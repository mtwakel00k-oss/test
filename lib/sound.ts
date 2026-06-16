"use client"

let audioCtx: AudioContext | null = null
let initialized = false

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null
  try {
    if (!audioCtx) {
      const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!Ctor) return null
      audioCtx = new Ctor()
    }
    if (audioCtx.state === "suspended") audioCtx.resume()
    return audioCtx
  } catch { return null }
}

function noise(ctx: AudioContext, duration: number): AudioBuffer {
  const len = Math.floor(ctx.sampleRate * duration)
  const buf = ctx.createBuffer(1, len, ctx.sampleRate)
  const data = buf.getChannelData(0)
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1
  return buf
}

export function initAudio(): void {
  if (initialized) return
  initialized = true
  getCtx()
}

export function playNewOrderSound(): void {
  try {
    const ctx = getCtx()
    if (!ctx) return
    const t = ctx.currentTime

    const notes = [523.25, 659.25, 783.99]
    const durations = [0.12, 0.12, 0.18]
    const starts = [t, t + 0.1, t + 0.2]

    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator()
      const g = ctx.createGain()
      osc.type = "sine"
      osc.frequency.setValueAtTime(freq, starts[i])
      g.gain.setValueAtTime(0, starts[i])
      g.gain.linearRampToValueAtTime(0.25, starts[i] + 0.01)
      g.gain.exponentialRampToValueAtTime(0.001, starts[i] + durations[i])
      osc.connect(g).connect(ctx.destination)
      osc.start(starts[i])
      osc.stop(starts[i] + durations[i] + 0.01)
    })
  } catch {}
}

export function playSuccessSound(): void {
  try {
    const ctx = getCtx()
    if (!ctx) return
    const t = ctx.currentTime

    const notes = [523.25, 659.25, 783.99, 1046.5]
    const starts = [t, t + 0.08, t + 0.16, t + 0.26]

    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator()
      const g = ctx.createGain()
      osc.type = "sine"
      osc.frequency.setValueAtTime(freq, starts[i])
      g.gain.setValueAtTime(0, starts[i])
      g.gain.linearRampToValueAtTime(0.2, starts[i] + 0.01)
      g.gain.exponentialRampToValueAtTime(0.001, starts[i] + 0.2)
      osc.connect(g).connect(ctx.destination)
      osc.start(starts[i])
      osc.stop(starts[i] + 0.25)
    })
  } catch {}
}

export function playPrintSound(): void {
  try {
    const ctx = getCtx()
    if (!ctx) return
    const t = ctx.currentTime

    for (let i = 0; i < 6; i++) {
      const start = t + i * 0.07
      const src = ctx.createBufferSource()
      src.buffer = noise(ctx, 0.04)
      const bp = ctx.createBiquadFilter()
      bp.type = "bandpass"
      bp.frequency.value = 3000 + Math.random() * 1500
      bp.Q.value = 0.8
      const amp = ctx.createGain()
      amp.gain.setValueAtTime(0.04, start)
      amp.gain.linearRampToValueAtTime(0.07, start + 0.01)
      amp.gain.exponentialRampToValueAtTime(0.001, start + 0.035)
      src.connect(bp).connect(amp).connect(ctx.destination)
      src.start(start)
      src.stop(start + 0.04)
    }

    const osc = ctx.createOscillator()
    const g = ctx.createGain()
    osc.type = "triangle"
    osc.frequency.setValueAtTime(130, t + 0.35)
    osc.frequency.linearRampToValueAtTime(80, t + 0.5)
    g.gain.setValueAtTime(0, t)
    g.gain.linearRampToValueAtTime(0.08, t + 0.37)
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.55)
    osc.connect(g).connect(ctx.destination)
    osc.start(t + 0.35)
    osc.stop(t + 0.6)
  } catch {}
}

export function playErrorSound(): void {
  try {
    const ctx = getCtx()
    if (!ctx) return
    const t = ctx.currentTime

    const osc = ctx.createOscillator()
    const g = ctx.createGain()
    osc.type = "sawtooth"
    osc.frequency.setValueAtTime(300, t)
    osc.frequency.linearRampToValueAtTime(100, t + 0.25)
    g.gain.setValueAtTime(0, t)
    g.gain.linearRampToValueAtTime(0.12, t + 0.02)
    g.gain.linearRampToValueAtTime(0.08, t + 0.08)
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.3)

    const lp = ctx.createBiquadFilter()
    lp.type = "lowpass"
    lp.frequency.value = 800

    osc.connect(lp).connect(g).connect(ctx.destination)
    osc.start(t)
    osc.stop(t + 0.35)
  } catch {}
}
