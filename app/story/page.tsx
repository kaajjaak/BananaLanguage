"use client"

import { useState, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ChevronLeft, ChevronRight, X } from "lucide-react"

// Mock story data with words and their knowledge levels
const mockStoryParagraphs = [
  {
    id: 1,
    text: "Marie walked through the bustling market in Paris. The aroma of fresh bread filled the air as she searched for the perfect ingredients for dinner.",
    image: "/bustling-paris-market-scene.jpg",
    words: [
      { word: "Marie", knowledgeLevel: 5 },
      { word: "walked", knowledgeLevel: 5 },
      { word: "through", knowledgeLevel: 5 },
      { word: "bustling", knowledgeLevel: 2 },
      { word: "market", knowledgeLevel: 4 },
      { word: "Paris", knowledgeLevel: 5 },
      { word: "aroma", knowledgeLevel: 3 },
      { word: "fresh", knowledgeLevel: 5 },
      { word: "bread", knowledgeLevel: 5 },
      { word: "filled", knowledgeLevel: 5 },
      { word: "air", knowledgeLevel: 5 },
      { word: "searched", knowledgeLevel: 4 },
      { word: "perfect", knowledgeLevel: 5 },
      { word: "ingredients", knowledgeLevel: 0 },
      { word: "dinner", knowledgeLevel: 5 },
    ],
  },
  {
    id: 2,
    text: "She approached the vendor who was arranging colorful vegetables. His cheerful smile made her feel welcome in this unfamiliar neighborhood.",
    image: "/french-vegetable-vendor-with-colorful-produce.jpg",
    words: [
      { word: "She", knowledgeLevel: 5 },
      { word: "approached", knowledgeLevel: 3 },
      { word: "vendor", knowledgeLevel: 1 },
      { word: "arranging", knowledgeLevel: 2 },
      { word: "colorful", knowledgeLevel: 5 },
      { word: "vegetables", knowledgeLevel: 4 },
      { word: "cheerful", knowledgeLevel: 0 },
      { word: "smile", knowledgeLevel: 5 },
      { word: "made", knowledgeLevel: 5 },
      { word: "feel", knowledgeLevel: 5 },
      { word: "welcome", knowledgeLevel: 4 },
      { word: "unfamiliar", knowledgeLevel: 1 },
      { word: "neighborhood", knowledgeLevel: 3 },
    ],
  },
]

function KnowledgeLevelModal({
  word,
  currentLevel,
  onClose,
  onLevelChange,
}: {
  word: string
  currentLevel: number
  onClose: () => void
  onLevelChange: (level: number) => void
}) {
  const [selectedLevel, setSelectedLevel] = useState(currentLevel)
  const [definitions, setDefinitions] = useState([
    {
      id: 1,
      sentence: `The ${word.toLowerCase()} was very important in this context.`,
      definition: `A sample definition for "${word}" in English.`,
    },
  ])

  const knowledgeLevels = [
    { level: 0, emoji: "❓", label: "Never seen" },
    { level: 1, emoji: "😵", label: "Barely know" },
    { level: 2, emoji: "🤔", label: "Familiar" },
    { level: 3, emoji: "😊", label: "Know well" },
    { level: 4, emoji: "😎", label: "Confident" },
    { level: 5, emoji: "🎯", label: "Mastered" },
  ]

  const addDefinition = () => {
    const newDefinition = {
      id: Date.now(),
      sentence: `Another example sentence with ${word.toLowerCase()}.`,
      definition: `Another definition for "${word}" in this context.`,
    }
    setDefinitions([...definitions, newDefinition])
  }

  const removeDefinition = (id: number) => {
    setDefinitions(definitions.filter((def) => def.id !== id))
  }

  const handleLevelSelect = (level: number) => {
    setSelectedLevel(level)
    onLevelChange(level)
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
              {knowledgeLevels.map((level) => (
                <Button
                  key={level.level}
                  variant={selectedLevel === level.level ? "default" : "outline"}
                  size="sm"
                  className="flex-1 min-w-0"
                  onClick={() => handleLevelSelect(level.level)}
                >
                  <span className="text-lg mr-1">{level.emoji}</span>
                  <span className="text-xs">{level.label}</span>
                </Button>
              ))}
            </div>
          </div>

          <div className="border-t pt-4">
            <h4 className="font-medium mb-3">Definitions & Examples</h4>
            <div className="space-y-4">
              {definitions.map((def) => (
                <div key={def.id} className="bg-muted/50 p-4 rounded-lg">
                  <div className="flex justify-between items-start mb-2">
                    <p className="text-sm italic">"{def.sentence}"</p>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeDefinition(def.id)}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground">{def.definition}</p>
                </div>
              ))}
            </div>
            <Button variant="outline" size="sm" onClick={addDefinition} className="mt-3 w-full bg-transparent">
              + Add Definition
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function StoryContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [currentParagraph, setCurrentParagraph] = useState(0)
  const [selectedWord, setSelectedWord] = useState<string | null>(null)
  const [wordKnowledge, setWordKnowledge] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {}
    mockStoryParagraphs.forEach((paragraph) => {
      paragraph.words.forEach((wordObj) => {
        initial[wordObj.word.toLowerCase()] = wordObj.knowledgeLevel
      })
    })
    return initial
  })

  const level = searchParams.get("level")
  const paragraph = mockStoryParagraphs[currentParagraph]

  const getWordColorClass = (knowledgeLevel: number) => {
    switch (knowledgeLevel) {
      case 0:
        return "bg-blue-100 text-blue-800 hover:bg-blue-200 cursor-pointer" // Never seen
      case 1:
        return "bg-pink-100 text-pink-800 hover:bg-pink-200 cursor-pointer" // Barely know
      case 2:
        return "bg-pink-200 text-pink-900 hover:bg-pink-300 cursor-pointer" // Somewhat familiar
      case 3:
        return "bg-pink-300 text-pink-900 hover:bg-pink-400 cursor-pointer" // Know well
      case 4:
        return "bg-pink-400 text-pink-900 hover:bg-pink-500 cursor-pointer" // Very confident
      case 5:
        return "text-foreground hover:bg-muted cursor-pointer" // Completely mastered (white/normal)
      default:
        return "cursor-pointer hover:bg-muted"
    }
  }

  const renderTextWithHighlights = (text: string, words: any[]) => {
    const wordMap = new Map(words.map((w) => [w.word.toLowerCase(), w]))

    return text.split(/(\s+|[.,!?;:])/).map((part, index) => {
      const cleanWord = part.replace(/[.,!?;:]/g, "").toLowerCase()
      const wordObj = wordMap.get(cleanWord)

      if (part.trim() && /^[a-zA-Z]+$/.test(cleanWord)) {
        // If word is in our tracking list, use its knowledge level
        // If not, assume common words (like "the", "and") are mastered (level 5)
        const defaultLevel = [
          "the",
          "and",
          "or",
          "but",
          "in",
          "on",
          "at",
          "to",
          "for",
          "of",
          "with",
          "by",
          "from",
          "up",
          "about",
          "into",
          "over",
          "after",
          "a",
          "an",
          "as",
          "be",
          "have",
          "do",
          "say",
          "get",
          "make",
          "go",
          "know",
          "take",
          "see",
          "come",
          "think",
          "look",
          "want",
          "give",
          "use",
          "find",
          "tell",
          "ask",
          "work",
          "seem",
          "feel",
          "try",
          "leave",
          "call",
        ].includes(cleanWord)
          ? 5
          : 0
        const currentKnowledge = wordKnowledge[cleanWord] ?? (wordObj?.knowledgeLevel || defaultLevel)

        return (
          <span
            key={index}
            className={`px-1 py-0.5 rounded transition-colors ${getWordColorClass(currentKnowledge)}`}
            onClick={() => setSelectedWord(part.replace(/[.,!?;:]/g, ""))}
          >
            {part}
          </span>
        )
      }
      return <span key={index}>{part}</span>
    })
  }

  const handleKnowledgeChange = (word: string, level: number) => {
    setWordKnowledge((prev) => ({
      ...prev,
      [word.toLowerCase()]: level,
    }))
  }

  const nextParagraph = () => {
    if (currentParagraph < mockStoryParagraphs.length - 1) {
      setCurrentParagraph(currentParagraph + 1)
    }
  }

  const prevParagraph = () => {
    if (currentParagraph > 0) {
      setCurrentParagraph(currentParagraph - 1)
    }
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <Button variant="ghost" onClick={() => router.push("/")}>
            ← Back to Home
          </Button>
          <div className="text-center">
            <h1 className="text-2xl font-serif font-bold">🍌 BananaLanguage</h1>
            <p className="text-sm text-muted-foreground">Level: {level}</p>
          </div>
          <div className="text-sm text-muted-foreground">
            {currentParagraph + 1} / {mockStoryParagraphs.length}
          </div>
        </div>

        <Card className="mb-6">
          <CardContent className="p-8">
            <div className="grid md:grid-cols-2 gap-8 items-start">
              <div>
                <img
                  src={paragraph.image || "/placeholder.svg"}
                  alt="Story illustration"
                  className="w-full h-64 object-cover rounded-lg mb-4"
                />
              </div>
              <div>
                <p className="text-lg leading-relaxed">{renderTextWithHighlights(paragraph.text, paragraph.words)}</p>
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

          <Button
            variant="outline"
            onClick={nextParagraph}
            disabled={currentParagraph === mockStoryParagraphs.length - 1}
          >
            Next
            <ChevronRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </div>

      {selectedWord && (
        <KnowledgeLevelModal
          word={selectedWord}
          currentLevel={wordKnowledge[selectedWord.toLowerCase()] ?? 0}
          onClose={() => setSelectedWord(null)}
          onLevelChange={(level) => handleKnowledgeChange(selectedWord, level)}
        />
      )}
    </div>
  )
}

export default function StoryPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <StoryContent />
    </Suspense>
  )
}
