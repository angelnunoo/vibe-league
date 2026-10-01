"use client"

import Link from "next/link"
import { useState } from "react"
import { Avatar, copyText, who } from "@/components/ui"
import { MvpBoard } from "@/components/pulse-screens"
import { awardsFor, mainLeague, standings } from "@/lib/logic"
import { weeklyMvps } from "@/lib/pulse"
import { useGame } from "@/lib/store"

export function LeagueScreen() {
  const game = useGame()
  const me = game.me
  const [name, setName] = useState("")
  const [copied, setCopied] = useState(false)
  if (!me) return null
  const league = mainLeague(me)
  if (!league) return null
  const table = standings(league, "season")

  return (
    <div className="stack rise">
      <p className="kicker">{league.seasonName}</p>
      <div className="between">
        <h1 className="display" style={{ fontSize: "2rem", margin: 0 }}>{league.name}</h1>
        <span className="pill">{league.code}</span>
      </div>
      <div className="grid-2">
        <Link href="/play/jornada" className="btn btn-primary">Jugar jornada</Link>
        <Link href="/rankings" className="btn btn-ghost">Rankings</Link>
      </div>
      <MvpBoard title="MVPs de la semana" awards={weeklyMvps(me)} />
      {me.lastMvps ? <MvpBoard title="Premios de la semana pasada" awards={me.lastMvps.awards} /> : null}
      <button className="btn btn-ghost" type="button" onClick={() => { void copyText(`${league.name} · ${league.code}`).then(() => setCopied(true)) }}>
        {copied ? "Código copiado" : "Invitar con el código"}
      </button>
      {table.map((row) => {
        const person = who(me, row.id)
        return (
          <article key={row.id} className="card between">
            <div className="row">
              <span className={row.rank <= 3 ? "rank top" : "rank"}>{row.rank <= 3 ? ["🥇", "🥈", "🥉"][row.rank - 1] : row.rank}</span>
              <Avatar emoji={person.emoji} />
              <div>
                <strong>{person.you ? "Tú" : person.name}</strong>
                <div className="muted">Nivel {person.level}</div>
              </div>
            </div>
            <b>{row.points}</b>
          </article>
        )
      })}
      <form
        className="stack"
        onSubmit={(event) => {
          event.preventDefault()
          if (name.trim().length < 2) return
          game.createLeague(name)
          setName("")
        }}
      >
        <label>
          Nueva liga privada
          <input className="field" value={name} onChange={(event) => setName(event.target.value)} placeholder="Nombre de la liga" />
        </label>
        <button className="btn btn-ghost" type="submit">Crear liga</button>
      </form>
      {me.leagues.length > 1 ? (
        <div className="stack">
          {me.leagues.map((item) => (
            <button key={item.id} className="btn btn-ghost" type="button" onClick={() => game.setMainLeague(item.id)}>
              {item.main ? "Principal · " : "Hacer principal · "}{item.name}
            </button>
          ))}
        </div>
      ) : null}
      {league.ownerId === me.profile.id ? (
        <button className="btn btn-ghost" type="button" onClick={() => game.startNewSeason(league.id)}>
          Cerrar temporada y abrir la siguiente
        </button>
      ) : null}
    </div>
  )
}

export function RankingsScreen() {
  const game = useGame()
  const me = game.me
  const [key, setKey] = useState<"season" | "weekly" | "historic">("season")
  if (!me) return null
  const league = mainLeague(me)
  if (!league) return null
  const table = standings(league, key)
  return (
    <div className="stack">
      <p className="kicker">{league.name}</p>
      <h1 className="display" style={{ fontSize: "2rem", margin: 0 }}>Clasificaciones</h1>
      <div className="tabs">
        {([
          ["season", "Temporada"],
          ["weekly", "Semana"],
          ["historic", "Histórico"],
        ] as const).map(([id, label]) => (
          <button key={id} type="button" className={key === id ? "on" : ""} onClick={() => setKey(id)}>{label}</button>
        ))}
        <Link href="/rankings#premios" className="btn btn-ghost" style={{ width: "auto", minHeight: 38 }}>Premios</Link>
      </div>
      {table.map((row) => {
        const person = who(me, row.id)
        return (
          <article key={row.id} className="between">
            <div className="row">
              <span className={row.rank <= 3 ? "rank top" : "rank"}>{row.rank}</span>
              <strong>{person.you ? "Tú" : person.name}</strong>
            </div>
            <b>{row.points}</b>
          </article>
        )
      })}
      <Awards />
    </div>
  )
}

function Awards() {
  const game = useGame()
  const me = game.me
  if (!me) return null
  const awards = awardsFor(me, (id) => (id === me.profile.id ? me.profile.name : who(me, id).name))
  return (
    <section id="premios" className="stack">
      <h2 className="display" style={{ margin: 0 }}>Premios del círculo</h2>
      <div className="grid-2">
        {awards.map((award) => (
          <article key={award.id} className="card">
            <div>{award.emoji}</div>
            <p className="kicker">{award.label}</p>
            <strong>{award.name}</strong>
            <p className="muted">{award.detail}</p>
          </article>
        ))}
      </div>
    </section>
  )
}
