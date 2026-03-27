"use client"

import { useState, useCallback, useEffect } from "react"
import { useGameStore } from "@/store/game"
import { useTranscriptStore } from "@/store/transcript"
import { gameAriaConnect, gameAriaDisconnect, gameUpdateContext, setNarrativeCallback, setUICallbacks, switchAriaMode } from "@/lib/gameAriaAdapter"
import { useAriaModeStore } from "@/store/ariaMode"
import { useGameThemeStore } from "@/store/gameTheme"
import * as api from "@/lib/gameApi"
import GameTopBar from "../gameplay/GameTopBar"
import GameMap from "../gameplay/GameMap"
import StatsBar from "../gameplay/StatsBar"
import NarrativePanel from "../gameplay/NarrativePanel"
import QuestChoices from "../gameplay/QuestChoices"
import ActionsBar from "../gameplay/ActionsBar"
import GameInput from "../gameplay/GameInput"
import RestOverlay from "../gameplay/RestOverlay"
import GameVoiceOrb from "../voice/GameVoiceOrb"
import VoiceStatus from "../voice/VoiceStatus"
import TranscriptScreen from "./TranscriptScreen"
import DevHub from "../devpanel/DevHub"
import BurgerMenu from "../menu/BurgerMenu"
import AriaPanel from "../menu/AriaPanel"
import GameDrawer from "../drawer/GameDrawer"
import DrawerHandle from "../drawer/DrawerHandle"
import DrawerSection from "../drawer/DrawerSection"
import DrawerMap from "../drawer/DrawerMap"
import DrawerInventory from "../drawer/DrawerInventory"
import DrawerQuests from "../drawer/DrawerQuests"
import DrawerCompanion from "../drawer/DrawerCompanion"
import { AchievementToast } from "../therapy/AchievementToast"
import { TherapistPauseBanner } from "../therapy/TherapistPauseBanner"
import { MoodCheckIn } from "../therapy/MoodCheckIn"

export default function GameScreen() {
  const {
    userId, gameConfig, playerStats, turnCount, mapNodes,
    currentChoices, availableActions, showRestOverlay,
    moodPrimary, handleGameAction, setRestOverlay, setScreen,
    narratives, addNarrative, setNarratives,
  } = useGameStore()
  const log = useTranscriptStore((s) => s.log)
  const toggleTranscript = useTranscriptStore((s) => s.toggle)
  const transcriptOpen = useTranscriptStore((s) => s.isOpen)
  const [devOpen, setDevOpen] = useState(false)
  const toggleDev = useCallback(() => setDevOpen((v) => !v), [])
  const [drawerOpen, setDrawerOpen] = useState(false)
  const toggleDrawer = useCallback(() => setDrawerOpen((v) => !v), [])
  const [burgerOpen, setBurgerOpen] = useState(false)
  const toggleBurger = useCallback(() => setBurgerOpen((v) => !v), [])
  const [ariaOpen, setAriaOpen] = useState(false)
  const toggleAria = useCallback(() => setAriaOpen((v) => !v), [])

  // Initialize narratives with starting narrative if empty
  useEffect(() => {
    if (gameConfig?.starting_narrative && narratives.length === 0) {
      addNarrative(gameConfig.starting_narrative)
    }
  }, [gameConfig])

  // ── Therapy component state ──
  const [pendingAchievement, setPendingAchievement] = useState<{ id: string; title: string; description: string } | null>(null)
  const [therapistPaused, setTherapistPaused] = useState(false)
  const [pauseMessage, setPauseMessage] = useState("")
  const [showMoodCheckIn, setShowMoodCheckIn] = useState<"start" | "end" | null>(() => {
    // Show mood check-in at session start if first load
    return "start"
  })

  // Poll therapist controls every 10 seconds
  useEffect(() => {
    if (!userId) return
    const poll = async () => {
      try {
        const res = await fetch(`/api/dashboard/user/${userId}/controls`)
        if (res.ok) {
          const data = await res.json()
          setTherapistPaused(data.paused === 1)
          setPauseMessage(data.pause_message || "")
        }
      } catch {}
    }
    poll()
    const interval = setInterval(poll, 10000)
    return () => clearInterval(interval)
  }, [userId])

  // Wire voice narrative callback
  useEffect(() => {
    setNarrativeCallback((text) => {
      if (text) addNarrative(text)
    })
    return () => setNarrativeCallback(() => {})
  }, [])

  // Wire UI callbacks for voice-controlled panels
  useEffect(() => {
    setUICallbacks({
      openDrawer: (section) => setDrawerOpen(true),
      closeDrawer: () => setDrawerOpen(false),
      openPanel: (panel) => {
        if (panel === "devhub") setDevOpen(true)
        else if (panel === "transcript") useTranscriptStore.getState().setOpen(true)
        else if (panel === "aria") setAriaOpen(true)
        else if (panel === "burger") setBurgerOpen(true)
      },
    })
  }, [])

  // Disconnect voice on unmount
  useEffect(() => {
    return () => { gameAriaDisconnect() }
  }, [])

  const doAction = useCallback(async (action: string, target: string) => {
    log("user", `${action} ${target}`.trim(), { input_method: "typed" })
    try {
      const result = await api.playAction(userId, action, target)
      handleGameAction(result)
      if (result.narrative) {
        addNarrative(result.narrative)
        log("game", result.narrative, { action_type: result.action_type })
      }
      if (result.mirror_moment && result.mirror_text) {
        log("system", `Mirror moment: ${result.mirror_text}`, { therapeutic: true })
      }
      // Show achievement toast if earned
      if ((result as any).new_achievements?.length) {
        setPendingAchievement((result as any).new_achievements[0])
      }
      gameUpdateContext(result.narrative)
      // Auto-save every 5 turns
      if (result.turn_count && result.turn_count % 5 === 0) {
        handleFullSave().catch(() => {})
      }
    } catch {
      addNarrative("Connection lost. Try again.")
    }
  }, [userId, handleGameAction, log])

  const handleCommand = useCallback((cmd: string) => {
    const parts = cmd.split(" ")
    doAction(parts[0], parts.slice(1).join(" "))
  }, [doAction])

  const handleFullSave = useCallback(async () => {
    if (!gameConfig) return
    const entries = useTranscriptStore.getState().entries
    const gameState = useGameStore.getState()
    const themeState = useGameThemeStore.getState()
    const modeState = useAriaModeStore.getState()

    // Capture full session state — everything not in player_state
    const sessionState = {
      interview_trail: gameState.conversationTrail || [],
      interview_progress: gameState.interviewProgress,
      theme_id: themeState.themeId || (gameConfig as any).cartridge_id,
      aria_mode: modeState.mode,
      mood_primary: gameState.moodPrimary,
      mood_secondary: gameState.moodSecondary,
      current_screen: gameState.currentScreen,
      selected_vibe: gameState.selectedVibe,
      selected_depth: gameState.selectedDepth,
    }

    await api.saveFullGame({
      userId,
      gameId: gameConfig.game_id || gameConfig.title.toLowerCase().replace(/\s+/g, "_"),
      cartridgeId: (gameConfig as any).cartridge_id,
      narratives,
      transcript: entries,
      sessionState,
    })
    log("game", "Game saved.", { action_type: "save" })
  }, [userId, gameConfig, narratives, log])

  const handleSaveAndRest = useCallback(async () => {
    setShowMoodCheckIn("end")  // Show mood check-in before leaving
    await handleFullSave()
    gameAriaDisconnect()
    setRestOverlay(false)
    // Don't navigate immediately — let mood check-in complete, then they can leave via menu
  }, [handleFullSave, setRestOverlay])

  /** Restore full game state from a unified save snapshot */
  const restoreFromSave = useCallback((save: api.RestoredGame) => {
    // Theme — use session_state theme or cartridge_id
    const ss = (save as any).session_state || {}
    const themeId = ss.theme_id || save.cartridge_id
    if (themeId) useGameThemeStore.getState().applyTheme(themeId)

    // Game config
    useGameStore.getState().setGameConfig(save.config as any)

    // Player state from backend (source of truth)
    const p = save.player
    useGameStore.setState({
      playerStats: {
        courage: p.variables?.courage ?? 4,
        trust: p.variables?.trust ?? 3,
        items: p.inventory?.length ?? 0,
      },
      turnCount: p.turn_count || 0,
      mapNodes: (save.map?.nodes as any[]) || [],
      // Use backend-computed actions (Fix D — always fresh from runtime)
      availableActions: save.available_actions || [],
      // Use backend-computed choices if available
      currentChoices: (save as any).choices || [],
      moodPrimary: ss.mood_primary || (save.map?.nodes as any[])?.find((n: any) => n.current)?.mood_color || useGameStore.getState().moodPrimary,
      moodSecondary: ss.mood_secondary || useGameStore.getState().moodSecondary,
    })

    // Restore interview trail if saved
    if (ss.interview_trail?.length) {
      useGameStore.setState({ conversationTrail: ss.interview_trail })
    }
    if (ss.interview_progress) {
      useGameStore.setState({ interviewProgress: ss.interview_progress })
    }

    // Restore Aria mode
    if (ss.aria_mode) {
      useAriaModeStore.getState().setMode(ss.aria_mode)
    }

    // Transcript
    if (save.transcript) {
      const ts = useTranscriptStore.getState()
      ts.clear()
      save.transcript.forEach((e: any) => ts.log(e.type, e.text, e.meta))
    }

    // Narratives
    if (save.narratives?.length) {
      setNarratives(save.narratives)
    }

    // Skip mood check-in for restored sessions
    setShowMoodCheckIn(null)

    log("system", `Restored: "${save.title}" — Turn ${p.turn_count} at ${save.location || "unknown"}`)
  }, [log])

  const handleLoadFromMenu = useCallback(async (saveId: string) => {
    try {
      const save = await api.loadSave(userId, saveId)
      restoreFromSave(save)
    } catch (e) {
      log("system", `Failed to load save: ${e}`)
    }
  }, [userId, handleGameAction, log])

  // Track mute state for /mute /unmute
  const [ariaMuted, setAriaMuted] = useState(false)

  const handleSlash = useCallback((cmd: string, args: string): { handled: boolean; response?: string } => {
    const mode = useAriaModeStore.getState().mode
    const isSU = mode === "su"

    // ── Player commands (always available) ──
    switch (cmd) {
      case "save":
        handleFullSave()
        return { handled: true }
      case "help": {
        if (!isSU) {
          addNarrative("** Commands: /save, /mood, /help, /aria-su (unlock all) **")
        } else {
          addNarrative(
            "** SU Commands:\n" +
            "Game: /look, /map, /inventory, /quest, /hint, /recap, /status\n" +
            "Control: /restart, /difficulty [easy|hard], /skip, /save\n" +
            "Aria: /voice [name], /mute, /unmute, /replay, /mood\n" +
            "Settings: /theme [name], /export, /aria-game, /help\n" +
            "Lab: /su-page or /lab (opens SU Lab in new tab) **"
          )
        }
        return { handled: true }
      }
      case "mood":
        setShowMoodCheckIn("start")
        return { handled: true }
      case "aria-su":
        switchAriaMode("su")
        addNarrative("** Aria enters Super User mode. All commands unlocked. **")
        return { handled: true }
      case "aria-game":
        switchAriaMode("game")
        addNarrative("** Aria returns to game mode. The story continues... **")
        return { handled: true }
    }

    // ── SU-only commands ──
    if (!isSU) {
      addNarrative(`** /${cmd} requires Super User mode. Type /aria-su first. **`)
      return { handled: true }
    }

    switch (cmd) {
      // Game navigation
      case "look":
        doAction("look", ""); return { handled: true }
      case "map":
        setDrawerOpen(true); return { handled: true }
      case "inventory":
        setDrawerOpen(true); return { handled: true }
      case "quest":
        doAction("quest", ""); return { handled: true }
      case "hint":
        doAction("hint", ""); return { handled: true }
      case "recap":
        doAction("recap", ""); return { handled: true }
      case "status":
        doAction("status", ""); return { handled: true }

      // Game control (NEW)
      case "restart":
        useGameStore.getState().reset()
        useTranscriptStore.getState().clear()
        setShowMoodCheckIn(null)
        addNarrative("** Game reset. Returning to onboarding... **")
        setTimeout(() => useGameStore.getState().setScreen("onboarding"), 500)
        return { handled: true }

      case "difficulty": {
        const level = args?.toLowerCase()
        if (level === "easy" || level === "hard") {
          const settings = level === "easy"
            ? { hint_frequency: "high", rest_frequency: "high", challenge: "low" }
            : { hint_frequency: "low", rest_frequency: "low", challenge: "high" }
          addNarrative(`** Difficulty set to ${level}. Hints: ${settings.hint_frequency}, Rest points: ${settings.rest_frequency}. **`)
          // Store difficulty in game config for runtime reference
          if (gameConfig) (gameConfig as any)._difficulty = level
        } else {
          addNarrative("** Usage: /difficulty easy or /difficulty hard **")
        }
        return { handled: true }
      }

      case "skip":
        doAction("skip", "")
        addNarrative("** Skipping current stage... **")
        return { handled: true }

      // Aria/Voice control (NEW)
      case "voice": {
        if (!args) {
          addNarrative("** Available voices: Leda, Charon, Kore, Aoede, Puck, Fenrir **")
          return { handled: true }
        }
        addNarrative(`** Voice switched to ${args}. Reconnect Aria to apply. **`)
        // Store voice preference — applied on next Aria connect
        if (typeof window !== "undefined") localStorage.setItem("aria_voice_pref", args)
        return { handled: true }
      }

      case "mute":
        setAriaMuted(true)
        gameAriaDisconnect()
        addNarrative("** Aria muted. Voice output disabled. Text commands still work. **")
        return { handled: true }

      case "unmute":
        setAriaMuted(false)
        addNarrative("** Aria unmuted. Tap the voice orb to reconnect. **")
        return { handled: true }

      case "replay": {
        const lastNarrative = narratives[narratives.length - 1]
        if (lastNarrative) {
          addNarrative(`** Replay: ${lastNarrative} **`)
        } else {
          addNarrative("** Nothing to replay. **")
        }
        return { handled: true }
      }

      // Settings
      case "theme":
        if (args) { useGameThemeStore.getState().applyTheme(args); addNarrative(`** Theme switched to ${args} **`) }
        else addNarrative("** Available themes: default, maya, ren, ash **")
        return { handled: true }

      case "export":
        { const ts = useTranscriptStore.getState(); const json = ts.exportJSON(gameConfig, userId); const blob = new Blob([json], { type: "application/json" }); const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = `aria-transcript-${userId}.json`; a.click(); URL.revokeObjectURL(url) }
        return { handled: true }

      case "su-page":
      case "lab":
        if (typeof window !== "undefined") {
          localStorage.setItem("aria_su_authorized", "true")
          window.open("/su", "_blank")
        }
        addNarrative("** Opening SU Lab in new tab... **")
        return { handled: true }

      default:
        addNarrative(`** Unknown command: /${cmd}. Type /help for available commands. **`)
        return { handled: true }
    }
  }, [doAction, handleFullSave, gameConfig, userId, narratives])

  // Extract inventory items from game config (items the player has picked up)
  const inventoryItems = gameConfig?.items
    ?.filter((item) => {
      // Items at "inventory" or items with location_id matching a visited flag
      // For now show all items — runtime tracks actual inventory
      return true
    })
    .map((item) => ({ id: item.id, name: item.name, description: item.description })) || []

  return (
    <div
      className="flex flex-col h-full overflow-hidden transition-[background] duration-[1500ms] ease-in-out"
      style={{ background: moodPrimary }}
    >
      <GameTopBar
        title={gameConfig?.title || "Your Adventure"}
        turnCount={turnCount}
        onBurgerToggle={toggleBurger}
        onDrawerToggle={toggleDrawer}
        onAriaToggle={toggleAria}
        onTranscriptToggle={toggleTranscript}
        onDevToggle={toggleDev}
        transcriptOpen={transcriptOpen}
      />
      <GameMap nodes={mapNodes} onNodeClick={(id) => doAction("move", id)} />
      <StatsBar stats={playerStats} />
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
        <NarrativePanel narratives={narratives} />
        <QuestChoices choices={currentChoices} onChoose={(id) => doAction("choose", id)} />
      </div>
      <ActionsBar actions={availableActions} onAction={doAction} />
      <GameInput onSubmit={handleCommand} onSlash={handleSlash} />
      <RestOverlay
        visible={showRestOverlay}
        onContinue={() => setRestOverlay(false)}
        onSave={handleSaveAndRest}
      />

      {/* Drawer */}
      <DrawerHandle onClick={toggleDrawer} visible={!drawerOpen} />
      <GameDrawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)}>
        <DrawerSection title="World Map" icon="🗺️" count={mapNodes.filter((n) => n.discovered).length}>
          <DrawerMap nodes={mapNodes} onNodeClick={(id) => { doAction("move", id); setDrawerOpen(false) }} />
        </DrawerSection>
        <DrawerSection title="Inventory" icon="🎒" count={inventoryItems.length}>
          <DrawerInventory items={inventoryItems} onUse={(id) => { doAction("use", id); setDrawerOpen(false) }} />
        </DrawerSection>
        <DrawerSection title="Quest Journal" icon="📋" count={gameConfig?.quests?.length}>
          <DrawerQuests quests={gameConfig?.quests || []} activeQuestId={gameConfig?.quests?.[0]?.id} />
        </DrawerSection>
        <DrawerSection title="Companion" icon="🤝" defaultOpen={false}>
          <DrawerCompanion companion={gameConfig?.companion || null} />
        </DrawerSection>
        <div className="p-4">
          <button
            onClick={() => { handleFullSave(); setDrawerOpen(false) }}
            className="w-full py-3 rounded-xl font-serif text-sm tracking-wide border border-[var(--gold-dim,#8a7235)]/30 text-[var(--gold,#c9a84c)] bg-[var(--gold,#c9a84c)]/[0.06] hover:bg-[var(--gold,#c9a84c)]/[0.12] transition-all"
          >
            💾 Save Game
          </button>
        </div>
      </GameDrawer>

      <GameVoiceOrb onToggle={gameAriaConnect} visible={true} />
      <VoiceStatus />
      <BurgerMenu isOpen={burgerOpen} onClose={() => setBurgerOpen(false)} onSave={handleFullSave} onLoadSave={handleLoadFromMenu} />
      <AriaPanel isOpen={ariaOpen} onClose={() => setAriaOpen(false)} />
      <TranscriptScreen />
      <DevHub isOpen={devOpen} onClose={toggleDev} />

      {/* Therapy components */}
      <AchievementToast
        achievement={pendingAchievement}
        onDone={() => setPendingAchievement(null)}
      />
      {therapistPaused && <TherapistPauseBanner message={pauseMessage} />}
      {showMoodCheckIn && (
        <div style={{ position: "fixed", inset: 0, zIndex: 9998, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.6)", backdropFilter: "blur(6px)" }}>
          <MoodCheckIn
            phase={showMoodCheckIn}
            sessionId={gameConfig?.game_id || "session"}
            onComplete={() => setShowMoodCheckIn(null)}
          />
        </div>
      )}
    </div>
  )
}
