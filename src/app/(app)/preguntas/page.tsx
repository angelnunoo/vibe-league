"use client"

import { useEffect, useState } from "react"
import { Top } from "@/components/shell"
import { dailyQuestions } from "@/lib/daily-pack"
import { CATEGORY_LABEL } from "@/lib/questions"
import { useGame } from "@/lib/store"
import type { Choice } from "@/lib/types"

function clock(ms: number) {
  const hours = Math.floor(ms / 3600000)
  const minutes = Math.floor((ms % 3600000) / 60000)
  return `${hours}h ${String(minutes).padStart(2, "0")}m`
}

export default function Page() {
  const game = useGame()
  const me = game.me
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 30000)
    return () => window.clearInterval(id)
  }, [])
  if (!me) return null
  const questions = dailyQuestions(new Date(now))
  const known = new Map(me.answers.map((answer) => [answer.questionId, answer.choice]))
  const done = questions.filter((question) => known.has(question.id)).length
  const midnight = new Date(now)
  midnight.setHours(24, 0, 0, 0)

  return (
    <div className="stack">
      <Top title="Preguntas de hoy" back="/profile" />
      <p className="kicker">Voluntario</p>
      <h1 className="display" style={{ fontSize: "2rem", margin: 0 }}>Si quieres, responde.</h1>
      <p className="muted">
        {done}/{questions.length} de hoy. A medianoche salen otras 30. Cada respuesta real afina cómo te predicen.
      </p>
      <p className="pill">Nuevas en {clock(midnight.getTime() - now)}</p>
      <div className="bar" aria-label={`${done} de ${questions.length}`}>
        <span style={{ width: `${Math.round((done / questions.length) * 100)}%` }} />
      </div>
      {questions.map((question) => {
        const choice = known.get(question.id)
        return (
          <article key={question.id} className="card stack">
            <p className="kicker">{question.emoji} {CATEGORY_LABEL[question.category] ?? question.category}</p>
            <h2 className="display" style={{ fontSize: "1.2rem", margin: 0 }}>{question.prompt}</h2>
            {choice == null ? (
              <div className="grid-2">
                {question.options.map((option, index) => (
                  <button key={option} className="option" type="button" onClick={() => game.answerSelf(question.id, index as Choice, "self")}>
                    {option}
                  </button>
                ))}
              </div>
            ) : (
              <p className="muted" style={{ margin: 0 }}>Tu respuesta: {question.options[choice]}</p>
            )}
          </article>
        )
      })}
    </div>
  )
}
