import { NextRequest } from "next/server"
import { storiesCollection } from "@/lib/db"
import { ObjectId } from "mongodb"

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    if (!process.env.MONGODB_URI) {
      return new Response(JSON.stringify({ error: "Not found" }), { status: 404 })
    }
    const id = params.id
    const col = await storiesCollection()
    const doc = await col.findOne({ _id: new ObjectId(id) })
    if (!doc) return new Response(JSON.stringify({ error: "Not found" }), { status: 404 })
    return new Response(JSON.stringify({
      id: String(doc._id),
      title: doc.title || doc.prompt || "Untitled",
      prompt: doc.prompt,
      level: doc.level,
      imageStyle: doc.imageStyle,
      paragraphs: doc.paragraphs,
      imageErrors: doc.imageErrors,
      createdAt: doc.createdAt,
    }), { status: 200 })
  } catch (err: any) {
    console.error("/api/stories/[id] GET error", err)
    return new Response(JSON.stringify({ error: err?.message || "Internal error" }), { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    if (!process.env.MONGODB_URI) {
      return new Response(JSON.stringify({ error: "MONGODB_URI not configured" }), { status: 500 })
    }
    const id = params.id
    const col = await storiesCollection()
    const res = await col.deleteOne({ _id: new ObjectId(id) })
    if (res.deletedCount === 0) return new Response(JSON.stringify({ error: "Not found" }), { status: 404 })
    return new Response(null, { status: 204 })
  } catch (err: any) {
    console.error("/api/stories/[id] DELETE error", err)
    return new Response(JSON.stringify({ error: err?.message || "Internal error" }), { status: 500 })
  }
}
