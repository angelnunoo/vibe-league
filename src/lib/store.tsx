"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react"
import type { Question } from "@/lib/questions"
import {
  acceptRequest,
  addFriendByQuery,
  awardFlat,
  createLeague,
  createNewUser,
  dealMatch,
  dropCast,
  declineRequest,
  emojiFrom,
  finishOnboarding,
  markDaily,
  noteDuel,
  noteDuo,
  patchPrivacy,
  recallAnswer,
  reviseSelf,
  setEmoji,
  setMainLeague,
  standings,
  startNewSeason,
  toggleFavorite,
  uid,
  withGuess,
  withSelfAnswer,
} from "@/lib/logic"
import { findQuestion } from "@/lib/events"
import { mostLikely, openDay, traitScore } from "@/lib/pulse"
import { playTone, type Tone } from "@/lib/sound"
import { ACHIEVEMENTS, levelFromXp, titleFor } from "@/lib/progression"
import { resolveTargetAnswer, type Resolution } from "@/lib/predict"
import { createClient } from "@/lib/supabase/client"
import { isSupabaseConfigured } from "@/lib/supabase/env"
import type { Choice, Confidence, GuessMode, Persisted, Privacy, Trait, UserState } from "@/lib/types"
import { blankPulse } from "@/lib/types"
import { npcCard, npcGuess } from "@/lib/world"
import { Confetti } from "@/components/ui"

const STORAGE_KEY = "vibe-league-save-v1"

type Secret = {
  targetId: string
  questionId: string
  choice: Choice
  answerType: "real_answer" | "ai_prediction"
}

export type PublicPrompt =
  | {
      status: "ready"
      token: string
      question: Question
      targetId: string
      targetName: string
      targetEmoji: string
    }
  | {
      status: "abstain"
      question: Question
      targetId: string
      targetName: string
      targetEmoji: string
      message: string
    }

export type Reveal = {
  correct: boolean
  type: "real_answer" | "ai_prediction"
  revealed: string
  xpGained: number
  points: number
  leveledUp: { to: number; title: string } | null
  achievementIds: string[]
  confidence?: Confidence
}

type LevelUp = { to: number; title: string }

type GameApi = {
  ready: boolean
  me: UserState | null
  configured: boolean
  linked: boolean
  levelUp: LevelUp | null
  dismissLevelUp: () => void
  signUp: (input: { name: string; email: string; password: string }) => Promise<string | null>
  signIn: (input: { email: string; password: string }) => Promise<string | null>
  signInGoogle: () => Promise<string | null>
  signOut: () => Promise<void>
  rememberedEmail: string | null
  finishOnboarding: (answers: { questionId: string; choice: Choice }[]) => void
  answerSelf: (questionId: string, choice: Choice, source: "self" | "party") => void
  prepare: (targetId: string, questionId: string) => PublicPrompt | null
  reveal: (token: string, choice: Choice, mode: GuessMode, leagueId?: string, predictorId?: string, confidence?: Confidence) => Reveal | null
  recordKnown: (input: {
    predictorId: string
    predictorName: string
    targetId: string
    targetName: string
    questionId: string
    choice: Choice
    correctChoice: Choice
    mode: GuessMode
  }) => Reveal | null
  deal: (targetIds: string[], count: number) => { targetId: string; questionId: string }[]
  simulateRival: (npcId: string, questionIds: string[]) => { correct: number; total: number }
  createLeague: (name: string) => void
  setMainLeague: (leagueId: string) => void
  startNewSeason: (leagueId: string) => void
  toggleFavorite: (friendId: string) => void
  addFriend: (query: string) => string | null
  acceptRequest: (requestId: string) => void
  declineRequest: (requestId: string) => void
  updatePrivacy: (patch: Partial<Privacy>) => void
  setEmoji: (emoji: string) => void
  markDaily: () => void
  answerWho: (friendId: string, trait: Trait) => { status: "abstain"; message: string } | { status: "ready"; correct: boolean; holderId: string; xp: number } | null
  revise: (questionId: string, choice: Choice) => void
  recall: (questionId: string, choice: Choice) => { correct: boolean; xpGained: number } | null
  noteDuel: (won: boolean) => void
  saveDuo: (partnerId: string, points: number, won: boolean) => void
  setSound: (on: boolean) => void
  readNotices: () => void
  playSound: (kind: Tone) => void
  toast: string | null
  fanfare: { title: string; detail: string } | null
  dismissFanfare: () => void
}

const GameContext = createContext<GameApi | null>(null)

function emptySave(): Persisted {
  return { version: 1, accounts: {}, sessionUserId: null, users: {}, supabaseUserId: null }
}

function migrateUser(user: UserState): UserState {
  const base = blankPulse()
  const next = dropCast({
    ...base,
    ...user,
    revisions: user.revisions ?? base.revisions,
    notices: user.notices ?? base.notices,
    dailyDoneKey: user.dailyDoneKey ?? null,
    eventScores: user.eventScores ?? [],
    lastMvps: user.lastMvps ?? null,
    weekHitBest: user.weekHitBest ?? 0,
    seasons: user.seasons ?? [],
    duos: user.duos ?? [],
    soundOn: user.soundOn ?? true,
    lastNotifiedDay: user.lastNotifiedDay ?? null,
    lastNotifiedEvent: user.lastNotifiedEvent ?? null,
    lastRank: user.lastRank ?? null,
    recalledIds: user.recalledIds ?? [],
    memoryHits: user.memoryHits ?? 0,
    duelWins: user.duelWins ?? 0,
    duoWins: user.duoWins ?? 0,
  })
  return next
}

function readSave(): Persisted {
  if (typeof window === "undefined") return emptySave()
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return emptySave()
    const parsed = JSON.parse(raw) as Persisted
    if (!parsed.users || !parsed.accounts) return emptySave()
    const users: Record<string, UserState> = {}
    for (const [id, user] of Object.entries(parsed.users)) users[id] = migrateUser(user)
    return { ...parsed, version: 1, users }
  } catch {
    return emptySave()
  }
}

async function digest(email: string, password: string) {
  const data = new TextEncoder().encode(`vibe-league:${email}:${password}`)
  const buf = await crypto.subtle.digest("SHA-256", data)
  return Array.from(new Uint8Array(buf), (byte) => byte.toString(16).padStart(2, "0")).join("")
}

function translateAuth(message: string) {
  const text = message.toLowerCase()
  if (text.includes("invalid login") || text.includes("invalid credentials")) return "Correo o contraseña incorrectos."
  if (text.includes("already registered") || text.includes("already been registered")) {
    return "Ese correo ya está en VibeLeague. Entra con tu contraseña."
  }
  if (text.includes("password")) return "La contraseña necesita 6 caracteres como mínimo."
  if (text.includes("email")) return "Revisa el correo. No parece válido."
  if (text.includes("provider") || text.includes("not enabled")) return "Google todavía no está activado en este proyecto."
  return "No hemos podido entrar. Inténtalo de nuevo."
}

function displayName(user: { email?: string; user_metadata?: Record<string, unknown> }) {
  const meta = user.user_metadata ?? {}
  const fromMeta = [meta.display_name, meta.full_name, meta.name].find((value) => typeof value === "string") as
    | string
    | undefined
  return fromMeta || user.email?.split("@")[0] || "Jugador"
}

function personLabel(user: UserState, id: string) {
  if (id === user.profile.id) return user.profile.name
  return user.friends.find((friend) => friend.id === id)?.name ?? npcCard(id)?.name ?? "alguien"
}

function personEmoji(user: UserState, id: string) {
  if (id === user.profile.id) return user.profile.emoji
  return user.friends.find((friend) => friend.id === id)?.emoji ?? npcCard(id)?.emoji ?? emojiFrom(id)
}

function resolveFor(users: Record<string, UserState>, targetId: string, question: Question): Resolution {
  const subject = users[targetId]
  if (!subject) {
    return { status: "abstain", type: "ai_prediction", message: "No hay datos suficientes para predecir esta respuesta." }
  }
  return resolveTargetAnswer({
    targetId,
    question,
    allowAi: subject.privacy.allowAi,
    answers: subject.answers.map((answer) => ({
      userId: targetId,
      questionId: answer.questionId,
      choice: answer.choice,
    })),
  })
}

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [persisted, setPersisted] = useState<Persisted>(emptySave)
  const [ready, setReady] = useState(false)
  const [levelUp, setLevelUp] = useState<LevelUp | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [fanfare, setFanfare] = useState<{ title: string; detail: string } | null>(null)
  const persistedRef = useRef(persisted)
  const secrets = useRef(new Map<string, Secret>())

  const sessionId = persisted.sessionUserId
  const me = sessionId ? persisted.users[sessionId] ?? null : null

  useEffect(() => {
    persistedRef.current = persisted
  }, [persisted])

  useEffect(() => {
    if (!toast) return
    const id = window.setTimeout(() => setToast(null), 2600)
    return () => window.clearTimeout(id)
  }, [toast])

  const writeUser = useCallback((user: UserState, leveled?: { to: number; title: string } | null) => {
    setPersisted((current) => ({
      ...current,
      users: { ...current.users, [user.profile.id]: user },
      sessionUserId: current.sessionUserId ?? user.profile.id,
    }))
    if (leveled) {
      setLevelUp(leveled)
      playTone("level", user.soundOn)
    }
  }, [])

  useEffect(() => {
    let live = true
    ;(async () => {
      let saved = readSave()
      if (isSupabaseConfigured()) {
        try {
          const supabase = createClient()
          const { data } = await supabase.auth.getSession()
          const authUser = data.session?.user
          if (authUser) {
            const existing = saved.users[authUser.id]
            const user = openDay(
              existing
                ? migrateUser(existing)
                : createNewUser({
                    id: authUser.id,
                    email: authUser.email ?? `${authUser.id}@players.vibe`,
                    name: displayName(authUser),
                  }),
            )
            saved = {
              ...saved,
              sessionUserId: authUser.id,
              supabaseUserId: authUser.id,
              users: { ...saved.users, [authUser.id]: user },
            }
          }
        } catch {
          saved = readSave()
        }
      }
      if (saved.sessionUserId && saved.users[saved.sessionUserId]) {
        const user = openDay(migrateUser(saved.users[saved.sessionUserId]))
        saved = { ...saved, users: { ...saved.users, [user.profile.id]: user } }
        const level = levelFromXp(user.xp)
        if (user.profile.onboarded && level > user.seenLevel) {
          setLevelUp({ to: level, title: titleFor(level) })
        }
      }
      if (!live) return
      setPersisted(saved)
      setReady(true)
    })()
    return () => {
      live = false
    }
  }, [])

  useEffect(() => {
    if (!ready) return
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(persisted))
  }, [persisted, ready])

  const api = useMemo<GameApi>(() => {
    const current = () => {
      const save = persistedRef.current
      const id = save.sessionUserId
      return id ? save.users[id] ?? null : null
    }

    return {
      ready,
      me,
      configured: isSupabaseConfigured(),
      linked: Boolean(me && persisted.supabaseUserId === me.profile.id),
      rememberedEmail: persisted.lastEmail ?? Object.keys(persisted.accounts)[0] ?? null,
      levelUp,
      toast,
      fanfare,
      dismissFanfare: () => setFanfare(null),
      dismissLevelUp: () => {
        const user = current()
        if (user) writeUser({ ...user, seenLevel: levelFromXp(user.xp) })
        setLevelUp(null)
      },
      signUp: async ({ name, email, password }) => {
        const key = email.trim().toLowerCase()
        const cleanName = name.trim()
        if (cleanName.length < 2) return "Dinos cómo te llamas."
        if (password.length < 6) return "La contraseña necesita 6 caracteres como mínimo."
        if (isSupabaseConfigured()) {
          const supabase = createClient()
          const { data, error } = await supabase.auth.signUp({
            email: key,
            password,
            options: { data: { display_name: cleanName } },
          })
          if (error) return translateAuth(error.message)
          const id = data.user?.id ?? uid()
          const user = createNewUser({ id, email: key, name: cleanName })
          setPersisted((save) => ({
            ...save,
            lastEmail: key,
            sessionUserId: id,
            supabaseUserId: data.session ? id : save.supabaseUserId,
            users: { ...save.users, [id]: save.users[id] ?? user },
          }))
          return null
        }
        const hash = await digest(key, password)
        let error: string | null = null
        setPersisted((save) => {
          if (save.accounts[key]) {
            error = "Ese correo ya tiene una cuenta."
            return save
          }
          const id = uid()
          const user = createNewUser({ id, email: key, name: cleanName })
          return {
            ...save,
            lastEmail: key,
            accounts: { ...save.accounts, [key]: { email: key, passwordHash: hash, userId: id } },
            sessionUserId: id,
            users: { ...save.users, [id]: user },
          }
        })
        return error
      },
      signIn: async ({ email, password }) => {
        const key = email.trim().toLowerCase()
        if (isSupabaseConfigured()) {
          const supabase = createClient()
          const { data, error } = await supabase.auth.signInWithPassword({ email: key, password })
          if (error) return translateAuth(error.message)
          const authUser = data.user
          if (!authUser) return "No hemos podido entrar."
          setPersisted((save) => {
            const existing = save.users[authUser.id]
            const user =
              existing ??
              createNewUser({
                id: authUser.id,
                email: authUser.email ?? key,
                name: displayName(authUser),
              })
            return {
              ...save,
              lastEmail: key,
              sessionUserId: authUser.id,
              supabaseUserId: authUser.id,
              users: { ...save.users, [authUser.id]: user },
            }
          })
          return null
        }
        const hash = await digest(key, password)
        const account = persistedRef.current.accounts[key]
        if (!account || account.passwordHash !== hash) return "Correo o contraseña incorrectos."
        setPersisted((save) => ({ ...save, sessionUserId: account.userId, lastEmail: key }))
        return null
      },
      signInGoogle: async () => {
        if (!isSupabaseConfigured()) return "Conecta Supabase para entrar con Google."
        const supabase = createClient()
        const { error } = await supabase.auth.signInWithOAuth({
          provider: "google",
          options: { redirectTo: `${window.location.origin}/auth/callback` },
        })
        return error ? translateAuth(error.message) : null
      },
      signOut: async () => {
        if (isSupabaseConfigured()) {
          const supabase = createClient()
          await supabase.auth.signOut()
        }
        setPersisted((save) => ({
          ...save,
          sessionUserId: null,
          lastEmail: save.users[save.sessionUserId ?? ""]?.profile.email ?? save.lastEmail ?? null,
        }))
        setLevelUp(null)
      },
      finishOnboarding: (answers) => {
        const user = current()
        if (!user) return
        const result = finishOnboarding(user, answers)
        writeUser(result.user, result.leveledUp)
      },
      answerSelf: (questionId, choice, source) => {
        const user = current()
        if (!user) return
        const result = withSelfAnswer(user, { questionId, choice, source })
        writeUser(result.user, result.leveledUp)
      },
      prepare: (targetId, questionId) => {
        const user = current()
        const question = findQuestion(questionId)
        if (!user || !question) return null
        const resolution = resolveFor(persistedRef.current.users, targetId, question)
        const base = {
          question,
          targetId,
          targetName: personLabel(user, targetId),
          targetEmoji: personEmoji(user, targetId),
        }
        if (resolution.status === "abstain") {
          return { status: "abstain", ...base, message: resolution.message }
        }
        const token = uid()
        secrets.current.set(token, {
          targetId,
          questionId,
          choice: resolution.choice,
          answerType: resolution.type,
        })
        return { status: "ready", token, ...base }
      },
      reveal: (token, choice, mode, leagueId, predictorId, confidence) => {
        const user = current()
        const secret = secrets.current.get(token)
        if (!user || !secret) return null
        secrets.current.delete(token)
        const question = findQuestion(secret.questionId)
        if (!question) return null
        const actor = predictorId ?? user.profile.id
        const correct = secret.choice === choice
        const result = withGuess(user, {
          predictorId: actor,
          targetId: secret.targetId,
          targetLabel: personLabel(user, secret.targetId),
          actorLabel: personLabel(user, actor),
          questionId: secret.questionId,
          choice,
          answerType: secret.answerType,
          correct,
          mode,
          leagueId,
          confidence,
        })
        writeUser(result.user, result.leveledUp)
        if (result.newAchievements.length) {
          setToast(result.newAchievements.map((id) => ACHIEVEMENTS.find((item) => item.id === id)?.name ?? id).join(", "))
          playTone("level", result.user.soundOn)
        } else if (actor === user.profile.id) {
          playTone(correct ? "hit" : "miss", user.soundOn)
        }
        return {
          correct,
          type: secret.answerType,
          revealed: question.options[secret.choice],
          xpGained: result.xpGained,
          points: result.points,
          leveledUp: result.leveledUp,
          achievementIds: result.newAchievements,
          confidence,
        }
      },
      recordKnown: ({ predictorId, predictorName, targetId, targetName, questionId, choice, correctChoice, mode }) => {
        const user = current()
        const question = findQuestion(questionId)
        if (!user || !question) return null
        if (predictorId !== user.profile.id && targetId !== user.profile.id) return null
        const correct = choice === correctChoice
        const result = withGuess(user, {
          predictorId,
          targetId,
          targetLabel: targetName,
          actorLabel: predictorName,
          questionId,
          choice,
          answerType: "real_answer",
          correct,
          mode,
        })
        writeUser(result.user, result.leveledUp)
        return {
          correct,
          type: "real_answer",
          revealed: question.options[correctChoice],
          xpGained: result.xpGained,
          points: result.points,
          leveledUp: result.leveledUp,
          achievementIds: result.newAchievements,
        }
      },
      deal: (targetIds, count) => {
        const user = current()
        if (!user) return []
        return dealMatch(targetIds, count, (targetId, questionId) => {
          const question = findQuestion(questionId)
          if (!question) return false
          return resolveFor(persistedRef.current.users, targetId, question).status !== "abstain"
        })
      },
      simulateRival: (npcId, questionIds) => {
        let user = current()
        if (!user || !npcCard(npcId)) return { correct: 0, total: 0 }
        let correct = 0
        let total = 0
        for (const questionId of questionIds) {
          const question = findQuestion(questionId)
          if (!question) continue
          const resolution = resolveFor(persistedRef.current.users, user.profile.id, question)
          if (resolution.status === "abstain") continue
          const pick = npcGuess(npcId, resolution.choice)
          const hit = pick === resolution.choice
          const result = withGuess(user, {
            predictorId: npcId,
            targetId: user.profile.id,
            targetLabel: user.profile.name,
            actorLabel: personLabel(user, npcId),
            questionId,
            choice: pick,
            answerType: resolution.type,
            correct: hit,
            mode: "duel",
          })
          user = result.user
          total += 1
          if (hit) correct += 1
        }
        writeUser(user, null)
        return { correct, total }
      },
      createLeague: (name) => {
        const user = current()
        if (!user) return
        writeUser(createLeague(user, name))
      },
      setMainLeague: (leagueId) => {
        const user = current()
        if (!user) return
        writeUser(setMainLeague(user, leagueId))
      },
      startNewSeason: (leagueId) => {
        const user = current()
        if (!user) return
        const league = user.leagues.find((item) => item.id === leagueId)
        const mine = league ? standings(league, "season").find((row) => row.id === user.profile.id) : null
        const next = startNewSeason(user, leagueId)
        writeUser(next)
        if (mine?.rank === 1 && mine.points > 0) {
          setFanfare({ title: "Temporada tuya", detail: `${league?.seasonName ?? "La temporada"} cierra contigo arriba.` })
          playTone("win", next.soundOn)
        }
      },
      toggleFavorite: (friendId) => {
        const user = current()
        if (!user) return
        writeUser(toggleFavorite(user, friendId))
      },
      addFriend: (query) => {
        const user = current()
        if (!user) return "Entra para añadir amigos."
        const people = Object.values(persistedRef.current.users)
          .filter((other) => other.profile.id !== user.profile.id)
          .map((other) => ({
            id: other.profile.id,
            name: other.profile.name,
            emoji: other.profile.emoji,
            code: other.profile.code,
          }))
        const result = addFriendByQuery(user, query, people)
        if (result.error || !result.person) return result.error
        const person = result.person
        const me = result.user
        setPersisted((save) => {
          const other = save.users[person.id]
          const already = other?.friends.some((friend) => friend.id === me.profile.id)
          const back = other && !already
            ? [...other.friends, { id: me.profile.id, favorite: false, name: me.profile.name, emoji: me.profile.emoji, code: me.profile.code }]
            : other?.friends
          return {
            ...save,
            users: {
              ...save.users,
              [me.profile.id]: me,
              ...(other && back ? { [other.profile.id]: { ...other, friends: back } } : {}),
            },
          }
        })
        return null
      },
      acceptRequest: (requestId) => {
        const user = current()
        if (!user) return
        writeUser(acceptRequest(user, requestId))
      },
      declineRequest: (requestId) => {
        const user = current()
        if (!user) return
        writeUser(declineRequest(user, requestId))
      },
      updatePrivacy: (patch) => {
        const user = current()
        if (!user) return
        writeUser(patchPrivacy(user, patch))
      },
      setEmoji: (emoji) => {
        const user = current()
        if (!user) return
        writeUser(setEmoji(user, emoji))
      },
      markDaily: () => {
        const user = current()
        if (!user) return
        writeUser(markDaily(user))
      },
      answerWho: (friendId, trait) => {
        const user = current()
        if (!user) return null
        const verdict = mostLikely(user.friends.map((friend) => friend.id), trait, (id) => {
          const other = persistedRef.current.users[id]
          if (other) return traitScore(other.answers, trait)
          return null
        })
        const dated = markDaily(user)
        if (verdict.status === "abstain") {
          writeUser(dated)
          return verdict
        }
        const correct = verdict.id === friendId
        const awarded = awardFlat(
          dated,
          correct ? 24 : 4,
          correct ? "🎯" : "💨",
          correct ? `Acertaste: ${personLabel(dated, verdict.id)}` : `Era ${personLabel(dated, verdict.id)}`,
        )
        writeUser(awarded.user, awarded.leveledUp)
        playTone(correct ? "hit" : "miss", awarded.user.soundOn)
        return { status: "ready" as const, correct, holderId: verdict.id, xp: awarded.xpGained }
      },
      revise: (questionId, choice) => {
        const user = current()
        if (!user) return
        const result = reviseSelf(user, questionId, choice)
        writeUser(result.user, result.leveledUp)
      },
      recall: (questionId, choice) => {
        const user = current()
        if (!user) return null
        const result = recallAnswer(user, questionId, choice)
        writeUser(result.user, result.leveledUp)
        playTone(result.correct ? "win" : "miss", result.user.soundOn)
        return { correct: result.correct, xpGained: result.xpGained }
      },
      noteDuel: (won) => {
        const user = current()
        if (!user) return
        const next = noteDuel(user, won)
        writeUser(next)
        if (won) playTone("win", next.soundOn)
      },
      saveDuo: (partnerId, points, won) => {
        const user = current()
        if (!user) return
        const next = noteDuo(user, { partnerId, points, won })
        writeUser(next)
        if (won) {
          setFanfare({ title: "Dúo campeón", detail: "Os leéis mejor que el otro lado." })
          playTone("win", next.soundOn)
        }
      },
      setSound: (on) => {
        const user = current()
        if (!user) return
        writeUser({ ...user, soundOn: on })
      },
      readNotices: () => {
        const user = current()
        if (!user) return
        writeUser({ ...user, notices: user.notices.map((notice) => ({ ...notice, read: true })) })
      },
      playSound: (kind) => {
        const user = current()
        playTone(kind, Boolean(user?.soundOn))
      },
    }
  }, [fanfare, levelUp, me, persisted.accounts, persisted.lastEmail, persisted.supabaseUserId, ready, toast, writeUser])

  return (
    <GameContext.Provider value={api}>
      <div className="provider">
        {children}
        {levelUp ? (
          <div className="levelup" role="dialog" aria-modal="true" aria-labelledby="level-title">
            <Confetti />
            <div className="levelup-card">
              <p className="kicker">Nuevo nivel</p>
              <h2 id="level-title" className="display levelup-num">
                {levelUp.to}
              </h2>
              <p className="levelup-title">{levelUp.title}</p>
              <button type="button" className="btn btn-primary" onClick={api.dismissLevelUp}>
                Seguir
              </button>
            </div>
          </div>
        ) : null}
        {fanfare ? (
          <div className="levelup" role="dialog" aria-modal="true">
            <Confetti />
            <div className="levelup-card">
              <p className="kicker">Victoria</p>
              <h2 className="display" style={{ fontSize: "2rem", margin: 0 }}>{fanfare.title}</h2>
              <p>{fanfare.detail}</p>
              <button type="button" className="btn btn-primary" onClick={() => setFanfare(null)}>Seguir</button>
            </div>
          </div>
        ) : null}
        {toast ? <p className="toast" role="status">Logro: {toast}</p> : null}
      </div>
    </GameContext.Provider>
  )
}

export function useGame() {
  const game = useContext(GameContext)
  if (!game) throw new Error("useGame debe usarse dentro de GameProvider")
  return game
}
