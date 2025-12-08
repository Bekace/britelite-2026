import { Storage } from "@google-cloud/storage"

// Initialize Google Cloud Storage client with service account credentials
const credentials = JSON.parse(process.env.GCS_SERVICE_ACCOUNT_JSON || "{}")

export const storage = new Storage({
  projectId: credentials.project_id,
  credentials,
})

export const bucket = storage.bucket(process.env.GCS_BUCKET_NAME || "xkreen-web-app")

/**
 * Upload a file to Google Cloud Storage
 * @param filePath - The path where the file will be stored in GCS
 * @param fileBuffer - The file content as a buffer
 * @param contentType - The MIME type of the file
 * @returns The public URL of the uploaded file
 */
export async function uploadFile(filePath: string, fileBuffer: Buffer, contentType: string): Promise<string> {
  const file = bucket.file(filePath)

  await file.save(fileBuffer, {
    contentType,
    metadata: {
      cacheControl: "public, max-age=31536000",
    },
  })

  // Make the file publicly accessible
  await file.makePublic()

  // Return the public URL
  return `https://storage.googleapis.com/${bucket.name}/${filePath}`
}

/**
 * Delete a file from Google Cloud Storage
 * @param filePath - The path of the file to delete in GCS (or the full URL)
 */
export async function deleteFile(filePath: string): Promise<void> {
  // Extract the file path from URL if a full URL is provided
  let path = filePath
  if (filePath.includes("storage.googleapis.com")) {
    const url = new URL(filePath)
    // Remove the bucket name from the path
    path = url.pathname.split("/").slice(2).join("/")
  }

  const file = bucket.file(path)
  await file.delete()
}
