"use client"

import { useEffect, useState } from "react"

export default function BananaCounter() {
  const [count, setCount] = useState<number>(0)

  async function refresh() {
    try {
      const res = await fetch("/api/words", { cache: "no-store" })
      if (!res.ok) return
      const words: Array<{ word: string; level: number }> = await res.json()
      const mastered = words.filter((w) => w.level === 5).length
      setCount(mastered)
    } catch (_) {
      // ignore
    }
  }

  useEffect(() => {
    refresh()
    const handler = () => refresh()
    window.addEventListener("word-levels-updated", handler as any)
    return () => window.removeEventListener("word-levels-updated", handler as any)
  }, [])

  if (count <= 0) return null

  return (
    <div
      aria-label="Mastered words"
      className="fixed bottom-4 right-4 z-50 select-none rounded-full bg-accent text-accent-foreground shadow-lg px-4 py-2 text-sm font-semibold flex items-center gap-2"
    >
      <span role="img" aria-hidden>
        🍌
      </span>
      <span>{count}</span>
    </div>
  )
}

