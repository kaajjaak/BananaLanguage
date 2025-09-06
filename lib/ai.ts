import { GoogleGenAI } from "@google/genai"

const apiKey = process.env.GOOGLE_API_KEY

if (!apiKey) {
  console.warn("[ai] GOOGLE_API_KEY is not set. AI generation will fail until configured.")
}

// Prefer explicit apiKey when available; SDK may also read env
const ai = new GoogleGenAI(apiKey ? { apiKey } : ({} as any))

export type GeneratedStory = {
  title: string
  paragraphs: string[]
}

export async function generateStoryText(userPrompt: string, level: string): Promise<GeneratedStory> {
  const instructions = `Vous êtes un·e tuteur·rice de langue et auteur·rice expert·e.
Rédige une courte histoire STRICTEMENT au niveau CECR ${level} en FRANÇAIS UNIQUEMENT. N'utilise pas de vocabulaire ni de grammaire au-dessus du niveau ${level}.
Retourne 4 à 7 très courts paragraphes (2 à 4 phrases simples chacun). Chaque paragraphe doit exprimer une idée/étape distincte de l'histoire.
Sors UNIQUEMENT du JSON compact au format: { "title": string, "paragraphs": string[] } sans texte supplémentaire.`

  const fullPrompt = `${instructions}\n\nSujet de l'utilisateur: ${userPrompt}`

  const resp = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: fullPrompt,
  })

  const text = (resp as any).text ?? ""
  // Try to parse JSON from response
  try {
    const firstBrace = text.indexOf("{")
    const lastBrace = text.lastIndexOf("}")
    const jsonStr = firstBrace >= 0 && lastBrace >= 0 ? text.slice(firstBrace, lastBrace + 1) : text
    const parsed = JSON.parse(jsonStr)
    const title: string = typeof parsed.title === "string" ? parsed.title : "Sans titre"
    const paragraphs: string[] = Array.isArray(parsed.paragraphs) ? parsed.paragraphs.map((p: any) => String(p)) : []
    if (paragraphs.length > 0) return { title, paragraphs }
  } catch (_) {
    // fall through to splitting
  }
  // Fallback: split by double newlines
  const parts = text
    .split(/\n\n+/)
    .map((s: string) => s.replace(/^\s*\d+\.?|\s*$/g, "").trim())
    .filter(Boolean)
  return { title: "Sans titre", paragraphs: parts.slice(0, 6) }
}

export async function generateImageForParagraph(params: {
  paragraph: string
  fullStory: string
  imageStyle?: string
}): Promise<{ mimeType: string; dataBase64: string }> {
  const { paragraph, fullStory, imageStyle } = params

  const imagePrompt = `Create a single illustrative image for the following paragraph of a story.\n
- Use the paragraph as the primary visual guidance.\n- You may use the overall story context for consistency, but DO NOT include spoilers for paragraphs not yet read.\n- Keep the composition clear and focused on this paragraph's main idea.\n${imageStyle ? `- Apply this visual style preference: ${imageStyle}.` : ""}\n
Paragraph (French text):\n${paragraph}\n\nStory context (for consistency only, avoid spoilers):\n${fullStory}`

  const resp = await ai.models.generateContent({
    model: "gemini-2.5-flash-image-preview",
    contents: imagePrompt,
  })

  // Walk candidates to find inline image data
  const candidates = (resp as any).candidates || []
  for (const c of candidates) {
    const parts = c?.content?.parts || []
    for (const part of parts) {
      if (part?.inlineData?.data) {
        const data: string = part.inlineData.data
        const mimeType: string = part.inlineData.mimeType || "image/png"
        return { mimeType, dataBase64: data }
      }
    }
  }
  // If no image returned, throw an error to let caller handle
  throw new Error("No image data returned from model")
}

export async function generateContextualDefinition(
  word: string,
  sentence: string,
): Promise<{ translation: string; definition: string }> {
  const prompt = `For the target word used in this specific French sentence, return a very brief English translation of the word in context and a concise English definition (10–25 words). Output ONLY compact JSON: { "translation": string, "definition": string }.

Target word: ${word}
French sentence: ${sentence}`

  const resp = await ai.models.generateContent({ model: "gemini-2.5-flash", contents: prompt })
  const text = (resp as any).text?.trim() || ""
  // Try JSON parse
  try {
    const first = text.indexOf("{")
    const last = text.lastIndexOf("}")
    const jsonStr = first >= 0 && last >= 0 ? text.slice(first, last + 1) : text
    const parsed = JSON.parse(jsonStr)
    const translation = String(parsed.translation || "").trim()
    const definition = String(parsed.definition || "").trim()
    if (translation || definition) return { translation, definition }
  } catch (_) {
    // fallback below
  }
  // Fallback: attempt to split lines like "translation - definition" or first line/second line
  const lines = text.split(/\n+/).map((l) => l.trim()).filter(Boolean)
  if (lines.length >= 2) return { translation: lines[0], definition: lines.slice(1).join(" ") }
  if (lines.length === 1) return { translation: lines[0], definition: "" }
  return { translation: "", definition: "" }
}
