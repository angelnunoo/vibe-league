"use client"

import Link from "next/link"
import { HomePulse } from "@/components/pulse-screens"
import { Avatar, Progress, who } from "@/components/ui"
import { bondIcon, greeting, mainLeague, nextSelfQuestion, playerStats, standings, timeAgo } from "@/lib/logic"
import { knowledge, levelProgress } from "@/lib/progression"
import { useGame } from "@/lib/store"
import type { Choice } from "@/lib/types"

export function HomeScreen() {
  const game = useGame()
  const me = game.me
  if (!me) return null
  const progress = levelProgress(me.xp)
  const league = mainLeague(me)
  const table = league ? standings(league, "season") : []
  const mine = table.find((row) => row.id === me.profile.id)
  const question = nextSelfQuestion(me)
  const stats = playerStats(me)
  const bond = stats.bestBond
  const profile = knowledge(me.answers.length)
  const online = me.friends
    .map((friend) => ({ ...who(me, friend.id), id: friend.id }))
    .filter((friend) => friend.online)
    .slice(0, 5)

  return (
    <div className="stack rise">
      <div className="between">
        <div>
          <p className="kicker">{greeting()}</p>
          <h1 className="display" style={{ fontSize: "2rem", margin: "4px 0 0" }}>
            {me.profile.name}
          </h1>
        </div>
        <div className="row">
          <span className="pill">🔥 {me.dailyStreak}</span>
          <Avatar emoji={me.profile.emoji} />
        </div>
      </div>

      <section className="card stack">
        <div className="between">
          <div>
            <p className="kicker">Nivel {progress.level}</p>
            <h2 className="display" style={{ fontSize: "1.6rem" }}>{progress.title}</h2>
          </div>
          <strong>{progress.maxed ? "MAX" : `${me.xp - progress.floor}/${progress.next - progress.floor} XP`}</strong>
        </div>
        <Progress value={progress.ratio} />
        <p className="muted" style={{ margin: 0 }}>{profile.label} · {profile.percent}% del perfil</p>
      </section>

      {league && mine ? (
        <Link href="/league" className="card between">
          <div>
            <p className="kicker">{league.seasonName}</p>
            <h2 className="display" style={{ fontSize: "1.4rem" }}>{league.name}</h2>
          </div>
          <div style={{ textAlign: "right" }}>
            <b className="display" style={{ fontSize: "2rem" }}>#{mine.rank}</b>
            <div className="muted">{mine.points} pts</div>
          </div>
        </Link>
      ) : null}

      {question ? (
        <QuestionCard
          emoji={question.emoji}
          prompt={question.prompt}
          options={question.options}
          onChoose={(choice) => game.answerSelf(question.id, choice, "self")}
        />
      ) : (
        <section className="card">
          <h2 className="display">Perfil muy completo</h2>
          <p className="muted">Ya respondiste el banco entero. Tus amigos lo tienen más difícil.</p>
        </section>
      )}

      <Link href="/play" className="btn btn-primary">Jugar ahora</Link>

      <HomePulse />

      <section className="card between">
        <div>
          <p className="kicker">Mejor conexión</p>
          <h2 className="display" style={{ fontSize: "1.4rem" }}>
            {bond ? `${who(me, bond.id).name} ${bondIcon(bond.score)} ${bond.score}%` : "Todavía sin medir"}
          </h2>
          <p className="muted">No es amistad. Es cuánto os leéis.</p>
        </div>
      </section>

      <section>
        <div className="between">
          <h2 className="display" style={{ fontSize: "1.2rem", margin: 0 }}>Conectados</h2>
          <Link href="/friends" className="muted">Ver círculo</Link>
        </div>
        <div className="row" style={{ marginTop: 12 }}>
          {online.length ? online.map((friend) => (
            <Link key={friend.id} href={`/friends/${friend.id}`}>
              <Avatar emoji={friend.emoji} online />
            </Link>
          )) : <p className="muted">Nadie en línea ahora mismo.</p>}
        </div>
      </section>

      <section className="stack">
        <h2 className="display" style={{ fontSize: "1.2rem", margin: 0 }}>Actividad</h2>
        {me.activity.slice(0, 4).map((item) => (
          <article key={item.id} className="card row">
            <span style={{ fontSize: "1.4rem" }}>{item.emoji}</span>
            <div>
              <strong>{item.text}</strong>
              <div className="muted">{timeAgo(item.at)}</div>
            </div>
          </article>
        ))}
      </section>
    </div>
  )
}

function QuestionCard({
  emoji,
  prompt,
  options,
  onChoose,
}: {
  emoji: string
  prompt: string
  options: [string, string]
  onChoose: (choice: Choice) => void
}) {
  return (
    <section className="card stack">
      <p className="kicker">Si quieres</p>
      <p className="muted" style={{ margin: 0 }}>Opcional. Cada respuesta afina cómo te conocen.</p>
      <h2 className="display" style={{ fontSize: "1.45rem" }}>{emoji} {prompt}</h2>
      <div className="grid-2">
        {options.map((option, index) => (
          <button key={option} className="option" type="button" onClick={() => onChoose(index as Choice)}>
            {option}
          </button>
        ))}
      </div>
    </section>
  )
}
