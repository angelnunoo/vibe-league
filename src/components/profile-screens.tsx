"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { knowledge, levelFromXp } from "@/lib/progression"
import { ACHIEVEMENTS } from "@/lib/progression"
import { InstallApp } from "@/components/install-app"
import { findQuestion } from "@/lib/events"
import { CATEGORY_LABEL, QUESTIONS } from "@/lib/questions"
import { useGame } from "@/lib/store"
import type { Choice, Privacy } from "@/lib/types"

const FACES = ["✨", "🦊", "🌙", "🔥", "🎧", "🌊", "⚡", "🍓", "👾", "🦋", "🎯", "👑"]

export function KnowledgeScreen() {
  const game = useGame()
  const me = game.me
  if (!me) return null
  const info = knowledge(me.answers.length)
  const open = QUESTIONS.filter((question) => !me.answers.some((answer) => answer.questionId === question.id)).slice(0, 6)
  return (
    <div className="stack">
      <p className="kicker">{me.answers.length} preguntas respondidas</p>
      <h1 className="display" style={{ fontSize: "2.2rem", margin: 0 }}>{info.label}</h1>
      <div className="bar" aria-label={`${info.percent}% del perfil`}><span style={{ width: `${info.percent}%` }} /></div>
      <p className="muted">{info.percent}% del perfil{info.nextAt ? ` · siguiente hito en ${info.nextAt}` : ""}</p>
      {open.length ? (
        <section className="stack">
          <p className="kicker">Si quieres</p>
          {open.map((question) => (
            <article key={question.id} className="card stack">
              <h2 className="display" style={{ fontSize: "1.25rem", margin: 0 }}>{question.emoji} {question.prompt}</h2>
              <div className="grid-2">
                {question.options.map((option, index) => (
                  <button key={option} className="option" type="button" onClick={() => game.answerSelf(question.id, index as Choice, "self")}>{option}</button>
                ))}
              </div>
            </article>
          ))}
        </section>
      ) : null}
      {me.answers.slice().reverse().slice(0, 12).map((answer) => {
        const question = findQuestion(answer.questionId)
        if (!question) return null
        return (
          <article key={answer.questionId} className="between">
            <span>{question.emoji} {CATEGORY_LABEL[question.category]}</span>
            <strong>{question.options[answer.choice]}</strong>
          </article>
        )
      })}
      <p className="muted">{QUESTIONS.filter((question) => !me.answers.some((answer) => answer.questionId === question.id)).length} del banco fijo siguen en blanco. Ninguna es obligatoria.</p>
      <Link href="/preguntas" className="btn btn-primary">30 de hoy, si quieres</Link>
    </div>
  )
}

export function AchievementsScreen() {
  const { me } = useGame()
  if (!me) return null
  return (
    <div className="stack">
      <p className="kicker">Vitrina</p>
      <h1 className="display" style={{ fontSize: "2rem", margin: 0 }}>Logros</h1>
      {ACHIEVEMENTS.map((achievement) => {
        const unlocked = me.achievements.includes(achievement.id)
        return (
          <article key={achievement.id} className={unlocked ? "card row" : "card row locked"}>
            <span style={{ fontSize: "1.8rem" }}>{achievement.emoji}</span>
            <div>
              <strong>{achievement.name}</strong>
              <p className="muted" style={{ margin: "4px 0 0" }}>{achievement.description}</p>
            </div>
          </article>
        )
      })}
    </div>
  )
}

export function SettingsScreen() {
  const game = useGame()
  const router = useRouter()
  const me = game.me
  if (!me) return null
  const privacy = me.privacy
  return (
    <div className="stack">
      <p className="kicker">Controlas tu círculo</p>
      <h1 className="display" style={{ fontSize: "2rem", margin: 0 }}>Privacidad</h1>
      <div className="row" style={{ flexWrap: "wrap" }}>
        {FACES.map((emoji) => (
          <button key={emoji} className="avatar" type="button" aria-label={`Avatar ${emoji}`} onClick={() => game.setEmoji(emoji)} style={{ outline: me.profile.emoji === emoji ? "2px solid #67e8f9" : undefined }}>
            {emoji}
          </button>
        ))}
      </div>
      <ChoiceRow label="Quién puede verte" value={privacy.visibility} options={[["everyone", "Todos"], ["friends", "Amigos"], ["nobody", "Nadie"]]} onChange={(visibility) => game.updatePrivacy({ visibility: visibility as Privacy["visibility"] })} />
      <ChoiceRow label="Quién puede invitarte" value={privacy.invites} options={[["everyone", "Todos"], ["friends", "Amigos"], ["nobody", "Nadie"]]} onChange={(invites) => game.updatePrivacy({ invites: invites as Privacy["invites"] })} />
      <ChoiceRow label="Quién puede retarte" value={privacy.challenges} options={[["everyone", "Todos"], ["friends", "Amigos"], ["nobody", "Nadie"]]} onChange={(challenges) => game.updatePrivacy({ challenges: challenges as Privacy["challenges"] })} />
      <ChoiceRow label="Respuestas visibles" value={privacy.answers} options={[["only_in_games", "Solo al jugar"], ["friends", "Amigos"], ["nobody", "Nadie"]]} onChange={(answers) => game.updatePrivacy({ answers: answers as Privacy["answers"] })} />
      <Toggle label="Sonidos" hint="Tonos cortos al acertar, subir de nivel o ganar." on={me.soundOn} onToggle={() => game.setSound(!me.soundOn)} />
      <Toggle label="Mis respuestas pueden alimentar predicciones" hint="Si lo apagas, sin respuesta real nadie recibe una predicción sobre ti." on={privacy.allowAi} onToggle={() => game.updatePrivacy({ allowAi: !privacy.allowAi })} />
      <Toggle label="Guardar lo que respondo en persona" hint="Si lo apagas, la sala no escribe en tu perfil." on={privacy.saveParty} onToggle={() => game.updatePrivacy({ saveParty: !privacy.saveParty })} />
      <p className="muted">{game.linked ? "Sesión conectada con Supabase." : "La partida vive en este dispositivo hasta que conectes Supabase."} Tu acceso queda guardado aquí. Nivel {levelFromXp(me.xp)}.</p>
      <InstallApp />
      <button className="btn btn-ghost" type="button" onClick={() => { void game.signOut().then(() => router.push("/")) }}>
        Cerrar sesión
      </button>
    </div>
  )
}

function Toggle({ label, hint, on, onToggle }: { label: string; hint: string; on: boolean; onToggle: () => void }) {
  return (
    <div className="card between">
      <div>
        <strong>{label}</strong>
        <p className="muted" style={{ margin: "4px 0 0" }}>{hint}</p>
      </div>
      <button type="button" className={on ? "switch on" : "switch"} role="switch" aria-checked={on} aria-label={label} onClick={onToggle}>
        <i />
      </button>
    </div>
  )
}

function ChoiceRow({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: string
  options: [string, string][]
  onChange: (value: string) => void
}) {
  const [open, setOpen] = useState(false)
  return (
    <div className="card stack">
      <button type="button" className="between" style={{ background: "transparent", border: 0, padding: 0 }} onClick={() => setOpen(!open)}>
        <span>{label}</span>
        <b>{options.find((option) => option[0] === value)?.[1]}</b>
      </button>
      {open ? (
        <div className="tabs">
          {options.map(([id, text]) => (
            <button key={id} type="button" className={value === id ? "on" : ""} onClick={() => { onChange(id); setOpen(false) }}>{text}</button>
          ))}
        </div>
      ) : null}
    </div>
  )
}
