import { NextRequest } from "next/server"
import { generateContextualDefinition } from "@/lib/ai"
import { wordsCollection, WordDoc, WordDefinition } from "@/lib/db"

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

function extractSentenceWithWord(paragraph: string, targetWord: string): string {
  const sentences = paragraph
    .split(/(?<=[.!?…])\s+|\n+/)
    .map((s) => s.trim())
    .filter(Boolean)
  const re = new RegExp(`(^|\\W)${escapeRegExp(targetWord)}(\\W|$)`, "i")
  for (const s of sentences) {
    if (re.test(s)) return s
  }
  return sentences[0] || paragraph
}

export async function POST(req: NextRequest) {
  try {
    if (!process.env.MONGODB_URI) {
      return new Response(JSON.stringify({ error: "MONGODB_URI not configured" }), { status: 500 })
    }
    if (!process.env.GOOGLE_API_KEY) {
      return new Response(JSON.stringify({ error: "GOOGLE_API_KEY not configured" }), { status: 500 })
    }
    const body = await req.json()
    const wordRaw: string | undefined = body.word
    const paragraph: string | undefined = body.paragraph
    if (!wordRaw || !paragraph) {
      return new Response(JSON.stringify({ error: "Missing word or paragraph" }), { status: 400 })
    }
    const word = String(wordRaw).toLowerCase()
    const sentence = extractSentenceWithWord(paragraph, word)

    const { translation, definition } = await generateContextualDefinition(word, sentence)
    const entry: WordDefinition = { sentence, translation, definition }

    const col = await wordsCollection()
    await col.updateOne(
      { word },
      {
        $set: { word, level: 0, updatedAt: new Date() },
        $setOnInsert: { createdAt: new Date() },
        $push: { definitions: entry },
      },
      { upsert: true },
    )
    const saved = (await col.findOne({ word })) as WordDoc | null
    return new Response(
      JSON.stringify({ word: saved?.word, level: saved?.level ?? 0, definitions: saved?.definitions ?? [entry] }),
      { status: 200 },
    )
  } catch (err: any) {
    console.error("/api/definitions POST error", err)
    return new Response(JSON.stringify({ error: err?.message || "Internal error" }), { status: 500 })
  }
}
