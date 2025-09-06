"use client"

export const dynamic = "force-dynamic"

import { useEffect, useMemo, useState, Suspense } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ChevronLeft, ChevronRight, X } from "lucide-react"
import { Input } from "@/components/ui/input"

type StoryApi = {
  id: string
  title: string
  prompt: string
  level: string
  imageStyle?: string
  paragraphs: { index: number; text: string; image?: { mimeType: string; dataBase64: string } }[]
}

type WordDoc = { word: string; level: number; definitions?: string[] }

function KnowledgeLevelModal({
  word,
  currentLevel,
  definitions,
  onClose,
  onLevelChange,
  onAddDefinition,
}: {
  word: string
  currentLevel: number
  definitions: string[]
  onClose: () => void
  onLevelChange: (level: number) => void
  onAddDefinition: (def: string) => void
}) {
  const [selectedLevel, setSelectedLevel] = useState(currentLevel)
  const [newDef, setNewDef] = useState("")

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

  const handleAddDef = async () => {
    const def = newDef.trim()
    if (!def) return
    onAddDefinition(def)
    setNewDef("")
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-2xl max-h-[80vh] overflow-y-auto">
        <CardContent className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-semibold">"{word}"</h3>
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
                  <span className="text-lg mr-1">{l.emoji}</span>
                  <span className="text-xs">{l.label}</span>
                </Button>
              ))}
            </div>
          </div>

          <div className="border-t pt-4">
            <h4 className="font-medium mb-3">Definitions</h4>
            <div className="space-y-2 mb-3">
              {definitions.length === 0 && (
                <p className="text-sm text-muted-foreground">No definitions yet.</p>
              )}
              {definitions.map((def, idx) => (
                <div key={idx} className="bg-muted/50 p-3 rounded text-sm">
                  {def}
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={newDef}
                onChange={(e) => setNewDef(e.target.value)}
                placeholder="Add a definition or note"
              />
              <Button variant="outline" onClick={handleAddDef}>
                + Add Definition
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Adding a definition will store this word at the lowest level if it's not in your database yet.
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
  const [wordLevels, setWordLevels] = useState<Record<string, { level: number; definitions: string[] }>>({})

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
          const map: Record<string, { level: number; definitions: string[] }> = {}
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
        return "bg-pink-100 text-pink-800 hover:bg-pink-200 cursor-pointer"
      case 2:
        return "bg-pink-200 text-pink-900 hover:bg-pink-300 cursor-pointer"
      case 3:
        return "bg-pink-300 text-pink-900 hover:bg-pink-400 cursor-pointer"
      case 4:
        return "bg-pink-400 text-pink-900 hover:bg-pink-500 cursor-pointer"
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
      const isWord = part.trim() && /^[\p{L}\p{M}]+$/u.test(cleanWord)
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

  const nextParagraph = () => {
    if (!story) return
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
    }
  }

  const handleAddDefinition = async (word: string, def: string) => {
    const w = word.toLowerCase()
    try {
      const res = await fetch("/api/words", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ word: w, level: 0, definition: def }),
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
    }
  }

  if (!story || !current) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-4xl mx-auto">Loading…</div>
      </div>
    )
  }

  const selWord = selectedWord?.toLowerCase()
  const selLevel = selWord ? wordLevels[selWord]?.level ?? 0 : 0
  const selDefs = selWord ? wordLevels[selWord]?.definitions ?? [] : []

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
                <p className="text-lg leading-relaxed">{renderTextWithHighlights(current.text)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

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

      {selectedWord && (
        <KnowledgeLevelModal
          word={selectedWord}
          currentLevel={selLevel}
          definitions={selDefs}
          onClose={() => setSelectedWord(null)}
          onLevelChange={(lvl) => handleLevelChange(selectedWord, lvl)}
          onAddDefinition={(def) => handleAddDefinition(selectedWord, def)}
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
