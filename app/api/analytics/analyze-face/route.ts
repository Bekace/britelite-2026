import { generateObject } from "ai"
import { z } from "zod"
import { type NextRequest, NextResponse } from "next/server"

const FaceAnalysisSchema = z.object({
  faces: z.array(
    z.object({
      gender: z.enum(["male", "female", "unknown"]).describe("The apparent gender of the person"),
      estimatedAge: z.number().describe("The estimated age of the person in years"),
      emotion: z
        .enum(["happy", "neutral", "sad", "angry", "surprised", "fearful", "disgusted"])
        .describe("The primary emotion expressed by the person"),
      lookingAtCamera: z.boolean().describe("Whether the person appears to be looking at the camera"),
      confidence: z.number().min(0).max(1).describe("Confidence level of the analysis (0-1)"),
    }),
  ),
})

async function analyzeWithRetry(imageData: string, faceCount: number, maxRetries = 2) {
  let lastError: Error | null = null

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[v0] Server: Attempt ${attempt + 1}/${maxRetries + 1} - Analyzing ${faceCount} face(s)...`)

      const { object } = await generateObject({
        model: "gpt-4o", // Using gpt-4o (the actual OpenAI vision model name)
        schema: FaceAnalysisSchema,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                image: imageData,
              },
              {
                type: "text",
                text: `Analyze this image and provide detailed information about each person visible. I detected ${faceCount} face(s) using face detection.

For EACH person in the image, provide:
1. Gender: male, female, or unknown (if unclear)
2. Estimated age in years (be as accurate as possible based on facial features)
3. Primary emotion: happy, neutral, sad, angry, surprised, fearful, or disgusted (look at facial expressions carefully)
4. Whether they appear to be looking at the camera (true/false)
5. Your confidence level in this analysis (0-1)

Be precise and analytical. Look at:
- Facial structure and features for gender
- Skin texture, wrinkles, facial proportions for age
- Facial muscle movements, eye shape, mouth position for emotions
- Eye gaze direction and head orientation for attention

Provide exactly ${faceCount} face analysis results.`,
              },
            ],
          },
        ],
      })

      console.log("[v0] Server: AI vision analysis complete on attempt", attempt + 1)
      return object
    } catch (error) {
      lastError = error as Error
      console.error(`[v0] Server: Attempt ${attempt + 1} failed:`, {
        message: error instanceof Error ? error.message : "Unknown error",
        name: error instanceof Error ? error.name : undefined,
      })

      // If this isn't the last attempt, wait before retrying
      if (attempt < maxRetries) {
        const waitTime = Math.pow(2, attempt) * 1000 // Exponential backoff: 1s, 2s, 4s
        console.log(`[v0] Server: Waiting ${waitTime}ms before retry...`)
        await new Promise((resolve) => setTimeout(resolve, waitTime))
      }
    }
  }

  // If we get here, all retries failed
  throw lastError
}

export async function POST(request: NextRequest) {
  try {
    const { imageData, faceCount } = await request.json()

    if (!imageData || !faceCount) {
      return NextResponse.json({ error: "Missing imageData or faceCount" }, { status: 400 })
    }

    console.log(`[v0] Server: Received request to analyze ${faceCount} face(s)`)

    const object = await analyzeWithRetry(imageData, faceCount)

    return NextResponse.json({
      faces: object.faces.map((face) => ({
        gender: face.gender,
        age: face.estimatedAge,
        ageGroup:
          face.estimatedAge < 13
            ? "child"
            : face.estimatedAge < 20
              ? "teen"
              : face.estimatedAge < 60
                ? "adult"
                : "senior",
        emotion: face.emotion === "fearful" || face.emotion === "disgusted" ? "unknown" : face.emotion,
        lookingAtScreen: face.lookingAtCamera,
        confidence: face.confidence,
      })),
    })
  } catch (error) {
    const errorDetails = {
      message: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : undefined,
      // @ts-ignore - Capture any additional error properties
      cause: error?.cause,
      // @ts-ignore
      code: error?.code,
    }

    console.error("[v0] Server: All retry attempts failed:", errorDetails)

    return NextResponse.json(
      {
        error: "AI analysis failed after retries",
        details: errorDetails.message,
        errorName: errorDetails.name,
        errorCode: errorDetails.code,
        fullError: JSON.stringify(errorDetails, null, 2),
      },
      { status: 500 },
    )
  }
}
