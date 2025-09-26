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
  const animationFrameRef = useRef<number>()

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const updateTime = () => {
      const current = audio.currentTime || 0
      const dur = audio.duration
      
      setCurrentTime(current)
      
      // Only update progress if duration is valid
      if (dur && isFinite(dur) && dur > 0) {
        setProgress((current / dur) * 100)
      } else {
        setProgress(0)
      }
    }

    const updateDuration = () => {
      const dur = audio.duration
      // Only set duration if it's a valid finite number
      if (dur && isFinite(dur) && dur > 0) {
        setDuration(dur)
      } else {
        setDuration(0)
      }
    }

    const handleEnded = () => {
      setIsPlaying(false)
      setProgress(0)
      setCurrentTime(0)
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }

    // Smooth animation loop for progress updates
    const animateProgress = () => {
      if (audio && !audio.paused && !audio.ended) {
        updateTime()
        animationFrameRef.current = requestAnimationFrame(animateProgress)
      }
    }

    const handlePlay = () => {
      setIsPlaying(true)
      animateProgress()
    }

    const handlePause = () => {
      setIsPlaying(false)
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }

    audio.addEventListener('timeupdate', updateTime)
    audio.addEventListener('loadedmetadata', updateDuration)
    audio.addEventListener('loadeddata', updateDuration)
    audio.addEventListener('canplay', updateDuration)
    audio.addEventListener('ended', handleEnded)
    audio.addEventListener('play', handlePlay)
    audio.addEventListener('pause', handlePause)

    return () => {
      audio.removeEventListener('timeupdate', updateTime)
      audio.removeEventListener('loadedmetadata', updateDuration)
      audio.removeEventListener('loadeddata', updateDuration)
      audio.removeEventListener('canplay', updateDuration)
      audio.removeEventListener('ended', handleEnded)
      audio.removeEventListener('play', handlePlay)
      audio.removeEventListener('pause', handlePause)
      
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
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
    if (!audio || !duration || !isFinite(duration) || duration <= 0) return

    const rect = e.currentTarget.getBoundingClientRect()
    const clickX = e.clientX - rect.left
    const width = rect.width
    const clickProgress = Math.max(0, Math.min(100, (clickX / width) * 100))
    const newTime = (clickProgress / 100) * duration

    // Temporarily disable smooth animation during seek
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
    }

    audio.currentTime = newTime
    setProgress(clickProgress)
    setCurrentTime(newTime)

    // Restart smooth animation if playing
    if (!audio.paused && !audio.ended) {
      const animateProgress = () => {
        if (audio && !audio.paused && !audio.ended) {
          const current = audio.currentTime || 0
          const dur = audio.duration
          
          setCurrentTime(current)
          
          if (dur && isFinite(dur) && dur > 0) {
            setProgress((current / dur) * 100)
          }
          
          animationFrameRef.current = requestAnimationFrame(animateProgress)
        }
      }
      animateProgress()
    }
  }

  const formatTime = (time: number) => {
    // Handle invalid time values
    if (!isFinite(time) || time < 0) {
      return "0:00"
    }
    
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
          className="flex-1 cursor-pointer group"
          onClick={handleProgressClick}
        >
          <Progress 
            value={progress} 
            className="h-2 group-hover:h-3 transition-all duration-200 [&>div]:transition-transform [&>div]:duration-75 [&>div]:ease-linear" 
          />
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