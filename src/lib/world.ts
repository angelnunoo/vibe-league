import { QUESTIONS } from "@/lib/questions"
import type { Choice, NpcCard, Trait } from "@/lib/types"

type Npc = NpcCard & {
  skill: number
  allowAi: boolean
  noise: number
  skip: number
  personality: Record<Trait, number>
  categories?: string[]
}

const NPCS: Npc[] = [
  {
    id: "pablo",
    name: "Pablo",
    emoji: "🎧",
    code: "VL-PABLO",
    level: 22,
    online: true,
    skill: 0.74,
    allowAi: true,
    noise: 0.06,
    skip: 0.08,
    weekly: 240,
    season: 860,
    historic: 2420,
    personality: { outgoing: 0.9, spender: 0.75, adventure: 0.15, comfort: -0.2, night: 0.85, planner: -0.45 },
  },
  {
    id: "jorge",
    name: "Jorge",
    emoji: "📚",
    code: "VL-JORGE",
    level: 14,
    online: false,
    skill: 0.63,
    allowAi: true,
    noise: 0.1,
    skip: 0.16,
    weekly: 120,
    season: 540,
    historic: 1310,
    personality: { outgoing: 0.05, spender: -0.35, adventure: 0.35, comfort: 0.25, night: -0.2, planner: 0.85 },
  },
  {
    id: "carlos",
    name: "Carlos",
    emoji: "🌀",
    code: "VL-CARLO",
    level: 11,
    online: true,
    skill: 0.4,
    allowAi: true,
    noise: 0.46,
    skip: 0.2,
    weekly: 80,
    season: 300,
    historic: 980,
    personality: { outgoing: -0.65, spender: 0.15, adventure: 0.8, comfort: -0.55, night: 0.25, planner: -0.4 },
  },
  {
    id: "lucia",
    name: "Lucía",
    emoji: "🌙",
    code: "VL-LUCIA",
    level: 16,
    online: false,
    skill: 0.7,
    allowAi: true,
    noise: 0.05,
    skip: 0.08,
    weekly: 160,
    season: 610,
    historic: 1540,
    categories: ["casa", "planes", "gustos", "tiempo"],
    personality: { outgoing: -0.45, spender: -0.2, adventure: -0.55, comfort: 0.95, night: -0.25, planner: 0.55 },
  },
  {
    id: "marta",
    name: "Marta",
    emoji: "⚡",
    code: "VL-MARTA",
    level: 19,
    online: true,
    skill: 0.69,
    allowAi: true,
    noise: 0.1,
    skip: 0.12,
    weekly: 210,
    season: 790,
    historic: 2010,
    personality: { outgoing: 0.55, spender: -0.45, adventure: 0.9, comfort: -0.15, night: 0.2, planner: 0.35 },
  },
  {
    id: "nora",
    name: "Nora",
    emoji: "🍓",
    code: "VL-NORA1",
    level: 8,
    online: true,
    skill: 0.58,
    allowAi: true,
    noise: 0.1,
    skip: 0.18,
    weekly: 40,
    season: 180,
    historic: 420,
    personality: { outgoing: 0.72, spender: 0.4, adventure: 0.5, comfort: 0.05, night: 0.6, planner: -0.15 },
  },
]

const answerCache = new Map<string, { questionId: string; choice: Choice }[]>()

function hashSeed(id: string) {
  let hash = 2166136261
  for (const char of id) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619)
  return hash >>> 0
}

function mulberry32(seed: number) {
  let value = seed
  return () => {
    value |= 0
    value = (value + 0x6d2b79f5) | 0
    let t = Math.imul(value ^ (value >>> 15), 1 | value)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function preference(npc: Npc, question: (typeof QUESTIONS)[number]): Choice {
  let score0 = 0
  let score1 = 0
  for (const [trait, option] of Object.entries(question.leans) as [Trait, 0 | 1][]) {
    const leaning = npc.personality[trait]
    if (option === 0) {
      score0 += leaning
      score1 -= leaning
    } else {
      score1 += leaning
      score0 -= leaning
    }
  }
  if (score0 === score1) return 0
  return score0 > score1 ? 0 : 1
}

export function directory(): NpcCard[] {
  return NPCS.map((npc) => ({
    id: npc.id,
    name: npc.name,
    emoji: npc.emoji,
    code: npc.code,
    level: npc.level,
    online: npc.online,
    weekly: npc.weekly,
    season: npc.season,
    historic: npc.historic,
  }))
}

export function npcCard(id: string) {
  return directory().find((npc) => npc.id === id) ?? null
}

export function npcAllowsAi(id: string) {
  return NPCS.find((npc) => npc.id === id)?.allowAi ?? false
}

export function npcTrait(id: string, trait: Trait) {
  const npc = NPCS.find((item) => item.id === id)
  if (!npc) return null
  return npc.personality[trait]
}

export function npcAnswers(id: string) {
  const cached = answerCache.get(id)
  if (cached) return cached
  const npc = NPCS.find((item) => item.id === id)
  if (!npc) return []
  const random = mulberry32(hashSeed(id))
  const answers: { questionId: string; choice: Choice }[] = []
  for (const question of QUESTIONS) {
    if (npc.categories && !npc.categories.includes(question.category)) continue
    if (random() < npc.skip) continue
    let choice = preference(npc, question)
    if (random() < npc.noise) choice = choice === 0 ? 1 : 0
    answers.push({ questionId: question.id, choice })
  }
  answerCache.set(id, answers)
  return answers
}

export function npcGuess(id: string, resolved: Choice): Choice {
  const npc = NPCS.find((item) => item.id === id)
  if (!npc) return resolved
  if (Math.random() < npc.skill) return resolved
  return resolved === 0 ? 1 : 0
}

export function findNpc(query: string) {
  const needle = query.trim().toLowerCase()
  return (
    directory().find((npc) => npc.code.toLowerCase() === needle || npc.name.toLowerCase() === needle) ?? null
  )
}
