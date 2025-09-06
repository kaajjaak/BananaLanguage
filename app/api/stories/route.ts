import { storiesCollection } from "@/lib/db"

export const dynamic = "force-dynamic"
export const revalidate = 0

export async function GET() {
  try {
    if (!process.env.MONGODB_URI) {
      return new Response(JSON.stringify([]), { status: 200 })
    }
    const col = await storiesCollection()
    const items = await col
      .find({}, { projection: { title: 1, level: 1, createdAt: 1, prompt: 1 } })
      .sort({ createdAt: -1 })
      .limit(20)
      .toArray()

    const out = items.map((d: any) => ({ id: String(d._id), title: d.title || d.prompt || "Untitled", level: d.level, createdAt: d.createdAt }))
    return new Response(JSON.stringify(out), { status: 200 })
  } catch (err: any) {
    console.error("/api/stories GET error", err)
    return new Response(JSON.stringify({ error: err?.message || "Internal error" }), { status: 500 })
  }
}
