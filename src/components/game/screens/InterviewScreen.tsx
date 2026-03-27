"use client"

import { useCallback } from "react"
import { useGameStore } from "@/store/game"
import { useTranscriptStore } from "@/store/transcript"
import * as api from "@/lib/gameApi"
import InterviewProgress from "../interview/InterviewProgress"
import AriaMessage from "../interview/AriaMessage"
import MirrorBubble from "../interview/MirrorBubble"
import ConversationTrail from "../interview/ConversationTrail"
import InterviewInput from "../interview/InterviewInput"

export default function InterviewScreen() {
  const {
    userId, currentQuestion, interviewProgress, mirrorData, conversationTrail,
    setQuestion, setProgress, setMirrorData, addToTrail, setScreen, setGameConfig,
  } = useGameStore()
  const log = useTranscriptStore((s) => s.log)

  const handleAnswer = useCallback(async (answer: string) => {
    if (currentQuestion) addToTrail(currentQuestion.text, answer)
    log("user", answer, { input_method: "typed" })

    try {
      const data = await api.submitAnswer(userId, answer)

      if (data.status === "complete" && data.synthesis) {
        setScreen("generating")
        log("system", "Interview complete — generating world")
        const config = await api.generateGame(userId, data.synthesis)
        setGameConfig(config)
        log("system", `Game generated: "${config.title}"`)
        const action = await api.playStart(userId)
        useGameStore.getState().handleGameAction(action)
        setScreen("game")
        return
      }

      if (data.status === "mirror_bubble" && data.mirror_bubble) {
        setMirrorData({ bubble: data.mirror_bubble, nextQuestion: data.next_question })
        log("system", `Mirror moment: ${data.mirror_bubble.reflection}`, { therapeutic: true })
      }

      if (data.question) setQuestion(data.question)
      if (data.progress) setProgress(data.progress)
    } catch {
      setQuestion({ text: "Something went wrong. Try again.", phase: "error", has_exit_ramp: false })
    }
  }, [userId, currentQuestion, addToTrail, setQuestion, setProgress, setMirrorData, setScreen, setGameConfig, log])

  const handleMirrorClose = useCallback(() => {
    if (mirrorData?.nextQuestion) {
      setQuestion(mirrorData.nextQuestion)
    }
    setMirrorData(null)
  }, [mirrorData, setQuestion, setMirrorData])

  const handleMirrorExpand = useCallback(async () => {
    setMirrorData(null)
    try { await api.expandMirror(userId) } catch {}
  }, [userId, setMirrorData])

  const handleExitRamp = useCallback(() => {
    if (currentQuestion?.exit_ramp) {
      handleAnswer(currentQuestion.exit_ramp)
    }
  }, [currentQuestion, handleAnswer])

  return (
    <div className="flex flex-col h-full bg-[var(--bg-deep,#0a0a0f)]">
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.04] shrink-0">
        <span className="font-serif text-xl text-[var(--gold,#c9a84c)]">Aria</span>
        <InterviewProgress progress={interviewProgress} />
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 scroll-smooth">
        <AriaMessage question={currentQuestion} />
        <MirrorBubble data={mirrorData} onClose={handleMirrorClose} onExpand={handleMirrorExpand} />
        <ConversationTrail trail={conversationTrail} />
      </div>

      <InterviewInput
        exitRamp={currentQuestion?.has_exit_ramp ? currentQuestion.exit_ramp : undefined}
        onSubmit={handleAnswer}
        onExitRamp={handleExitRamp}
      />
    </div>
  )
}
