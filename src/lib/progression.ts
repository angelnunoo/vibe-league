export const LEVEL_CAP = 50

export const ACHIEVEMENTS = [
  { id: "first_hit", emoji: "🎯", name: "Primer Acierto", description: "Acierta la respuesta de alguien por primera vez." },
  { id: "streak_10", emoji: "🔥", name: "Racha x10", description: "Encadena 10 aciertos seguidos." },
  { id: "known_too_well", emoji: "🧠", name: "Me conoces demasiado", description: "Alguien acierta el 80% de tus respuestas, con al menos 8 intentos." },
  { id: "league_champion", emoji: "👑", name: "Campeón de Liga", description: "Lidera el histórico de tu liga." },
  { id: "nobody_understands", emoji: "🌀", name: "Nadie me entiende", description: "Menos del 40% de aciertos sobre ti, con 10 intentos o más." },
  { id: "total_connection", emoji: "❤️", name: "Conexión total", description: "Alcanza un 90% de afinidad con alguien." },
  { id: "season_top", emoji: "🏆", name: "Top 1 de temporada", description: "Lidera la clasificación de la temporada." },
  { id: "event_join", emoji: "🎭", name: "Participaste en un evento especial", description: "Entra en un evento temático y responde sus preguntas." },
  { id: "streak_30", emoji: "🔥", name: "30 días seguidos", description: "Vuelve 30 días seguidos." },
  { id: "weekly_mvp", emoji: "👑", name: "MVP semanal", description: "Cierra una semana como MVP de tu círculo." },
  { id: "bond_90", emoji: "❤️", name: "Conexión superior al 90%", description: "Una afinidad llega al 90% o más." },
  { id: "self_master", emoji: "🧠", name: "Te conoces perfectamente", description: "Completa 40 respuestas sobre ti." },
  { id: "hits_100", emoji: "🎯", name: "100 predicciones correctas", description: "Suma 100 aciertos sobre otras personas." },
  { id: "season_champion", emoji: "🏆", name: "Campeón de temporada", description: "Gana una temporada cerrada." },
  { id: "duel_champ", emoji: "⚔️", name: "Campeón de duelos", description: "Gana 5 duelos." },
  { id: "duo_king", emoji: "👥", name: "Rey de Duo League", description: "Gana 3 dúos." },
  { id: "memory_perfect", emoji: "🤯", name: "Memoria perfecta", description: "Aciertas una respuesta antigua tuya." },
] as const

export type AchievementId = (typeof ACHIEVEMENTS)[number]["id"]

export function xpFloor(level: number) {
  if (level <= 1) return 0
  return 40 * (level - 1) * (level - 1)
}

export function levelFromXp(xp: number) {
  let level = 1
  while (level < LEVEL_CAP && xp >= xpFloor(level + 1)) level += 1
  return level
}

export function titleFor(level: number) {
  if (level >= 50) return "Vibe Master"
  if (level >= 30) return "Maestro del Vibe"
  if (level >= 20) return "Lector de Amigos"
  if (level >= 10) return "Conocedor"
  if (level >= 5) return "Observador"
  return "Novato"
}

export function levelProgress(xp: number) {
  const level = levelFromXp(xp)
  const floor = xpFloor(level)
  const next = level >= LEVEL_CAP ? floor : xpFloor(level + 1)
  const span = Math.max(1, next - floor)
  const ratio = level >= LEVEL_CAP ? 1 : Math.min(1, Math.max(0, (xp - floor) / span))
  return { level, title: titleFor(level), floor, next, ratio, xp, maxed: level >= LEVEL_CAP }
}

export function knowledge(count: number) {
  const label =
    count >= 40
      ? "Perfil muy completo"
      : count >= 30
        ? "Te conocemos bastante"
        : count >= 20
          ? "Buen conocimiento"
          : count >= 15
            ? "Empezamos a pillarte"
            : count >= 10
              ? "Ya sabemos algunas cosas"
              : count >= 5
                ? "Primera impresión"
                : "Recién llegado"
  const nextAt = [5, 10, 15, 20, 30, 40].find((step) => step > count) ?? null
  return {
    label,
    percent: Math.min(100, Math.round((count / 40) * 100)),
    nextAt,
  }
}

export function xpForGuess(correct: boolean, type: "real_answer" | "ai_prediction") {
  if (correct) return type === "real_answer" ? 32 : 18
  return type === "real_answer" ? 6 : 4
}

export function pointsForGuess(correct: boolean, type: "real_answer" | "ai_prediction") {
  if (!correct) return 0
  return type === "real_answer" ? 12 : 6
}

export function scaleByConfidence(xp: number, points: number, correct: boolean, confidence?: 0 | 1 | 2 | 3) {
  if (confidence !== 3) return { xp, points }
  if (correct) return { xp: xp * 2, points: points * 2 }
  return { xp: 0, points: 0 }
}

export const SELF_ANSWER_XP = 18
