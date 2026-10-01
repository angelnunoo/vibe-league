export type Choice = 0 | 1

export type Trait =
  | "outgoing"
  | "spender"
  | "adventure"
  | "comfort"
  | "night"
  | "planner"

export type AnswerType = "real_answer" | "ai_prediction"

export type GuessMode = "quick" | "duel" | "league" | "party" | "daily" | "duo" | "likely"

export type Confidence = 0 | 1 | 2 | 3

export type AnswerSource = "onboarding" | "self" | "party"

export type Privacy = {
  visibility: "everyone" | "friends" | "nobody"
  invites: "everyone" | "friends" | "nobody"
  challenges: "everyone" | "friends" | "nobody"
  answers: "only_in_games" | "friends" | "nobody"
  allowAi: boolean
  saveParty: boolean
}

export const defaultPrivacy: Privacy = {
  visibility: "friends",
  invites: "friends",
  challenges: "friends",
  answers: "only_in_games",
  allowAi: true,
  saveParty: true,
}

export type Profile = {
  id: string
  email: string
  name: string
  username: string
  emoji: string
  code: string
  onboarded: boolean
  createdAt: string
}

export type SelfAnswer = {
  questionId: string
  choice: Choice
  source: AnswerSource
  at: string
}

export type Guess = {
  id: string
  at: string
  predictorId: string
  targetId: string
  questionId: string
  choice: Choice
  answerType: AnswerType
  correct: boolean
  mode: GuessMode
  confidence?: Confidence
}

export type FriendLink = {
  id: string
  favorite: boolean
  name?: string
  emoji?: string
  code?: string
}

export type FriendRequest = {
  id: string
  fromId: string
  name: string
  emoji: string
  code: string
  at: string
}

export type LeagueMember = {
  id: string
  weekly: number
  season: number
  historic: number
}

export type League = {
  id: string
  name: string
  code: string
  seasonName: string
  ownerId: string
  main: boolean
  members: LeagueMember[]
}

export type Activity = {
  id: string
  emoji: string
  text: string
  at: string
}

export type Revision = {
  questionId: string
  from: Choice
  to: Choice
  at: string
  previousAt: string
}

export type Notice = {
  id: string
  emoji: string
  text: string
  href: string
  at: string
  read: boolean
}

export type MvpSlot = {
  id: string
  emoji: string
  label: string
  holderId: string | null
  holderName: string
  detail: string
}

export type SeasonArchive = {
  id: string
  leagueId: string
  leagueName: string
  seasonName: string
  closedAt: string
  winnerId: string
  winnerName: string
  myRank: number
  myPoints: number
  podium: { id: string; name: string; points: number; rank: number }[]
  mvps: MvpSlot[]
}

export type DuoRecord = {
  partnerId: string
  points: number
  wins: number
}

export type EventScore = {
  id: string
  points: number
  played: boolean
}

export type UserState = {
  profile: Profile
  xp: number
  dailyStreak: number
  lastPlayDate: string | null
  hitStreak: number
  bestHitStreak: number
  answers: SelfAnswer[]
  guesses: Guess[]
  friends: FriendLink[]
  requests: FriendRequest[]
  leagues: League[]
  activity: Activity[]
  achievements: string[]
  privacy: Privacy
  weekKey: string
  seenLevel: number
  revisions: Revision[]
  notices: Notice[]
  dailyDoneKey: string | null
  eventScores: EventScore[]
  lastMvps: { weekKey: string; awards: MvpSlot[] } | null
  weekHitBest: number
  seasons: SeasonArchive[]
  duos: DuoRecord[]
  soundOn: boolean
  lastNotifiedDay: string | null
  lastNotifiedEvent: string | null
  lastRank: number | null
  recalledIds: string[]
  memoryHits: number
  duelWins: number
  duoWins: number
}

export type NpcCard = {
  id: string
  name: string
  emoji: string
  code: string
  level: number
  online: boolean
  weekly: number
  season: number
  historic: number
}

export type Account = {
  email: string
  passwordHash: string
  userId: string
}

export type Persisted = {
  version: 1
  accounts: Record<string, Account>
  sessionUserId: string | null
  users: Record<string, UserState>
  supabaseUserId: string | null
  lastEmail?: string | null
}

export function blankPulse(): Pick<
  UserState,
  | "revisions"
  | "notices"
  | "dailyDoneKey"
  | "eventScores"
  | "lastMvps"
  | "weekHitBest"
  | "seasons"
  | "duos"
  | "soundOn"
  | "lastNotifiedDay"
  | "lastNotifiedEvent"
  | "lastRank"
  | "recalledIds"
  | "memoryHits"
  | "duelWins"
  | "duoWins"
> {
  return {
    revisions: [],
    notices: [],
    dailyDoneKey: null,
    eventScores: [],
    lastMvps: null,
    weekHitBest: 0,
    seasons: [],
    duos: [],
    soundOn: true,
    lastNotifiedDay: null,
    lastNotifiedEvent: null,
    lastRank: null,
    recalledIds: [],
    memoryHits: 0,
    duelWins: 0,
    duoWins: 0,
  }
}
