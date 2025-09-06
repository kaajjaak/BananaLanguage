"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import { Clock, BookOpen } from "lucide-react"

export default function HomePage() {
  const [prompt, setPrompt] = useState("")
  const [level, setLevel] = useState("")
  const [imageStyle, setImageStyle] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)
  const [stories, setStories] = useState<Array<{ id: string; title: string; level: string; createdAt: string }>>([])
  const router = useRouter()

  useEffect(() => {
    const loadStories = async () => {
      try {
        const res = await fetch("/api/stories", { cache: "no-store" })
        if (res.ok) {
          const data = await res.json()
          setStories(
            data.map((d: any) => ({
              id: d.id,
              title: d.title,
              level: d.level,
              createdAt: d.createdAt,
            })),
          )
        }
      } catch (_) {
        // ignore
      }
    }
    loadStories()
  }, [])

  const handleGenerate = async () => {
    if (!prompt.trim() || !level) return

    setIsGenerating(true)
    try {
      const res = await fetch("/api/generate-story", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, level, imageStyle: imageStyle.trim() || undefined }),
      })
      if (!res.ok) throw new Error(await res.text())
      const data = await res.json()
      router.push(`/story/${data.id}`)
    } catch (e) {
      console.error("Failed to generate story", e)
      setIsGenerating(false)
    }
  }

  const handleReopenStory = (id: string) => {
    router.push(`/story/${id}`)
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

          <div className="space-y-2">
            <label htmlFor="imageStyle" className="text-sm font-medium text-foreground">
              Optional image style
            </label>
            <Input
              id="imageStyle"
              placeholder="e.g., watercolor, cyberpunk, hand-drawn sketch"
              value={imageStyle}
              onChange={(e) => setImageStyle(e.target.value)}
              className="border-2 border-border bg-card"
            />
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
            {stories.map((conversation) => (
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
                      {new Date(conversation.createdAt).toLocaleString()}
                    </div>
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
