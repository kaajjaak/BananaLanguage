"use client"

import type React from "react"

import { useState } from "react"
import { ArrowLeft, BookOpen, Globe, Sparkles, Wand2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import Link from "next/link"

const CEFR_LEVELS = [
  { value: "A1", label: "A1 - Beginner", description: "Basic phrases and simple sentences" },
  { value: "A2", label: "A2 - Elementary", description: "Simple conversations and familiar topics" },
  { value: "B1", label: "B1 - Intermediate", description: "Clear standard speech on familiar matters" },
  { value: "B2", label: "B2 - Upper Intermediate", description: "Complex text and abstract topics" },
  { value: "C1", label: "C1 - Advanced", description: "Flexible and effective language use" },
  { value: "C2", label: "C2 - Proficient", description: "Native-like fluency and precision" },
]

const LANGUAGES = [
  { value: "spanish", label: "Spanish" },
  { value: "french", label: "French" },
  { value: "german", label: "German" },
  { value: "italian", label: "Italian" },
  { value: "portuguese", label: "Portuguese" },
  { value: "japanese", label: "Japanese" },
  { value: "korean", label: "Korean" },
  { value: "chinese", label: "Chinese (Mandarin)" },
]

export default function CreateStoryPage() {
  const [prompt, setPrompt] = useState("")
  const [cefrLevel, setCefrLevel] = useState("")
  const [language, setLanguage] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!prompt.trim() || !cefrLevel || !language) return

    setIsGenerating(true)
    // TODO: Implement story generation logic
    setTimeout(() => {
      setIsGenerating(false)
      // Navigate to story display page
    }, 3000)
  }

  const isFormValid = prompt.trim() && cefrLevel && language

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="sm" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
            </Link>
            <div className="flex items-center gap-2">
              <BookOpen className="h-6 w-6 text-accent" />
              <h1 className="text-xl font-serif font-bold text-foreground">StoryLingo</h1>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="relative">
              <Wand2 className="h-12 w-12 text-accent" />
              <Sparkles className="absolute -top-1 -right-1 h-6 w-6 text-secondary animate-pulse" />
            </div>
          </div>
          <h1 className="text-3xl md:text-4xl font-serif font-bold text-foreground mb-4">Create Your Learning Story</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Tell us what kind of story you'd like to read, and we'll create a personalized tale with beautiful
            illustrations tailored to your language level.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Language Selection */}
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-serif">
                <Globe className="h-5 w-5 text-accent" />
                Target Language
              </CardTitle>
              <CardDescription>Which language are you learning?</CardDescription>
            </CardHeader>
            <CardContent>
              <Select value={language} onValueChange={setLanguage}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select your target language" />
                </SelectTrigger>
                <SelectContent>
                  {LANGUAGES.map((lang) => (
                    <SelectItem key={lang.value} value={lang.value}>
                      {lang.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* CEFR Level Selection */}
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-serif">
                <BookOpen className="h-5 w-5 text-accent" />
                Your Language Level
              </CardTitle>
              <CardDescription>
                Select your current level according to the Common European Framework of Reference for Languages (CEFR)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RadioGroup value={cefrLevel} onValueChange={setCefrLevel} className="space-y-3">
                {CEFR_LEVELS.map((level) => (
                  <div key={level.value} className="flex items-start space-x-3">
                    <RadioGroupItem value={level.value} id={level.value} className="mt-1" />
                    <div className="flex-1">
                      <Label htmlFor={level.value} className="font-medium cursor-pointer">
                        {level.label}
                      </Label>
                      <p className="text-sm text-muted-foreground mt-1">{level.description}</p>
                    </div>
                  </div>
                ))}
              </RadioGroup>
            </CardContent>
          </Card>

          {/* Story Prompt */}
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-serif">
                <Sparkles className="h-5 w-5 text-accent" />
                Story Prompt
              </CardTitle>
              <CardDescription>
                Describe the kind of story you'd like to read. Be creative! You can specify characters, settings,
                themes, or any elements you're interested in.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Textarea
                  placeholder="Example: A young chef discovers a magical cookbook in her grandmother's attic that brings recipes to life..."
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  className="min-h-32 resize-none"
                  maxLength={500}
                />
                <div className="flex justify-between items-center text-sm text-muted-foreground">
                  <span>Be as detailed or as simple as you like!</span>
                  <span>{prompt.length}/500</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Submit Button */}
          <div className="flex justify-center pt-4">
            <Button
              type="submit"
              size="lg"
              disabled={!isFormValid || isGenerating}
              className="text-lg px-8 py-6 bg-accent hover:bg-accent/90 text-accent-foreground min-w-48"
            >
              {isGenerating ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-accent-foreground mr-2" />
                  Creating Story...
                </>
              ) : (
                <>
                  Generate My Story
                  <Wand2 className="ml-2 h-5 w-5" />
                </>
              )}
            </Button>
          </div>
        </form>

        {/* Example Prompts */}
        <div className="mt-12 pt-8 border-t border-border">
          <h3 className="text-xl font-serif font-semibold text-center mb-6">Need Inspiration?</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <Card className="border-border bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors">
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground italic">
                  "A detective story set in a small Italian village where the main character must solve the mystery of
                  the missing pasta recipe."
                </p>
              </CardContent>
            </Card>
            <Card className="border-border bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors">
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground italic">
                  "An adventure about a student who finds a time machine in their school library and travels to
                  different historical periods."
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
