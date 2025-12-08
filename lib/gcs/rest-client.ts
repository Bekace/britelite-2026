// Google Cloud Storage REST API client
// Uses fetch() instead of @google-cloud/storage SDK for compatibility

interface GCSCredentials {
  project_id: string
  private_key: string
  client_email: string
}

// Generate JWT for GCS authentication
async function generateJWT(credentials: GCSCredentials): Promise<string> {
  const header = {
    alg: "RS256",
    typ: "JWT",
  }

  const now = Math.floor(Date.now() / 1000)
  const payload = {
    iss: credentials.client_email,
    scope: "https://www.googleapis.com/auth/devstorage.full_control",
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now,
  }

  const encoder = new TextEncoder()
  const headerBase64 = btoa(JSON.stringify(header)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
  const payloadBase64 = btoa(JSON.stringify(payload)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")

  const message = `${headerBase64}.${payloadBase64}`

  // Import private key
  const privateKey = credentials.private_key.replace(/\\n/g, "\n")
  const pemHeader = "-----BEGIN PRIVATE KEY-----"
  const pemFooter = "-----END PRIVATE KEY-----"
  const pemContents = privateKey.substring(pemHeader.length, privateKey.length - pemFooter.length).replace(/\s/g, "")

  const binaryKey = Uint8Array.from(atob(pemContents), (c) => c.charCodeAt(0))

  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    binaryKey,
    {
      name: "RSASSA-PKCS1-v1_5",
      hash: "SHA-256",
    },
    false,
    ["sign"],
  )

  const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", cryptoKey, encoder.encode(message))

  const signatureBase64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "")

  return `${message}.${signatureBase64}`
}

// Get OAuth2 access token
async function getAccessToken(credentials: GCSCredentials): Promise<string> {
  const jwt = await generateJWT(credentials)

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to get access token: ${error}`)
  }

  const data = await response.json()
  return data.access_token
}

export async function uploadToGCS(
  bucketName: string,
  fileName: string,
  fileBuffer: Buffer,
  contentType: string,
): Promise<string> {
  const credentialsJson = process.env.GCS_SERVICE_ACCOUNT_JSON
  if (!credentialsJson) {
    throw new Error("GCS_SERVICE_ACCOUNT_JSON environment variable is not set")
  }

  const credentials: GCSCredentials = JSON.parse(credentialsJson)
  const accessToken = await getAccessToken(credentials)

  const url = `https://storage.googleapis.com/upload/storage/v1/b/${bucketName}/o?uploadType=media&name=${encodeURIComponent(fileName)}`

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": contentType,
      "Content-Length": fileBuffer.length.toString(),
    },
    body: fileBuffer,
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`GCS upload failed: ${response.status} ${error}`)
  }

  const data = await response.json()

  // Make the file public
  const makePublicUrl = `https://storage.googleapis.com/storage/v1/b/${bucketName}/o/${encodeURIComponent(fileName)}/acl`
  await fetch(makePublicUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      entity: "allUsers",
      role: "READER",
    }),
  })

  return `https://storage.googleapis.com/${bucketName}/${fileName}`
}

export async function deleteFromGCS(bucketName: string, fileName: string): Promise<void> {
  const credentialsJson = process.env.GCS_SERVICE_ACCOUNT_JSON
  if (!credentialsJson) {
    throw new Error("GCS_SERVICE_ACCOUNT_JSON environment variable is not set")
  }

  const credentials: GCSCredentials = JSON.parse(credentialsJson)
  const accessToken = await getAccessToken(credentials)

  const url = `https://storage.googleapis.com/storage/v1/b/${bucketName}/o/${encodeURIComponent(fileName)}`

  const response = await fetch(url, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })

  if (!response.ok && response.status !== 404) {
    const error = await response.text()
    throw new Error(`GCS delete failed: ${response.status} ${error}`)
  }
}

export async function generateSignedUploadUrl(
  bucketName: string,
  fileName: string,
  contentType: string,
  expiresInSeconds = 3600,
): Promise<{ signedUrl: string; publicUrl: string }> {
  const credentialsJson = process.env.GCS_SERVICE_ACCOUNT_JSON
  if (!credentialsJson) {
    throw new Error("GCS_SERVICE_ACCOUNT_JSON environment variable is not set")
  }

  const credentials: GCSCredentials = JSON.parse(credentialsJson)

  // Generate signed URL using V4 signing
  const expiration = Math.floor(Date.now() / 1000) + expiresInSeconds
  const host = `storage.googleapis.com`
  const canonicalUri = `/${bucketName}/${encodeURIComponent(fileName).replace(/%2F/g, "/")}`

  const datetime = new Date()
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "")
  const datestamp = datetime.substring(0, 8)

  const credentialScope = `${datestamp}/auto/storage/goog4_request`
  const credential = `${credentials.client_email}/${credentialScope}`

  const canonicalHeaders = `host:${host}\nx-goog-content-length-range:0,524288000\n`
  const signedHeaders = "host;x-goog-content-length-range"

  const canonicalQueryString = [
    `X-Goog-Algorithm=GOOG4-RSA-SHA256`,
    `X-Goog-Credential=${encodeURIComponent(credential)}`,
    `X-Goog-Date=${datetime}`,
    `X-Goog-Expires=${expiresInSeconds}`,
    `X-Goog-SignedHeaders=${signedHeaders}`,
  ]
    .sort()
    .join("&")

  const canonicalRequest = [
    "PUT",
    canonicalUri,
    canonicalQueryString,
    canonicalHeaders,
    signedHeaders,
    "UNSIGNED-PAYLOAD",
  ].join("\n")

  const encoder = new TextEncoder()
  const canonicalRequestHash = await crypto.subtle.digest("SHA-256", encoder.encode(canonicalRequest))
  const canonicalRequestHashHex = Array.from(new Uint8Array(canonicalRequestHash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")

  const stringToSign = ["GOOG4-RSA-SHA256", datetime, credentialScope, canonicalRequestHashHex].join("\n")

  // Sign the string
  const privateKey = credentials.private_key.replace(/\\n/g, "\n")
  const pemHeader = "-----BEGIN PRIVATE KEY-----"
  const pemFooter = "-----END PRIVATE KEY-----"
  const pemContents = privateKey.substring(pemHeader.length, privateKey.length - pemFooter.length).replace(/\s/g, "")
  const binaryKey = Uint8Array.from(atob(pemContents), (c) => c.charCodeAt(0))

  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    binaryKey,
    {
      name: "RSASSA-PKCS1-v1_5",
      hash: "SHA-256",
    },
    false,
    ["sign"],
  )

  const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", cryptoKey, encoder.encode(stringToSign))
  const signatureHex = Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")

  const signedUrl = `https://${host}${canonicalUri}?${canonicalQueryString}&X-Goog-Signature=${signatureHex}`
  const publicUrl = `https://storage.googleapis.com/${bucketName}/${fileName}`

  return { signedUrl, publicUrl }
}

export async function makeFilePublic(bucketName: string, fileName: string): Promise<void> {
  const credentialsJson = process.env.GCS_SERVICE_ACCOUNT_JSON
  if (!credentialsJson) {
    throw new Error("GCS_SERVICE_ACCOUNT_JSON environment variable is not set")
  }

  const credentials: GCSCredentials = JSON.parse(credentialsJson)
  const accessToken = await getAccessToken(credentials)

  const makePublicUrl = `https://storage.googleapis.com/storage/v1/b/${bucketName}/o/${encodeURIComponent(fileName)}/acl`
  const response = await fetch(makePublicUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      entity: "allUsers",
      role: "READER",
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    console.error("[v0] Failed to make file public:", error)
  }
}
