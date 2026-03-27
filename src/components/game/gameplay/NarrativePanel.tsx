"use client"

import { useRef, useEffect } from "react"
import NarrativeText from "../shared/NarrativeText"

interface Props {
  narratives: string[]
}

export default function NarrativePanel({ narratives }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      setTimeout(() => {
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" })
      }, 100)
    }
  }, [narratives.length])

  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 scroll-smooth">
      {narratives.map((text, i) => (
        <div key={i} className="mb-4 animate-[fadeSlideUp_0.4s_ease]">
          <NarrativeText text={text} />
        </div>
      ))}
    </div>
  )
}
