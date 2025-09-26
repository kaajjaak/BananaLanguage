import { NextRequest } from "next/server"
import { generateStoryText, generateImageForParagraph } from "@/lib/ai"
import { storiesCollection, StoryDoc } from "@/lib/db"
import { GenerationError, ErrorType, classifyError } from "@/lib/errors"

export const maxDuration = 300

export async function POST(req: NextRequest) {
  try {
    const { prompt, level, imageStyle } = await req.json()
    if (!prompt || !level) {
      return new Response(JSON.stringify({ 
        error: "Missing prompt or level",
        type: "VALIDATION_ERROR"
      }), { status: 400 })
    }
    if (!process.env.GOOGLE_API_KEY) {
      return new Response(JSON.stringify({ 
        error: "GOOGLE_API_KEY not configured",
        type: ErrorType.API_KEY_MISSING
      }), { status: 500 })
    }
    if (!process.env.MONGODB_URI) {
      return new Response(JSON.stringify({ 
        error: "MONGODB_URI not configured",
        type: ErrorType.DATABASE_ERROR
      }), { status: 500 })
    }

    let story
    try {
      story = await generateStoryText(String(prompt), String(level))
    } catch (err) {
      const genError = err instanceof GenerationError ? err : classifyError(err)
      console.error("Story text generation failed:", genError)
      
      // Return specific error information for the frontend
      return new Response(JSON.stringify({ 
        error: genError.message,
        type: genError.type,
        retryable: genError.retryable
      }), { 
        status: genError.type === ErrorType.API_KEY_MISSING || genError.type === ErrorType.BILLING_ISSUE ? 500 : 503
      })
    }

    const fullText = story.paragraphs.join("\n\n")
    const paragraphsWithImages: StoryDoc["paragraphs"] = []
    const imageErrors: string[] = []

    for (let i = 0; i < story.paragraphs.length; i++) {
      const p = story.paragraphs[i]
      try {
        const img = await generateImageForParagraph({ paragraph: p, fullStory: fullText, imageStyle })
        paragraphsWithImages.push({ index: i, text: p, image: img })
      } catch (err) {
        const imgError = err instanceof GenerationError ? err : classifyError(err)
        console.warn(`Image generation failed for paragraph ${i}:`, imgError)
        imageErrors.push(`Paragraph ${i + 1}: ${imgError.message}`)
        
        // If image fails, still store text paragraph
        paragraphsWithImages.push({ index: i, text: p })
      }
    }

    const doc: StoryDoc = {
      prompt: String(prompt),
      level: String(level),
      imageStyle: imageStyle ? String(imageStyle) : undefined,
      title: story.title,
      fullText,
      paragraphs: paragraphsWithImages,
      createdAt: new Date(),
    }

    try {
      const col = await storiesCollection()
      const res = await col.insertOne(doc as any)

      const response: any = { id: String(res.insertedId) }
      if (imageErrors.length > 0) {
        response.imageErrors = imageErrors
        response.warning = `Story created successfully, but ${imageErrors.length} image(s) failed to generate`
      }

      return new Response(JSON.stringify(response), { status: 201 })
    } catch (err) {
      const dbError = classifyError(err)
      console.error("Database error:", dbError)
      return new Response(JSON.stringify({ 
        error: "Failed to save story to database",
        type: ErrorType.DATABASE_ERROR,
        retryable: true
      }), { status: 503 })
    }
  } catch (err: any) {
    const genError = classifyError(err)
    console.error("/api/generate-story unexpected error", genError)
    return new Response(JSON.stringify({ 
      error: genError.message,
      type: genError.type,
      retryable: genError.retryable
    }), { status: 500 })
  }
}
