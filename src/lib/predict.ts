import { dailyQuestionById } from "@/lib/daily-pack"
import { QUESTIONS, type Question } from "@/lib/questions"
import type { Choice, Trait } from "@/lib/types"

export const ABSTAIN_MESSAGE = "No hay datos suficientes para predecir esta respuesta."

export type RealAnswer = {
  userId: string
  questionId: string
  choice: Choice
}

export type Resolution =
  | { status: "real"; type: "real_answer"; choice: Choice }
  | { status: "predicted"; type: "ai_prediction"; choice: Choice; confidence: number }
  | { status: "abstain"; type: "ai_prediction"; message: string }

const TRAITS: Trait[] = ["outgoing", "spender", "adventure", "comfort", "night", "planner"]

function abstain(): Resolution {
  return { status: "abstain", type: "ai_prediction", message: ABSTAIN_MESSAGE }
}

function predictFromEvidence(question: Question, answers: RealAnswer[], catalog: Question[]): Resolution {
  const byId = new Map(catalog.map((item) => [item.id, item]))
  if (!byId.has(question.id)) byId.set(question.id, question)
  for (const answer of answers) {
    if (byId.has(answer.questionId)) continue
    const extra = dailyQuestionById(answer.questionId)
    if (extra) byId.set(extra.id, extra)
  }
  const traits = TRAITS.filter((trait) => question.leans[trait] !== undefined)
  const evidence: Record<Trait, number> = {
    outgoing: 0,
    spender: 0,
    adventure: 0,
    comfort: 0,
    night: 0,
    planner: 0,
  }
  const support: Record<Trait, number> = { ...evidence }
  let relevantAnswers = 0

  for (const answer of answers) {
    const source = byId.get(answer.questionId)
    if (!source || source.id === question.id) continue
    const shares = traits.some((trait) => source.leans[trait] !== undefined)
    if (!shares) continue
    relevantAnswers += 1
    const weight = source.category === question.category ? 2 : 1
    for (const trait of traits) {
      const lean = source.leans[trait]
      if (lean === undefined) continue
      const signal = answer.choice === lean ? 1 : -1
      evidence[trait] += signal * weight
      support[trait] += weight
    }
  }

  if (relevantAnswers < 3) return abstain()

  let score0 = 0
  let score1 = 0
  for (const trait of traits) {
    if (support[trait] === 0) continue
    const lean = question.leans[trait]
    if (lean === undefined) continue
    const signal = evidence[trait]
    if (lean === 0) {
      score0 += signal
      score1 -= signal
    } else {
      score1 += signal
      score0 -= signal
    }
  }

  const margin = Math.abs(score0 - score1)
  if (margin < 2 || score0 === score1) return abstain()

  const choice: Choice = score0 > score1 ? 0 : 1
  const confidence = margin / (Math.abs(score0) + Math.abs(score1) || 1)
  return { status: "predicted", type: "ai_prediction", choice, confidence }
}

export function resolveTargetAnswer(input: {
  targetId: string
  question: Question
  answers: RealAnswer[]
  allowAi: boolean
  catalog?: Question[]
}): Resolution {
  const real = input.answers.find(
    (answer) => answer.userId === input.targetId && answer.questionId === input.question.id,
  )
  if (real) {
    return { status: "real", type: "real_answer", choice: real.choice }
  }
  if (!input.allowAi) return abstain()
  const mine = input.answers.filter((answer) => answer.userId === input.targetId)
  return predictFromEvidence(input.question, mine, input.catalog ?? QUESTIONS)
}
