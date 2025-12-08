// Google Cloud Storage REST API client
// Uses fetch() for direct uploads with proper error handling

interface GCSCredentials {
  project_id: string
  private_key: string
  client_email: string
}

// Parse credentials from environment
function getCredentials(): GCSCredentials {
  const credentialsJson = process.env.GCS_SERVICE_ACCOUNT_JSON
  if (!credentialsJson) {
    throw new Error("GCS_SERVICE_ACCOUNT_JSON environment variable is not set")
  }
  return JSON.parse(credentialsJson)
}

// Generate JWT for GCS authentication
async function generateJWT(credentials: GCSCredentials): Promise<string> {
  const header = { alg: "RS256", typ: "JWT" }
  const now = Math.floor(Date.now() / 1000)
  const payload = {
    iss: credentials.client_email,
    scope: "https://www.googleapis.com/auth/devstorage.full_control",
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now,
  }

  const encoder = new TextEncoder()
  const headerB64 = btoa(JSON.stringify(header)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
  const payloadB64 = btoa(JSON.stringify(payload)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
  const message = `${headerB64}.${payloadB64}`

  // Import private key
  const privateKey = credentials.private_key.replace(/\\n/g, "\n")
  const pemContents = privateKey
    .replace("-----BEGIN PRIVATE KEY-----", "")
    .replace("-----END PRIVATE KEY-----", "")
    .replace(/\s/g, "")

  const binaryKey = Uint8Array.from(atob(pemContents), (c) => c.charCodeAt(0))

  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    binaryKey,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  )

  const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", cryptoKey, encoder.encode(message))
  const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "")

  return `${message}.${signatureB64}`
}

// Get OAuth2 access token
async function getAccessToken(): Promise<string> {
  const credentials = getCredentials()
  const jwt = await generateJWT(credentials)

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to get access token: ${error}`)
  }

  const data = await response.json()
  return data.access_token
}

// Upload file to GCS using resumable upload (supports large files)
export async function uploadToGCS(
  bucketName: string,
  fileName: string,
  fileBuffer: Buffer,
  contentType: string,
): Promise<string> {
  const accessToken = await getAccessToken()

  // Step 1: Initiate resumable upload
  const initUrl = `https://storage.googleapis.com/upload/storage/v1/b/${bucketName}/o?uploadType=resumable&name=${encodeURIComponent(fileName)}`

  const initResponse = await fetch(initUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "X-Upload-Content-Type": contentType,
      "X-Upload-Content-Length": fileBuffer.length.toString(),
    },
    body: JSON.stringify({
      name: fileName,
      contentType: contentType,
    }),
  })

  if (!initResponse.ok) {
    const error = await initResponse.text()
    throw new Error(`GCS upload init failed: ${initResponse.status} ${error}`)
  }

  const uploadUrl = initResponse.headers.get("Location")
  if (!uploadUrl) {
    throw new Error("GCS did not return upload URL")
  }

  // Step 2: Upload the file content
  const uploadResponse = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      "Content-Type": contentType,
      "Content-Length": fileBuffer.length.toString(),
    },
    body: fileBuffer,
  })

  if (!uploadResponse.ok) {
    const error = await uploadResponse.text()
    throw new Error(`GCS upload failed: ${uploadResponse.status} ${error}`)
  }

  // Step 3: Make the file public
  const aclUrl = `https://storage.googleapis.com/storage/v1/b/${bucketName}/o/${encodeURIComponent(fileName)}/acl`
  await fetch(aclUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ entity: "allUsers", role: "READER" }),
  })

  return `https://storage.googleapis.com/${bucketName}/${fileName}`
}

// Delete file from GCS
export async function deleteFromGCS(bucketName: string, fileName: string): Promise<void> {
  const accessToken = await getAccessToken()

  const url = `https://storage.googleapis.com/storage/v1/b/${bucketName}/o/${encodeURIComponent(fileName)}`
  const response = await fetch(url, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  if (!response.ok && response.status !== 404) {
    const error = await response.text()
    throw new Error(`GCS delete failed: ${response.status} ${error}`)
  }
}

// Generate a signed URL for client-side upload
export async function getSignedUploadUrl(
  bucketName: string,
  fileName: string,
  contentType: string,
): Promise<{ uploadUrl: string; publicUrl: string }> {
  const accessToken = await getAccessToken()

  // Initiate resumable upload and return the session URL
  const initUrl = `https://storage.googleapis.com/upload/storage/v1/b/${bucketName}/o?uploadType=resumable&name=${encodeURIComponent(fileName)}`

  const initResponse = await fetch(initUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "X-Upload-Content-Type": contentType,
    },
    body: JSON.stringify({
      name: fileName,
      contentType: contentType,
    }),
  })

  if (!initResponse.ok) {
    const error = await initResponse.text()
    throw new Error(`Failed to initiate upload: ${initResponse.status} ${error}`)
  }

  const uploadUrl = initResponse.headers.get("Location")
  if (!uploadUrl) {
    throw new Error("GCS did not return upload URL")
  }

  return {
    uploadUrl,
    publicUrl: `https://storage.googleapis.com/${bucketName}/${fileName}`,
  }
}

// Make a file public after upload
export async function makeFilePublic(bucketName: string, fileName: string): Promise<void> {
  const accessToken = await getAccessToken()

  const aclUrl = `https://storage.googleapis.com/storage/v1/b/${bucketName}/o/${encodeURIComponent(fileName)}/acl`
  const response = await fetch(aclUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ entity: "allUsers", role: "READER" }),
  })

  if (!response.ok) {
    const error = await response.text()
    console.error("[v0] Failed to make file public:", error)
  }
}
