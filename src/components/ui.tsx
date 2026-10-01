"use client"

import { useEffect, useState } from "react"
import type { UserState } from "@/lib/types"
import { levelFromXp } from "@/lib/progression"
import { npcCard } from "@/lib/world"

export function Confetti() {
  const colors = ["#ff4d8d", "#22d3ee", "#f6c453", "#a855f7", "#ffffff"]
  return (
    <div className="confetti" aria-hidden>
      {Array.from({ length: 16 }, (_, index) => (
        <i
          key={index}
          style={{
            left: `${(index * 17) % 100}%`,
            background: colors[index % colors.length],
            animationDelay: `${(index % 8) * 0.07}s`,
          }}
        />
      ))}
    </div>
  )
}

export function Splash() {
  return (
    <div className="splash">
      <img className="mark" src="/logo.jpg" alt="" />
      <strong className="display" style={{ fontSize: "1.6rem" }}>
        VibeLeague
      </strong>
    </div>
  )
}

export function who(me: UserState, id: string) {
  if (id === me.profile.id) {
    return { name: me.profile.name, emoji: me.profile.emoji, level: levelFromXp(me.xp), online: true, you: true }
  }
  const link = me.friends.find((friend) => friend.id === id)
  const npc = npcCard(id)
  return {
    name: link?.name ?? npc?.name ?? "Jugador",
    emoji: link?.emoji ?? npc?.emoji ?? "✨",
    level: npc?.level ?? 1,
    online: Boolean(npc?.online),
    you: false,
  }
}

export function Avatar({ emoji, online, large = false }: { emoji: string; online?: boolean; large?: boolean }) {
  return (
    <span className={large ? "avatar lg" : "avatar"} aria-hidden>
      {emoji}
      {online ? <i className="dot" /> : null}
    </span>
  )
}

export function Progress({ value }: { value: number }) {
  return (
    <div className="bar" aria-hidden>
      <span style={{ width: `${Math.round(value * 100)}%` }} />
    </div>
  )
}

export function Qr({ value }: { value: string }) {
  const [svg, setSvg] = useState("")
  useEffect(() => {
    let live = true
    import("qrcode").then((qr) => {
      qr.toString(value, { type: "svg", margin: 1, color: { dark: "#F4F1FF", light: "#00000000" } }).then((markup) => {
        if (live) setSvg(markup)
      })
    })
    return () => {
      live = false
    }
  }, [value])
  return <div className="qr" aria-label="Código QR" dangerouslySetInnerHTML={{ __html: svg }} />
}

export async function copyText(value: string) {
  if (navigator.share) {
    try {
      await navigator.share({ title: "VibeLeague", text: value })
      return
    } catch {
      return
    }
  }
  await navigator.clipboard.writeText(value)
}
