import { NextRequest } from "next/server"
import { generateStoryText, generateImageForParagraph } from "@/lib/ai"
import { storiesCollection, StoryDoc, paragraphAudioCollection, ParagraphAudioDoc } from "@/lib/db"
import { GenerationError, ErrorType, classifyError } from "@/lib/errors"
import { TextToSpeechClient } from "@google-cloud/text-to-speech"
import { createHash } from "crypto"

export const maxDuration = 300

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

async function generateTTSForText(text: string): Promise<{ mimeType: string; dataBase64: string } | null> {
  try {
    // Create hash of the text for caching
    const textHash = createHash('sha256').update(text.trim()).digest('hex')
    
    // Check if we already have cached audio for this text
    const audioCol = await paragraphAudioCollection()
    const cachedAudio = await audioCol.findOne({ textHash })
    
    if (cachedAudio) {
      console.log("Using cached paragraph audio for hash:", textHash.substring(0, 8))
      return cachedAudio.audio
    }
    
    // Generate new audio
    const client = getTTSClient()
    
    const request = {
      input: { text },
      voice: {
        languageCode: 'fr-FR',
        name: 'fr-FR-Neural2-A',
        ssmlGender: 'FEMALE' as const,
      },
      audioConfig: {
        audioEncoding: 'MP3' as const,
        speakingRate: 1.0,
        pitch: 0,
        volumeGainDb: 0,
      },
    }

    const [response] = await client.synthesizeSpeech(request)
    
    if (!response.audioContent) {
      throw new Error("No audio content received from TTS service")
    }

    const audioData = {
      mimeType: 'audio/mpeg',
      dataBase64: Buffer.from(response.audioContent).toString('base64')
    }
    
    // Cache the generated audio
    try {
      const audioDoc: ParagraphAudioDoc = {
        textHash,
        text: text.trim(),
        audio: audioData,
        createdAt: new Date()
      }
      
      await audioCol.insertOne(audioDoc)
      console.log("Cached new paragraph audio for hash:", textHash.substring(0, 8))
    } catch (cacheError) {
      // If caching fails, still return the audio (maybe duplicate key error)
      console.warn("Failed to cache paragraph audio:", cacheError)
    }

    return audioData
  } catch (error) {
    console.warn("TTS generation failed:", error)
    return null
  }
}

export async function POST(req: NextRequest) {
  try {
    const { prompt, level, imageStyle, generateTTS } = await req.json()
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
    const audioErrors: string[] = []

    for (let i = 0; i < story.paragraphs.length; i++) {
      const p = story.paragraphs[i]
      let img = undefined
      let audio = undefined
      
      // Generate image
      try {
        img = await generateImageForParagraph({ paragraph: p, fullStory: fullText, imageStyle })
      } catch (err) {
        const imgError = err instanceof GenerationError ? err : classifyError(err)
        console.warn(`Image generation failed for paragraph ${i}:`, imgError)
        imageErrors.push(`Paragraph ${i + 1}: ${imgError.message}`)
      }
      
      // Generate TTS if requested
      if (generateTTS) {
        try {
          audio = await generateTTSForText(p)
          if (!audio) {
            audioErrors.push(`Paragraph ${i + 1}: TTS generation failed`)
          }
        } catch (err) {
          console.warn(`TTS generation failed for paragraph ${i}:`, err)
          audioErrors.push(`Paragraph ${i + 1}: ${err instanceof Error ? err.message : 'TTS generation failed'}`)
        }
      }
      
      paragraphsWithImages.push({ 
        index: i, 
        text: p, 
        image: img,
        audio: audio
      })
    }

    const doc: StoryDoc = {
      prompt: String(prompt),
      level: String(level),
      imageStyle: imageStyle ? String(imageStyle) : undefined,
      title: story.title,
      fullText,
      paragraphs: paragraphsWithImages,
      imageErrors: imageErrors.length > 0 ? imageErrors : undefined,
      audioErrors: audioErrors.length > 0 ? audioErrors : undefined,
      hasTTS: generateTTS,
      createdAt: new Date(),
    }

    try {
      const col = await storiesCollection()
      const res = await col.insertOne(doc as any)

      const response: any = { id: String(res.insertedId) }
      const totalErrors = imageErrors.length + audioErrors.length
      if (totalErrors > 0) {
        const warnings = []
        if (imageErrors.length > 0) {
          response.imageErrors = imageErrors
          warnings.push(`${imageErrors.length} image(s) failed to generate`)
        }
        if (audioErrors.length > 0) {
          response.audioErrors = audioErrors
          warnings.push(`${audioErrors.length} audio clip(s) failed to generate`)
        }
        response.warning = `Story created successfully, but ${warnings.join(' and ')}`
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
