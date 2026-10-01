"use client"

import { useState, useSyncExternalStore } from "react"
import { Top } from "@/components/shell"
import { copyText, Qr } from "@/components/ui"
import { emojiFrom, makeCode } from "@/lib/logic"
import { QUESTIONS } from "@/lib/questions"
import { useGame } from "@/lib/store"
import type { Choice } from "@/lib/types"

type Player = { id: string; name: string; emoji: string; score: number }
type Secret = { playerId: string; questionId: string; choice: Choice }
type Turn = { guesserId: string; targetId: string; questionId: string }

function shuffle<T>(list: T[]) {
  const copy = [...list]
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(Math.random() * (index + 1))
    ;[copy[index], copy[swap]] = [copy[swap], copy[index]]
  }
  return copy
}

function subscribeOrigin() {
  return () => {}
}

export function PartyScreen({ codeFromLink = "" }: { codeFromLink?: string }) {
  const game = useGame()
  const me = game.me
  const [code] = useState(makeCode)
  const origin = useSyncExternalStore(subscribeOrigin, () => window.location.origin, () => "")
  const link = origin ? `${origin}/play/party?code=${code}` : code
  const [name, setName] = useState("")
  const [players, setPlayers] = useState<Player[]>(() =>
    me ? [{ id: me.profile.id, name: me.profile.name, emoji: me.profile.emoji, score: 0 }] : [],
  )
  const [phase, setPhase] = useState<"lobby" | "cover-answer" | "answer" | "cover-guess" | "guess" | "podium">("lobby")
  const [assigned, setAssigned] = useState<Record<string, string[]>>({})
  const [secrets, setSecrets] = useState<Secret[]>([])
  const [playerIndex, setPlayerIndex] = useState(0)
  const [questionIndex, setQuestionIndex] = useState(0)
  const [queue, setQueue] = useState<Turn[]>([])
  const [cursor, setCursor] = useState(0)
  const [flash, setFlash] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  if (!me) return null
  const current = players[playerIndex]
  const questionId = current ? assigned[current.id]?.[questionIndex] : undefined
  const question = QUESTIONS.find((item) => item.id === questionId)
  const turn = queue[cursor]
  const guesser = players.find((player) => player.id === turn?.guesserId)
  const target = players.find((player) => player.id === turn?.targetId)
  const turnQuestion = QUESTIONS.find((item) => item.id === turn?.questionId)

  function addPlayer(event: React.FormEvent) {
    event.preventDefault()
    const clean = name.trim()
    if (clean.length < 2 || players.length >= 8) return
    setPlayers([...players, { id: `guest-${crypto.randomUUID()}`, name: clean, emoji: emojiFrom(clean), score: 0 }])
    setName("")
  }

  function start() {
    if (players.length < 2) return
    const deck = shuffle(QUESTIONS)
    const next: Record<string, string[]> = {}
    players.forEach((player, index) => {
      next[player.id] = [deck[index * 2].id, deck[index * 2 + 1].id]
    })
    setAssigned(next)
    setSecrets([])
    setPlayerIndex(0)
    setQuestionIndex(0)
    setPhase("cover-answer")
  }

  function saveAnswer(choice: Choice) {
    if (!current || !question || !me) return
    const nextSecrets = [...secrets, { playerId: current.id, questionId: question.id, choice }]
    setSecrets(nextSecrets)
    if (current.id === me.profile.id && me.privacy.saveParty) game.answerSelf(question.id, choice, "party")
    const moreQuestions = questionIndex + 1 < 2
    const morePlayers = playerIndex + 1 < players.length
    if (moreQuestions) {
      setQuestionIndex(questionIndex + 1)
      return
    }
    if (morePlayers) {
      setPlayerIndex(playerIndex + 1)
      setQuestionIndex(0)
      setPhase("cover-answer")
      return
    }
    const turns: Turn[] = []
    for (const secret of nextSecrets) {
      for (const player of players) {
        if (player.id !== secret.playerId) {
          turns.push({ guesserId: player.id, targetId: secret.playerId, questionId: secret.questionId })
        }
      }
    }
    setQueue(shuffle(turns))
    setCursor(0)
    setPhase("cover-guess")
  }

  function guess(choice: Choice) {
    if (!turn || !guesser || !target) return
    const secret = secrets.find((item) => item.playerId === turn.targetId && item.questionId === turn.questionId)
    if (!secret) return
    const correct = secret.choice === choice
    setPlayers(players.map((player) => (player.id === guesser.id ? { ...player, score: player.score + (correct ? 1 : 0) } : player)))
    game.recordKnown({
      predictorId: guesser.id,
      predictorName: guesser.name,
      targetId: target.id,
      targetName: target.name,
      questionId: turn.questionId,
      choice,
      correctChoice: secret.choice,
      mode: "party",
    })
    setFlash(correct ? `Sí. ${target.name} eligió ${QUESTIONS.find((item) => item.id === turn.questionId)?.options[secret.choice]}.` : `Nope. Era ${QUESTIONS.find((item) => item.id === turn.questionId)?.options[secret.choice]}.`)
    window.setTimeout(() => {
      setFlash(null)
      const next = cursor + 1
      if (next >= queue.length) {
        setPhase("podium")
        return
      }
      const nextGuesser = queue[next].guesserId
      setCursor(next)
      setPhase(nextGuesser === guesser.id ? "guess" : "cover-guess")
    }, 700)
  }

  const podium = [...players].sort((a, b) => b.score - a.score)

  return (
    <div className="stack">
      {phase === "lobby" ? (
        <>
          <Top title="En persona" back="/play" />
          {codeFromLink && codeFromLink !== code ? (
            <section className="card">
              <p>La sala {codeFromLink} vive en el móvil de quien la creó. Acercaos y jugad desde esa pantalla.</p>
            </section>
          ) : null}
          <section className="card stack" style={{ textAlign: "center" }}>
            <p className="kicker">Código de sala</p>
            <h1 className="display" style={{ fontSize: "2.4rem", margin: 0 }}>{code}</h1>
            {link ? <Qr value={link} /> : null}
            <button className="btn btn-ghost" type="button" onClick={() => { void copyText(link).then(() => setCopied(true)) }}>
              {copied ? "Listo para compartir" : "Copiar enlace"}
            </button>
          </section>
          <form className="row" onSubmit={addPlayer}>
            <input className="field" value={name} onChange={(event) => setName(event.target.value)} placeholder="Nombre de quien está aquí" aria-label="Nombre" />
            <button className="btn btn-primary" style={{ width: "auto" }} type="submit">Añadir</button>
          </form>
          {players.map((player) => (
            <article key={player.id} className="card row">
              <span style={{ fontSize: "1.4rem" }}>{player.emoji}</span>
              <strong>{player.name}</strong>
            </article>
          ))}
          <button className="btn btn-primary" type="button" disabled={players.length < 2} onClick={start}>
            Empezar
          </button>
        </>
      ) : null}

      {phase === "cover-answer" && current ? (
        <section className="stack" style={{ minHeight: "70%", justifyContent: "center" }}>
          <p className="kicker">En privado</p>
          <h1 className="display" style={{ fontSize: "2.4rem", margin: 0 }}>Pásale el móvil a {current.name}.</h1>
          <button className="btn btn-primary" type="button" onClick={() => setPhase("answer")}>Soy {current.name}</button>
        </section>
      ) : null}

      {phase === "answer" && question && current ? (
        <section className="stack">
          <p className="kicker">{current.name} · {questionIndex + 1}/2</p>
          <h1 className="display" style={{ fontSize: "2.1rem", margin: 0 }}>{question.emoji} {question.prompt}</h1>
          {question.options.map((option, index) => (
            <button key={option} className="option" type="button" onClick={() => saveAnswer(index as Choice)}>{option}</button>
          ))}
        </section>
      ) : null}

      {phase === "cover-guess" && guesser ? (
        <section className="stack" style={{ minHeight: "70%", justifyContent: "center" }}>
          <p className="kicker">Adivina</p>
          <h1 className="display" style={{ fontSize: "2.4rem", margin: 0 }}>Turno de {guesser.name}.</h1>
          <button className="btn btn-primary" type="button" onClick={() => setPhase("guess")}>Estoy listo</button>
        </section>
      ) : null}

      {phase === "guess" && turnQuestion && target ? (
        <section className="stack">
          <p className="kicker">{cursor + 1}/{queue.length}</p>
          <h1 className="display" style={{ fontSize: "2rem", margin: 0 }}>¿Qué eligió {target.name}?</h1>
          <p className="muted">{turnQuestion.prompt}</p>
          {turnQuestion.options.map((option, index) => (
            <button key={option} className="option" type="button" disabled={Boolean(flash)} onClick={() => guess(index as Choice)}>{option}</button>
          ))}
          {flash ? <p aria-live="polite">{flash}</p> : null}
        </section>
      ) : null}

      {phase === "podium" ? (
        <section className="stack">
          <p className="kicker">Ranking de la sala</p>
          <h1 className="display" style={{ fontSize: "2.2rem", margin: 0 }}>
            {podium.filter((player) => player.score === podium[0]?.score).length > 1 ? "Empate en la cima." : `${podium[0]?.name} se lleva la noche.`}
          </h1>
          <div className="podium">
            {[podium[1], podium[0], podium[2]].map((player, index) => player ? (
              <article key={player.id} className={index === 1 ? "card first" : "card"}>
                <div>{index === 1 ? "🥇" : index === 0 ? "🥈" : "🥉"}</div>
                <strong>{player.name}</strong>
                <div className="muted">{player.score}</div>
              </article>
            ) : <span key={index} />)}
          </div>
          {podium.slice(3).map((player, index) => (
            <article key={player.id} className="card between"><span>{index + 4}. {player.name}</span><b>{player.score}</b></article>
          ))}
        </section>
      ) : null}
    </div>
  )
}
