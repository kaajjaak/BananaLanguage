"use client"

export const dynamic = "force-dynamic"

import { useEffect, useMemo, useState, Suspense } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ChevronLeft, ChevronRight, X, Volume2 } from "lucide-react"
import { WarningDisplay } from "@/components/ui/error-display"
import { AudioPlayer } from "@/components/audio-player"

type StoryApi = {
  id: string
  title: string
  prompt: string
  level: string
  imageStyle?: string
  paragraphs: { 
    index: number; 
    text: string; 
    image?: { mimeType: string; dataBase64: string }
    audio?: { mimeType: string; dataBase64: string }
  }[]
  imageErrors?: string[]
  audioErrors?: string[]
  hasTTS?: boolean
}

type WordDefinition = { sentence: string; translation: string; definition: string }
type WordDoc = { word: string; level: number; definitions?: WordDefinition[] }

function KnowledgeLevelModal({
  word,
  currentLevel,
  definitions,
  paragraphText,
  onClose,
  onLevelChange,
  onWordDocUpdate,
}: {
  word: string
  currentLevel: number
  definitions: WordDefinition[]
  paragraphText: string
  onClose: () => void
  onLevelChange: (level: number) => void
  onWordDocUpdate: (doc: WordDoc) => void
}) {
  const [selectedLevel, setSelectedLevel] = useState(currentLevel)
  const [isAddingDef, setIsAddingDef] = useState(false)
  const [isLoadingAudio, setIsLoadingAudio] = useState(false)
  const [audioData, setAudioData] = useState<{ mimeType: string; dataBase64: string } | null>(null)

  useEffect(() => setSelectedLevel(currentLevel), [currentLevel])

  const knowledgeLevels = [
    { level: 0, emoji: "❓", label: "Never seen" },
    { level: 1, emoji: "😵", label: "Barely know" },
    { level: 2, emoji: "🤔", label: "Familiar" },
    { level: 3, emoji: "😊", label: "Know well" },
    { level: 4, emoji: "😎", label: "Confident" },
    { level: 5, emoji: "🎯", label: "Mastered" },
  ]

  const handleLevelSelect = async (level: number) => {
    setSelectedLevel(level)
    onLevelChange(level)
  }

  const playWordAudio = async () => {
    if (audioData) {
      // Play cached audio
      const audio = new Audio(`data:${audioData.mimeType};base64,${audioData.dataBase64}`)
      audio.play()
      return
    }

    setIsLoadingAudio(true)
    try {
      // First try to get cached audio
      const cacheResponse = await fetch(`/api/word-audio?word=${encodeURIComponent(word)}`)
      
      let audio
      if (cacheResponse.ok) {
        const cacheData = await cacheResponse.json()
        audio = cacheData.audio
      } else {
        // Generate new audio
        const generateResponse = await fetch('/api/word-audio', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ word })
        })
        
        if (!generateResponse.ok) {
          throw new Error('Failed to generate word audio')
        }
        
        const generateData = await generateResponse.json()
        audio = generateData.audio
      }

      setAudioData(audio)
      
      // Play the audio
      const audioElement = new Audio(`data:${audio.mimeType};base64,${audio.dataBase64}`)
      audioElement.play()
      
    } catch (error) {
      console.error('Failed to play word audio:', error)
    } finally {
      setIsLoadingAudio(false)
    }
  }

  const handleAddDefinition = async () => {
    if (isAddingDef) return
    setIsAddingDef(true)
    try {
      const res = await fetch("/api/definitions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ word, paragraph: paragraphText }),
      })
      if (res.ok) {
        const saved: WordDoc = await res.json()
        onWordDocUpdate(saved)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setIsAddingDef(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-2xl max-h-[80vh] overflow-y-auto">
        <CardContent className="p-6">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-3">
              <h3 className="text-xl font-semibold">"{word}"</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={playWordAudio}
                disabled={isLoadingAudio}
                className="flex items-center gap-2"
              >
                {isLoadingAudio ? (
                  <div className="animate-spin rounded-full h-3 w-3 border-b border-current" />
                ) : (
                  <Volume2 className="h-3 w-3" />
                )}
              </Button>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="mb-6">
            <p className="text-sm text-muted-foreground mb-3">How well do you know this word?</p>
            <div className="flex flex-wrap gap-2">
              {knowledgeLevels.map((l) => (
                <Button
                  key={l.level}
                  variant={selectedLevel === l.level ? "default" : "outline"}
                  size="sm"
                  className="flex-1 min-w-0"
                  onClick={() => handleLevelSelect(l.level)}
                >
                  <span className="text-base mr-1">{l.emoji}</span>
                  <span className="text-[10px] leading-none">{l.label}</span>
                </Button>
              ))}
            </div>
          </div>

          <div className="border-t pt-4">
            <h4 className="font-medium mb-3">Translations & Definitions</h4>
            <div className="space-y-3">
              {definitions.length === 0 && (
                <p className="text-sm text-muted-foreground">No entries yet.</p>
              )}
              {definitions.map((def, idx) => (
                <div key={idx} className="bg-muted/50 p-4 rounded">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm italic mb-1">"{def.sentence}"</p>
                      {def.translation ? (
                        <p className="text-sm font-medium">Translation: <span className="font-normal">{def.translation}</span></p>
                      ) : null}
                      {def.definition ? (
                        <p className="text-sm text-muted-foreground mt-0.5">Definition: {def.definition}</p>
                      ) : null}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={async () => {
                        try {
                          const res = await fetch("/api/definitions", {
                            method: "DELETE",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ word, sentence: def.sentence, translation: def.translation, definition: def.definition }),
                          })
                          if (res.ok) {
                            const saved: WordDoc = await res.json()
                            onWordDocUpdate(saved)
                          }
                        } catch (e) {
                          console.error(e)
                        }
                      }}
                      className="-mr-2 -mt-2"
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleAddDefinition}
              className="mt-3 w-full bg-transparent"
              disabled={isAddingDef}
            >
              {isAddingDef ? "Generating…" : "+ Add Translation & Definition (AI)"}
            </Button>
            <p className="text-xs text-muted-foreground mt-2">
              Adds a brief English translation and a definition in the context of the sentence and saves this word as "Barely know".
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function StoryView() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const [story, setStory] = useState<StoryApi | null>(null)
  const [currentParagraph, setCurrentParagraph] = useState(0)
  const [selectedWord, setSelectedWord] = useState<string | null>(null)
  const [wordLevels, setWordLevels] = useState<Record<string, { level: number; definitions: WordDefinition[] }>>({})
  const [showImageWarning, setShowImageWarning] = useState(true)

  const notifyLevelsUpdated = () => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("word-levels-updated"))
    }
  }

  useEffect(() => {
    const load = async () => {
      try {
        const [sRes, wRes] = await Promise.all([
          fetch(`/api/stories/${params.id}`, { cache: "no-store" }),
          fetch("/api/words", { cache: "no-store" }),
        ])
        if (sRes.ok) setStory(await sRes.json())
        if (wRes.ok) {
          const words: WordDoc[] = await wRes.json()
          const map: Record<string, { level: number; definitions: WordDefinition[] }> = {}
          for (const w of words) map[w.word.toLowerCase()] = { level: w.level, definitions: w.definitions || [] }
          setWordLevels(map)
        }
      } catch (e) {
        console.error(e)
      }
    }
    load()
  }, [params.id])

  const getWordColorClass = (knowledgeLevel: number) => {
    switch (knowledgeLevel) {
      case 0:
        return "bg-blue-100 text-blue-800 hover:bg-blue-200 cursor-pointer"
      case 1:
        return "bg-pink-400 text-pink-900 hover:bg-pink-500 cursor-pointer" // Barely know => darker
      case 2:
        return "bg-pink-300 text-pink-900 hover:bg-pink-400 cursor-pointer"
      case 3:
        return "bg-pink-200 text-pink-900 hover:bg-pink-300 cursor-pointer"
      case 4:
        return "bg-pink-100 text-pink-800 hover:bg-pink-200 cursor-pointer" // Confident => lighter
      case 5:
        return "text-foreground hover:bg-muted cursor-pointer"
      default:
        return "cursor-pointer hover:bg-muted"
    }
  }

  const current = useMemo(() => (story ? story.paragraphs[currentParagraph] : null), [story, currentParagraph])

  const renderTextWithHighlights = (text: string) => {
    return text.split(/(\s+|[.,!?;:])/).map((part, index) => {
      const cleanWord = part.replace(/[.,!?;:]/g, "").toLowerCase()
      const isWord = part.trim() && /^[\p{L}\p{M}]+(?:['’][\p{L}\p{M}]+)*$/u.test(cleanWord)
      if (isWord) {
        const level = wordLevels[cleanWord]?.level ?? 0 // unknown words default to 0 = blue
        return (
          <span
            key={index}
            className={`px-1 py-0.5 rounded transition-colors ${getWordColorClass(level)}`}
            onClick={() => setSelectedWord(part.replace(/[.,!?;:]/g, ""))}
          >
            {part}
          </span>
        )
      }
      return <span key={index}>{part}</span>
    })
  }

  const nextParagraph = async () => {
    if (!story || !current) return

    // Auto-master blue (level 0) words from current paragraph before moving on
    const tokens = current.text.split(/(\s+|[.,!?;:])/)
    const uniqueWords = new Set<string>()
    for (const part of tokens) {
      const cleanWord = part.replace(/[.,!?;:]/g, "").toLowerCase()
      if (cleanWord && /^[\p{L}\p{M}]+(?:['’][\p{L}\p{M}]+)*$/u.test(cleanWord)) uniqueWords.add(cleanWord)
    }
    const toMaster = Array.from(uniqueWords).filter((w) => (wordLevels[w]?.level ?? 0) === 0)

    if (toMaster.length) {
      try {
        await Promise.all(
          toMaster.map(async (w) => {
            const res = await fetch("/api/words", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ word: w, level: 5 }),
            })
            if (res.ok) {
              const saved: WordDoc = await res.json()
              setWordLevels((prev) => ({ ...prev, [saved.word.toLowerCase()]: { level: saved.level, definitions: saved.definitions || [] } }))
            } else {
              // update state optimistically even if request fails
              setWordLevels((prev) => ({ ...prev, [w]: { level: 5, definitions: prev[w]?.definitions || [] } }))
            }
          }),
        )
      } catch (e) {
        console.error(e)
      } finally {
        notifyLevelsUpdated()
      }
    }

    if (currentParagraph < story.paragraphs.length - 1) setCurrentParagraph((p) => p + 1)
  }
  const prevParagraph = () => {
    if (currentParagraph > 0) setCurrentParagraph((p) => p - 1)
  }

  const handleLevelChange = async (word: string, level: number) => {
    const w = word.toLowerCase()
    try {
      const res = await fetch("/api/words", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ word: w, level }),
      })
      if (res.ok) {
        const saved: WordDoc = await res.json()
        setWordLevels((prev) => ({
          ...prev,
          [w]: { level: saved.level, definitions: saved.definitions || [] },
        }))
      }
    } catch (e) {
      console.error(e)
    } finally {
      notifyLevelsUpdated()
    }
  }

  const handleWordDocUpdate = (doc: WordDoc) => {
    const w = doc.word.toLowerCase()
    setWordLevels((prev) => ({ ...prev, [w]: { level: doc.level, definitions: doc.definitions || [] } }))
  }

  if (!story || !current) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-4xl mx-auto">Loading…</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <Button variant="ghost" onClick={() => router.push("/")}>← Back to Home</Button>
          <div className="text-center">
            <h1 className="text-2xl font-serif font-bold">🍌 {story.title || "BananaLanguage"}</h1>
            <p className="text-sm text-muted-foreground">Level: {story.level}</p>
          </div>
          <div className="text-sm text-muted-foreground">
            {currentParagraph + 1} / {story.paragraphs.length}
          </div>
        </div>

        <Card className="mb-6">
          <CardContent className="p-8">
            <div className="grid md:grid-cols-2 gap-8 items-start">
              <div>
                {current.image ? (
                  <img
                    src={`data:${current.image.mimeType};base64,${current.image.dataBase64}`}
                    alt="Story illustration"
                    className="w-full h-64 object-cover rounded-lg mb-4"
                  />
                ) : (
                  <div className="w-full h-64 rounded-lg mb-4 bg-muted" />
                )}
              </div>
              <div>
                {/* Audio Player for Paragraph */}
                {current.audio && (
                  <div className="mb-4">
                    <AudioPlayer audioData={current.audio} />
                  </div>
                )}
                <p className="text-lg leading-relaxed">{renderTextWithHighlights(current.text)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Generation Warnings */}
        {((story.imageErrors && story.imageErrors.length > 0) || (story.audioErrors && story.audioErrors.length > 0)) && showImageWarning && (
          <div className="mb-6">
            <WarningDisplay
              message={(() => {
                const warnings = []
                if (story.imageErrors && story.imageErrors.length > 0) {
                  warnings.push(`${story.imageErrors.length} image(s) failed to generate`)
                }
                if (story.audioErrors && story.audioErrors.length > 0) {
                  warnings.push(`${story.audioErrors.length} audio clip(s) failed to generate`)
                }
                return `Some content failed to generate: ${warnings.join(' and ')}`
              })()}
              details={[...(story.imageErrors || []), ...(story.audioErrors || [])]}
              onDismiss={() => setShowImageWarning(false)}
            />
          </div>
        )}

        <div className="flex justify-between items-center">
          <Button variant="outline" onClick={prevParagraph} disabled={currentParagraph === 0}>
            <ChevronLeft className="h-4 w-4 mr-2" />
            Previous
          </Button>

          <div className="text-sm text-muted-foreground text-center">
            <div>Click on any word to set your knowledge level</div>
            <div className="flex items-center gap-2 mt-1 justify-center text-xs">
              <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">❓ New</span>
              <span className="bg-pink-200 text-pink-900 px-2 py-1 rounded">🤔 Learning</span>
              <span className="text-foreground px-2 py-1 rounded border">🎯 Mastered</span>
            </div>
          </div>

          <Button variant="outline" onClick={nextParagraph} disabled={currentParagraph === story.paragraphs.length - 1}>
            Next
            <ChevronRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </div>

      {selectedWord && story && (
        <KnowledgeLevelModal
          word={selectedWord}
          currentLevel={wordLevels[selectedWord.toLowerCase()]?.level ?? 0}
          definitions={wordLevels[selectedWord.toLowerCase()]?.definitions || []}
          paragraphText={story.paragraphs[currentParagraph].text}
          onClose={() => setSelectedWord(null)}
          onLevelChange={(lvl) => handleLevelChange(selectedWord, lvl)}
          onWordDocUpdate={handleWordDocUpdate}
        />
      )}
    </div>
  )
}

export default function StoryPage() {
  return (
    <Suspense fallback={<div>Loading…</div>}>
      <StoryView />
    </Suspense>
  )
}
