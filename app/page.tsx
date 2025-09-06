"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import { Clock, BookOpen } from "lucide-react"

// Mock past conversations data
const mockPastConversations = [
  {
    id: 1,
    title: "A story about a cat who loves to travel",
    level: "A2",
    date: "2 hours ago",
    progress: "2/3 paragraphs read",
  },
  {
    id: 2,
    title: "Adventures in a magical forest",
    level: "B1",
    date: "Yesterday",
    progress: "Completed",
  },
  {
    id: 3,
    title: "A chef discovering new recipes",
    level: "A2",
    date: "3 days ago",
    progress: "1/4 paragraphs read",
  },
  {
    id: 4,
    title: "Mystery at the old library",
    level: "B2",
    date: "1 week ago",
    progress: "Completed",
  },
  {
    id: 5,
    title: "Learning to dance in Paris",
    level: "A1",
    date: "2 weeks ago",
    progress: "3/5 paragraphs read",
  },
]

export default function HomePage() {
  const [prompt, setPrompt] = useState("")
  const [level, setLevel] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)
  const router = useRouter()

  const handleGenerate = async () => {
    if (!prompt.trim() || !level) return

    setIsGenerating(true)

    // Simulate generation delay
    setTimeout(() => {
      setIsGenerating(false)
      router.push(`/story?level=${level}&prompt=${encodeURIComponent(prompt)}`)
    }, 2000)
  }

  const handleReopenStory = (conversationId: number) => {
    // In a real app, this would load the specific conversation
    router.push(`/story?level=A2&prompt=mock-story-${conversationId}`)
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="flex flex-col items-center justify-center p-4 min-h-screen">
        <div className="text-center mb-12">
          <div className="text-6xl mb-4">🍌</div>
          <h1 className="text-4xl font-serif font-bold text-foreground mb-2">BananaLanguage</h1>
          <p className="text-muted-foreground">AI stories for language learning • Powered by Nano Banana</p>
          <p className="text-sm text-muted-foreground mt-1">Currently supports French language</p>
        </div>

        <div className="w-full max-w-2xl space-y-6">
          <div className="space-y-2">
            <label htmlFor="prompt" className="text-sm font-medium text-foreground">
              What story would you like to generate?
            </label>
            <Textarea
              id="prompt"
              placeholder="e.g., A story about a cat who loves to travel..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="min-h-[120px] resize-none border-2 border-border bg-card"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="level" className="text-sm font-medium text-foreground">
              Your language level
            </label>
            <Select value={level} onValueChange={setLevel}>
              <SelectTrigger className="border-2 border-border bg-card">
                <SelectValue placeholder="Select your CEFR level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="A1">A1 - Beginner</SelectItem>
                <SelectItem value="A2">A2 - Elementary</SelectItem>
                <SelectItem value="B1">B1 - Intermediate</SelectItem>
                <SelectItem value="B2">B2 - Upper Intermediate</SelectItem>
                <SelectItem value="C1">C1 - Advanced</SelectItem>
                <SelectItem value="C2">C2 - Proficient</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button
            onClick={handleGenerate}
            disabled={!prompt.trim() || !level || isGenerating}
            className="w-full bg-accent hover:bg-accent/90 text-accent-foreground py-6 text-lg"
          >
            {isGenerating ? "Generating your story..." : "Generate Story 🍌"}
          </Button>
        </div>
      </div>

      <div className="bg-muted/30 py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-serif font-bold text-foreground mb-2">Your Past Stories</h2>
            <p className="text-muted-foreground">Continue reading where you left off</p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {mockPastConversations.map((conversation) => (
              <Card
                key={conversation.id}
                className="hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => handleReopenStory(conversation.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <BookOpen className="h-5 w-5 text-accent mt-1" />
                    <span className="text-xs bg-accent/10 text-accent px-2 py-1 rounded-full">
                      {conversation.level}
                    </span>
                  </div>

                  <h3 className="font-medium text-foreground mb-2 line-clamp-2">{conversation.title}</h3>

                  <div className="space-y-2 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {conversation.date}
                    </div>
                    <div className="text-xs">Progress: {conversation.progress}</div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
