import { NextRequest } from "next/server"
import { TextToSpeechClient } from "@google-cloud/text-to-speech"
import { storiesCollection } from "@/lib/db"
import { ObjectId } from "mongodb"

export const maxDuration = 60

// Initialize the TTS client
let ttsClient: TextToSpeechClient | null = null

function getTTSClient() {
  if (!ttsClient) {
    if (!process.env.GOOGLE_API_KEY) {
      throw new Error("GOOGLE_API_KEY not configured")
    }
    
    // Create client with API key authentication
    ttsClient = new TextToSpeechClient({
      apiKey: process.env.GOOGLE_API_KEY,
    })
  }
  return ttsClient
}

export async function POST(req: NextRequest) {
  try {
    const { text, type, storyId, paragraphIndex, word } = await req.json()
    
    if (!text) {
      return new Response(JSON.stringify({ 
        error: "Missing text parameter" 
      }), { status: 400 })
    }

    const client = getTTSClient()

    // Configure the TTS request for French
    const request = {
      input: { text },
      voice: {
        languageCode: 'fr-FR',
        name: 'fr-FR-Neural2-A', // Female French voice
        ssmlGender: 'FEMALE' as const,
      },
      audioConfig: {
        audioEncoding: 'MP3' as const,
        speakingRate: type === 'word' ? 0.8 : 1.0, // Slower for individual words
        pitch: 0,
        volumeGainDb: 0,
      },
    }

    // Generate the audio
    const [response] = await client.synthesizeSpeech(request)
    
    if (!response.audioContent) {
      throw new Error("No audio content received from TTS service")
    }

    // Convert audio content to base64
    const audioBase64 = Buffer.from(response.audioContent).toString('base64')

    // If this is for a story paragraph, save it to the database
    if (type === 'paragraph' && storyId && paragraphIndex !== undefined) {
      try {
        const collection = await storiesCollection()
        await collection.updateOne(
          { _id: new ObjectId(storyId) },
          { 
            $set: { 
              [`paragraphs.${paragraphIndex}.audio`]: {
                mimeType: 'audio/mpeg',
                dataBase64: audioBase64
              }
            }
          }
        )
      } catch (dbError) {
        console.warn("Failed to save audio to database:", dbError)
        // Continue anyway, return the audio
      }
    }

    // If this is for a word, we could cache it in a separate collection
    // For now, we'll just return it without caching

    return new Response(JSON.stringify({
      audio: {
        mimeType: 'audio/mpeg',
        dataBase64: audioBase64
      }
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      }
    })

  } catch (error: any) {
    console.error("TTS generation failed:", error)
    
    return new Response(JSON.stringify({
      error: error.message || "Failed to generate speech",
      type: "TTS_ERROR"
    }), { 
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      }
    })
  }
}