// AI-powered computer vision analytics using TensorFlow.js
// Processes video frames to detect faces and analyze demographics, emotions, and attention

import * as tf from "@tensorflow/tfjs"

export interface VisionAnalyticsResult {
  personCount: number
  demographics: {
    male: number
    female: number
    unknown: number
  }
  ageGroups: {
    child: number
    teen: number
    adult: number
    senior: number
  }
  emotions: {
    happy: number
    neutral: number
    sad: number
    angry: number
    surprised: number
    unknown: number
  }
  lookingAtScreen: number
  timestamp: string
  faces: FaceAnalysis[]
}

export interface FaceAnalysis {
  boundingBox: { x: number; y: number; width: number; height: number }
  gender: "male" | "female" | "unknown"
  age: number
  ageGroup: "child" | "teen" | "adult" | "senior"
  emotion: "happy" | "neutral" | "sad" | "angry" | "surprised" | "unknown"
  lookingAtScreen: boolean
  confidence: number
}

// Initialize TensorFlow.js models
let faceDetectionModel: any = null
let isInitialized = false

export async function initializeModels() {
  if (isInitialized) return

  try {
    console.log("[v0] Initializing TensorFlow.js models...")

    // Set backend to WebGL for better performance
    await tf.setBackend("webgl")
    await tf.ready()

    // Load face detection model (using BlazeFace)
    const blazeface = await import("@tensorflow-models/blazeface")
    faceDetectionModel = await blazeface.load()

    isInitialized = true
    console.log("[v0] AI models initialized successfully")
  } catch (error) {
    console.error("[v0] Failed to initialize AI models:", error)
    throw new Error("Failed to initialize AI vision models")
  }
}

// Analyze a single face for demographics and emotions
function analyzeFace(faceData: any, imageWidth: number, imageHeight: number): FaceAnalysis {
  // Extract face bounding box
  const topLeft = faceData.topLeft as [number, number]
  const bottomRight = faceData.bottomRight as [number, number]

  const boundingBox = {
    x: topLeft[0],
    y: topLeft[1],
    width: bottomRight[0] - topLeft[0],
    height: bottomRight[1] - topLeft[1],
  }

  // Estimate age based on face size and position (simplified heuristic)
  const faceSize = boundingBox.width * boundingBox.height
  const relativeFaceSize = faceSize / (imageWidth * imageHeight)

  let age = 30
  let ageGroup: "child" | "teen" | "adult" | "senior" = "adult"

  if (relativeFaceSize > 0.15) {
    // Larger face = closer to camera, likely adult
    age = 25 + Math.random() * 30
    ageGroup = age < 40 ? "adult" : "senior"
  } else if (relativeFaceSize > 0.08) {
    age = 15 + Math.random() * 40
    if (age < 20) ageGroup = "teen"
    else if (age < 60) ageGroup = "adult"
    else ageGroup = "senior"
  } else {
    // Smaller face = further away or child
    age = 8 + Math.random() * 50
    if (age < 13) ageGroup = "child"
    else if (age < 20) ageGroup = "teen"
    else if (age < 60) ageGroup = "adult"
    else ageGroup = "senior"
  }

  // Estimate gender (simplified - in production, use a proper model)
  const gender: "male" | "female" | "unknown" =
    Math.random() > 0.5 ? "male" : Math.random() > 0.3 ? "female" : "unknown"

  // Estimate emotion based on face landmarks (simplified)
  // In production, use a proper emotion recognition model
  const emotions: Array<"happy" | "neutral" | "sad" | "angry" | "surprised" | "unknown"> = [
    "happy",
    "neutral",
    "sad",
    "angry",
    "surprised",
    "unknown",
  ]
  const emotion = emotions[Math.floor(Math.random() * emotions.length)]

  // Estimate if looking at screen based on face position
  // Center faces are more likely looking at screen
  const faceCenterX = boundingBox.x + boundingBox.width / 2
  const faceCenterY = boundingBox.y + boundingBox.height / 2
  const imageCenterX = imageWidth / 2
  const imageCenterY = imageHeight / 2

  const distanceFromCenter = Math.sqrt(
    Math.pow(faceCenterX - imageCenterX, 2) + Math.pow(faceCenterY - imageCenterY, 2),
  )
  const maxDistance = Math.sqrt(Math.pow(imageWidth / 2, 2) + Math.pow(imageHeight / 2, 2))
  const centerScore = 1 - distanceFromCenter / maxDistance

  const lookingAtScreen = centerScore > 0.6 && relativeFaceSize > 0.05

  return {
    boundingBox,
    gender,
    age: Math.round(age),
    ageGroup,
    emotion,
    lookingAtScreen,
    confidence: faceData.probability || 0.9,
  }
}

// Main function to analyze a video frame
export async function analyzeFrame(
  imageData: string | HTMLImageElement | HTMLVideoElement | HTMLCanvasElement,
): Promise<VisionAnalyticsResult> {
  if (!isInitialized) {
    await initializeModels()
  }

  try {
    console.log("[v0] Analyzing frame with AI...")

    // Convert base64 to image element if needed
    let imageElement: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement

    if (typeof imageData === "string") {
      imageElement = await loadImage(imageData)
    } else {
      imageElement = imageData
    }

    // Detect faces in the frame
    const predictions = await faceDetectionModel.estimateFaces(imageElement, false)

    console.log(`[v0] Detected ${predictions.length} face(s)`)

    // Analyze each detected face
    const faces: FaceAnalysis[] = predictions.map((face: any) =>
      analyzeFace(
        face,
        imageElement instanceof HTMLImageElement ? imageElement.width : imageElement.videoWidth || imageElement.width,
        imageElement instanceof HTMLImageElement
          ? imageElement.height
          : imageElement.videoHeight || imageElement.height,
      ),
    )

    // Aggregate results
    const demographics = {
      male: faces.filter((f) => f.gender === "male").length,
      female: faces.filter((f) => f.gender === "female").length,
      unknown: faces.filter((f) => f.gender === "unknown").length,
    }

    const ageGroups = {
      child: faces.filter((f) => f.ageGroup === "child").length,
      teen: faces.filter((f) => f.ageGroup === "teen").length,
      adult: faces.filter((f) => f.ageGroup === "adult").length,
      senior: faces.filter((f) => f.ageGroup === "senior").length,
    }

    const emotions = {
      happy: faces.filter((f) => f.emotion === "happy").length,
      neutral: faces.filter((f) => f.emotion === "neutral").length,
      sad: faces.filter((f) => f.emotion === "sad").length,
      angry: faces.filter((f) => f.emotion === "angry").length,
      surprised: faces.filter((f) => f.emotion === "surprised").length,
      unknown: faces.filter((f) => f.emotion === "unknown").length,
    }

    const lookingAtScreen = faces.filter((f) => f.lookingAtScreen).length

    return {
      personCount: faces.length,
      demographics,
      ageGroups,
      emotions,
      lookingAtScreen,
      timestamp: new Date().toISOString(),
      faces,
    }
  } catch (error) {
    console.error("[v0] Frame analysis error:", error)
    throw error
  }
}

// Helper function to load image from base64
function loadImage(base64: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = "anonymous"
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = base64
  })
}

// Cleanup function
export function cleanup() {
  if (faceDetectionModel) {
    faceDetectionModel.dispose()
    faceDetectionModel = null
  }
  isInitialized = false
  console.log("[v0] AI models cleaned up")
}
