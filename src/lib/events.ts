import { questionById, type Question } from "@/lib/questions"

function q(
  id: string,
  category: string,
  emoji: string,
  prompt: string,
  options: [string, string],
  leans: Question["leans"],
): Question {
  return { id, category, emoji, prompt, options, leans }
}

export type VibeEvent = {
  id: string
  name: string
  emoji: string
  blurb: string
  theme: string
  badge: string
  questions: Question[]
}

export const EVENTS: VibeEvent[] = [
  {
    id: "fiesta",
    name: "Semana Fiesta",
    emoji: "🍻",
    blurb: "Preguntas de noche, brindis y planes que se alargan.",
    theme: "party",
    badge: "Alma de la fiesta",
    questions: [
      q("evt_after", "noche", "🌃", "¿After o a casa?", ["After", "A casa"], { night: 0, comfort: 1 }),
      q("evt_plusone", "planes", "🎟️", "¿Llevar a alguien o ir solo?", ["Acompañado", "Solo"], { outgoing: 0, adventure: 1 }),
    ],
  },
  {
    id: "gamer",
    name: "Semana Gamer",
    emoji: "🎮",
    blurb: "Una semana de partidas, rangos y quedarse una más.",
    theme: "gamer",
    badge: "Una partida más",
    questions: [
      q("evt_rank", "gustos", "🕹️", "¿Jugar para ganar o para reírte?", ["Para ganar", "Para reírme"], { outgoing: 0, comfort: 1 }),
      q("evt_coop", "planes", "🎯", "¿Cooperativo o todos contra todos?", ["Cooperativo", "Contra todos"], { comfort: 0, adventure: 1 }),
    ],
  },
  {
    id: "viajes",
    name: "Semana Viajes",
    emoji: "✈️",
    blurb: "Maletas, ventanilla y planes que no caben en el mapa.",
    theme: "travel",
    badge: "Siempre en tránsito",
    questions: [
      q("evt_window", "viajes", "🪟", "¿Ventanilla o pasillo?", ["Ventanilla", "Pasillo"], { comfort: 0, planner: 1 }),
      q("evt_return", "viajes", "🧳", "¿Volver el domingo o alargar?", ["Domingo", "Alargar"], { planner: 0, adventure: 1 }),
    ],
  },
  {
    id: "parejas",
    name: "Semana Parejas",
    emoji: "❤️",
    blurb: "Cómo elegís cuando la decisión es de dos.",
    theme: "love",
    badge: "Mitad y mitad",
    questions: [
      q("evt_plan_date", "planes", "💌", "¿Plan sorpresa o plan hablado?", ["Sorpresa", "Hablado"], { adventure: 0, planner: 1 }),
      q("evt_nightin", "casa", "🕯️", "¿Salir juntos o noche en casa?", ["Salir", "En casa"], { outgoing: 0, comfort: 1 }),
    ],
  },
  {
    id: "cine",
    name: "Semana Cine",
    emoji: "🎬",
    blurb: "Butaca, palomitas y el debate de los créditos.",
    theme: "cinema",
    badge: "Quedarse a los créditos",
    questions: [
      q("evt_credits", "gustos", "🎞️", "¿Irte en los créditos o quedarte?", ["Irme", "Quedarme"], { planner: 0, comfort: 1 }),
      q("evt_genre", "gustos", "🍿", "¿Terror o comedia?", ["Terror", "Comedia"], { night: 0, outgoing: 1 }),
    ],
  },
  {
    id: "extrema",
    name: "Semana Extrema",
    emoji: "🔥",
    blurb: "Lo que dirías que sí sin pensarlo dos veces.",
    theme: "extreme",
    badge: "Sin red",
    questions: [
      q("evt_jump", "planes", "🪂", "¿Saltar o mirar desde abajo?", ["Saltar", "Mirar"], { adventure: 0, comfort: 1 }),
      q("evt_dare", "noche", "🌶️", "¿Reto o pasar?", ["Reto", "Paso"], { outgoing: 0, planner: 1 }),
    ],
  },
]

export function weekIndex(date = new Date()) {
  const utc = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const day = utc.getUTCDay() || 7
  utc.setUTCDate(utc.getUTCDate() + 4 - day)
  const yearStart = new Date(Date.UTC(utc.getUTCFullYear(), 0, 1))
  return Math.ceil(((utc.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
}

export function activeEvent(date = new Date()) {
  return EVENTS[weekIndex(date) % EVENTS.length]
}

export function eventQuestion(id: string) {
  for (const event of EVENTS) {
    const found = event.questions.find((question) => question.id === id)
    if (found) return found
  }
  return null
}

export function findQuestion(id: string) {
  return questionById(id) ?? eventQuestion(id)
}

export function questionIsLiveEvent(id: string, date = new Date()) {
  return activeEvent(date).questions.some((question) => question.id === id)
}
