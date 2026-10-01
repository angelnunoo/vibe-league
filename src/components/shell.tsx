"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useEffect } from "react"
import { Splash } from "@/components/ui"
import { useGame } from "@/lib/store"

export function Guard({ mode, children }: { mode: "app" | "auth" | "onboarding"; children: React.ReactNode }) {
  const { ready, me } = useGame()
  const router = useRouter()

  useEffect(() => {
    if (!ready) return
    if (mode === "auth") {
      if (me?.profile.onboarded) router.replace("/home")
      else if (me) router.replace("/onboarding")
    }
    if (mode === "onboarding") {
      if (!me) router.replace("/")
      else if (me.profile.onboarded && sessionStorage.getItem("vibe-just-onboarded") !== "1") router.replace("/home")
    }
    if (mode === "app") {
      if (!me) router.replace("/")
      else if (!me.profile.onboarded) router.replace("/onboarding")
    }
  }, [ready, me, mode, router])

  const celebrating = (() => {
    try {
      return sessionStorage.getItem("vibe-just-onboarded") === "1"
    } catch {
      return false
    }
  })()

  if (!ready) return <Splash />
  if (mode === "app" && (!me || !me.profile.onboarded)) return <Splash />
  if (mode === "onboarding" && (!me || (me.profile.onboarded && !celebrating))) return <Splash />
  if (mode === "auth" && me) return <Splash />
  return children
}

const TABS = [
  { href: "/home", label: "Inicio" },
  { href: "/play", label: "Jugar" },
  { href: "/league", label: "Liga" },
  { href: "/friends", label: "Amigos" },
  { href: "/profile", label: "Tú" },
] as const

export function Shell({ children }: { children: React.ReactNode }) {
  const path = usePathname()
  const immersive = /^\/play\/(quick|duel|party|jornada|duo|likely|event)/.test(path)
  return (
    <div className="shell">
      <div className={immersive ? "shell-scroll immersive" : "shell-scroll"}>{children}</div>
      {immersive ? null : (
        <nav className="nav" aria-label="Principal">
          {TABS.map((tab) => {
            const active = tab.href === "/play" ? path.startsWith("/play") : path.startsWith(tab.href)
            return (
              <Link key={tab.href} href={tab.href} className={active ? (tab.href === "/play" ? "active play" : "active") : tab.href === "/play" ? "play" : ""}>
                <Icon name={tab.label} />
                {tab.label}
              </Link>
            )
          })}
        </nav>
      )}
    </div>
  )
}

function Icon({ name }: { name: string }) {
  const common = { width: 18, height: 18, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, "aria-hidden": true as const }
  if (name === "Inicio") {
    return (
      <svg {...common}>
        <path d="M4 11.5 12 4l8 7.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1z" />
      </svg>
    )
  }
  if (name === "Jugar") {
    return (
      <svg {...common}>
        <path d="M8 5v14l11-7z" />
      </svg>
    )
  }
  if (name === "Liga") {
    return (
      <svg {...common}>
        <path d="M8 4h8v3a4 4 0 0 1-8 0zM6 6H4v2a4 4 0 0 0 4 4M18 6h2v2a4 4 0 0 1-4 4M12 14v3M8 21h8" />
      </svg>
    )
  }
  if (name === "Amigos") {
    return (
      <svg {...common}>
        <path d="M16 19v-1a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v1M9.5 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM20 19v-1a3.5 3.5 0 0 0-2.5-3.35M16.5 5.1a3 3 0 0 1 0 5.8" />
      </svg>
    )
  }
  return (
    <svg {...common}>
      <path d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4zM5 20a7 7 0 0 1 14 0" />
    </svg>
  )
}

export function Top({ title, back = "/home" }: { title: string; back?: string }) {
  const router = useRouter()
  return (
    <div className="between" style={{ marginBottom: 16 }}>
      <button type="button" className="back" aria-label="Volver" onClick={() => router.push(back)}>
        ←
      </button>
      <h1 className="display" style={{ fontSize: "1.35rem", margin: 0 }}>
        {title}
      </h1>
      <span style={{ width: 42 }} />
    </div>
  )
}
