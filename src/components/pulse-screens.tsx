"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { MatchPlay, SummaryCard, type Summary } from "@/components/match"
import { Top } from "@/components/shell"
import { Avatar, who } from "@/components/ui"
import { activeEvent } from "@/lib/events"
import { ageLabel, clock, dailyBoard, duoBoard, evolutionOf, LIKELY_CATEGORIES, LIKELY_PROMPTS, mostLikely, msUntilMidnight, recallDue, seasonStory, trendLines, weeklyMvps } from "@/lib/pulse"
import { findQuestion } from "@/lib/events"
import { bondScore } from "@/lib/logic"
import { playerStats } from "@/lib/logic"
import { useGame } from "@/lib/store"
import type { Choice, MvpSlot, Trait } from "@/lib/types"

function useClock() {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [])
  return now
}

export function MvpBoard({ title, awards }: { title: string; awards: MvpSlot[] }) {
  return (
    <section className="stack">
      <h2 className="display" style={{ fontSize: "1.2rem", margin: 0 }}>{title}</h2>
      <div className="mvp-row">
        {awards.map((award) => (
          <article key={award.id} className="card mvp">
            <span style={{ fontSize: "1.6rem" }}>{award.emoji}</span>
            <p className="kicker">{award.label}</p>
            <strong>{award.holderName}</strong>
            <span className="muted">{award.detail}</span>
          </article>
        ))}
      </div>
    </section>
  )
}

export function HomePulse() {
  const game = useGame()
  const me = game.me
  const now = useClock()
  if (!me) return null
  const event = activeEvent(new Date(now))
  const daily = dailyBoard(me, new Date(now))
  const stats = playerStats(me)
  const live = weeklyMvps(me)
  const story = evolutionOf(me)[0]
  const due = recallDue(me, new Date(now))
  const unread = me.notices.filter((notice) => !notice.read).length
  const score = me.eventScores.find((item) => item.id === event.id)

  return (
    <>
      <Link href="/inbox" className="card between">
        <div>
          <p className="kicker">Avisos</p>
          <strong>{unread ? `${unread} sin leer` : "Al día"}</strong>
        </div>
        <span className="pill">🔔</span>
      </Link>
      <Link href="/play/event" className={`card stack banner banner-${event.theme}`}>
        <p className="kicker">Evento activo</p>
        <h2 className="display" style={{ fontSize: "1.45rem" }}>{event.emoji} {event.name}</h2>
        <p className="muted" style={{ margin: 0 }}>{event.blurb}</p>
        <span className="pill">{score?.played ? event.badge : "Insignia al participar"}</span>
      </Link>
      <Link href="/daily" className="card stack">
        <div className="between">
          <p className="kicker">Pregunta del Día</p>
          <span className="pill">{daily?.done ? "Hecha" : clock(msUntilMidnight(new Date(now)))}</span>
        </div>
        <h2 className="display" style={{ fontSize: "1.35rem" }}>
          {daily?.kind === "predict"
            ? `${daily.question.emoji} ¿Qué elegiría ${who(me, daily.targetId).name}?`
            : daily?.kind === "who"
              ? `${daily.prompt.emoji} ${daily.prompt.prompt}`
              : "Cuando tengas amigos, aparece aquí."}
        </h2>
      </Link>
      <section className="grid-2">
        <article className="card stat"><b>{stats.precision}%</b><span>Tu precisión</span></article>
        <article className="card stat"><b>{me.dailyStreak}</b><span>Tu racha</span></article>
      </section>
      <MvpBoard title="MVPs de la semana" awards={live} />
      {me.lastMvps ? <MvpBoard title={`Coronados · ${me.lastMvps.weekKey}`} awards={me.lastMvps.awards} /> : null}
      <Link href="/evolution" className="card stack">
        <p className="kicker">Evolución reciente</p>
        {story ? (
          <>
            <strong>{story.emoji} {story.prompt}</strong>
            <p className="muted" style={{ margin: 0 }}>{ageLabel(story.previousAt)}: {story.before} → hoy: {story.after}</p>
          </>
        ) : (
          <strong>Cuando cambies de idea, lo verás aquí.</strong>
        )}
      </Link>
      {due ? (
        <Link href="/recall" className="card stack">
          <p className="kicker">Ocasión especial</p>
          <strong>🤯 ¿Qué crees que respondiste?</strong>
          <p className="muted" style={{ margin: 0 }}>{ageLabel(due.at)} guardamos una respuesta tuya.</p>
        </Link>
      ) : null}
    </>
  )
}

export function DailyScreen() {
  const game = useGame()
  const router = useRouter()
  const me = game.me
  const now = useClock()
  const [steps, setSteps] = useState<{ targetId: string; questionId: string }[] | null>(null)
  const [whoResult, setWhoResult] = useState<{ status: "abstain"; message: string } | { status: "ready"; correct: boolean; holderId: string; xp: number } | null>(null)
  const [summary, setSummary] = useState<Summary | null>(null)
  if (!me) return null
  const board = dailyBoard(me, new Date(now))
  if (!board) return <p className="muted">Añade amigos para abrir la pregunta del día.</p>

  if (summary) {
    return (
      <SummaryCard
        title={summary.correct > 0 ? "El día empieza bien." : "Mañana hay otra."}
        summary={summary}
        extra="Cuenta para tu experiencia y tus estadísticas."
        onAgain={() => router.push("/home")}
        onHome={() => router.push("/home")}
      />
    )
  }

  if (steps) {
    return (
      <MatchPlay
        kicker="Pregunta del Día"
        steps={steps}
        mode="daily"
        onDone={(result) => {
          game.markDaily()
          setSummary(result)
        }}
      />
    )
  }

  if (board.kind === "who" && whoResult) {
    const name = whoResult.status === "ready" ? who(me, whoResult.holderId).name : ""
    return (
      <div className="stack">
        <p className="kicker">Pregunta del Día</p>
        <h1 className="display" style={{ fontSize: "2rem", margin: 0 }}>
          {whoResult.status === "abstain" ? "Sin datos suficientes" : whoResult.correct ? "Les lees el punto." : "Hoy se te escapa."}
        </h1>
        <p>{whoResult.status === "abstain" ? whoResult.message : whoResult.correct ? `${name} era la respuesta.` : `El dato señala a ${name}.`}</p>
        <button className="btn btn-primary" type="button" onClick={() => router.push("/home")}>Volver al inicio</button>
      </div>
    )
  }

  return (
    <div className="stack">
      <Top title="Pregunta del Día" />
      <p className="pill">Siguiente en {clock(msUntilMidnight(new Date(now)))}</p>
      {board.done ? <p className="muted">Ya respondiste la de hoy. La siguiente entra a medianoche.</p> : null}
      {board.kind === "predict" ? (
        <section className="card stack">
          <p className="kicker">Sobre {who(me, board.targetId).name}</p>
          <h1 className="display" style={{ fontSize: "1.8rem", margin: 0 }}>{board.question.emoji} {board.question.prompt}</h1>
          <button
            className="btn btn-primary"
            type="button"
            disabled={board.done}
            onClick={() => setSteps([{ targetId: board.targetId, questionId: board.question.id }])}
          >
            Responder
          </button>
        </section>
      ) : (
        <section className="card stack">
          <h1 className="display" style={{ fontSize: "1.7rem", margin: 0 }}>{board.prompt.emoji} {board.prompt.prompt}</h1>
          {me.friends.map((friend) => (
            <button key={friend.id} className="option" type="button" disabled={board.done} onClick={() => setWhoResult(game.answerWho(friend.id, board.prompt.trait))}>
              {who(me, friend.id).emoji} {who(me, friend.id).name}
            </button>
          ))}
        </section>
      )}
    </div>
  )
}

export function EventScreen() {
  const game = useGame()
  const me = game.me
  const [steps, setSteps] = useState<{ targetId: string; questionId: string }[] | null>(null)
  const [summary, setSummary] = useState<Summary | null>(null)
  if (!me) return null
  const event = activeEvent()
  const score = me.eventScores.find((item) => item.id === event.id)
  const table = [{ id: me.profile.id, points: score?.points ?? 0 }]

  if (summary) {
    return (
      <SummaryCard
        title="Evento cerrado por hoy."
        summary={summary}
        extra={score?.played || summary.played ? `Insignia: ${event.badge}` : undefined}
        onAgain={() => { setSummary(null); setSteps(null) }}
        onHome={() => { setSummary(null); setSteps(null) }}
      />
    )
  }
  if (steps) return <MatchPlay kicker={event.name} steps={steps} mode="quick" onDone={setSummary} />

  return (
    <div className={`stack banner banner-${event.theme}`}>
      <Top title={event.name} back="/home" />
      <p className="muted">{event.blurb}</p>
      <span className="pill">{score?.played ? event.badge : "La insignia se queda esta semana"}</span>
      <p className="muted">{score?.points ?? 0} puntos de evento</p>
      <button
        className="btn btn-primary"
        type="button"
        onClick={() => {
          const friends = me.friends.map((friend) => friend.id)
          if (!friends.length) return
          setSteps(event.questions.map((question, index) => ({ questionId: question.id, targetId: friends[index % friends.length] })))
        }}
      >
        Jugar preguntas exclusivas
      </button>
      <h2 className="display" style={{ fontSize: "1.2rem", margin: 0 }}>Clasificación del evento</h2>
      {table.map((row, index) => (
        <article key={row.id} className="card between">
          <span>{index + 1}. {who(me, row.id).name}</span>
          <b>{row.points}</b>
        </article>
      ))}
    </div>
  )
}

export function EvolutionScreen() {
  const game = useGame()
  const me = game.me
  const [openId, setOpenId] = useState<string | null>(null)
  if (!me) return null
  const changes = evolutionOf(me)
  const lines = trendLines(me)
  const revisit = me.answers.slice(0, 6)
  return (
    <div className="stack">
      <p className="kicker">Cómo has cambiado</p>
      <h1 className="display" style={{ fontSize: "2rem", margin: 0 }}>Tu historia</h1>
      {lines.map((line) => <p key={line.trait} className="card">{line.text}</p>)}
      {changes.length ? changes.map((change) => (
        <article key={`${change.questionId}-${change.at}`} className="card stack">
          <p className="kicker">{ageLabel(change.previousAt)}</p>
          <strong>{change.emoji} {change.before}</strong>
          <p className="muted" style={{ margin: 0 }}>Hoy: {change.after}</p>
          <p>Tu preferencia ha cambiado</p>
        </article>
      )) : <p className="muted">Todavía no hay un antes y un después. Responde otra vez una pregunta y, si cambias, queda escrito.</p>}
      <h2 className="display" style={{ fontSize: "1.2rem", margin: 0 }}>¿Sigues pensando igual?</h2>
      {revisit.map((answer) => {
        const question = findQuestion(answer.questionId)
        if (!question) return null
        return (
          <article key={answer.questionId} className="card stack">
            <button type="button" className="between" style={{ background: "transparent", border: 0, padding: 0 }} onClick={() => setOpenId(openId === answer.questionId ? null : answer.questionId)}>
              <span>{question.emoji} {question.prompt}</span>
              <b>{question.options[answer.choice]}</b>
            </button>
            {openId === answer.questionId ? (
              <div className="grid-2">
                {question.options.map((option, index) => (
                  <button key={option} className="option" type="button" onClick={() => game.revise(answer.questionId, index as Choice)}>{option}</button>
                ))}
              </div>
            ) : null}
          </article>
        )
      })}
    </div>
  )
}

export function RecallScreen() {
  const game = useGame()
  const me = game.me
  const [result, setResult] = useState<{ correct: boolean; xp: number; before: string; now: string } | null>(null)
  if (!me) return null
  const pending = me.answers.filter((answer) => !me.recalledIds.includes(answer.questionId)).sort((a, b) => a.at.localeCompare(b.at))
  const target = pending[0]
  const question = target ? findQuestion(target.questionId) : null
  const current = target ? me.answers.find((answer) => answer.questionId === target.questionId) : null
  const revision = target ? [...me.revisions].reverse().find((item) => item.questionId === target.questionId) : null

  if (!target || !question || !current) {
    return (
      <div className="stack">
        <p className="kicker">Predícete a ti mismo</p>
        <h1 className="display" style={{ fontSize: "2rem", margin: 0 }}>Nada pendiente</h1>
        <p className="muted">Cuando guardes respuestas, de vez en cuando te pediremos que las recuerdes.</p>
      </div>
    )
  }

  if (result) {
    return (
      <div className="stack victory">
        <p className="kicker">{result.correct ? "Acertaste" : "Fallaste"}</p>
        <h1 className="display" style={{ fontSize: "2rem", margin: 0 }}>{result.correct ? "✅ Esa eras tú." : "❌ Ya no coincide."}</h1>
        <article className="card stack">
          <p>Respuesta antigua: {result.before}</p>
          <p>Respuesta actual: {result.now}</p>
          <p className="muted">{result.before === result.now ? "Sigues en el mismo sitio." : "Tu preferencia ha cambiado."}</p>
        </article>
        <p className="muted">+{result.xp} XP</p>
      </div>
    )
  }

  return (
    <div className="stack">
      <p className="kicker">Predícete a ti mismo</p>
      <h1 className="display" style={{ fontSize: "1.8rem", margin: 0 }}>¿Qué crees que respondiste {ageLabel(target.at).toLowerCase()}?</h1>
      <p className="muted">{question.emoji} {question.prompt}</p>
      {question.options.map((option, index) => (
        <button
          key={option}
          className="option"
          type="button"
          onClick={() => {
            const scored = game.recall(question.id, index as Choice)
            const before = question.options[target.choice]
            const nowLabel = revision ? question.options[revision.to] : before
            setResult({ correct: Boolean(scored?.correct), xp: scored?.xpGained ?? 0, before, now: nowLabel })
          }}
        >
          {option}
        </button>
      ))}
    </div>
  )
}

export function SeasonsScreen() {
  const { me } = useGame()
  if (!me) return null
  const story = seasonStory(me)
  return (
    <div className="stack">
      <p className="kicker">Archivo</p>
      <h1 className="display" style={{ fontSize: "2rem", margin: 0 }}>Temporadas</h1>
      <section className="grid-2">
        <article className="card stat"><b>{story.championships}</b><span>Campeonatos</span></article>
        <article className="card stat"><b>{story.podiums}</b><span>Podios</span></article>
      </section>
      {story.best ? <p className="card">Mejor temporada: {story.best.seasonName}, puesto {story.best.myRank}.</p> : <p className="muted">Cierra una temporada en la liga para guardar el podio.</p>}
      {me.seasons.map((season) => (
        <article key={season.id} className="card stack">
          <div className="between">
            <strong>{season.myRank === 1 ? "🥇" : season.myRank === 2 ? "🥈" : season.myRank === 3 ? "🥉" : `#${season.myRank}`} {season.seasonName}</strong>
            <span className="muted">{season.myPoints} pts</span>
          </div>
          <p className="muted" style={{ margin: 0 }}>Ganó {season.winnerName}</p>
          {season.podium.map((row) => (
            <div key={row.id} className="between"><span>{row.rank}. {row.name}</span><b>{row.points}</b></div>
          ))}
        </article>
      ))}
    </div>
  )
}

export function InboxScreen() {
  const game = useGame()
  const me = game.me
  if (!me) return null
  return (
    <div className="stack">
      <div className="between">
        <h1 className="display" style={{ fontSize: "2rem", margin: 0 }}>Avisos</h1>
        <button className="btn btn-ghost" style={{ width: "auto" }} type="button" onClick={() => game.readNotices()}>Leídos</button>
      </div>
      {me.notices.length === 0 ? <p className="muted">Cuando pase algo en el círculo, llega aquí.</p> : null}
      {me.notices.map((notice) => (
        <Link key={notice.id} href={notice.href} className={notice.read ? "card row locked" : "card row"}>
          <span style={{ fontSize: "1.4rem" }}>{notice.emoji}</span>
          <div>
            <strong>{notice.text}</strong>
            <div className="muted">{ageLabel(notice.at)}</div>
          </div>
        </Link>
      ))}
    </div>
  )
}

export function ShareScreen() {
  const { me } = useGame()
  const [status, setStatus] = useState<string | null>(null)
  if (!me) return null
  const stats = playerStats(me)
  const bond = stats.bestBond
  const cards = [
    { kicker: "Precisión", title: `${stats.precision}%`, subtitle: "de acierto en VibeLeague" },
    { kicker: "Racha", title: `${me.bestHitStreak}`, subtitle: "aciertos seguidos" },
    { kicker: "Nivel", title: `${me.profile.name}`, subtitle: `${me.xp} XP en el círculo` },
    bond ? { kicker: "Conexión", title: `${bond.score}%`, subtitle: `con ${who(me, bond.id).name}` } : null,
  ].filter((card): card is { kicker: string; title: string; subtitle: string } => card != null)

  async function share(card: { kicker: string; title: string; subtitle: string }) {
    const canvas = document.createElement("canvas")
    canvas.width = 1080
    canvas.height = 1350
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    const gradient = ctx.createLinearGradient(0, 0, 1080, 1350)
    gradient.addColorStop(0, "#2a1248")
    gradient.addColorStop(0.55, "#7c1d6f")
    gradient.addColorStop(1, "#10243a")
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, 1080, 1350)
    ctx.fillStyle = "rgba(255,255,255,0.08)"
    ctx.fillRect(70, 80, 940, 1190)
    ctx.fillStyle = "#c4b5fd"
    ctx.font = "700 42px sans-serif"
    ctx.fillText(card.kicker.toUpperCase(), 130, 240)
    ctx.fillStyle = "#ffffff"
    ctx.font = "800 120px sans-serif"
    ctx.fillText(card.title, 130, 430)
    ctx.fillStyle = "#e9d5ff"
    ctx.font = "600 48px sans-serif"
    wrap(ctx, card.subtitle, 130, 540, 820, 64)
    ctx.fillStyle = "#ffffff"
    ctx.font = "800 40px sans-serif"
    ctx.fillText("VibeLeague", 130, 1140)
    ctx.fillStyle = "#a78bfa"
    ctx.font = "600 32px sans-serif"
    ctx.fillText("League Studios", 130, 1190)
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"))
    if (!blob) return
    const file = new File([blob], "vibe-league.png", { type: "image/png" })
    if (navigator.share && navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], title: "VibeLeague", text: `${card.kicker}: ${card.title}` })
      setStatus("Listo para WhatsApp, Instagram, TikTok o X.")
      return
    }
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = "vibe-league.png"
    link.click()
    URL.revokeObjectURL(url)
    setStatus("Imagen descargada. Ya puedes subirla donde quieras.")
  }

  return (
    <div className="stack">
      <p className="kicker">Compartir</p>
      <h1 className="display" style={{ fontSize: "2rem", margin: 0 }}>Tus cartas</h1>
      {cards.map((card) => (
        <article key={card.kicker} className="card stack share-preview">
          <p className="kicker">{card.kicker}</p>
          <strong className="display" style={{ fontSize: "2rem" }}>{card.title}</strong>
          <p className="muted" style={{ margin: 0 }}>{card.subtitle}</p>
          <button className="btn btn-primary" type="button" onClick={() => void share(card)}>Compartir imagen</button>
        </article>
      ))}
      {status ? <p>{status}</p> : null}
    </div>
  )
}

function wrap(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, max: number, line: number) {
  const words = text.split(" ")
  let row = ""
  let top = y
  for (const word of words) {
    const trial = row ? `${row} ${word}` : word
    if (ctx.measureText(trial).width > max) {
      ctx.fillText(row, x, top)
      row = word
      top += line
    } else row = trial
  }
  if (row) ctx.fillText(row, x, top)
}

export function DuoScreen() {
  const game = useGame()
  const me = game.me
  const [partner, setPartner] = useState<string | null>(null)
  const [steps, setSteps] = useState<{ targetId: string; questionId: string }[] | null>(null)
  const [summary, setSummary] = useState<Summary | null>(null)
  const [opp, setOpp] = useState<number | null>(null)
  if (!me) return null
  const board = duoBoard(me)
  const rivals = me.friends.filter((friend) => friend.id !== partner).slice(0, 2)

  if (summary && partner && opp != null) {
    const won = summary.correct >= opp
    return (
      <div className="stack">
        <SummaryCard
          title={won ? "Vuestro dúo manda." : "El otro lado os ha leído."}
          summary={summary}
          extra={`Ellos: ${opp} aciertos · Vosotros: ${summary.correct}`}
          onAgain={() => { setSummary(null); setSteps(null); setPartner(null); setOpp(null) }}
          onHome={() => { setSummary(null); setSteps(null) }}
        />
      </div>
    )
  }

  if (steps && partner) {
    return (
      <MatchPlay
        kicker={`Dúo · ${who(me, partner).name}`}
        steps={steps}
        mode="duo"
        onDone={(result) => {
          const hits = knownRivalHits(me, rivals.map((friend) => friend.id), steps)
          const won = result.correct >= hits
          game.saveDuo(partner, result.correct * 10, won)
          setOpp(hits)
          setSummary(result)
        }}
      />
    )
  }

  return (
    <div className="stack">
      <Top title="Duo League" back="/play" />
      <p className="muted">Dos amigos contra otros dos. Los puntos salen de cuánto os conocéis.</p>
      {board.best ? <p className="card">🔥 Mejor dúo: {who(me, board.best.partnerId).name} · {board.best.wins} victorias</p> : null}
      {board.legendary ? <p className="card">❤️ Conexión legendaria con {who(me, board.legendary.id).name}: {board.legendary.score}%</p> : null}
      <h2 className="display" style={{ fontSize: "1.2rem", margin: 0 }}>Elige pareja</h2>
      {me.friends.map((friend) => (
        <button
          key={friend.id}
          className="card person"
          type="button"
          onClick={() => {
            const others = me.friends.filter((item) => item.id !== friend.id).slice(0, 2).map((item) => item.id)
            const targets = [friend.id, ...others]
            if (targets.length < 2) return
            const deck = findQuestionPool().slice(0, 6)
            setPartner(friend.id)
            setSteps(deck.map((question, index) => ({ questionId: question.id, targetId: targets[index % targets.length] })))
          }}
        >
          <Avatar emoji={who(me, friend.id).emoji} />
          <div>
            <strong>{who(me, friend.id).name}</strong>
            <div className="muted">{bondScore(me, me.profile.id, friend.id) == null ? "Sin medir" : `${bondScore(me, me.profile.id, friend.id)}%`}</div>
          </div>
        </button>
      ))}
      {board.ranked.length ? (
        <>
          <h2 className="display" style={{ fontSize: "1.2rem", margin: 0 }}>Clasificación de dúos</h2>
          {board.ranked.map((duo, index) => (
            <article key={duo.partnerId} className="card between">
              <span>{index === 0 ? "🏆" : index + 1} {me.profile.name} + {who(me, duo.partnerId).name}</span>
              <b>{duo.points}</b>
            </article>
          ))}
        </>
      ) : null}
    </div>
  )
}

function findQuestionPool() {
  return Array.from({ length: 8 }, (_, index) => {
    const question = findQuestion(["q_beach", "q_night", "q_money", "q_plan", "q_solo", "q_gift", "q_film", "q_sport"][index])
    return question
  }).filter((question): question is NonNullable<typeof question> => question != null)
}

function knownRivalHits(
  me: NonNullable<ReturnType<typeof useGame>["me"]>,
  ids: string[],
  steps: { targetId: string; questionId: string }[],
) {
  let hits = 0
  for (const step of steps) {
    const hit = me.guesses.some(
      (guess) => ids.includes(guess.predictorId) && guess.targetId === step.targetId && guess.questionId === step.questionId && guess.correct,
    )
    if (hit) hits += 1
  }
  return hits
}

type Guest = { id: string; name: string }
type Vote = { voterId: string; pickId: string }

export function LikelyScreen() {
  const { me } = useGame()
  const [category, setCategory] = useState<(typeof LIKELY_CATEGORIES)[number][0]>("fiesta")
  const [mode, setMode] = useState<"circle" | "room">("circle")
  const [promptId, setPromptId] = useState(LIKELY_PROMPTS[0].id)
  const [guests, setGuests] = useState<Guest[]>([])
  const [name, setName] = useState("")
  const [votes, setVotes] = useState<Vote[]>([])
  const [voter, setVoter] = useState(0)
  const [phase, setPhase] = useState<"ask" | "cover" | "vote" | "answer" | "done">("ask")
  const [yes, setYes] = useState<boolean | null>(null)
  const [circlePick, setCirclePick] = useState<string | null>(null)
  if (!me) return null
  const prompts = LIKELY_PROMPTS.filter((item) => item.category === category)
  const prompt = prompts.find((item) => item.id === promptId) ?? prompts[0]
  const room = [{ id: me.profile.id, name: me.profile.name }, ...guests]

  function tally(list: Vote[]) {
    const counts = new Map<string, number>()
    for (const vote of list) counts.set(vote.pickId, (counts.get(vote.pickId) ?? 0) + 1)
    return [...counts.entries()].sort((a, b) => b[1] - a[1])
  }

  return (
    <div className="stack">
      <Top title="¿Quién es más probable?" back="/play" />
      <div className="tabs">
        <button type="button" className={mode === "circle" ? "on" : ""} onClick={() => setMode("circle")}>Círculo</button>
        <button type="button" className={mode === "room" ? "on" : ""} onClick={() => setMode("room")}>En persona</button>
      </div>
      <div className="tabs">
        {LIKELY_CATEGORIES.map(([id, label]) => (
          <button key={id} type="button" className={category === id ? "on" : ""} onClick={() => { setCategory(id); setCirclePick(null); setPhase("ask") }}>{label}</button>
        ))}
      </div>
      {prompt ? <h1 className="display" style={{ fontSize: "1.7rem", margin: 0 }}>{prompt.emoji} {prompt.prompt}</h1> : null}
      <div className="tabs">
        {prompts.map((item) => (
          <button key={item.id} type="button" className={item.id === prompt?.id ? "on" : ""} onClick={() => { setPromptId(item.id); setCirclePick(null) }}>{item.emoji}</button>
        ))}
      </div>

      {mode === "circle" && prompt ? (
        <section className="stack">
          {me.friends.map((friend) => (
            <button key={friend.id} className="option" type="button" onClick={() => setCirclePick(friend.id)}>
              {who(me, friend.id).emoji} {who(me, friend.id).name}
            </button>
          ))}
          {circlePick ? <CircleResult pick={circlePick} ids={me.friends.map((friend) => friend.id)} trait={prompt.trait} names={(id) => who(me, id).name} /> : null}
        </section>
      ) : null}

      {mode === "room" && prompt && phase === "ask" ? (
        <section className="stack">
          <form className="row" onSubmit={(event) => {
            event.preventDefault()
            const clean = name.trim()
            if (clean.length < 2) return
            setGuests([...guests, { id: `g-${guests.length}`, name: clean }])
            setName("")
          }}>
            <input className="field" value={name} onChange={(event) => setName(event.target.value)} placeholder="Quién está en la sala" aria-label="Nombre" />
            <button className="btn btn-primary" style={{ width: "auto" }} type="submit">Añadir</button>
          </form>
          {room.map((player) => <article key={player.id} className="card"><strong>{player.name}</strong></article>)}
          <button className="btn btn-primary" type="button" disabled={room.length < 2} onClick={() => { setVotes([]); setVoter(0); setPhase("cover") }}>Empezar votos</button>
        </section>
      ) : null}

      {mode === "room" && phase === "cover" ? (
        <section className="stack">
          <h2 className="display">Pásale el móvil a {room[voter]?.name}.</h2>
          <button className="btn btn-primary" type="button" onClick={() => setPhase("vote")}>Soy {room[voter]?.name}</button>
        </section>
      ) : null}

      {mode === "room" && phase === "vote" ? (
        <section className="stack">
          {room.filter((player) => player.id !== room[voter]?.id).map((player) => (
            <button key={player.id} className="option" type="button" onClick={() => {
              const next = [...votes, { voterId: room[voter].id, pickId: player.id }]
              setVotes(next)
              if (voter + 1 >= room.length) setPhase("answer")
              else { setVoter(voter + 1); setPhase("cover") }
            }}>{player.name}</button>
          ))}
        </section>
      ) : null}

      {mode === "room" && phase === "answer" ? (
        <section className="stack">
          <h2 className="display">{room.find((player) => player.id === tally(votes)[0]?.[0])?.name}, ¿lo harías?</h2>
          <div className="grid-2">
            <button className="btn btn-primary" type="button" onClick={() => { setYes(true); setPhase("done") }}>Sí</button>
            <button className="btn btn-ghost" type="button" onClick={() => { setYes(false); setPhase("done") }}>No</button>
          </div>
        </section>
      ) : null}

      {mode === "room" && phase === "done" ? (
        <section className="stack victory">
          <h2 className="display">La sala ha hablado.</h2>
          {tally(votes).map(([id, count]) => (
            <article key={id} className="card between"><span>{room.find((player) => player.id === id)?.name}</span><b>{count}</b></article>
          ))}
          <p>{yes ? "Y dice que sí." : "Y dice que no."}</p>
          <button className="btn btn-primary" type="button" onClick={() => { setPhase("ask"); setVotes([]); setYes(null) }}>Otra</button>
        </section>
      ) : null}
    </div>
  )
}

function CircleResult({
  pick,
  ids,
  trait,
  names,
}: {
  pick: string
  ids: string[]
  trait: Trait
  names: (id: string) => string
}) {
  const verdict = mostLikely(ids, trait)
  if (verdict.status === "abstain") return <p className="card">{verdict.message}</p>
  const same = verdict.id === pick
  return (
    <article className="card stack">
      <strong>{same ? "El círculo y tú coincidís." : "Hay debate."}</strong>
      <p>Tú votaste a {names(pick)}.</p>
      <p>El dato señala a {names(verdict.id)}.</p>
    </article>
  )
}
