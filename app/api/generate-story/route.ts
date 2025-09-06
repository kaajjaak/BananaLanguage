import { NextRequest } from "next/server"
import { generateStoryText, generateImageForParagraph } from "@/lib/ai"
import { storiesCollection, StoryDoc } from "@/lib/db"

export const maxDuration = 300

export async function POST(req: NextRequest) {
  try {
    const { prompt, level, imageStyle } = await req.json()
    if (!prompt || !level) {
      return new Response(JSON.stringify({ error: "Missing prompt or level" }), { status: 400 })
    }
    if (!process.env.GOOGLE_API_KEY) {
      return new Response(JSON.stringify({ error: "GOOGLE_API_KEY not configured" }), { status: 500 })
    }
    if (!process.env.MONGODB_URI) {
      return new Response(JSON.stringify({ error: "MONGODB_URI not configured" }), { status: 500 })
    }

    const story = await generateStoryText(String(prompt), String(level))
    const fullText = story.paragraphs.join("\n\n")

    const paragraphsWithImages: StoryDoc["paragraphs"] = []
    for (let i = 0; i < story.paragraphs.length; i++) {
      const p = story.paragraphs[i]
      try {
        const img = await generateImageForParagraph({ paragraph: p, fullStory: fullText, imageStyle })
        paragraphsWithImages.push({ index: i, text: p, image: img })
      } catch (e) {
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

    const col = await storiesCollection()
    const res = await col.insertOne(doc as any)

    return new Response(JSON.stringify({ id: String(res.insertedId) }), { status: 201 })
  } catch (err: any) {
    console.error("/api/generate-story error", err)
    return new Response(JSON.stringify({ error: err?.message || "Internal error" }), { status: 500 })
  }
}
