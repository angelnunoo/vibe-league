"use client"

import Link from "next/link"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { MatchPlay, SummaryCard, type Summary } from "@/components/match"
import { Top } from "@/components/shell"
import { Avatar, who } from "@/components/ui"
import { mainLeague } from "@/lib/logic"
import { useGame } from "@/lib/store"

export function PlayHub() {
  return (
    <div className="stack rise">
      <p className="kicker">Modos</p>
      <h1 className="display" style={{ fontSize: "2.2rem", margin: 0 }}>¿A quién lees hoy?</h1>
      <div className="grid-2">
        <Link href="/league" className="mode gold"><span>🏆</span><strong>Liga</strong><span>Clasificación permanente</span></Link>
        <Link href="/play/duel" className="mode"><span>⚔️</span><strong>Duelo</strong><span>10 preguntas, cara a cara</span></Link>
        <Link href="/play/quick" className="mode blue"><span>⚡</span><strong>Rápida</strong><span>Resultado al momento</span></Link>
        <Link href="/play/party" className="mode pink"><span>🎉</span><strong>En persona</strong><span>Sala, código y móvil</span></Link>
        <Link href="/play/duo" className="mode pink"><span>❤️</span><strong>Duo League</strong><span>Dos contra dos</span></Link>
        <Link href="/play/likely" className="mode blue"><span>🤯</span><strong>¿Quién es más probable?</strong><span>Online o en la sala</span></Link>
      </div>
    </div>
  )
}

export function QuickScreen() {
  const game = useGame()
  const router = useRouter()
  const me = game.me
  const [length, setLength] = useState<5 | 10>(5)
  const [steps, setSteps] = useState<{ targetId: string; questionId: string }[] | null>(null)
  const [summary, setSummary] = useState<Summary | null>(null)
  if (!me) return null

  if (summary) {
    return (
      <SummaryCard
        title={summary.correct >= Math.ceil(summary.played / 2) ? "Les pillas el punto." : "Todavía se te escapan."}
        summary={summary}
        onAgain={() => { setSummary(null); setSteps(null) }}
        onHome={() => router.push("/play")}
      />
    )
  }

  if (steps) {
    return <MatchPlay kicker="Partida rápida" steps={steps} mode="quick" onDone={setSummary} />
  }

  return (
    <div className="stack">
      <Top title="Rápida" back="/play" />
      <div className="tabs">
        <button type="button" className={length === 5 ? "on" : ""} onClick={() => setLength(5)}>5 preguntas</button>
        <button type="button" className={length === 10 ? "on" : ""} onClick={() => setLength(10)}>10 preguntas</button>
      </div>
      <button
        className="btn btn-primary"
        type="button"
        onClick={() => setSteps(game.deal(me.friends.map((friend) => friend.id), length))}
      >
        Empezar
      </button>
    </div>
  )
}

export function DuelScreen() {
  const game = useGame()
  const router = useRouter()
  const me = game.me
  const [rival, setRival] = useState<string | null>(null)
  const [phase, setPhase] = useState<"pick" | "me" | "hand" | "them" | "done">("pick")
  const [mySteps, setMySteps] = useState<{ targetId: string; questionId: string }[]>([])
  const [theirSteps, setTheirSteps] = useState<{ targetId: string; questionId: string }[]>([])
  const [mine, setMine] = useState<Summary | null>(null)
  const [theirs, setTheirs] = useState<{ correct: number; total: number } | null>(null)
  if (!me) return null
  const rivalCard = rival ? who(me, rival) : null

  if (phase === "me" && rival) {
    return (
      <MatchPlay
        kicker={`Duelo · tú sobre ${rivalCard?.name}`}
        steps={mySteps}
        mode="duel"
        onDone={(summary) => { setMine(summary); setPhase("hand") }}
      />
    )
  }

  if (phase === "them" && rival) {
    return (
      <MatchPlay
        kicker={`Duelo · ${rivalCard?.name} sobre ti`}
        steps={theirSteps}
        mode="duel"
        predictorId={rival}
        onDone={(summary) => {
          setTheirs({ correct: summary.correct, total: summary.played })
          if (mine) game.noteDuel(mine.correct > summary.correct)
          setPhase("done")
        }}
      />
    )
  }

  if (phase === "hand" && rival && mine) {
    return (
      <div className="stack">
        <p className="kicker">Cambio de turno</p>
        <h1 className="display" style={{ fontSize: "2.2rem", margin: 0 }}>{rivalCard?.name} va a intentar leerte.</h1>
        <p className="muted">Llevas {mine.correct}/{mine.played}. Si está en la sala, pásale el móvil.</p>
        <button className="btn btn-primary" type="button" onClick={() => { setTheirSteps(game.deal([me.profile.id], 10)); setPhase("them") }}>
          Pasarle el móvil
        </button>
      </div>
    )
  }

  if (phase === "done" && mine && theirs && rivalCard) {
    const won = mine.correct > theirs.correct
    const tied = mine.correct === theirs.correct
    return (
      <div className="stack">
        <p className="kicker">Duelo</p>
        <h1 className="display" style={{ fontSize: "2.3rem", margin: 0 }}>
          {tied ? "Empate de vibe." : won ? "Les lees mejor." : `${rivalCard.name} te lee mejor.`}
        </h1>
        <section className="grid-2">
          <article className="card stat"><b>{mine.correct}/{mine.played}</b><span>Tú</span></article>
          <article className="card stat"><b>{theirs.correct}/{theirs.total}</b><span>{rivalCard.name}</span></article>
        </section>
        <button className="btn btn-primary" type="button" onClick={() => { setPhase("pick"); setRival(null); setMine(null); setTheirs(null) }}>Otro duelo</button>
        <button className="btn btn-ghost" type="button" onClick={() => router.push("/play")}>Volver</button>
      </div>
    )
  }

  return (
    <div className="stack">
      <Top title="Duelo" back="/play" />
      {me.friends.map((friend) => {
        const person = who(me, friend.id)
        return (
          <button
            key={friend.id}
            className="card person"
            type="button"
            onClick={() => {
              setRival(friend.id)
              setMySteps(game.deal([friend.id], 10))
              setPhase("me")
            }}
          >
            <Avatar emoji={person.emoji} online={person.online} />
            <div>
              <strong>{person.name}</strong>
              <div className="muted">{friend.code ?? "En tu círculo"}</div>
            </div>
          </button>
        )
      })}
    </div>
  )
}

export function JornadaScreen() {
  const game = useGame()
  const router = useRouter()
  const me = game.me
  const league = me ? mainLeague(me) : null
  const [steps, setSteps] = useState<{ targetId: string; questionId: string }[] | null>(null)
  const [summary, setSummary] = useState<Summary | null>(null)
  if (!me || !league) return null
  const targets = league.members.map((member) => member.id).filter((id) => id !== me.profile.id)

  if (summary) {
    return (
      <SummaryCard
        title="Jornada cerrada"
        summary={summary}
        extra={summary.played ? "Los puntos ya están en la liga." : undefined}
        onAgain={() => { setSummary(null); setSteps(null) }}
        onHome={() => router.push("/league")}
      />
    )
  }
  if (steps) {
    return <MatchPlay kicker={league.name} steps={steps} mode="league" leagueId={league.id} onDone={setSummary} />
  }
  return (
    <div className="stack">
      <Top title="Jornada" back="/league" />
      <h1 className="display" style={{ fontSize: "2rem", margin: 0 }}>Seis preguntas. Puntos de temporada.</h1>
      <button className="btn btn-primary" type="button" onClick={() => setSteps(game.deal(targets, 6))}>Jugar jornada</button>
    </div>
  )
}
