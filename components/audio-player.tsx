"use client"

import React, { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Play, Pause, Volume2 } from "lucide-react"

interface AudioPlayerProps {
  audioData: {
    mimeType: string
    dataBase64: string
  }
  className?: string
}

export function AudioPlayer({ audioData, className = "" }: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [duration, setDuration] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const audioRef = useRef<HTMLAudioElement>(null)

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const updateTime = () => {
      setCurrentTime(audio.currentTime)
      setProgress((audio.currentTime / audio.duration) * 100)
    }

    const updateDuration = () => {
      setDuration(audio.duration)
    }

    const handleEnded = () => {
      setIsPlaying(false)
      setProgress(0)
      setCurrentTime(0)
    }

    audio.addEventListener('timeupdate', updateTime)
    audio.addEventListener('loadedmetadata', updateDuration)
    audio.addEventListener('ended', handleEnded)

    return () => {
      audio.removeEventListener('timeupdate', updateTime)
      audio.removeEventListener('loadedmetadata', updateDuration)
      audio.removeEventListener('ended', handleEnded)
    }
  }, [])

  const togglePlayPause = () => {
    const audio = audioRef.current
    if (!audio) return

    if (isPlaying) {
      audio.pause()
    } else {
      audio.play()
    }
    setIsPlaying(!isPlaying)
  }

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current
    if (!audio) return

    const rect = e.currentTarget.getBoundingClientRect()
    const clickX = e.clientX - rect.left
    const width = rect.width
    const clickProgress = (clickX / width) * 100
    const newTime = (clickProgress / 100) * duration

    audio.currentTime = newTime
    setProgress(clickProgress)
    setCurrentTime(newTime)
  }

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60)
    const seconds = Math.floor(time % 60)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  return (
    <div className={`flex items-center gap-3 p-3 bg-muted/30 rounded-lg ${className}`}>
      <audio
        ref={audioRef}
        src={`data:${audioData.mimeType};base64,${audioData.dataBase64}`}
        preload="metadata"
      />
      
      <Button
        variant="ghost"
        size="sm"
        onClick={togglePlayPause}
        className="h-8 w-8 p-0"
      >
        {isPlaying ? (
          <Pause className="h-4 w-4" />
        ) : (
          <Play className="h-4 w-4" />
        )}
      </Button>

      <div className="flex-1 flex items-center gap-2">
        <Volume2 className="h-4 w-4 text-muted-foreground" />
        <div 
          className="flex-1 cursor-pointer"
          onClick={handleProgressClick}
        >
          <Progress value={progress} className="h-2" />
        </div>
        <span className="text-xs text-muted-foreground min-w-[40px]">
          {formatTime(currentTime)} / {formatTime(duration || 0)}
        </span>
      </div>
    </div>
  )
}

interface WordMenuProps {
  word: string
  children: React.ReactNode
}

export function WordMenu({ word, children }: WordMenuProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [audioData, setAudioData] = useState<{ mimeType: string; dataBase64: string } | null>(null)
  const audioRef = useRef<HTMLAudioElement>(null)

  const playWordAudio = async () => {
    if (audioData) {
      // Play cached audio
      const audio = audioRef.current
      if (audio) {
        audio.currentTime = 0
        audio.play()
      }
      return
    }

    setIsLoading(true)
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
      setTimeout(() => {
        const audioElement = audioRef.current
        if (audioElement) {
          audioElement.play()
        }
      }, 100)
      
    } catch (error) {
      console.error('Failed to play word audio:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      <Popover>
        <PopoverTrigger asChild>
          <span className="cursor-pointer hover:bg-accent/20 rounded px-1 transition-colors">
            {children}
          </span>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-2" side="top">
          <div className="flex flex-col gap-2">
            <div className="text-sm font-medium">{word}</div>
            <Button
              variant="outline"
              size="sm"
              onClick={playWordAudio}
              disabled={isLoading}
              className="flex items-center gap-2"
            >
              {isLoading ? (
                <div className="animate-spin rounded-full h-3 w-3 border-b border-current" />
              ) : (
                <Volume2 className="h-3 w-3" />
              )}
              Hear pronunciation
            </Button>
          </div>
        </PopoverContent>
      </Popover>
      
      {audioData && (
        <audio
          ref={audioRef}
          src={`data:${audioData.mimeType};base64,${audioData.dataBase64}`}
          preload="metadata"
        />
      )}
    </>
  )
}