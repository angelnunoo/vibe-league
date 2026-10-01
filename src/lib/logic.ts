import { activeEvent, findQuestion, questionIsLiveEvent } from "@/lib/events"
import { QUESTIONS } from "@/lib/questions"
import { levelFromXp, pointsForGuess, scaleByConfidence, SELF_ANSWER_XP, titleFor, xpForGuess } from "@/lib/progression"
import { ABSTAIN_MESSAGE } from "@/lib/predict"
import type {
  Activity,
  Choice,
  Confidence,
  Guess,
  GuessMode,
  League,
  Notice,
  Privacy,
  SeasonArchive,
  UserState,
} from "@/lib/types"
import { blankPulse, defaultPrivacy } from "@/lib/types"
import { npcCard } from "@/lib/world"

const FACES = ["✨", "🦊", "🌙", "🔥", "🎧", "🌊", "⚡", "🍓", "👾", "🦋"]
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
const CAST = new Set(["pablo", "jorge", "carlos", "lucia", "marta", "nora"])

export function uid() {
  return crypto.randomUUID()
}

export function todayKey(date = new Date()) {
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${date.getFullYear()}-${month}-${day}`
}

export function isoWeekKey(date = new Date()) {
  const utc = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const day = utc.getUTCDay() || 7
  utc.setUTCDate(utc.getUTCDate() + 4 - day)
  const yearStart = new Date(Date.UTC(utc.getUTCFullYear(), 0, 1))
  const week = Math.ceil(((utc.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
  return `${utc.getUTCFullYear()}-W${String(week).padStart(2, "0")}`
}

export function timeAgo(iso: string) {
  const seconds = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000)
  if (seconds < 60) return "ahora"
  if (seconds < 3600) return `hace ${Math.floor(seconds / 60)} min`
  if (seconds < 86400) return `hace ${Math.floor(seconds / 3600)} h`
  return `hace ${Math.floor(seconds / 86400)} d`
}

export function greeting(date = new Date()) {
  const hour = date.getHours()
  if (hour < 6) return "Sigue en pie"
  if (hour < 12) return "Buenos días"
  if (hour < 20) return "Buenas tardes"
  return "Buenas noches"
}

function usernameFrom(name: string) {
  const base = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .slice(0, 12)
  const stem = base.length >= 3 ? base : "vibe"
  return `${stem}${Math.floor(Math.random() * 90 + 10)}`
}

export function emojiFrom(name: string) {
  let hash = 0
  for (const char of name) hash = (hash + char.charCodeAt(0)) % FACES.length
  return FACES[hash] ?? "✨"
}

export function makeCode() {
  const bytes = crypto.getRandomValues(new Uint8Array(4))
  return `VL-${Array.from(bytes, (byte) => CODE_ALPHABET[byte % CODE_ALPHABET.length]).join("")}`
}

function pushActivity(user: UserState, item: Activity): UserState {
  return { ...user, activity: [item, ...user.activity].slice(0, 24) }
}

export function dropCast(user: UserState): UserState {
  const fake = (id: string) => CAST.has(id)
  return {
    ...user,
    friends: user.friends.filter((friend) => !fake(friend.id)),
    requests: user.requests.filter((request) => !fake(request.fromId)),
    guesses: user.guesses.filter((guess) => !fake(guess.predictorId) && !fake(guess.targetId)),
    duos: user.duos.filter((duo) => !fake(duo.partnerId)),
    leagues: user.leagues.map((league) => ({
      ...league,
      members: league.members.filter((member) => !fake(member.id)),
    })),
    activity: user.activity.filter((item) => !/Pablo|Jorge|Carlos|Luc[ií]a|Marta|Nora/.test(item.text)),
  }
}

export function createNewUser(input: {
  id: string
  email: string
  name: string
  now?: Date
}): UserState {
  const now = input.now ?? new Date()
  const members = [{ id: input.id, weekly: 0, season: 0, historic: 0 }]

  return {
    profile: {
      id: input.id,
      email: input.email.trim().toLowerCase(),
      name: input.name.trim(),
      username: usernameFrom(input.name),
      emoji: emojiFrom(input.name),
      code: makeCode(),
      onboarded: false,
      createdAt: now.toISOString(),
    },
    xp: 0,
    dailyStreak: 0,
    lastPlayDate: null,
    hitStreak: 0,
    bestHitStreak: 0,
    answers: [],
    guesses: [],
    friends: [],
    requests: [],
    leagues: [
      {
        id: "league-intimo",
        name: "Círculo Íntimo",
        code: "VL-NOCHE",
        seasonName: "Temporada 1",
        ownerId: input.id,
        main: true,
        members,
      },
    ],
    activity: [
      {
        id: uid(),
        emoji: "✨",
        text: "Tu círculo empieza contigo. Invita a quien quieras.",
        at: now.toISOString(),
      },
    ],
    achievements: [],
    privacy: { ...defaultPrivacy },
    weekKey: isoWeekKey(now),
    seenLevel: 1,
    ...blankPulse(),
  }
}

export function rolloverWeek(user: UserState, now = new Date()): UserState {
  const key = isoWeekKey(now)
  if (user.weekKey === key) return user
  return {
    ...user,
    weekKey: key,
    leagues: user.leagues.map((league) => ({
      ...league,
      members: league.members.map((member) => ({ ...member, weekly: 0 })),
    })),
  }
}

export function mainLeague(user: UserState) {
  return user.leagues.find((league) => league.main) ?? user.leagues[0] ?? null
}

export function touchPlay(user: UserState, now: Date): UserState {
  const key = todayKey(now)
  if (user.lastPlayDate === key) return user
  const yesterday = todayKey(new Date(now.getTime() - 86400000))
  const dailyStreak = user.lastPlayDate === yesterday ? user.dailyStreak + 1 : 1
  return { ...user, lastPlayDate: key, dailyStreak }
}

export function directedAccuracy(user: UserState, predictorId: string, targetId: string) {
  const list = user.guesses.filter((guess) => guess.predictorId === predictorId && guess.targetId === targetId)
  if (list.length < 3) return null
  return Math.round((list.filter((guess) => guess.correct).length / list.length) * 100)
}

export function bondScore(user: UserState, a: string, b: string) {
  const forward = directedAccuracy(user, a, b)
  const backward = directedAccuracy(user, b, a)
  if (forward == null && backward == null) return null
  if (forward == null) return backward
  if (backward == null) return forward
  return Math.round((forward + backward) / 2)
}

export function bondIcon(score: number) {
  if (score >= 80) return "❤️"
  if (score >= 60) return "🤝"
  return "🌀"
}

export function evaluateAchievements(user: UserState) {
  const have = new Set(user.achievements)
  const mine = user.guesses.filter((guess) => guess.predictorId === user.profile.id)
  if (mine.some((guess) => guess.correct)) have.add("first_hit")
  if (user.bestHitStreak >= 10) have.add("streak_10")

  const onMe = user.guesses.filter((guess) => guess.targetId === user.profile.id)
  const byPredictor = new Map<string, Guess[]>()
  for (const guess of onMe) {
    const list = byPredictor.get(guess.predictorId) ?? []
    list.push(guess)
    byPredictor.set(guess.predictorId, list)
  }
  for (const list of byPredictor.values()) {
    if (list.length >= 8 && list.filter((guess) => guess.correct).length / list.length >= 0.8) {
      have.add("known_too_well")
    }
  }
  if (onMe.length >= 10 && onMe.filter((guess) => guess.correct).length / onMe.length < 0.4) {
    have.add("nobody_understands")
  }

  for (const friend of user.friends) {
    const score = bondScore(user, user.profile.id, friend.id)
    if (score != null && score >= 90) {
      have.add("total_connection")
      have.add("bond_90")
    }
  }

  for (const league of user.leagues) {
    const season = [...league.members].sort((a, b) => b.season - a.season)
    const historic = [...league.members].sort((a, b) => b.historic - a.historic)
    const me = user.profile.id
    if (season[0]?.id === me && season[0].season > (season[1]?.season ?? -1)) have.add("season_top")
    if (historic[0]?.id === me && historic[0].historic > (historic[1]?.historic ?? -1)) have.add("league_champion")
  }

  if (user.dailyStreak >= 30) have.add("streak_30")
  if (user.answers.length >= 40) have.add("self_master")
  if (mine.filter((guess) => guess.correct).length >= 100) have.add("hits_100")
  if (user.duelWins >= 5) have.add("duel_champ")
  if (user.duoWins >= 3) have.add("duo_king")
  if (user.memoryHits > 0) have.add("memory_perfect")
  if (user.eventScores.some((score) => score.played)) have.add("event_join")
  if (user.seasons.some((season) => season.myRank === 1)) have.add("season_champion")
  if (user.lastMvps?.awards.some((award) => award.holderId === user.profile.id)) have.add("weekly_mvp")

  return [...have]
}

export function withSelfAnswer(
  user: UserState,
  input: { questionId: string; choice: Choice; source: "onboarding" | "self" | "party"; now?: Date; silent?: boolean },
): { user: UserState; xpGained: number; leveledUp: { from: number; to: number; title: string } | null } {
  if (user.answers.some((answer) => answer.questionId === input.questionId)) {
    return { user, xpGained: 0, leveledUp: null }
  }
  const now = input.now ?? new Date()
  const previous = levelFromXp(user.xp)
  let next = touchPlay(user, now)
  next = {
    ...next,
    xp: next.xp + SELF_ANSWER_XP,
    answers: [
      ...next.answers,
      { questionId: input.questionId, choice: input.choice, source: input.source, at: now.toISOString() },
    ],
  }
  if (!input.silent) {
    const question = findQuestion(input.questionId)
    next = pushActivity(next, {
      id: uid(),
      emoji: question?.emoji ?? "✨",
      text: "Respondiste una pregunta sobre ti",
      at: now.toISOString(),
    })
  }
  next = { ...next, achievements: evaluateAchievements(next) }
  const level = levelFromXp(next.xp)
  return {
    user: next,
    xpGained: SELF_ANSWER_XP,
    leveledUp: level > previous ? { from: previous, to: level, title: titleFor(level) } : null,
  }
}

export function finishOnboarding(
  user: UserState,
  answers: { questionId: string; choice: Choice }[],
  now = new Date(),
) {
  let next = user
  let leveledUp: { from: number; to: number; title: string } | null = null
  for (const answer of answers) {
    const result = withSelfAnswer(next, { ...answer, source: "onboarding", now, silent: true })
    next = result.user
    if (result.leveledUp) leveledUp = result.leveledUp
  }
  next = {
    ...touchPlay(next, now),
    profile: { ...next.profile, onboarded: true },
  }
  next = pushActivity(next, {
    id: uid(),
    emoji: "✨",
    text: "Tu perfil acaba de nacer",
    at: now.toISOString(),
  })
  return { user: { ...next, achievements: evaluateAchievements(next) }, leveledUp }
}

function nameOf(user: UserState, id: string) {
  if (id === user.profile.id) return user.profile.name
  return user.friends.find((friend) => friend.id === id)?.name ?? npcCard(id)?.name ?? "Alguien"
}

function pushNotice(user: UserState, emoji: string, text: string, href: string, at: string): UserState {
  const item: Notice = { id: uid(), emoji, text, href, at, read: false }
  return { ...user, notices: [item, ...user.notices].slice(0, 40) }
}

function addPoints(user: UserState, leagueId: string, memberId: string, points: number): UserState {
  if (points <= 0) return user
  return {
    ...user,
    leagues: user.leagues.map((league) => {
      if (league.id !== leagueId) return league
      return {
        ...league,
        members: league.members.map((member) =>
          member.id === memberId
            ? {
                ...member,
                weekly: member.weekly + points,
                season: member.season + points,
                historic: member.historic + points,
              }
            : member,
        ),
      }
    }),
  }
}

export function withGuess(
  user: UserState,
  input: {
    predictorId: string
    targetId: string
    targetLabel: string
    actorLabel: string
    questionId: string
    choice: Choice
    answerType: "real_answer" | "ai_prediction"
    correct: boolean
    mode: GuessMode
    leagueId?: string
    now?: Date
    confidence?: Confidence
  },
): {
  user: UserState
  xpGained: number
  points: number
  leveledUp: { from: number; to: number; title: string } | null
  newAchievements: string[]
} {
  const now = input.now ?? new Date()
  const isMe = input.predictorId === user.profile.id
  const before = new Set(user.achievements)
  const previous = levelFromXp(user.xp)
  const bondBefore = isMe ? bondScore(user, user.profile.id, input.targetId) : null
  let next = isMe ? touchPlay(user, now) : user
  let xpGained = 0
  let points = 0
  if (isMe) {
    const scaled = scaleByConfidence(
      xpForGuess(input.correct, input.answerType),
      input.mode === "league" && input.leagueId ? pointsForGuess(input.correct, input.answerType) : 0,
      input.correct,
      input.confidence,
    )
    xpGained = scaled.xp
    points = scaled.points
    next = { ...next, xp: next.xp + xpGained }
    const hitStreak = input.correct ? next.hitStreak + 1 : 0
    next = {
      ...next,
      hitStreak,
      bestHitStreak: Math.max(next.bestHitStreak, hitStreak),
      weekHitBest: Math.max(next.weekHitBest, hitStreak),
    }
    if (points > 0 && input.leagueId) next = addPoints(next, input.leagueId, user.profile.id, points)
    if (questionIsLiveEvent(input.questionId, now)) {
      const gain = input.correct ? (input.confidence === 3 ? 2 : 1) : 0
      const id = activeEvent(now).id
      const current = next.eventScores.find((score) => score.id === id)
      const eventScores = current
        ? next.eventScores.map((score) => (score.id === id ? { ...score, points: score.points + gain, played: true } : score))
        : [...next.eventScores, { id, points: gain, played: true }]
      next = { ...next, eventScores }
    }
  }
  const guess: Guess = {
    id: uid(),
    at: now.toISOString(),
    predictorId: input.predictorId,
    targetId: input.targetId,
    questionId: input.questionId,
    choice: input.choice,
    answerType: input.answerType,
    correct: input.correct,
    mode: input.mode,
    confidence: input.confidence,
  }
  next = { ...next, guesses: [guess, ...next.guesses].slice(0, 500) }
  if (isMe) {
    next = pushActivity(next, {
      id: uid(),
      emoji: input.correct ? "🎯" : "💨",
      text: `${input.correct ? "Acertaste" : "Fallaste"} sobre ${input.targetLabel}`,
      at: now.toISOString(),
    })
    const bondAfter = bondScore(next, user.profile.id, input.targetId)
    if (bondAfter != null && (bondBefore == null ? bondAfter >= 60 : bondAfter > bondBefore)) {
      next = pushNotice(
        next,
        "❤️",
        `Tu conexión con ${input.targetLabel} ha aumentado.`,
        `/friends/${input.targetId}`,
        now.toISOString(),
      )
    }
  } else if (input.targetId === user.profile.id) {
    next = pushActivity(next, {
      id: uid(),
      emoji: input.correct ? "🧠" : "🌀",
      text: `${input.actorLabel} ${input.correct ? "te ha leído" : "no te ha pillado"}`,
      at: now.toISOString(),
    })
    if (input.correct) {
      next = pushNotice(next, "👀", `${input.actorLabel} acertó una predicción difícil sobre ti.`, "/profile", now.toISOString())
    }
  }
  next = { ...next, achievements: evaluateAchievements(next) }
  const level = levelFromXp(next.xp)
  return {
    user: next,
    xpGained,
    points,
    leveledUp: level > previous ? { from: previous, to: level, title: titleFor(level) } : null,
    newAchievements: next.achievements.filter((id) => !before.has(id)),
  }
}

export function nextSelfQuestion(user: UserState) {
  return QUESTIONS.find((question) => !user.answers.some((answer) => answer.questionId === question.id)) ?? null
}

export function pickOnboarding(random: () => number = Math.random) {
  const categories = [...new Set(QUESTIONS.map((question) => question.category))]
  for (let index = categories.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1))
    ;[categories[index], categories[swap]] = [categories[swap], categories[index]]
  }
  return categories.slice(0, 5).map((category) => {
    const pool = QUESTIONS.filter((question) => question.category === category)
    return pool[Math.floor(random() * pool.length)]
  })
}

export function dealMatch(
  targetIds: string[],
  count: number,
  isReady: (targetId: string, questionId: string) => boolean,
) {
  const ready: { targetId: string; questionId: string }[] = []
  const abstain: { targetId: string; questionId: string }[] = []
  for (const targetId of targetIds) {
    for (const question of QUESTIONS) {
      const card = { targetId, questionId: question.id }
      if (isReady(targetId, question.id)) ready.push(card)
      else abstain.push(card)
    }
  }
  shuffle(ready)
  shuffle(abstain)
  return [...ready, ...abstain].slice(0, count)
}

function shuffle<T>(list: T[]) {
  for (let index = list.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(Math.random() * (index + 1))
    ;[list[index], list[swap]] = [list[swap], list[index]]
  }
  return list
}

export type Standing = {
  id: string
  points: number
  rank: number
}

export function standings(league: League, key: "weekly" | "season" | "historic"): Standing[] {
  const sorted = [...league.members].sort((a, b) => b[key] - a[key] || a.id.localeCompare(b.id))
  return sorted.map((member, index) => ({ id: member.id, points: member[key], rank: index + 1 }))
}

export function playerStats(user: UserState) {
  const mine = user.guesses.filter((guess) => guess.predictorId === user.profile.id)
  const hits = mine.filter((guess) => guess.correct).length
  const bonds = user.friends
    .map((friend) => ({ id: friend.id, score: bondScore(user, user.profile.id, friend.id), favorite: friend.favorite }))
    .filter((bond): bond is { id: string; score: number; favorite: boolean } => bond.score != null)
    .sort((a, b) => b.score - a.score)
  const hardestPool = user.friends
    .map((friend) => ({ id: friend.id, score: directedAccuracy(user, user.profile.id, friend.id) }))
    .filter((item): item is { id: string; score: number } => item.score != null)
    .sort((a, b) => a.score - b.score)
  const favorite = user.friends.find((friend) => friend.favorite)
  return {
    precision: mine.length ? Math.round((hits / mine.length) * 100) : 0,
    predictions: mine.length,
    hits,
    answered: user.answers.length,
    bestBond: bonds[0] ?? null,
    hardest: hardestPool[0] ?? null,
    bestFriendId: favorite?.id ?? bonds[0]?.id ?? null,
  }
}

export type Award = {
  id: string
  emoji: string
  label: string
  name: string
  detail: string
}

export function awardsFor(user: UserState, names: (id: string) => string): Award[] {
  const grouped = new Map<string, Guess[]>()
  for (const guess of user.guesses) {
    const list = grouped.get(guess.predictorId) ?? []
    list.push(guess)
    grouped.set(guess.predictorId, list)
  }
  let bestPredictor = { id: "", correct: -1 }
  let precise = { id: "", rate: -1 }
  for (const [id, list] of grouped) {
    const correct = list.filter((guess) => guess.correct).length
    if (correct > bestPredictor.correct) bestPredictor = { id, correct }
    if (list.length >= 8) {
      const rate = correct / list.length
      if (rate > precise.rate) precise = { id, rate }
    }
  }

  const onTarget = new Map<string, Guess[]>()
  for (const guess of user.guesses) {
    const list = onTarget.get(guess.targetId) ?? []
    list.push(guess)
    onTarget.set(guess.targetId, list)
  }
  let known = { id: "", rate: -1 }
  let wild = { id: "", rate: 2 }
  for (const [id, list] of onTarget) {
    if (list.length < 5) continue
    const rate = list.filter((guess) => guess.correct).length / list.length
    if (rate > known.rate) known = { id, rate }
    if (rate < wild.rate) wild = { id, rate }
  }

  const bonds = user.friends
    .map((friend) => ({ id: friend.id, score: bondScore(user, user.profile.id, friend.id) }))
    .filter((bond): bond is { id: string; score: number } => bond.score != null)
    .sort((a, b) => b.score - a.score)

  const name = (id: string) => (id ? names(id) : "—")
  return [
    {
      id: "predictor",
      emoji: "🥇",
      label: "Mejor predictor",
      name: bestPredictor.correct > 0 ? name(bestPredictor.id) : "—",
      detail: bestPredictor.correct > 0 ? `${bestPredictor.correct} aciertos` : "Aún sin datos",
    },
    {
      id: "known",
      emoji: "🧠",
      label: "Mejor conocido",
      name: known.rate >= 0 ? name(known.id) : "—",
      detail: known.rate >= 0 ? `${Math.round(known.rate * 100)}% de acierto` : "Hacen falta 5 intentos",
    },
    {
      id: "wild",
      emoji: "🌀",
      label: "Más impredecible",
      name: wild.rate <= 1 ? name(wild.id) : "—",
      detail: wild.rate <= 1 ? `${Math.round(wild.rate * 100)}% de acierto` : "Hacen falta 5 intentos",
    },
    {
      id: "streak",
      emoji: "🔥",
      label: "Mejor racha",
      name: user.bestHitStreak > 0 ? user.profile.name : "—",
      detail: user.bestHitStreak > 0 ? `${user.bestHitStreak} seguidos` : "Tu racha empieza hoy",
    },
    {
      id: "precision",
      emoji: "🎯",
      label: "Más precisión",
      name: precise.rate >= 0 ? name(precise.id) : "—",
      detail: precise.rate >= 0 ? `${Math.round(precise.rate * 100)}%` : "Mínimo 8 predicciones",
    },
    {
      id: "bond",
      emoji: "❤️",
      label: "Mejor conexión",
      name: bonds[0] ? name(bonds[0].id) : "—",
      detail: bonds[0] ? `${bonds[0].score}%` : "Juega para medirla",
    },
  ]
}

export type KnownPerson = {
  id: string
  name: string
  emoji: string
  code: string
}

export function addFriendByQuery(user: UserState, query: string, people: KnownPerson[]) {
  const needle = query.trim().toLowerCase()
  if (!needle) return { user, error: "Escribe un nombre o un código.", person: null }
  if (user.profile.code.toLowerCase() === needle || user.profile.name.toLowerCase() === needle) {
    return { user, error: "Ese eres tú.", person: null }
  }
  const person =
    people.find((item) => item.code.toLowerCase() === needle || item.name.toLowerCase() === needle) ?? null
  if (!person) return { user, error: "No encontramos a nadie con ese nombre o código.", person: null }
  if (user.friends.some((friend) => friend.id === person.id)) {
    return { user, error: `${person.name} ya está en tu círculo.`, person: null }
  }
  const now = new Date().toISOString()
  return {
    user: pushActivity(
      {
        ...user,
        friends: [
          ...user.friends,
          { id: person.id, favorite: false, name: person.name, emoji: person.emoji, code: person.code },
        ],
      },
      { id: uid(), emoji: person.emoji, text: `${person.name} entró en tu círculo`, at: now },
    ),
    error: null as string | null,
    person,
  }
}

export function acceptRequest(user: UserState, requestId: string) {
  const request = user.requests.find((item) => item.id === requestId)
  if (!request) return user
  const friends = user.friends.some((friend) => friend.id === request.fromId)
    ? user.friends
    : [
        ...user.friends,
        {
          id: request.fromId,
          favorite: false,
          name: request.name,
          emoji: request.emoji,
          code: request.code,
        },
      ]
  const leagues = user.leagues.map((league) => {
    if (!league.main || league.members.some((member) => member.id === request.fromId)) return league
    return {
      ...league,
      members: [...league.members, { id: request.fromId, weekly: 0, season: 0, historic: 0 }],
    }
  })
  return pushActivity(
    { ...user, friends, leagues, requests: user.requests.filter((item) => item.id !== requestId) },
    { id: uid(), emoji: request.emoji, text: `Aceptaste a ${request.name}`, at: new Date().toISOString() },
  )
}

export function declineRequest(user: UserState, requestId: string) {
  return { ...user, requests: user.requests.filter((request) => request.id !== requestId) }
}

export function toggleFavorite(user: UserState, friendId: string) {
  return {
    ...user,
    friends: user.friends.map((friend) =>
      friend.id === friendId ? { ...friend, favorite: !friend.favorite } : friend,
    ),
  }
}

export function createLeague(user: UserState, name: string): UserState {
  const league: League = {
    id: uid(),
    name: name.trim() || "Nueva liga",
    code: makeCode(),
    seasonName: "Temporada 1",
    ownerId: user.profile.id,
    main: user.leagues.length === 0,
    members: [
      { id: user.profile.id, weekly: 0, season: 0, historic: 0 },
      ...user.friends.map((friend) => ({ id: friend.id, weekly: 0, season: 0, historic: 0 })),
    ],
  }
  return pushActivity(
    { ...user, leagues: [...user.leagues, league] },
    { id: uid(), emoji: "🏆", text: `Creaste ${league.name}`, at: new Date().toISOString() },
  )
}

export function setMainLeague(user: UserState, leagueId: string) {
  if (!user.leagues.some((league) => league.id === leagueId)) return user
  return { ...user, leagues: user.leagues.map((league) => ({ ...league, main: league.id === leagueId })) }
}

export function startNewSeason(user: UserState, leagueId: string) {
  const league = user.leagues.find((item) => item.id === leagueId && item.ownerId === user.profile.id)
  if (!league) return user
  const table = standings(league, "season")
  const mine = table.find((row) => row.id === user.profile.id)
  const podium = table.slice(0, 3).map((row) => ({
    id: row.id,
    name: nameOf(user, row.id),
    points: row.points,
    rank: row.rank,
  }))
  const winner = table[0]
  const archive: SeasonArchive = {
    id: uid(),
    leagueId: league.id,
    leagueName: league.name,
    seasonName: league.seasonName,
    closedAt: new Date().toISOString(),
    winnerId: winner?.id ?? user.profile.id,
    winnerName: winner ? nameOf(user, winner.id) : user.profile.name,
    myRank: mine?.rank ?? table.length,
    myPoints: mine?.points ?? 0,
    podium,
    mvps: awardsFor(user, (id) => nameOf(user, id)).map((award) => ({
      id: award.id,
      emoji: award.emoji,
      label: award.label,
      holderId: award.name === "—" ? null : award.name,
      holderName: award.name,
      detail: award.detail,
    })),
  }
  const number = Number(league.seasonName.replace(/\D/g, "")) || 1
  return {
    ...user,
    seasons: [archive, ...user.seasons].slice(0, 24),
    leagues: user.leagues.map((item) => {
      if (item.id !== leagueId) return item
      return {
        ...item,
        seasonName: `Temporada ${number + 1}`,
        members: item.members.map((member) => ({
          ...member,
          historic: member.historic + member.season,
          season: 0,
        })),
      }
    }),
    achievements: evaluateAchievements({
      ...user,
      seasons: [archive, ...user.seasons],
    }),
  }
}

export function reviseSelf(user: UserState, questionId: string, choice: Choice, now = new Date()) {
  const current = user.answers.find((answer) => answer.questionId === questionId)
  if (!current) return withSelfAnswer(user, { questionId, choice, source: "self", now })
  if (current.choice === choice) return { user, xpGained: 0, leveledUp: null as { from: number; to: number; title: string } | null, changed: false }
  const previous = levelFromXp(user.xp)
  const xpGained = 8
  let next = touchPlay(user, now)
  next = {
    ...next,
    xp: next.xp + xpGained,
    answers: next.answers.map((answer) =>
      answer.questionId === questionId ? { ...answer, choice, at: now.toISOString(), source: "self" as const } : answer,
    ),
    revisions: [
      ...next.revisions,
      { questionId, from: current.choice, to: choice, at: now.toISOString(), previousAt: current.at },
    ],
  }
  const question = findQuestion(questionId)
  next = pushActivity(next, {
    id: uid(),
    emoji: question?.emoji ?? "📈",
    text: "Tu preferencia ha cambiado",
    at: now.toISOString(),
  })
  next = { ...next, achievements: evaluateAchievements(next) }
  const level = levelFromXp(next.xp)
  return {
    user: next,
    xpGained,
    leveledUp: level > previous ? { from: previous, to: level, title: titleFor(level) } : null,
    changed: true,
  }
}

export function markDaily(user: UserState, now = new Date()) {
  return { ...user, dailyDoneKey: todayKey(now) }
}

export function awardFlat(user: UserState, xp: number, emoji: string, text: string, now = new Date()) {
  const previous = levelFromXp(user.xp)
  let next = touchPlay(user, now)
  next = { ...next, xp: next.xp + xp }
  next = pushActivity(next, { id: uid(), emoji, text, at: now.toISOString() })
  next = { ...next, achievements: evaluateAchievements(next) }
  const level = levelFromXp(next.xp)
  return {
    user: next,
    xpGained: xp,
    leveledUp: level > previous ? { from: previous, to: level, title: titleFor(level) } : null,
  }
}

export function recallAnswer(user: UserState, questionId: string, choice: Choice, now = new Date()) {
  const saved = user.answers.find((answer) => answer.questionId === questionId)
  if (!saved || user.recalledIds.includes(questionId)) {
    return { user, correct: false, xpGained: 0, leveledUp: null as { from: number; to: number; title: string } | null }
  }
  const correct = saved.choice === choice
  const previous = levelFromXp(user.xp)
  const xpGained = correct ? 28 : 6
  let next = touchPlay(user, now)
  next = {
    ...next,
    xp: next.xp + xpGained,
    recalledIds: [...next.recalledIds, questionId],
    memoryHits: next.memoryHits + (correct ? 1 : 0),
  }
  next = pushActivity(next, {
    id: uid(),
    emoji: correct ? "✅" : "❌",
    text: correct ? "Recordaste una respuesta antigua" : "Esa respuesta antigua se te escapó",
    at: now.toISOString(),
  })
  next = { ...next, achievements: evaluateAchievements(next) }
  const level = levelFromXp(next.xp)
  return {
    user: next,
    correct,
    xpGained,
    leveledUp: level > previous ? { from: previous, to: level, title: titleFor(level) } : null,
  }
}

export function noteDuel(user: UserState, won: boolean) {
  if (!won) return user
  const next = { ...user, duelWins: user.duelWins + 1 }
  return { ...next, achievements: evaluateAchievements(next) }
}

export function noteDuo(user: UserState, input: { partnerId: string; points: number; won: boolean }) {
  const found = user.duos.find((duo) => duo.partnerId === input.partnerId)
  const duos = found
    ? user.duos.map((duo) =>
        duo.partnerId === input.partnerId
          ? { ...duo, points: duo.points + input.points, wins: duo.wins + (input.won ? 1 : 0) }
          : duo,
      )
    : [...user.duos, { partnerId: input.partnerId, points: input.points, wins: input.won ? 1 : 0 }]
  const next = { ...user, duos, duoWins: user.duoWins + (input.won ? 1 : 0) }
  return pushActivity(
    { ...next, achievements: evaluateAchievements(next) },
    {
      id: uid(),
      emoji: input.won ? "❤️" : "🤝",
      text: input.won ? "Vuestro dúo se lleva la partida" : "El otro dúo os ha leído mejor",
      at: new Date().toISOString(),
    },
  )
}

export function patchPrivacy(user: UserState, patch: Partial<Privacy>) {
  return { ...user, privacy: { ...user.privacy, ...patch } }
}

export function setEmoji(user: UserState, emoji: string) {
  return { ...user, profile: { ...user.profile, emoji } }
}

export { ABSTAIN_MESSAGE }
