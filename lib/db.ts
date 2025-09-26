import { MongoClient, Db, Collection } from "mongodb"

const uri = process.env.MONGODB_URI || ""

if (!uri) {
  console.warn("[db] MONGODB_URI is not set. API routes depending on DB will fail until configured.")
}

let _client: MongoClient | null = null
let _db: Db | null = null

export async function getDb(): Promise<Db> {
  if (_db) return _db
  if (!_client) {
    _client = new MongoClient(uri)
    await _client.connect()
  }
  _db = _client.db("banana")
  return _db
}

// --- Collections & Schemas ---
export type WordDefinition = {
  sentence: string
  translation: string // brief translation of the target word in sentence context
  definition: string // brief English definition in context
}

export type WordDoc = {
  _id?: any
  word: string // lowercased
  level: number // 0..5
  definitions?: WordDefinition[]
  createdAt: Date
  updatedAt: Date
}

export type StoryParagraph = {
  index: number
  text: string
  image?: {
    mimeType: string
    dataBase64: string // base64 without data: prefix
  }
  audio?: {
    mimeType: string
    dataBase64: string // base64 without data: prefix
  }
}

export type StoryDoc = {
  _id?: any
  prompt: string
  level: string // A1..C2
  imageStyle?: string
  title?: string
  fullText: string
  paragraphs: StoryParagraph[]
  imageErrors?: string[] // Store image generation error messages
  audioErrors?: string[] // Store audio generation error messages
  hasTTS?: boolean // Whether TTS was requested for this story
  createdAt: Date
}

export async function wordsCollection(): Promise<Collection<WordDoc>> {
  const db = await getDb()
  const col = db.collection<WordDoc>("words")
  await col.createIndex({ word: 1 }, { unique: true })
  return col
}

export async function storiesCollection(): Promise<Collection<StoryDoc>> {
  const db = await getDb()
  const col = db.collection<StoryDoc>("stories")
  await col.createIndex({ createdAt: -1 })
  return col
}

export type ParagraphAudioDoc = {
  _id?: any
  textHash: string // SHA-256 hash of the paragraph text
  text: string // Original paragraph text for reference
  audio: {
    mimeType: string
    dataBase64: string // base64 without data: prefix
  }
  createdAt: Date
}

export async function paragraphAudioCollection(): Promise<Collection<ParagraphAudioDoc>> {
  const db = await getDb()
  const col = db.collection<ParagraphAudioDoc>("paragraph_audio")
  await col.createIndex({ textHash: 1 }, { unique: true })
  return col
}
