export type Tone = "hit" | "miss" | "level" | "win"

export function playTone(kind: Tone, enabled: boolean) {
  if (!enabled || typeof window === "undefined") return
  const Context = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!Context) return
  const audio = new Context()
  const now = audio.currentTime
  const notes = kind === "hit" ? [523, 659] : kind === "win" ? [523, 659, 784] : kind === "level" ? [392, 523, 784] : [196]
  notes.forEach((frequency, index) => {
    const osc = audio.createOscillator()
    const gain = audio.createGain()
    osc.type = kind === "miss" ? "triangle" : "sine"
    osc.frequency.value = frequency
    gain.gain.setValueAtTime(0.0001, now)
    gain.gain.exponentialRampToValueAtTime(0.05, now + 0.02 + index * 0.08)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18 + index * 0.08)
    osc.connect(gain)
    gain.connect(audio.destination)
    osc.start(now + index * 0.08)
    osc.stop(now + 0.22 + index * 0.08)
  })
  window.setTimeout(() => void audio.close(), 900)
}
