import { activeEvent, findQuestion } from "@/lib/events"
import { bondScore, isoWeekKey, mainLeague, standings, todayKey, uid } from "@/lib/logic"
import { QUESTIONS } from "@/lib/questions"
import type { Choice, MvpSlot, Trait, UserState } from "@/lib/types"
import { npcCard, npcTrait } from "@/lib/world"

const TRAIT_LABEL: Record<Trait, string> = {
  outgoing: "salir y estar con gente",
  spender: "gastar sin pensarlo",
  adventure: "improvisar",
  comfort: "quedarte en lo conocido",
  night: "alargar la noche",
  planner: "tenerlo todo cerrado",
}

export const LIKELY_PROMPTS: {
  id: string
  category: "graciosas" | "fiesta" | "personalidad" | "arriesgadas" | "amistad"
  emoji: string
  trait: Trait
  prompt: string
}[] = [
  { id: "country", category: "personalidad", emoji: "🧠", trait: "adventure", prompt: "¿Quién es más probable que se vaya a vivir a otro país?" },
  { id: "late", category: "fiesta", emoji: "🎉", trait: "night", prompt: "¿Quién es más probable que sea el último en irse?" },
  { id: "dare", category: "arriesgadas", emoji: "🔥", trait: "adventure", prompt: "¿Quién es más probable que diga que sí a un plan imposible?" },
  { id: "host", category: "amistad", emoji: "👥", trait: "outgoing", prompt: "¿Quién es más probable que organice la siguiente quedada?" },
  { id: "laugh", category: "graciosas", emoji: "😂", trait: "outgoing", prompt: "¿Quién es más probable que se ría en el momento menos oportuno?" },
  { id: "save", category: "personalidad", emoji: "🧠", trait: "planner", prompt: "¿Quién es más probable que llegue con todo apuntado?" },
  { id: "toast", category: "fiesta", emoji: "🍻", trait: "night", prompt: "¿Quién es más probable que pida la última ronda?" },
  { id: "home", category: "amistad", emoji: "🏠", trait: "comfort", prompt: "¿Quién es más probable que cancele para quedarse en casa?" },
]

export const LIKELY_CATEGORIES = [
  ["graciosas", "😂 Graciosas"],
  ["fiesta", "🎉 Fiesta"],
  ["personalidad", "🧠 Personalidad"],
  ["arriesgadas", "🔥 Arriesgadas"],
  ["amistad", "👥 Amistad"],
] as const

function hashDay(day: string) {
  let hash = 2166136261
  for (const char of day) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619)
  return hash >>> 0
}

export function msUntilMidnight(now = new Date()) {
  const next = new Date(now)
  next.setHours(24, 0, 0, 0)
  return Math.max(0, next.getTime() - now.getTime())
}

export function clock(ms: number) {
  const hours = Math.floor(ms / 3600000)
  const minutes = Math.floor((ms % 3600000) / 60000)
  const seconds = Math.floor((ms % 60000) / 1000)
  return `${hours}h ${String(minutes).padStart(2, "0")}m ${String(seconds).padStart(2, "0")}s`
}

export function dailyBoard(user: UserState, now = new Date()) {
  const day = todayKey(now)
  const friends = user.friends
  if (!friends.length) return null
  const seed = hashDay(day)
  const done = user.dailyDoneKey === day
  if (seed % 2 === 0) {
    const question = QUESTIONS[seed % QUESTIONS.length]
    const targetId = friends[seed % friends.length].id
    return { kind: "predict" as const, day, done, question, targetId }
  }
  const prompt = LIKELY_PROMPTS[seed % LIKELY_PROMPTS.length]
  return { kind: "who" as const, day, done, prompt }
}

export function traitScore(answers: { questionId: string; choice: Choice }[], trait: Trait) {
  let total = 0
  let count = 0
  for (const answer of answers) {
    const lean = findQuestion(answer.questionId)?.leans[trait]
    if (lean == null) continue
    count += 1
    total += answer.choice === lean ? 1 : -1
  }
  if (count < 3) return null
  return total / count
}

export function mostLikely(ids: string[], trait: Trait, scoreOf?: (id: string) => number | null) {
  const ranked = ids
    .map((id) => ({ id, score: scoreOf ? scoreOf(id) : npcTrait(id, trait) }))
    .filter((item): item is { id: string; score: number } => item.score != null)
    .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id))
  if (!ranked.length) {
    return { status: "abstain" as const, message: "No hay datos suficientes para predecir esta respuesta." }
  }
  if (ranked.length > 1 && ranked[0].score - ranked[1].score < 0.08) {
    return { status: "abstain" as const, message: "No hay datos suficientes para predecir esta respuesta." }
  }
  return { status: "ready" as const, id: ranked[0].id, score: ranked[0].score }
}

function personName(user: UserState, id: string) {
  if (id === user.profile.id) return user.profile.name
  return user.friends.find((friend) => friend.id === id)?.name ?? npcCard(id)?.name ?? "Alguien"
}

function guessesInWeek(user: UserState, weekKey: string) {
  return user.guesses.filter((guess) => isoWeekKey(new Date(guess.at)) === weekKey)
}

export function weeklyMvps(user: UserState, weekKey = user.weekKey): MvpSlot[] {
  const guesses = guessesInWeek(user, weekKey)
  const byPredictor = new Map<string, { correct: number; total: number }>()
  const byTarget = new Map<string, { correct: number; total: number }>()
  for (const guess of guesses) {
    const predictor = byPredictor.get(guess.predictorId) ?? { correct: 0, total: 0 }
    predictor.total += 1
    if (guess.correct) predictor.correct += 1
    byPredictor.set(guess.predictorId, predictor)
    const target = byTarget.get(guess.targetId) ?? { correct: 0, total: 0 }
    target.total += 1
    if (guess.correct) target.correct += 1
    byTarget.set(guess.targetId, target)
  }

  let king: { id: string; correct: number } | null = null
  let precise: { id: string; rate: number } | null = null
  for (const [id, stat] of byPredictor) {
    if (!king || stat.correct > king.correct) king = { id, correct: stat.correct }
    if (stat.total >= 3) {
      const rate = stat.correct / stat.total
      if (!precise || rate > precise.rate) precise = { id, rate }
    }
  }

  let known: { id: string; rate: number } | null = null
  let wild: { id: string; rate: number } | null = null
  let lost: { id: string; misses: number } | null = null
  for (const [id, stat] of byTarget) {
    if (stat.total >= 3) {
      const rate = stat.correct / stat.total
      if (!known || rate > known.rate) known = { id, rate }
      if (!wild || rate < wild.rate) wild = { id, rate }
    }
    const misses = stat.total - stat.correct
    if (misses > 0 && (!lost || misses > lost.misses)) lost = { id, misses }
  }

  const bonds = user.friends
    .map((friend) => ({ id: friend.id, score: bondScore(user, user.profile.id, friend.id) }))
    .filter((bond): bond is { id: string; score: number } => bond.score != null)
    .sort((a, b) => b.score - a.score)
  const streakHolder = user.weekHitBest > 0 ? user.profile.id : null

  const slot = (id: string, emoji: string, label: string, holderId: string | null, detail: string): MvpSlot => ({
    id,
    emoji,
    label,
    holderId,
    holderName: holderId ? personName(user, holderId) : "—",
    detail,
  })

  return [
    slot("king", "🏆", "Rey Predictor", king && king.correct > 0 ? king.id : null, king && king.correct > 0 ? `${king.correct} aciertos` : "Aún sin datos"),
    slot("known", "🧠", "Mejor Conocido", known?.id ?? null, known ? `${Math.round(known.rate * 100)}%` : "Hacen falta 3 intentos"),
    slot("streak", "🔥", "Mejor Racha", streakHolder, streakHolder ? `${user.weekHitBest} seguidos` : "La racha empieza hoy"),
    slot("precision", "🎯", "Mayor Precisión", precise?.id ?? null, precise ? `${Math.round(precise.rate * 100)}%` : "Mínimo 3 predicciones"),
    slot("wild", "🌀", "Más Impredecible", wild?.id ?? null, wild ? `${Math.round(wild.rate * 100)}% de acierto` : "Hacen falta 3 intentos"),
    slot("lost", "😂", "Más Incomprendido", lost?.id ?? null, lost ? `${lost.misses} fallos sobre esta persona` : "Nadie se ha perdido aún"),
    slot("bond", "❤️", "Mejor Conexión", bonds[0]?.id ?? null, bonds[0] ? `${bonds[0].score}%` : "Juega para medirla"),
  ]
}

function pushNotice(user: UserState, emoji: string, text: string, href: string, at: string): UserState {
  if (user.notices.some((notice) => notice.text === text && notice.at.slice(0, 10) === at.slice(0, 10))) return user
  return {
    ...user,
    notices: [{ id: uid(), emoji, text, href, at, read: false }, ...user.notices].slice(0, 40),
  }
}

export function openDay(user: UserState, now = new Date()): UserState {
  let next = user
  const week = isoWeekKey(now)
  if (next.weekKey !== week) {
    const awards = weeklyMvps(next, next.weekKey)
    const mine = awards.filter((award) => award.holderId === next.profile.id)
    next = {
      ...next,
      lastMvps: { weekKey: next.weekKey, awards },
      weekKey: week,
      weekHitBest: 0,
      leagues: next.leagues.map((league) => ({
        ...league,
        members: league.members.map((member) => ({ ...member, weekly: 0 })),
      })),
    }
    if (mine.length) {
      next = pushNotice(next, "👑", `Has sido MVP semanal: ${mine.map((award) => award.label).join(", ")}.`, "/league", now.toISOString())
      if (!next.achievements.includes("weekly_mvp")) {
        next = { ...next, achievements: [...next.achievements, "weekly_mvp"] }
      }
    }
  }

  const day = todayKey(now)
  if (next.lastNotifiedDay !== day) {
    next = pushNotice(next, "🎯", "Nueva Pregunta del Día. El círculo ya puede responder.", "/daily", now.toISOString())
    next = { ...next, lastNotifiedDay: day }
  }

  const event = activeEvent(now)
  if (next.lastNotifiedEvent !== event.id) {
    next = pushNotice(next, event.emoji, `Nuevo evento disponible: ${event.name}.`, "/play/event", now.toISOString())
    next = { ...next, lastNotifiedEvent: event.id }
  }

  const league = mainLeague(next)
  if (league) {
    const table = standings(league, "season")
    const mine = table.find((row) => row.id === next.profile.id)
    if (mine && next.lastRank != null && mine.rank > next.lastRank) {
      const above = table.find((row) => row.rank === mine.rank - 1)
      if (above) {
        next = pushNotice(next, "🏆", `${personName(next, above.id)} te ha superado.`, "/league", now.toISOString())
      }
    }
    if (mine) next = { ...next, lastRank: mine.rank }
  }

  const oldest = [...next.answers].sort((a, b) => a.at.localeCompare(b.at))[0]
  if (oldest && !next.recalledIds.includes(oldest.questionId) && now.getTime() - new Date(oldest.at).getTime() >= 12 * 3600000) {
    next = pushNotice(next, "🤯", "Tienes una respuesta antigua para recordar.", "/recall", now.toISOString())
  }

  return next
}

export function evolutionOf(user: UserState) {
  return user.revisions
    .map((revision) => {
      const question = findQuestion(revision.questionId)
      if (!question) return null
      return {
        ...revision,
        emoji: question.emoji,
        prompt: question.prompt,
        before: question.options[revision.from],
        after: question.options[revision.to],
      }
    })
    .filter((item): item is NonNullable<typeof item> => item != null)
    .reverse()
}

export function trendLines(user: UserState) {
  const drift = new Map<Trait, number>()
  for (const revision of user.revisions) {
    const question = findQuestion(revision.questionId)
    if (!question) continue
    for (const [trait, option] of Object.entries(question.leans) as [Trait, 0 | 1][]) {
      const before = revision.from === option ? 1 : -1
      const after = revision.to === option ? 1 : -1
      drift.set(trait, (drift.get(trait) ?? 0) + (after - before))
    }
  }
  return [...drift.entries()]
    .filter(([, value]) => value !== 0)
    .map(([trait, value]) => ({
      trait,
      text: value > 0 ? `Te mueves hacia ${TRAIT_LABEL[trait]}.` : `Te alejas de ${TRAIT_LABEL[trait]}.`,
    }))
}

export function ageLabel(iso: string, now = new Date()) {
  const ms = now.getTime() - new Date(iso).getTime()
  const days = Math.floor(ms / 86400000)
  if (days >= 60) {
    const months = Math.max(1, Math.floor(days / 30))
    return `Hace ${months} ${months === 1 ? "mes" : "meses"}`
  }
  if (days >= 1) return `Hace ${days} ${days === 1 ? "día" : "días"}`
  const hours = Math.floor(ms / 3600000)
  if (hours >= 1) return `Hace ${hours} h`
  return "Hace un momento"
}

export function recallDue(user: UserState, now = new Date()) {
  const pending = user.answers
    .filter((answer) => !user.recalledIds.includes(answer.questionId))
    .sort((a, b) => a.at.localeCompare(b.at))
  const target = pending[0]
  if (!target) return null
  if (now.getTime() - new Date(target.at).getTime() < 12 * 3600000) return null
  return target
}

export function seasonStory(user: UserState) {
  const championships = user.seasons.filter((season) => season.myRank === 1).length
  const podiums = user.seasons.filter((season) => season.myRank <= 3 && season.myRank > 0).length
  const best = [...user.seasons].sort((a, b) => a.myRank - b.myRank || b.myPoints - a.myPoints)[0] ?? null
  return { championships, podiums, best }
}

export function duoBoard(user: UserState) {
  const ranked = [...user.duos].sort((a, b) => b.wins - a.wins || b.points - a.points)
  const best = ranked[0] ?? null
  const legendary = user.friends
    .map((friend) => ({ id: friend.id, score: bondScore(user, user.profile.id, friend.id) }))
    .filter((bond): bond is { id: string; score: number } => bond.score != null && bond.score >= 90)
    .sort((a, b) => b.score - a.score)[0] ?? null
  return { ranked, best, legendary }
}
