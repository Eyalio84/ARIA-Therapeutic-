"use client"

import { useEffect, useRef } from "react"
import { useChatStore } from "@/store/chat"
import type { ChatMessage } from "@/store/chat"

function Message({ msg }: { msg: ChatMessage }) {
  if (msg.role === "system") {
    return (
      <div className="flex justify-center my-2">
        <span className="text-[11px] text-zinc-600 font-mono px-3 py-1 rounded-full glass">
          {msg.text}
        </span>
      </div>
    )
  }

  const isUser = msg.role === "user"

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-3 px-4`}>
      {!isUser && (
        <div className="w-7 h-7 rounded-full bg-violet-500/20 border border-violet-500/30 flex items-center justify-center mr-2.5 mt-0.5 flex-shrink-0">
          <span className="text-violet-300 text-xs font-bold">A</span>
        </div>
      )}
      <div className={`max-w-[78%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
        isUser
          ? "bg-violet-500/20 border border-violet-500/25 text-zinc-100 rounded-br-sm"
          : "glass text-zinc-200 rounded-bl-sm"
      }`}>
        {msg.text}
      </div>
    </div>
  )
}

export function MessageThread() {
  const messages = useChatStore((s) => s.messages)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages.length])

  return (
    <div className="py-4 space-y-1 min-h-full flex flex-col justify-end">
      {messages.length === 0 && (
        <div className="flex-1 flex items-center justify-center py-16">
          <p className="text-zinc-700 text-sm">Tap the orb to begin.</p>
        </div>
      )}
      {messages.map((msg) => <Message key={msg.id} msg={msg} />)}
      <div ref={bottomRef} />
    </div>
  )
}
