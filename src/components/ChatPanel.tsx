"use client"

import { useState } from "react"
import { TopBar } from "./TopBar"
import { MessageThread } from "./MessageThread"
import { VoiceOrb } from "./VoiceOrb"
import { ChatInput } from "./ChatInput"
import { ConfigDrawer } from "./ConfigDrawer"
import { SessionHistory } from "./SessionHistory"
import { SnapshotManager } from "./SnapshotManager"
import { useChatStore } from "@/store/chat"
import { aria, ariaResumeSession } from "@/lib/aria"
import type { SessionRow } from "@/lib/aria-core/state/sqliteSessionStore"

export function ChatPanel() {
  const [drawerOpen,   setDrawerOpen]   = useState(false)
  const [historyOpen,  setHistoryOpen]  = useState(false)
  const [snapshotOpen, setSnapshotOpen] = useState(false)
  const { addMessage } = useChatStore()

  const handleSendText = (text: string) => {
    aria.sendText(text)
    addMessage("user", text)
  }

  const handleSlashCommand = (cmd: string) => {
    if (cmd === "/snapshot") {
      setSnapshotOpen(true)
      return true
    }
    return false
  }

  const handleResumeSession = (session: SessionRow) => {
    void ariaResumeSession(session)
  }

  return (
    <>
      <TopBar
        onMenuOpen={() => setDrawerOpen(true)}
        onHistoryOpen={() => setHistoryOpen(true)}
      />

      <div className="flex-1 min-h-0 overflow-y-auto">
        <MessageThread />
      </div>

      <div
        className="flex-shrink-0 flex flex-col items-center gap-4 px-4 pt-4"
        style={{ paddingBottom: "max(1.5rem, env(safe-area-inset-bottom))" }}
      >
        {snapshotOpen && (
          <div className="w-full max-w-sm">
            <SnapshotManager onClose={() => setSnapshotOpen(false)} />
          </div>
        )}
        <VoiceOrb />
        <ChatInput onSendText={handleSendText} onSlashCommand={handleSlashCommand} />
      </div>

      <ConfigDrawer  open={drawerOpen}  onClose={() => setDrawerOpen(false)} />
      <SessionHistory
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        onResumeSession={handleResumeSession}
      />
    </>
  )
}
