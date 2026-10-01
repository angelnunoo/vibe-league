import type { Question } from "@/lib/questions"
import type { Trait } from "@/lib/types"

const DAY_SIZE = 30

type Stem = {
  id: string
  category: string
  emoji: string
  prompt: string
  options: [string, string]
  leans: Partial<Record<Trait, 0 | 1>>
}

function stem(
  id: string,
  category: string,
  emoji: string,
  prompt: string,
  options: [string, string],
  leans: Partial<Record<Trait, 0 | 1>>,
): Stem {
  return { id, category, emoji, prompt, options, leans }
}

const POOL: Stem[] = [
  stem("soup", "comida", "🥣", "¿Sopa o ensalada?", ["Sopa", "Ensalada"], { comfort: 0, planner: 1 }),
  stem("latebite", "comida", "🌙", "¿Cenar pronto o tarde?", ["Pronto", "Tarde"], { planner: 0, night: 1 }),
  stem("sweetbrk", "comida", "🥐", "¿Desayuno dulce o salado?", ["Dulce", "Salado"], { comfort: 0, planner: 1 }),
  stem("dessert", "comida", "🍰", "¿Siempre postre o casi nunca?", ["Siempre", "Casi nunca"], { spender: 0, planner: 1 }),
  stem("sea", "comida", "🦐", "¿Marisco o carne?", ["Marisco", "Carne"], { adventure: 0, comfort: 1 }),
  stem("brunch", "comida", "🥞", "¿Brunch o comida de toda la vida?", ["Brunch", "De siempre"], { outgoing: 0, comfort: 1 }),
  stem("leftover", "comida", "🥡", "¿Acabar sobras o cocinar otra vez?", ["Sobras", "Cocinar"], { planner: 0, spender: 1 }),
  stem("spark", "comida", "🫧", "¿Agua con gas o sin gas?", ["Con gas", "Sin gas"], { adventure: 0, comfort: 1 }),
  stem("ice", "comida", "🍦", "¿Helado o fruta?", ["Helado", "Fruta"], { comfort: 0, planner: 1 }),
  stem("shareplate", "comida", "🍽️", "¿Compartir platos o cada uno el suyo?", ["Compartir", "El mío"], { outgoing: 0, comfort: 1 }),
  stem("citybreak", "viajes", "🚆", "¿Escapada de ciudad o de campo?", ["Ciudad", "Campo"], { outgoing: 0, comfort: 1 }),
  stem("pack", "viajes", "🧳", "¿Maleta hecha con tiempo o la noche antes?", ["Con tiempo", "La noche antes"], { planner: 0, night: 1 }),
  stem("hotel", "viajes", "🏨", "¿Hotel o casa de alguien?", ["Hotel", "Casa"], { spender: 0, comfort: 1 }),
  stem("map", "viajes", "📍", "¿Mapa en la mano o preguntar por la calle?", ["Mapa", "Preguntar"], { planner: 0, outgoing: 1 }),
  stem("phototrip", "viajes", "📷", "¿Viaje con fotos o sin sacar el móvil?", ["Fotos", "Sin móvil"], { outgoing: 0, comfort: 1 }),
  stem("return", "viajes", "🔁", "¿Volver a un sitio o estrenar destino?", ["Volver", "Estrenar"], { comfort: 0, adventure: 1 }),
  stem("window", "viajes", "🪟", "¿Ventanilla o pasillo?", ["Ventanilla", "Pasillo"], { adventure: 0, planner: 1 }),
  stem("souvenir", "viajes", "🧲", "¿Traer recuerdo o volver ligero?", ["Recuerdo", "Ligero"], { spender: 0, planner: 1 }),
  stem("nightbus", "viajes", "🚌", "¿Viaje de noche o de día?", ["De noche", "De día"], { night: 0, planner: 1 }),
  stem("grouptrip", "viajes", "👫", "¿Viaje en grupo o en pareja mínima?", ["Grupo", "Mínimo"], { outgoing: 0, comfort: 1 }),
  stem("cash", "dinero", "💵", "¿Efectivo o tarjeta?", ["Efectivo", "Tarjeta"], { planner: 0, spender: 1 }),
  stem("budget", "dinero", "📒", "¿Presupuesto escrito o a ojo?", ["Escrito", "A ojo"], { planner: 0, adventure: 1 }),
  stem("treat", "dinero", "🧋", "¿Capricho semanal o aguantar?", ["Capricho", "Aguantar"], { spender: 0, planner: 1 }),
  stem("round", "dinero", "🍻", "¿Pagar la ronda o esperar turno?", ["La ronda", "Mi turno"], { spender: 0, planner: 1 }),
  stem("sale2", "dinero", "🛍️", "¿Comprar ya o apuntarlo?", ["Ya", "Apuntarlo"], { spender: 0, planner: 1 }),
  stem("lend", "dinero", "🤝", "¿Prestar dinero o decir que no?", ["Prestar", "No"], { outgoing: 0, planner: 1 }),
  stem("tip2", "dinero", "🧾", "¿Redondear la cuenta hacia arriba o exacta?", ["Hacia arriba", "Exacta"], { spender: 0, planner: 1 }),
  stem("sub", "dinero", "📺", "¿Suscripciones o nada fijo?", ["Suscripciones", "Nada fijo"], { spender: 0, planner: 1 }),
  stem("split2", "dinero", "🧮", "¿Cuenta al céntimo o a ojo?", ["Al céntimo", "A ojo"], { planner: 0, outgoing: 1 }),
  stem("gift2", "dinero", "💐", "¿Regalo caro y pocos o barato y varios?", ["Caro", "Varios"], { spender: 0, planner: 1 }),
  stem("surprise2", "planes", "🎲", "¿Que te sorprendan o saber la hora?", ["Sorpresa", "La hora"], { adventure: 0, planner: 1 }),
  stem("rain2", "planes", "☔", "¿Plan de interior o salir aunque llueva?", ["Interior", "Salir"], { comfort: 0, adventure: 1 }),
  stem("earlyplan", "planes", "🕖", "¿Quedada temprana o nocturna?", ["Temprana", "Nocturna"], { planner: 0, night: 1 }),
  stem("host2", "planes", "🏠", "¿Organizar tú o dejarte llevar?", ["Organizo", "Me dejo"], { planner: 0, adventure: 1 }),
  stem("plus", "planes", "➕", "¿Sumar gente al plan o dejarlo cerrado?", ["Sumar", "Cerrado"], { outgoing: 0, comfort: 1 }),
  stem("cancel2", "planes", "📵", "¿Cancelar con tiempo o a última hora?", ["Con tiempo", "A última hora"], { planner: 0, night: 1 }),
  stem("walk", "planes", "🚶", "¿Paseo sin rumbo o destino fijo?", ["Sin rumbo", "Destino"], { adventure: 0, planner: 1 }),
  stem("double", "planes", "📅", "¿Dos planes el mismo día o uno solo?", ["Dos", "Uno"], { outgoing: 0, comfort: 1 }),
  stem("invite", "planes", "💌", "¿Invitar tú o esperar a que te llamen?", ["Invito", "Espero"], { outgoing: 0, comfort: 1 }),
  stem("backup", "planes", "🛟", "¿Plan B preparado o improvisar si falla?", ["Plan B", "Improvisar"], { planner: 0, adventure: 1 }),
  stem("lyrics2", "musica", "🎤", "¿Cantar en alto o solo en la ducha?", ["En alto", "En la ducha"], { outgoing: 0, comfort: 1 }),
  stem("newmix", "musica", "🆕", "¿Buscar música nueva o la de siempre?", ["Nueva", "De siempre"], { adventure: 0, comfort: 1 }),
  stem("quietcar", "musica", "🚗", "¿Música en el coche o silencio?", ["Música", "Silencio"], { outgoing: 0, comfort: 1 }),
  stem("live2", "musica", "🎸", "¿Primeras filas o atrás del todo?", ["Delante", "Atrás"], { outgoing: 0, comfort: 1 }),
  stem("sharelist", "musica", "📤", "¿Pasar tu playlist o guardártela?", ["Pasarla", "Guardármela"], { outgoing: 0, comfort: 1 }),
  stem("volume2", "musica", "🔉", "¿Cascos fuera o siempre puestos?", ["Fuera", "Puestos"], { outgoing: 0, comfort: 1 }),
  stem("dance2", "musica", "🕺", "¿Bailar en casa o solo en una fiesta?", ["En casa", "En una fiesta"], { comfort: 0, outgoing: 1 }),
  stem("radio", "musica", "📻", "¿Radio al azar o tu lista?", ["Radio", "Mi lista"], { adventure: 0, planner: 1 }),
  stem("concert", "musica", "🎟️", "¿Entrada cara o verlo en vídeo?", ["Entrada", "Vídeo"], { spender: 0, planner: 1 }),
  stem("genre2", "musica", "🥁", "¿Ritmo para bailar o para pensar?", ["Bailar", "Pensar"], { outgoing: 0, comfort: 1 }),
  stem("team2", "deporte", "🏟️", "¿Verlo con gente o solo?", ["Con gente", "Solo"], { outgoing: 0, comfort: 1 }),
  stem("sweat", "deporte", "💦", "¿Sudar de verdad o un paseo suave?", ["Sudar", "Paseo"], { adventure: 0, comfort: 1 }),
  stem("morning2", "deporte", "🌄", "¿Deporte al amanecer o por la noche?", ["Amanecer", "Noche"], { planner: 0, night: 1 }),
  stem("score", "deporte", "🔢", "¿Llevar la cuenta o jugar sin puntos?", ["La cuenta", "Sin puntos"], { planner: 0, comfort: 1 }),
  stem("join", "deporte", "🙋", "¿Apuntarte a un equipo o ir por libre?", ["Equipo", "Por libre"], { outgoing: 0, adventure: 1 }),
  stem("stretch", "deporte", "🧘", "¿Estirar antes o lanzarte?", ["Estirar", "Lanzarme"], { planner: 0, adventure: 1 }),
  stem("bet", "deporte", "🎯", "¿Apostar el resultado o solo mirar?", ["Apostar", "Mirar"], { spender: 0, planner: 1 }),
  stem("rainrun", "deporte", "🌧️", "¿Entrenar con lluvia o saltártelo?", ["Entrenar", "Saltármelo"], { planner: 0, comfort: 1 }),
  stem("coach", "deporte", "📋", "¿Rutina escrita o según el cuerpo?", ["Escrita", "El cuerpo"], { planner: 0, adventure: 1 }),
  stem("win2", "deporte", "🏆", "¿Jugar a ganar o a reírte?", ["Ganar", "Reírte"], { outgoing: 0, comfort: 1 }),
  stem("lastround", "noche", "🕛", "¿Última y a casa o una más?", ["A casa", "Una más"], { planner: 0, night: 1 }),
  stem("pregame", "noche", "🏠", "¿Previos en casa o directo al sitio?", ["En casa", "Directo"], { comfort: 0, outgoing: 1 }),
  stem("photo2", "noche", "📸", "¿Stories de la noche o cero pruebas?", ["Stories", "Cero"], { outgoing: 0, comfort: 1 }),
  stem("taxi", "noche", "🚕", "¿Irte cuando toca o cuando el cuerpo diga?", ["Cuando toca", "Cuando diga"], { planner: 0, night: 1 }),
  stem("table", "noche", "🪑", "¿Mesa reservada o llegar y ver?", ["Reservada", "Y ver"], { planner: 0, adventure: 1 }),
  stem("toast2", "noche", "🥂", "¿Brindis largo o un choque rápido?", ["Largo", "Rápido"], { outgoing: 0, planner: 1 }),
  stem("stranger", "noche", "🗣️", "¿Hablar con desconocidos o con los tuyos?", ["Desconocidos", "Los míos"], { outgoing: 0, comfort: 1 }),
  stem("coat", "noche", "🧥", "¿Quedarte hasta el cierre o irte con luz?", ["Hasta el cierre", "Con luz"], { night: 0, planner: 1 }),
  stem("snack", "noche", "🍟", "¿Picoteo de madrugada o aguantar?", ["Picoteo", "Aguantar"], { night: 0, planner: 1 }),
  stem("after2", "noche", "🌃", "¿Segunda parada o se acabó?", ["Segunda", "Se acabó"], { night: 0, comfort: 1 }),
  stem("tidy", "casa", "🧹", "¿Recoger al momento o luego?", ["Al momento", "Luego"], { planner: 0, night: 1 }),
  stem("guest", "casa", "🔑", "¿Dar una copia de llaves o no?", ["Sí", "No"], { outgoing: 0, comfort: 1 }),
  stem("light", "casa", "💡", "¿Luces cálidas o blancas?", ["Cálidas", "Blancas"], { comfort: 0, planner: 1 }),
  stem("plant2", "casa", "🌿", "¿Macetas vivas o nada que regar?", ["Macetas", "Nada"], { comfort: 0, planner: 1 }),
  stem("tv", "casa", "📺", "¿Tele de fondo o silencio en casa?", ["De fondo", "Silencio"], { comfort: 0, planner: 1 }),
  stem("bed", "casa", "🛏️", "¿Cama hecha cada día o cuando toca?", ["Cada día", "Cuando toca"], { planner: 0, adventure: 1 }),
  stem("cookhome", "casa", "🍲", "¿Cocina abierta a visitas o solo tuya?", ["Visitas", "Solo mía"], { outgoing: 0, comfort: 1 }),
  stem("scent2", "casa", "🕯️", "¿Casa con olor o neutra?", ["Con olor", "Neutra"], { outgoing: 0, planner: 1 }),
  stem("window2", "casa", "🪟", "¿Ventanas abiertas o todo cerrado?", ["Abiertas", "Cerrado"], { adventure: 0, comfort: 1 }),
  stem("sofa2", "casa", "🛋️", "¿El sofá es de todos o tu sitio fijo?", ["De todos", "Mi sitio"], { outgoing: 0, comfort: 1 }),
  stem("black2", "estilo", "🖤", "¿Un color fijo o cambiar cada día?", ["Fijo", "Cambiar"], { planner: 0, adventure: 1 }),
  stem("shoes", "estilo", "👟", "¿Zapatillas o algo más arreglado?", ["Zapatillas", "Arreglado"], { comfort: 0, planner: 1 }),
  stem("logo", "estilo", "🏷️", "¿Logo a la vista o liso?", ["Logo", "Liso"], { spender: 0, planner: 1 }),
  stem("hair", "estilo", "💇", "¿Peinado pensado o al despertar?", ["Pensado", "Al despertar"], { planner: 0, comfort: 1 }),
  stem("bag", "estilo", "🎒", "¿Bolso preparado o lo justo en el bolsillo?", ["Preparado", "El bolsillo"], { planner: 0, adventure: 1 }),
  stem("scent3", "estilo", "🌸", "¿Perfume antes de salir o nada?", ["Perfume", "Nada"], { outgoing: 0, comfort: 1 }),
  stem("layer", "estilo", "🧥", "¿Capas por si acaso o una prenda?", ["Capas", "Una"], { planner: 0, adventure: 1 }),
  stem("newfit", "estilo", "✨", "¿Estrenar look o repetir el que funciona?", ["Estrenar", "Repetir"], { spender: 0, comfort: 1 }),
  stem("glasses", "estilo", "🕶️", "¿Gafas de sol siempre o solo si pega?", ["Siempre", "Si pega"], { planner: 0, adventure: 1 }),
  stem("match", "estilo", "🧦", "¿Todo conjuntado o mezclado?", ["Conjuntado", "Mezclado"], { planner: 0, adventure: 1 }),
  stem("call2", "gente", "📞", "¿Llamar para contar algo o escribirlo?", ["Llamar", "Escribir"], { outgoing: 0, planner: 1 }),
  stem("advice", "gente", "🧠", "¿Pedir consejo o decidir solo?", ["Consejo", "Solo"], { outgoing: 0, adventure: 1 }),
  stem("group2", "gente", "👥", "¿Grupo grande de chat o hilos cortos?", ["Grande", "Cortos"], { outgoing: 0, comfort: 1 }),
  stem("sorry", "gente", "🙏", "¿Pedir perdón pronto o cuando se enfríe?", ["Pronto", "Luego"], { outgoing: 0, night: 1 }),
  stem("intro", "gente", "👋", "¿Presentar tú a la gente o esperar?", ["Presento", "Espero"], { outgoing: 0, comfort: 1 }),
  stem("secret2", "gente", "🤐", "¿Contar el chisme o tragártelo?", ["Contarlo", "Tragármelo"], { outgoing: 0, comfort: 1 }),
  stem("voice", "gente", "🎙️", "¿Nota de voz larga o frase corta?", ["Larga", "Corta"], { outgoing: 0, planner: 1 }),
  stem("reunion", "gente", "🎂", "¿Ir a todas las quedadas o elegir?", ["A todas", "Elegir"], { outgoing: 0, planner: 1 }),
  stem("hug", "gente", "🤗", "¿Saludo con abrazo o de lejos?", ["Abrazo", "De lejos"], { outgoing: 0, comfort: 1 }),
  stem("remember", "gente", "🎂", "¿Acordarte de los cumpleaños o que te avisen?", ["Me acuerdo", "Que avisen"], { planner: 0, adventure: 1 }),
  stem("alarm", "tiempo", "⏰", "¿Varias alarmas o una y ya?", ["Varias", "Una"], { planner: 0, adventure: 1 }),
  stem("late", "tiempo", "🐢", "¿Llegar justo o con margen?", ["Justo", "Con margen"], { night: 0, planner: 1 }),
  stem("sunday", "tiempo", "☀️", "¿Domingo lleno o vacío?", ["Lleno", "Vacío"], { outgoing: 0, comfort: 1 }),
  stem("list", "tiempo", "📝", "¿Lista del día o ir viendo?", ["Lista", "Viéndolo"], { planner: 0, adventure: 1 }),
  stem("break", "tiempo", "☕", "¿Pausa a su hora o cuando puedas?", ["A su hora", "Cuando pueda"], { planner: 0, night: 1 }),
  stem("nightowl", "tiempo", "🦉", "¿Rendir de noche o de mañana?", ["Noche", "Mañana"], { night: 0, planner: 1 }),
  stem("wait", "tiempo", "⏳", "¿Esperar sin prisa o mirar el reloj?", ["Sin prisa", "El reloj"], { comfort: 0, planner: 1 }),
  stem("week", "tiempo", "📆", "¿Planear la semana el domingo o el lunes?", ["Domingo", "Lunes"], { planner: 0, night: 1 }),
  stem("gap", "tiempo", "🕳️", "¿Dejar huecos en la agenda o llenarla?", ["Huecos", "Llenarla"], { comfort: 0, outgoing: 1 }),
  stem("now", "tiempo", "⚡", "¿Hacerlo ahora o dejarlo para luego?", ["Ahora", "Luego"], { planner: 0, night: 1 }),
  stem("series", "gustos", "📺", "¿Serie del tirón o un capítulo?", ["Del tirón", "Un capítulo"], { night: 0, planner: 1 }),
  stem("spoiler", "gustos", "🙊", "¿Spoilers sí o ni de broma?", ["Sí", "Ni de broma"], { adventure: 0, planner: 1 }),
  stem("reread", "gustos", "📖", "¿Releer o estrenar historia?", ["Releer", "Estrenar"], { comfort: 0, adventure: 1 }),
  stem("livegame", "gustos", "🎮", "¿Partida con amigos o solo?", ["Con amigos", "Solo"], { outgoing: 0, comfort: 1 }),
  stem("museum", "gustos", "🖼️", "¿Museo o calle?", ["Museo", "Calle"], { planner: 0, adventure: 1 }),
  stem("funny", "gustos", "😂", "¿Comedia o algo que duela un poco?", ["Comedia", "Que duela"], { comfort: 0, night: 1 }),
  stem("collect", "gustos", "📦", "¿Coleccionar o soltar cosas?", ["Coleccionar", "Soltar"], { comfort: 0, planner: 1 }),
  stem("classic", "gustos", "🎞️", "¿Clásico conocido o rareza?", ["Clásico", "Rareza"], { comfort: 0, adventure: 1 }),
  stem("loud", "gustos", "📢", "¿Plan ruidoso o en voz baja?", ["Ruidoso", "Voz baja"], { outgoing: 0, comfort: 1 }),
  stem("learn", "gustos", "📚", "¿Aprender algo nuevo o perfeccionar lo tuyo?", ["Nuevo", "Lo mío"], { adventure: 0, planner: 1 }),
]

function dateKey(date: Date) {
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${date.getFullYear()}-${month}-${day}`
}

function dayNumber(date: Date) {
  return Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86400000)
}

export function dailyQuestions(date = new Date()): Question[] {
  const key = dateKey(date)
  const start = (dayNumber(date) * DAY_SIZE) % POOL.length
  return Array.from({ length: DAY_SIZE }, (_, index) => {
    const item = POOL[(start + index) % POOL.length]
    return {
      id: `d_${key}_${item.id}`,
      category: item.category,
      emoji: item.emoji,
      prompt: item.prompt,
      options: item.options,
      leans: item.leans,
    }
  })
}

export function dailyQuestionById(id: string) {
  const match = /^d_(\d{4}-\d{2}-\d{2})_/.exec(id)
  if (!match) return null
  const [year, month, day] = match[1].split("-").map(Number)
  return dailyQuestions(new Date(year, month - 1, day)).find((question) => question.id === id) ?? null
}

export function dailyPackProgress(answeredIds: string[], date = new Date()) {
  const today = dailyQuestions(date)
  const done = today.filter((question) => answeredIds.includes(question.id)).length
  return { total: today.length, done, left: today.length - done }
}
