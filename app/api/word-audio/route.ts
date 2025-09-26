import { NextRequest } from "next/server"
import { TextToSpeechClient } from "@google-cloud/text-to-speech"
import { getDb } from "@/lib/db"

export const maxDuration = 60

// Word audio cache collection
async function wordAudioCollection() {
  const db = await getDb()
  return db.collection("word-audio")
}

// Initialize the TTS client
let ttsClient: TextToSpeechClient | null = null

function getTTSClient() {
  if (!ttsClient) {
    if (!process.env.GOOGLE_API_KEY) {
      throw new Error("GOOGLE_API_KEY not configured")
    }
    
    ttsClient = new TextToSpeechClient({
      apiKey: process.env.GOOGLE_API_KEY,
    })
  }
  return ttsClient
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const word = searchParams.get('word')
    
    if (!word) {
      return new Response(JSON.stringify({ 
        error: "Missing word parameter" 
      }), { status: 400 })
    }

    // Check if we have cached audio for this word
    const collection = await wordAudioCollection()
    const cached = await collection.findOne({ word: word.toLowerCase() })
    
    if (cached) {
      return new Response(JSON.stringify({
        audio: {
          mimeType: cached.mimeType,
          dataBase64: cached.dataBase64
        },
        cached: true
      }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        }
      })
    }

    return new Response(JSON.stringify({
      error: "Word audio not found in cache"
    }), { status: 404 })

  } catch (error: any) {
    console.error("Word audio retrieval failed:", error)
    
    return new Response(JSON.stringify({
      error: error.message || "Failed to retrieve word audio",
      type: "CACHE_ERROR"
    }), { 
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      }
    })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { word } = await req.json()
    
    if (!word) {
      return new Response(JSON.stringify({ 
        error: "Missing word parameter" 
      }), { status: 400 })
    }

    const normalizedWord = word.toLowerCase().trim()

    // Check if we already have cached audio for this word
    const collection = await wordAudioCollection()
    const cached = await collection.findOne({ word: normalizedWord })
    
    if (cached) {
      return new Response(JSON.stringify({
        audio: {
          mimeType: cached.mimeType,
          dataBase64: cached.dataBase64
        },
        cached: true
      }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        }
      })
    }

    // Generate new audio
    const client = getTTSClient()

    const request = {
      input: { text: normalizedWord },
      voice: {
        languageCode: 'fr-FR',
        name: 'fr-FR-Neural2-A',
        ssmlGender: 'FEMALE' as const,
      },
      audioConfig: {
        audioEncoding: 'MP3' as const,
        speakingRate: 0.8, // Slower for individual words
        pitch: 0,
        volumeGainDb: 0,
      },
    }

    const [response] = await client.synthesizeSpeech(request)
    
    if (!response.audioContent) {
      throw new Error("No audio content received from TTS service")
    }

    const audioBase64 = Buffer.from(response.audioContent).toString('base64')

    // Cache the audio
    try {
      await collection.insertOne({
        word: normalizedWord,
        mimeType: 'audio/mpeg',
        dataBase64: audioBase64,
        createdAt: new Date()
      })
    } catch (dbError) {
      console.warn("Failed to cache word audio:", dbError)
      // Continue anyway, return the audio
    }

    return new Response(JSON.stringify({
      audio: {
        mimeType: 'audio/mpeg',
        dataBase64: audioBase64
      },
      cached: false
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      }
    })

  } catch (error: any) {
    console.error("Word audio generation failed:", error)
    
    return new Response(JSON.stringify({
      error: error.message || "Failed to generate word audio",
      type: "TTS_ERROR"
    }), { 
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      }
    })
  }
}