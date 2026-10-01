"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Guard } from "@/components/shell"
import { pickOnboarding } from "@/lib/logic"
import { useGame } from "@/lib/store"
import type { Choice } from "@/lib/types"

export function OnboardingScreen() {
  const game = useGame()
  const router = useRouter()
  const questions = useMemo(() => pickOnboarding(), [])
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState<{ questionId: string; choice: Choice }[]>([])
  const [done, setDone] = useState(() => {
    try {
      return sessionStorage.getItem("vibe-just-onboarded") === "1"
    } catch {
      return false
    }
  })
  const question = questions[step]

  function choose(choice: Choice) {
    if (!question) return
    const next = [...answers, { questionId: question.id, choice }]
    setAnswers(next)
    if (step + 1 >= questions.length) {
      sessionStorage.setItem("vibe-just-onboarded", "1")
      game.finishOnboarding(next)
      setDone(true)
      return
    }
    setStep(step + 1)
  }

  return (
    <Guard mode="onboarding">
      <div className="page">
        {done ? (
          <div className="stack rise" style={{ minHeight: "100%", justifyContent: "center" }}>
            <p className="kicker">Perfil listo</p>
            <h1 className="display" style={{ fontSize: "2.6rem", margin: 0, lineHeight: 0.95 }}>
              Ya podemos jugar.
            </h1>
            <p className="muted">Cinco respuestas. Primera impresión. El resto se construye jugando.</p>
            <button className="btn btn-primary" type="button" onClick={() => { sessionStorage.removeItem("vibe-just-onboarded"); router.push("/home") }}>
              Entrar a jugar
            </button>
            <button className="btn btn-ghost" type="button" onClick={() => { sessionStorage.removeItem("vibe-just-onboarded"); router.push("/knowledge") }}>
              Seguir respondiendo
            </button>
          </div>
        ) : question ? (
          <div className="stack rise" key={question.id}>
            <p className="kicker">Vamos a conocerte · {step + 1}/5</p>
            <ProgressDots step={step} />
            <h1 className="display" style={{ fontSize: "2.3rem", lineHeight: 1, margin: "12px 0" }}>
              {question.emoji} {question.prompt}
            </h1>
            {question.options.map((option, index) => (
              <button key={option} className="option" type="button" onClick={() => choose(index as Choice)}>
                {option}
              </button>
            ))}
            {step > 0 ? (
              <button className="btn btn-ghost" type="button" onClick={() => { setAnswers(answers.slice(0, -1)); setStep(step - 1) }}>
                Anterior
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    </Guard>
  )
}

function ProgressDots({ step }: { step: number }) {
  return (
    <div className="row" aria-hidden>
      {Array.from({ length: 5 }, (_, index) => (
        <span key={index} style={{ height: 6, flex: 1, borderRadius: 99, background: index <= step ? "linear-gradient(90deg,#22d3ee,#ff4d8d)" : "rgba(255,255,255,.12)", backgroundColor: index <= step ? "#c084fc" : "rgba(255,255,255,.12)" }} />
      ))}
    </div>
  )
}
