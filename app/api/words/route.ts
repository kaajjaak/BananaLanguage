import { NextRequest } from "next/server"
import { wordsCollection } from "@/lib/db"

export async function GET() {
  try {
    if (!process.env.MONGODB_URI) {
      return new Response(JSON.stringify([]), { status: 200 })
    }
    const col = await wordsCollection()
    const items = await col.find({}, { projection: { word: 1, level: 1, definitions: 1 } }).toArray()
    const normalized = items.map((w: any) => ({
      word: w.word,
      level: w.level,
      definitions: Array.isArray(w.definitions)
        ? w.definitions.map((d: any) =>
            typeof d === "string"
              ? { sentence: "", translation: "", definition: d }
              : { sentence: d.sentence || "", translation: d.translation || "", definition: d.definition || "" },
          )
        : [],
    }))
    return new Response(JSON.stringify(normalized), { status: 200 })
  } catch (err: any) {
    console.error("/api/words GET error", err)
    return new Response(JSON.stringify({ error: err?.message || "Internal error" }), { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    if (!process.env.MONGODB_URI) {
      return new Response(JSON.stringify({ error: "MONGODB_URI not configured" }), { status: 500 })
    }
    const body = await req.json()
    const wordRaw: string | undefined = body.word
    const level: number | undefined = body.level

    if (!wordRaw) return new Response(JSON.stringify({ error: "Missing word" }), { status: 400 })
    if (typeof level !== "number" || level < 0 || level > 5)
      return new Response(JSON.stringify({ error: "Invalid level" }), { status: 400 })

    const word = String(wordRaw).toLowerCase()
    const col = await wordsCollection()

    const update: any = {
      $set: { level, updatedAt: new Date(), word },
      $setOnInsert: { createdAt: new Date(), definitions: [] },
    }

    await col.updateOne({ word }, update, { upsert: true })
    const saved = await col.findOne({ word })
    return new Response(JSON.stringify(saved), { status: 200 })
  } catch (err: any) {
    console.error("/api/words POST error", err)
    return new Response(JSON.stringify({ error: err?.message || "Internal error" }), { status: 500 })
  }
}
