"use client"

import { useEffect, useRef, useState } from "react"
import { Confetti } from "@/components/ui"
import { ACHIEVEMENTS } from "@/lib/progression"
import { useGame, type PublicPrompt, type Reveal } from "@/lib/store"
import type { Choice, Confidence, GuessMode } from "@/lib/types"

const CONFIDENCE_OPTIONS: { id: Confidence; emoji: string; label: string }[] = [
  { id: 0, emoji: "🎲", label: "No tengo ni idea" },
  { id: 1, emoji: "😅", label: "Poco seguro" },
  { id: 2, emoji: "🤔", label: "Bastante seguro" },
  { id: 3, emoji: "😎", label: "100% seguro" },
]

export type Summary = { correct: number; played: number; xp: number; skips: number }

export function MatchPlay({
  kicker,
  steps,
  mode,
  leagueId,
  predictorId,
  onDone,
}: {
  kicker: string
  steps: { targetId: string; questionId: string }[]
  mode: GuessMode
  leagueId?: string
  predictorId?: string
  onDone: (summary: Summary) => void
}) {
  const game = useGame()
  const [index, setIndex] = useState(0)
  const [prompt, setPrompt] = useState<PublicPrompt | null>(() => {
    const step = steps[0]
    return step ? game.prepare(step.targetId, step.questionId) : null
  })
  const [feedback, setFeedback] = useState<Reveal | null>(null)
  const [picked, setPicked] = useState<Choice | null>(null)
  const [confidence, setConfidence] = useState<Confidence | null>(null)
  const [tally, setTally] = useState<Summary>({ correct: 0, played: 0, xp: 0, skips: 0 })
  const timer = useRef<number | null>(null)

  useEffect(() => {
    return () => {
      if (timer.current) window.clearTimeout(timer.current)
    }
  }, [])

  function show(nextIndex: number) {
    const step = steps[nextIndex]
    setIndex(nextIndex)
    setFeedback(null)
    setPicked(null)
    setConfidence(null)
    setPrompt(step ? game.prepare(step.targetId, step.questionId) : null)
  }

  function go(next: Summary) {
    if (index + 1 >= steps.length) onDone(next)
    else show(index + 1)
  }

  function choose(choice: Choice) {
    if (!prompt || prompt.status !== "ready" || feedback) return
    const result = game.reveal(prompt.token, choice, mode, leagueId, predictorId, confidence ?? 2)
    if (!result) return
    const next = {
      correct: tally.correct + (result.correct ? 1 : 0),
      played: tally.played + 1,
      xp: tally.xp + result.xpGained,
      skips: tally.skips,
    }
    setTally(next)
    setPicked(choice)
    setFeedback(result)
    timer.current = window.setTimeout(() => go(next), 880)
  }

  function skip() {
    const next = { ...tally, skips: tally.skips + 1 }
    setTally(next)
    go(next)
  }

  if (!steps.length) {
    return (
      <div className="stack">
        <p className="kicker">{kicker}</p>
        <h1 className="display" style={{ fontSize: "2rem", margin: 0 }}>No hay preguntas listas.</h1>
        <button className="btn btn-primary" type="button" onClick={() => onDone(tally)}>Volver</button>
      </div>
    )
  }

  if (!prompt) return <p className="kicker">Preparando…</p>

  const correctIndex = feedback ? prompt.question.options.indexOf(feedback.revealed) : -1
  const names = feedback?.achievementIds
    .map((id) => ACHIEVEMENTS.find((item) => item.id === id)?.name)
    .filter(Boolean)

  return (
    <div className="stack rise" key={prompt.question.id + index}>
      <div className="between">
        <p className="kicker">{kicker}</p>
        <span className="pill">{index + 1}/{steps.length}</span>
      </div>
      <p className="muted" style={{ margin: 0 }}>{prompt.targetEmoji} Sobre {prompt.targetName}</p>
      <h1 className="display" style={{ fontSize: "2.1rem", lineHeight: 1, margin: 0 }}>{prompt.question.prompt}</h1>
      {prompt.status === "abstain" ? (
        <section className="card stack">
          <p>{prompt.message}</p>
          <button className="btn btn-primary" type="button" onClick={skip}>Siguiente</button>
        </section>
      ) : confidence == null ? (
        <section className="stack">
          <p className="kicker">¿Cuánta confianza tienes?</p>
          {CONFIDENCE_OPTIONS.map((option) => (
            <button key={option.id} className="option" type="button" onClick={() => setConfidence(option.id)}>
              {option.emoji} {option.label}
            </button>
          ))}
          <p className="muted" style={{ margin: 0 }}>Un acierto normal suma lo de siempre. Al 100%, el acierto vale el doble y el fallo no suma.</p>
        </section>
      ) : (
        prompt.question.options.map((option, optionIndex) => {
          const state = feedback
            ? optionIndex === correctIndex
              ? "good"
              : optionIndex === picked
                ? "bad"
                : ""
            : ""
          return (
            <button key={option} className={`option ${state}`} type="button" disabled={Boolean(feedback)} onClick={() => choose(optionIndex as Choice)}>
              {option}
            </button>
          )
        })
      )}
      {feedback ? (
        <section className="card" aria-live="polite">
          <strong>{feedback.correct ? "Exacto." : "Casi."}</strong>
          <p className="muted" style={{ margin: "6px 0 0" }}>
            {feedback.type === "real_answer" ? "Respuesta real" : "Predicción IA"} · {feedback.revealed}
            {feedback.confidence === 3 && feedback.correct ? " · x2" : ""}
            {feedback.confidence === 3 && !feedback.correct ? " · 0 XP" : feedback.xpGained ? ` · +${feedback.xpGained} XP` : ""}
            {feedback.points ? ` · +${feedback.points} pts` : ""}
          </p>
          {names?.length ? <p>Logro: {names.join(", ")}</p> : null}
        </section>
      ) : null}
    </div>
  )
}

export function SummaryCard({
  title,
  summary,
  extra,
  onAgain,
  onHome,
}: {
  title: string
  summary: Summary
  extra?: string
  onAgain: () => void
  onHome: () => void
}) {
  const total = summary.played + summary.skips
  const won = summary.played > 0 && summary.correct >= Math.ceil(summary.played / 2)
  return (
    <div className={won ? "stack rise victory" : "stack rise"}>
      {won ? <Confetti /> : null}
      <p className="kicker">Resultado</p>
      <h1 className="display" style={{ fontSize: "2.4rem", margin: 0 }}>{title}</h1>
      <section className="card grid-2">
        <div className="stat"><b>{summary.correct}/{summary.played || 0}</b><span>aciertos</span></div>
        <div className="stat"><b>+{summary.xp}</b><span>XP</span></div>
      </section>
      {summary.skips ? <p className="muted">{summary.skips} de {total} sin datos suficientes.</p> : null}
      {extra ? <p>{extra}</p> : null}
      <button className="btn btn-primary" type="button" onClick={onAgain}>Otra vez</button>
      <button className="btn btn-ghost" type="button" onClick={onHome}>Volver</button>
    </div>
  )
}
