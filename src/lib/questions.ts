import type { Trait } from "@/lib/types"

export type Question = {
  id: string
  category: string
  emoji: string
  prompt: string
  options: [string, string]
  leans: Partial<Record<Trait, 0 | 1>>
}

export const CATEGORY_LABEL: Record<string, string> = {
  comida: "Comida",
  viajes: "Viajes",
  dinero: "Dinero",
  planes: "Planes",
  musica: "Música",
  deporte: "Deporte",
  noche: "Noche",
  casa: "Casa",
  estilo: "Estilo",
  gente: "Gente",
  tiempo: "Tiempo",
  gustos: "Gustos",
}

export const QUESTIONS: Question[] = [
  { id: "q_pizza", category: "comida", emoji: "🍕", prompt: "¿Pizza o hamburguesa?", options: ["Pizza", "Hamburguesa"], leans: { comfort: 0, night: 1 } },
  { id: "q_breakfast", category: "comida", emoji: "☕", prompt: "¿Desayuno grande o café y listo?", options: ["Desayuno grande", "Café y listo"], leans: { comfort: 0, planner: 1 } },
  { id: "q_cook", category: "comida", emoji: "🍳", prompt: "¿Cocinar o pedir?", options: ["Cocinar", "Pedir"], leans: { planner: 0, spender: 1 } },
  { id: "q_beach", category: "viajes", emoji: "🏖️", prompt: "¿Playa o montaña?", options: ["Playa", "Montaña"], leans: { comfort: 0, adventure: 1 } },
  { id: "q_solo", category: "viajes", emoji: "🎒", prompt: "¿Viajar solo o acompañado?", options: ["Solo", "Acompañado"], leans: { adventure: 0, outgoing: 1 } },
  { id: "q_plan", category: "viajes", emoji: "🗺️", prompt: "¿Itinerario cerrado o improvisar?", options: ["Itinerario", "Improvisar"], leans: { planner: 0, adventure: 1 } },
  { id: "q_money", category: "dinero", emoji: "💸", prompt: "¿Ahorrar o gastar?", options: ["Ahorrar", "Gastar"], leans: { planner: 0, spender: 1 } },
  { id: "q_gift", category: "dinero", emoji: "🎁", prompt: "¿Regalo útil o regalo sorpresa?", options: ["Útil", "Sorpresa"], leans: { planner: 0, outgoing: 1 } },
  { id: "q_split", category: "dinero", emoji: "💳", prompt: "¿Pagar a medias o invitar yo?", options: ["A medias", "Invito yo"], leans: { planner: 0, spender: 1 } },
  { id: "q_night", category: "planes", emoji: "🏠", prompt: "¿Salir o quedarse en casa?", options: ["Salir", "Quedarme"], leans: { outgoing: 0, night: 0, comfort: 1 } },
  { id: "q_friday", category: "planes", emoji: "📅", prompt: "¿Plan con tiempo o a última hora?", options: ["Con tiempo", "A última hora"], leans: { planner: 0, night: 1 } },
  { id: "q_group", category: "planes", emoji: "👥", prompt: "¿Grupo grande o grupo pequeño?", options: ["Grande", "Pequeño"], leans: { outgoing: 0, comfort: 1 } },
  { id: "q_music", category: "musica", emoji: "🎧", prompt: "¿Playlist o aleatorio?", options: ["Playlist", "Aleatorio"], leans: { planner: 0, adventure: 1 } },
  { id: "q_live", category: "musica", emoji: "🎤", prompt: "¿Concierto o auriculares?", options: ["Concierto", "Auriculares"], leans: { outgoing: 0, comfort: 1 } },
  { id: "q_volume", category: "musica", emoji: "🔊", prompt: "¿Volumen alto o bajo?", options: ["Alto", "Bajo"], leans: { night: 0, comfort: 1 } },
  { id: "q_sport", category: "deporte", emoji: "⚽", prompt: "¿Deporte de equipo o solo?", options: ["Equipo", "Solo"], leans: { outgoing: 0, adventure: 1 } },
  { id: "q_gym", category: "deporte", emoji: "🏃", prompt: "¿Gimnasio o aire libre?", options: ["Gimnasio", "Aire libre"], leans: { planner: 0, adventure: 1 } },
  { id: "q_win", category: "deporte", emoji: "🏅", prompt: "¿Competir o pasarlo bien?", options: ["Competir", "Pasarlo bien"], leans: { outgoing: 0, comfort: 1 } },
  { id: "q_late", category: "noche", emoji: "🌙", prompt: "¿Quedarte hasta tarde o irte pronto?", options: ["Hasta tarde", "Pronto"], leans: { night: 0, planner: 1 } },
  { id: "q_toast", category: "noche", emoji: "🥂", prompt: "¿Brindar o agua?", options: ["Brindar", "Agua"], leans: { outgoing: 0, planner: 1 } },
  { id: "q_dance", category: "noche", emoji: "💃", prompt: "¿Bailar o conversar?", options: ["Bailar", "Conversar"], leans: { outgoing: 0, comfort: 1 } },
  { id: "q_home", category: "casa", emoji: "🛋️", prompt: "¿Orden o caos creativo?", options: ["Orden", "Caos creativo"], leans: { planner: 0, adventure: 1 } },
  { id: "q_pet", category: "casa", emoji: "🐾", prompt: "¿Perro o gato?", options: ["Perro", "Gato"], leans: { outgoing: 0, comfort: 1 } },
  { id: "q_host", category: "casa", emoji: "🚪", prompt: "¿Recibir gente o casa en calma?", options: ["Recibir gente", "Casa en calma"], leans: { outgoing: 0, comfort: 1 } },
  { id: "q_style", category: "estilo", emoji: "🖤", prompt: "¿Todo negro o color?", options: ["Todo negro", "Color"], leans: { night: 0, outgoing: 1 } },
  { id: "q_shop", category: "estilo", emoji: "🛍️", prompt: "¿Marcas o de segunda?", options: ["Marcas", "De segunda"], leans: { spender: 0, planner: 1 } },
  { id: "q_fit", category: "estilo", emoji: "👟", prompt: "¿Arreglado o cómodo?", options: ["Arreglado", "Cómodo"], leans: { planner: 0, comfort: 1 } },
  { id: "q_meet", category: "gente", emoji: "🗣️", prompt: "¿Hablar con desconocidos o quedarte con los tuyos?", options: ["Desconocidos", "Los míos"], leans: { outgoing: 0, comfort: 1 } },
  { id: "q_text", category: "gente", emoji: "💬", prompt: "¿Audio o texto?", options: ["Audio", "Texto"], leans: { outgoing: 0, planner: 1 } },
  { id: "q_secret", category: "gente", emoji: "🤫", prompt: "¿Contarlo todo o guardártelo?", options: ["Contarlo", "Guardármelo"], leans: { outgoing: 0, comfort: 1 } },
  { id: "q_morning", category: "tiempo", emoji: "⏰", prompt: "¿Madrugar o dormir?", options: ["Madrugar", "Dormir"], leans: { planner: 0, night: 1 } },
  { id: "q_weekend", category: "tiempo", emoji: "📆", prompt: "¿Agenda llena o hueco vacío?", options: ["Agenda llena", "Hueco vacío"], leans: { outgoing: 0, comfort: 1 } },
  { id: "q_rush", category: "tiempo", emoji: "⏱️", prompt: "¿Con prisa o con margen?", options: ["Con prisa", "Con margen"], leans: { night: 0, planner: 1 } },
  { id: "q_film", category: "gustos", emoji: "🎬", prompt: "¿Cine o peli en casa?", options: ["Cine", "En casa"], leans: { outgoing: 0, comfort: 1 } },
  { id: "q_book", category: "gustos", emoji: "📚", prompt: "¿Libro o serie?", options: ["Libro", "Serie"], leans: { comfort: 0, night: 1 } },
  { id: "q_season", category: "gustos", emoji: "🌤️", prompt: "¿Verano o invierno?", options: ["Verano", "Invierno"], leans: { outgoing: 0, comfort: 1 } },
  { id: "q_sweet", category: "comida", emoji: "🍰", prompt: "¿Dulce o salado?", options: ["Dulce", "Salado"], leans: { comfort: 0, planner: 1 } },
  { id: "q_spice", category: "comida", emoji: "🌶️", prompt: "¿Picante o suave?", options: ["Picante", "Suave"], leans: { adventure: 0, comfort: 1 } },
  { id: "q_city", category: "viajes", emoji: "🏙️", prompt: "¿Ciudad o pueblo?", options: ["Ciudad", "Pueblo"], leans: { outgoing: 0, comfort: 1 } },
  { id: "q_fly", category: "viajes", emoji: "✈️", prompt: "¿Avión o tren?", options: ["Avión", "Tren"], leans: { spender: 0, planner: 1 } },
  { id: "q_tip", category: "dinero", emoji: "🪙", prompt: "¿Propina generosa o justa?", options: ["Generosa", "Justa"], leans: { spender: 0, planner: 1 } },
  { id: "q_sale", category: "dinero", emoji: "🏷️", prompt: "¿Esperar la rebaja o comprarlo ya?", options: ["Esperar", "Ya"], leans: { planner: 0, spender: 1 } },
  { id: "q_surprise", category: "planes", emoji: "🎁", prompt: "¿Plan sorpresa o plan contado?", options: ["Sorpresa", "Contado"], leans: { adventure: 0, planner: 1 } },
  { id: "q_rain", category: "planes", emoji: "🌧️", prompt: "¿Si llueve, cancelar o salir igual?", options: ["Cancelar", "Salir igual"], leans: { comfort: 0, adventure: 1 } },
  { id: "q_lyrics", category: "musica", emoji: "🎶", prompt: "¿Cantado o instrumental?", options: ["Cantado", "Instrumental"], leans: { outgoing: 0, comfort: 1 } },
  { id: "q_ears", category: "musica", emoji: "🎧", prompt: "¿Compartir auriculares o cada uno lo suyo?", options: ["Compartir", "Cada uno"], leans: { outgoing: 0, comfort: 1 } },
  { id: "q_watch", category: "deporte", emoji: "📺", prompt: "¿Ver el partido o jugarlo?", options: ["Verlo", "Jugarlo"], leans: { comfort: 0, outgoing: 1 } },
  { id: "q_train", category: "deporte", emoji: "🌅", prompt: "¿Entreno de mañana o de noche?", options: ["Mañana", "Noche"], leans: { planner: 0, night: 1 } },
  { id: "q_after", category: "noche", emoji: "🌃", prompt: "¿After o a casa?", options: ["After", "A casa"], leans: { night: 0, comfort: 1 } },
  { id: "q_camera", category: "noche", emoji: "📸", prompt: "¿Fotos de la noche o nada de cámara?", options: ["Fotos", "Nada"], leans: { outgoing: 0, comfort: 1 } },
  { id: "q_plants", category: "casa", emoji: "🪴", prompt: "¿Plantas o espacios vacíos?", options: ["Plantas", "Vacío"], leans: { comfort: 0, planner: 1 } },
  { id: "q_sofa", category: "casa", emoji: "🛋️", prompt: "¿Sofá compartido o cada uno en su sitio?", options: ["Compartido", "Cada uno"], leans: { outgoing: 0, comfort: 1 } },
  { id: "q_scent", category: "estilo", emoji: "🧴", prompt: "¿Perfume o nada?", options: ["Perfume", "Nada"], leans: { outgoing: 0, comfort: 1 } },
  { id: "q_sun", category: "estilo", emoji: "🕶️", prompt: "¿Gafas de sol o gorra?", options: ["Gafas", "Gorra"], leans: { planner: 0, comfort: 1 } },
  { id: "q_call", category: "gente", emoji: "📞", prompt: "¿Llamar o escribir?", options: ["Llamar", "Escribir"], leans: { outgoing: 0, planner: 1 } },
  { id: "q_mute", category: "gente", emoji: "🔕", prompt: "¿Grupo de chat activo o silenciado?", options: ["Activo", "Silenciado"], leans: { outgoing: 0, comfort: 1 } },
  { id: "q_early", category: "tiempo", emoji: "⌚", prompt: "¿Llegar pronto o en punto?", options: ["Pronto", "En punto"], leans: { planner: 0, night: 1 } },
  { id: "q_nap", category: "tiempo", emoji: "😴", prompt: "¿Siesta o seguir?", options: ["Siesta", "Seguir"], leans: { comfort: 0, planner: 1 } },
  { id: "q_board", category: "gustos", emoji: "🎲", prompt: "¿Videojuego o juego de mesa?", options: ["Videojuego", "Mesa"], leans: { night: 0, outgoing: 1 } },
  { id: "q_quiet", category: "gustos", emoji: "🎙️", prompt: "¿Podcast o silencio?", options: ["Podcast", "Silencio"], leans: { outgoing: 0, comfort: 1 } },
]

export function questionById(id: string) {
  return QUESTIONS.find((question) => question.id === id) ?? null
}
