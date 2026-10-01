"use client"

import { useEffect, useState } from "react"

type InstallEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>
}

let saved: InstallEvent | null = null
const listeners = new Set<() => void>()

function standaloneNow() {
  if (typeof window === "undefined") return false
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in navigator && Boolean((navigator as Navigator & { standalone?: boolean }).standalone))
  )
}

function iosNow() {
  if (typeof window === "undefined") return false
  return /iphone|ipad|ipod/i.test(navigator.userAgent)
}

function publish(next: InstallEvent | null) {
  saved = next
  listeners.forEach((listener) => listener())
}

export function InstallApp() {
  const [prompt, setPrompt] = useState<InstallEvent | null>(saved)
  const [installed, setInstalled] = useState(standaloneNow)
  const [ios] = useState(iosNow)

  useEffect(() => {
    const sync = () => setPrompt(saved)
    listeners.add(sync)
    const onPrompt = (event: Event) => {
      event.preventDefault()
      publish(event as InstallEvent)
    }
    window.addEventListener("beforeinstallprompt", onPrompt)
    if ("serviceWorker" in navigator) {
      void navigator.serviceWorker.register("/sw.js").catch(() => undefined)
    }
    return () => {
      listeners.delete(sync)
      window.removeEventListener("beforeinstallprompt", onPrompt)
    }
  }, [])

  if (installed) return null

  async function install() {
    if (!prompt) return
    await prompt.prompt()
    const choice = await prompt.userChoice
    if (choice.outcome === "accepted") {
      publish(null)
      setInstalled(true)
    }
  }

  return (
    <section className="card stack">
      <p className="kicker">En tu móvil</p>
      <h2 className="display" style={{ fontSize: "1.3rem", margin: 0 }}>Instala VibeLeague</h2>
      <p className="muted" style={{ margin: 0 }}>
        Entras una vez. La app guarda la sesión en este dispositivo y no pide la contraseña cada vez que la abres.
      </p>
      {prompt ? (
        <button className="btn btn-primary" type="button" onClick={() => void install()}>
          Instalar
        </button>
      ) : ios ? (
        <p className="muted" style={{ margin: 0 }}>En iPhone: Compartir y luego Añadir a pantalla de inicio.</p>
      ) : (
        <p className="muted" style={{ margin: 0 }}>Desde el menú del navegador puedes añadirla a la pantalla de inicio.</p>
      )}
    </section>
  )
}
