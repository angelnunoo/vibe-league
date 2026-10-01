"use client"

import Link from "next/link"
import { useState } from "react"
import { Avatar, copyText, Qr, who } from "@/components/ui"
import { MvpBoard } from "@/components/pulse-screens"
import { bondIcon, bondScore, directedAccuracy, playerStats, timeAgo } from "@/lib/logic"
import { seasonStory, weeklyMvps } from "@/lib/pulse"
import { levelProgress, titleFor } from "@/lib/progression"
import { useGame } from "@/lib/store"

export function FriendsScreen({ initialCode = "" }: { initialCode?: string }) {
  const game = useGame()
  const me = game.me
  const [query, setQuery] = useState(initialCode)
  const [message, setMessage] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  if (!me) return null
  const link = typeof window === "undefined" ? me.profile.code : `${window.location.origin}/friends?add=${me.profile.code}`

  return (
    <div className="stack rise">
      <p className="kicker">Tu círculo</p>
      <h1 className="display" style={{ fontSize: "2rem", margin: 0 }}>Amigos</h1>
      <section className="card stack" style={{ textAlign: "center" }}>
        <p className="kicker">Tu código</p>
        <strong className="display" style={{ fontSize: "1.8rem" }}>{me.profile.code}</strong>
        <Qr value={link} />
        <button className="btn btn-ghost" type="button" onClick={() => { void copyText(link).then(() => setCopied(true)) }}>
          {copied ? "Enlace copiado" : "Copiar enlace"}
        </button>
      </section>
      <form
        className="stack"
        onSubmit={(event) => {
          event.preventDefault()
        const error = game.addFriend(query)
        setMessage(error)
        if (!error) setQuery("")
        }}
      >
        <label>
          Añadir por nombre o código
          <input className="field" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Nombre o código VL-" />
        </label>
        <button className="btn btn-primary" type="submit">Añadir</button>
        {message ? <p className="alert" role="alert">{message}</p> : null}
      </form>
      {me.requests.length ? (
        <section className="stack">
          <h2 className="display" style={{ fontSize: "1.2rem", margin: 0 }}>Solicitudes</h2>
          {me.requests.map((request) => (
            <article key={request.id} className="card stack">
              <div className="row">
                <Avatar emoji={request.emoji} online />
                <div>
                  <strong>{request.name}</strong>
                  <div className="muted">{request.code}</div>
                </div>
              </div>
              <div className="grid-2">
                <button className="btn btn-primary" type="button" onClick={() => game.acceptRequest(request.id)}>Aceptar</button>
                <button className="btn btn-ghost" type="button" onClick={() => game.declineRequest(request.id)}>Ahora no</button>
              </div>
            </article>
          ))}
        </section>
      ) : null}
      {me.friends.length === 0 ? (
        <p className="muted">Tu círculo está vacío. Comparte tu código con quien quieras jugar.</p>
      ) : null}
      {me.friends.map((friend) => {
        const person = who(me, friend.id)
        const score = bondScore(me, me.profile.id, friend.id)
        return (
          <article key={friend.id} className="card between">
            <Link href={`/friends/${friend.id}`} className="person">
              <Avatar emoji={person.emoji} online={person.online} />
              <div>
                <strong>{person.name}</strong>
                <div className="muted">{score == null ? "Sin medir" : `${bondIcon(score)} ${score}%`}</div>
              </div>
            </Link>
            <button
              className="back"
              type="button"
              aria-label={friend.favorite ? "Quitar de favoritos" : "Marcar favorito"}
              onClick={() => game.toggleFavorite(friend.id)}
            >
              {friend.favorite ? "★" : "☆"}
            </button>
          </article>
        )
      })}
    </div>
  )
}

export function FriendScreen({ id }: { id: string }) {
  const game = useGame()
  const me = game.me
  if (!me) return null
  const person = who(me, id)
  const link = me.friends.find((friend) => friend.id === id)
  const youKnow = directedAccuracy(me, me.profile.id, id)
  const theyKnow = directedAccuracy(me, id, me.profile.id)
  const bond = bondScore(me, me.profile.id, id)
  const mine = playerStats(me)

  return (
    <div className="stack">
      <Link href="/friends" className="muted">← Amigos</Link>
      <div className="row">
        <Avatar emoji={person.emoji} online={person.online} large />
        <div>
          <h1 className="display" style={{ margin: 0 }}>{person.name}</h1>
          <p className="muted">{titleFor(person.level)} · nivel {person.level}</p>
          {link?.code ? <p className="muted">{link.code}</p> : null}
        </div>
      </div>
      <section className="card">
        <p className="kicker">Conexión</p>
        <h2 className="display" style={{ fontSize: "2rem" }}>{bond == null ? "Sin medir" : `${bondIcon(bond)} ${bond}%`}</h2>
        <p className="muted">Capacidad de entenderse, no una amistad.</p>
      </section>
      <section className="grid-2">
        <article className="card stat"><b>{youKnow == null ? "—" : `${youKnow}%`}</b><span>Le conoces</span></article>
        <article className="card stat"><b>{theyKnow == null ? "—" : `${theyKnow}%`}</b><span>Te conoce</span></article>
        <article className="card stat"><b>{mine.precision}%</b><span>Tu precisión</span></article>
        <article className="card stat"><b>{mine.answered}</b><span>Tus respuestas</span></article>
      </section>
      <Link href="/play/duel" className="btn btn-primary">Retar a duelo</Link>
    </div>
  )
}

export function ProfileScreen() {
  const { me } = useGame()
  if (!me) return null
  const progress = levelProgress(me.xp)
  const stats = playerStats(me)
  const best = stats.bestFriendId ? who(me, stats.bestFriendId) : null
  const bond = stats.bestBond ? who(me, stats.bestBond.id) : null
  const hard = stats.hardest ? who(me, stats.hardest.id) : null
  return (
    <div className="stack rise">
      <div className="row">
        <Avatar emoji={me.profile.emoji} large />
        <div>
          <h1 className="display" style={{ margin: 0 }}>{me.profile.name}</h1>
          <p className="muted">@{me.profile.username}</p>
          <p className="muted">{progress.title} · nivel {progress.level}</p>
        </div>
      </div>
      <ProgressBlock ratio={progress.ratio} label={`${me.xp} XP`} />
      <section className="grid-2">
        <article className="card stat"><b>{me.dailyStreak}</b><span>Racha</span></article>
        <article className="card stat"><b>{stats.precision}%</b><span>Precisión</span></article>
        <article className="card stat"><b>{stats.predictions}</b><span>Predicciones</span></article>
        <article className="card stat"><b>{stats.hits}</b><span>Aciertos</span></article>
        <article className="card stat"><b>{stats.answered}</b><span>Respondidas</span></article>
        <article className="card stat"><b>{me.bestHitStreak}</b><span>Mejor racha</span></article>
      </section>
      <section className="card stack">
        <p>Mejor amigo: {best?.name ?? "Aún nadie"}</p>
        <p>Mejor conexión: {bond ? `${bond.name} ${stats.bestBond?.score}%` : "Juega para descubrirla"}</p>
        <p>Más difícil de predecir: {hard ? `${hard.name} · ${stats.hardest?.score}%` : "Hacen falta más partidas"}</p>
      </section>
      <ProfileMvps />
      <SeasonStrip />
      <div className="grid-2">
        <Link href="/knowledge" className="btn btn-ghost">Conocimiento</Link>
        <Link href="/preguntas" className="btn btn-ghost">Preguntas de hoy</Link>
        <Link href="/achievements" className="btn btn-ghost">Logros</Link>
        <Link href="/evolution" className="btn btn-ghost">Cómo has cambiado</Link>
        <Link href="/recall" className="btn btn-ghost">Predícete</Link>
        <Link href="/seasons" className="btn btn-ghost">Temporadas</Link>
        <Link href="/share" className="btn btn-ghost">Compartir</Link>
        <Link href="/settings" className="btn btn-ghost">Privacidad</Link>
        <Link href="/rankings" className="btn btn-ghost">Rankings</Link>
      </div>
      <section className="stack">
        <h2 className="display" style={{ fontSize: "1.2rem", margin: 0 }}>Historial</h2>
        {me.guesses.slice(0, 6).map((guess) => (
          <article key={guess.id} className="between">
            <span>{guess.correct ? "🎯" : "💨"} {who(me, guess.targetId).name}</span>
            <span className="muted">{timeAgo(guess.at)}</span>
          </article>
        ))}
        {me.guesses.length === 0 ? <p className="muted">Tu historial empieza con la primera partida.</p> : null}
      </section>
    </div>
  )
}

function ProfileMvps() {
  const { me } = useGame()
  if (!me) return null
  const awards = [
    ...weeklyMvps(me).filter((award) => award.holderId === me.profile.id),
    ...(me.lastMvps?.awards.filter((award) => award.holderId === me.profile.id) ?? []),
  ]
  if (!awards.length) return null
  return <MvpBoard title="Tus MVPs" awards={awards} />
}

function SeasonStrip() {
  const { me } = useGame()
  if (!me) return null
  const story = seasonStory(me)
  if (!me.seasons.length) return null
  return (
    <section className="card stack">
      <p className="kicker">{story.championships} campeonatos · {story.podiums} podios</p>
      <div className="row" style={{ flexWrap: "wrap" }}>
        {me.seasons.slice(0, 6).map((season) => (
          <span key={season.id} className="pill">{season.myRank === 1 ? "🥇" : season.myRank === 2 ? "🥈" : season.myRank === 3 ? "🥉" : `#${season.myRank}`} {season.seasonName}</span>
        ))}
      </div>
    </section>
  )
}

function ProgressBlock({ ratio, label }: { ratio: number; label: string }) {
  return (
    <div className="stack">
      <div className="bar" aria-hidden><span style={{ width: `${Math.round(ratio * 100)}%` }} /></div>
      <span className="muted">{label}</span>
    </div>
  )
}
