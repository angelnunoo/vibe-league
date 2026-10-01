"use client"

import { useState } from "react"
import { InstallApp } from "@/components/install-app"
import { Guard } from "@/components/shell"
import { useGame } from "@/lib/store"

export function AuthScreen() {
  const game = useGame()
  const [mode, setMode] = useState<"in" | "up">("in")
  const [name, setName] = useState("")
  const [email, setEmail] = useState<string | null>(null)
  const emailValue = email ?? game.rememberedEmail ?? ""
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setPending(true)
    setError(null)
    const message =
      mode === "up"
        ? await game.signUp({ name, email: emailValue, password })
        : await game.signIn({ email: emailValue, password })
    setPending(false)
    if (message) setError(message)
  }

  return (
    <Guard mode="auth">
      <div className="page">
        <div className="stack rise">
          <img className="mark" src="/logo.jpg" alt="" />
          <p className="kicker">VibeLeague</p>
          <h1 className="display" style={{ fontSize: "2.5rem", lineHeight: 0.95, margin: 0 }}>
            ¿Cuánto conoces realmente a tus amigos?
          </h1>
          <section className="card stack">
            <p className="kicker">Una sola vez</p>
            <p style={{ margin: 0 }}>
              En este dispositivo entras una vez. La sesión se queda abierta y no hace falta volver a escribir la contraseña.
            </p>
            {game.rememberedEmail ? <p className="muted" style={{ margin: 0 }}>Este móvil ya te reconoce como {game.rememberedEmail}.</p> : null}
          </section>
          <InstallApp />
          <form className="stack" onSubmit={submit}>
            {mode === "up" ? (
              <label>
                Tu nombre
                <input className="field" value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" required minLength={2} />
              </label>
            ) : null}
            <label>
              Correo
              <input className="field" type="email" value={emailValue} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required />
            </label>
            <label>
              Contraseña
              <input className="field" type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete={mode === "up" ? "new-password" : "current-password"} required minLength={6} />
            </label>
            {error ? <p className="alert" role="alert">{error}</p> : null}
            <button className="btn btn-primary" type="submit" disabled={pending}>
              {pending ? "Un segundo…" : mode === "up" ? "Crear cuenta" : "Entrar"}
            </button>
          </form>
          <button className="btn btn-ghost" type="button" onClick={() => void game.signInGoogle().then((message) => message && setError(message))}>
            Continuar con Google
          </button>
          <button className="btn btn-ghost" type="button" disabled>
            Apple · pronto
          </button>
          <button className="btn btn-ghost" type="button" onClick={() => { setMode(mode === "up" ? "in" : "up"); setError(null) }}>
            {mode === "up" ? "Ya tengo cuenta" : "Soy nuevo aquí"}
          </button>
          <p className="muted" style={{ textAlign: "center", margin: 0 }}>
            Un juego de League Studios
          </p>
        </div>
      </div>
    </Guard>
  )
}
