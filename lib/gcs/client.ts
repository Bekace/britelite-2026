import { URL } from "url"

let storageInstance: any | null = null
let bucketInstance: any | null = null
let Storage: any = null

async function loadGCSModule() {
  if (Storage) {
    return Storage
  }

  try {
    const { Storage: StorageClass } = await import("@google-cloud/storage")
    Storage = StorageClass
    console.log("[v0] GCS module loaded successfully")
    return Storage
  } catch (error) {
    console.error("[v0] Failed to load @google-cloud/storage module:", error)
    throw new Error(
      "Google Cloud Storage library could not be loaded. Please ensure @google-cloud/storage is installed.",
    )
  }
}

async function initializeStorage() {
  if (storageInstance) {
    return { storage: storageInstance, bucket: bucketInstance! }
  }

  try {
    const StorageClass = await loadGCSModule()

    const credentialsJson = process.env.GCS_SERVICE_ACCOUNT_JSON
    if (!credentialsJson) {
      throw new Error("GCS_SERVICE_ACCOUNT_JSON environment variable is not set")
    }

    let credentials
    try {
      credentials = JSON.parse(credentialsJson)
    } catch (parseError) {
      throw new Error("Failed to parse GCS_SERVICE_ACCOUNT_JSON: Invalid JSON format")
    }

    if (!credentials.project_id || !credentials.private_key || !credentials.client_email) {
      throw new Error("Invalid GCS credentials: missing required fields (project_id, private_key, or client_email)")
    }

    storageInstance = new StorageClass({
      projectId: credentials.project_id,
      credentials: {
        client_email: credentials.client_email,
        private_key: credentials.private_key,
      },
    })

    const bucketName = process.env.GCS_BUCKET_NAME || "xkreen-web-app"
    bucketInstance = storageInstance.bucket(bucketName)

    console.log("[v0] GCS initialized successfully with bucket:", bucketName)

    return { storage: storageInstance, bucket: bucketInstance }
  } catch (error) {
    console.error("[v0] Failed to initialize GCS:", error)
    throw new Error(`GCS initialization failed: ${error instanceof Error ? error.message : "Unknown error"}`)
  }
}

export const getStorage = async () => {
  const { storage } = await initializeStorage()
  return storage
}

export const getBucket = async () => {
  const { bucket } = await initializeStorage()
  return bucket
}

/**
 * Upload a file to Google Cloud Storage
 * @param filePath - The path where the file will be stored in GCS
 * @param fileBuffer - The file content as a buffer
 * @param contentType - The MIME type of the file
 * @returns The public URL of the uploaded file
 */
export async function uploadFile(filePath: string, fileBuffer: Buffer, contentType: string): Promise<string> {
  try {
    const bucket = await getBucket()
    const file = bucket.file(filePath)

    console.log("[v0] Uploading file to GCS:", filePath, "Size:", fileBuffer.length, "bytes")

    await file.save(fileBuffer, {
      contentType,
      metadata: {
        cacheControl: "public, max-age=31536000",
      },
    })

    // Make the file publicly accessible
    await file.makePublic()

    // Return the public URL
    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${filePath}`
    console.log("[v0] File uploaded successfully:", publicUrl)

    return publicUrl
  } catch (error) {
    console.error("[v0] GCS upload error:", error)
    throw error
  }
}

/**
 * Delete a file from Google Cloud Storage
 * @param filePath - The path of the file to delete in GCS (or the full URL)
 */
export async function deleteFile(filePath: string): Promise<void> {
  try {
    const bucket = await getBucket()

    // Extract the file path from URL if a full URL is provided
    let path = filePath
    if (filePath.includes("storage.googleapis.com")) {
      const url = new URL(filePath)
      // Remove the bucket name from the path
      path = url.pathname.split("/").slice(2).join("/")
    }

    console.log("[v0] Deleting file from GCS:", path)

    const file = bucket.file(path)
    await file.delete()

    console.log("[v0] File deleted successfully:", path)
  } catch (error) {
    console.error("[v0] GCS delete error:", error)
    throw error
  }
}
