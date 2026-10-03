/*
 * Son d'ambiance calme, synthétisé avec Web Audio : aucun fichier audio n'est chargé.
 * Une ambiance par décor (accords longs, notes espacées, bruits de nature) et de petits
 * sons de réponse. Démarre au premier geste de l'utilisateur (règle des navigateurs).
 */
import type { DecorKey } from "@/lib/decors/registry";

type Voice = "flute" | "lute" | "bell";
type NatureEvent = { k: "bird" | "creak" | "quill" | "gull" | "crackle"; gap: [number, number]; g: number };

type Theme = {
  /** Note de base (MIDI). */
  root: number;
  scale: number[];
  chords: number[][];
  voice: Voice;
  melGap: [number, number];
  pad: "soft" | "choir";
  padCut: number;
  wind: number;
  windCut: number;
  surf: number;
  rev: number;
  ev: NatureEvent[];
};

const THEMES: Record<DecorKey, Theme> = {
  ruines: {
    root: 50,
    scale: [0, 2, 4, 7, 9],
    chords: [
      [0, 7, 14],
      [5, 9, 12],
      [9, 12, 16],
      [7, 11, 14],
    ],
    voice: "flute",
    melGap: [6500, 12000],
    pad: "soft",
    padCut: 900,
    wind: 0.025,
    windCut: 600,
    surf: 0,
    rev: 0.55,
    ev: [{ k: "bird", gap: [9000, 20000], g: 0.5 }],
  },
  frontiere: {
    root: 45,
    scale: [0, 3, 5, 7, 10],
    chords: [
      [0, 7, 12, 15],
      [8, 12, 15],
      [3, 7, 10, 15],
      [10, 14, 17],
    ],
    voice: "bell",
    melGap: [9000, 16000],
    pad: "soft",
    padCut: 650,
    wind: 0.05,
    windCut: 900,
    surf: 0,
    rev: 0.75,
    ev: [
      { k: "creak", gap: [10000, 22000], g: 1 },
      { k: "crackle", gap: [800, 2200], g: 0.03 },
    ],
  },
  codex: {
    root: 48,
    scale: [0, 2, 4, 7, 9],
    chords: [
      [0, 7, 12, 16],
      [9, 12, 16],
      [5, 9, 12, 16],
      [7, 11, 14, 19],
    ],
    voice: "lute",
    melGap: [5500, 10500],
    pad: "soft",
    padCut: 1000,
    wind: 0,
    windCut: 600,
    surf: 0,
    rev: 0.45,
    ev: [
      { k: "quill", gap: [9000, 18000], g: 1 },
      { k: "crackle", gap: [1000, 3000], g: 0.025 },
    ],
  },
  eglise: {
    root: 41,
    scale: [0, 2, 4, 7, 9],
    chords: [
      [0, 7, 12, 16],
      [2, 9, 14, 18],
      [9, 12, 16, 21],
      [7, 12, 16, 19],
    ],
    voice: "bell",
    melGap: [11000, 19000],
    pad: "choir",
    padCut: 700,
    wind: 0,
    windCut: 600,
    surf: 0,
    rev: 0.9,
    ev: [],
  },
  plaine: {
    root: 55,
    scale: [0, 2, 4, 7, 9],
    chords: [
      [0, 7, 12, 16],
      [5, 9, 12, 16],
      [7, 11, 14, 19],
      [9, 12, 16, 19],
    ],
    voice: "flute",
    melGap: [6000, 11000],
    pad: "soft",
    padCut: 1100,
    wind: 0.02,
    windCut: 700,
    surf: 0,
    rev: 0.4,
    ev: [{ k: "bird", gap: [3500, 8000], g: 1 }],
  },
  mer: {
    root: 38,
    scale: [0, 3, 5, 7, 10],
    chords: [
      [0, 7, 12, 15],
      [8, 12, 15, 19],
      [3, 7, 10, 15],
      [10, 14, 17],
    ],
    voice: "bell",
    melGap: [10000, 17000],
    pad: "soft",
    padCut: 600,
    wind: 0.03,
    windCut: 380,
    surf: 0.06,
    rev: 0.7,
    ev: [{ k: "gull", gap: [15000, 30000], g: 1 }],
  },
  chateau: {
    root: 52,
    scale: [0, 3, 5, 7, 10],
    chords: [
      [0, 7, 12, 15],
      [3, 7, 10, 15],
      [10, 14, 17],
      [5, 8, 12],
    ],
    voice: "lute",
    melGap: [6000, 11000],
    pad: "soft",
    padCut: 950,
    wind: 0.02,
    windCut: 650,
    surf: 0,
    rev: 0.5,
    ev: [{ k: "bird", gap: [7000, 15000], g: 0.6 }],
  },
};

export type SoundEffect = "good" | "bad" | "win";

export type AmbientSound = {
  supported: boolean;
  start(): void;
  stop(): void;
  volume(v: number): void;
  theme(k: DecorKey): void;
  pause(): void;
  resume(): void;
  fx(kind: SoundEffect): void;
  isPlaying(): boolean;
};

type Ctor = typeof AudioContext;

function hz(m: number): number {
  return 440 * Math.pow(2, (m - 69) / 12);
}

function rr(a: number, b: number): number {
  return a + Math.random() * (b - a);
}

function impulse(c: AudioContext, sec: number, decay: number): AudioBuffer {
  const n = Math.floor(c.sampleRate * sec);
  const b = c.createBuffer(2, n, c.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = b.getChannelData(ch);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, decay);
  }
  return b;
}

export function createAmbientSound(): AmbientSound {
  const AC: Ctor | undefined =
    typeof window === "undefined"
      ? undefined
      : (window.AudioContext ?? (window as unknown as { webkitAudioContext?: Ctor }).webkitAudioContext);

  let ctx: AudioContext | null = null;
  let master!: GainNode;
  let bus!: GainNode;
  let revSend!: GainNode;
  let delaySend!: GainNode;
  let windGain!: GainNode;
  let windBP!: BiquadFilterNode;
  let surfGain!: GainNode;
  let nbuf!: AudioBuffer;
  let padBus: GainNode | null = null;
  let playing = false;
  let cur: DecorKey = "ruines";
  let vol = 0.35;
  let chordI = 0;
  let tPad: ReturnType<typeof setTimeout> | undefined;
  let tMel: ReturnType<typeof setTimeout> | undefined;
  let tEv: ReturnType<typeof setTimeout>[] = [];

  function audio(): AudioContext {
    if (!ctx) throw new Error("contexte audio absent");
    return ctx;
  }

  function noiseSrc(): AudioBufferSourceNode {
    const s = audio().createBufferSource();
    s.buffer = nbuf;
    s.loop = true;
    return s;
  }

  function build() {
    const c = new AC!();
    ctx = c;
    const comp = c.createDynamicsCompressor();
    comp.threshold.value = -24;
    comp.ratio.value = 3;
    master = c.createGain();
    master.gain.value = 0;
    master.connect(comp);
    comp.connect(c.destination);
    bus = c.createGain();
    bus.connect(master);
    const conv = c.createConvolver();
    conv.buffer = impulse(c, 3.2, 2.4);
    const rg = c.createGain();
    rg.gain.value = 0.7;
    conv.connect(rg);
    rg.connect(master);
    revSend = c.createGain();
    revSend.gain.value = 0.55;
    revSend.connect(conv);
    const dl = c.createDelay(1.5);
    dl.delayTime.value = 0.5;
    const fb = c.createGain();
    fb.gain.value = 0.28;
    const dlp = c.createBiquadFilter();
    dlp.type = "lowpass";
    dlp.frequency.value = 1500;
    delaySend = c.createGain();
    delaySend.gain.value = 0.28;
    delaySend.connect(dl);
    dl.connect(dlp);
    dlp.connect(fb);
    fb.connect(dl);
    dlp.connect(master);
    nbuf = c.createBuffer(1, c.sampleRate * 2, c.sampleRate);
    const nd = nbuf.getChannelData(0);
    for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
    // Vent : bruit filtré dont le souffle varie lentement.
    windBP = c.createBiquadFilter();
    windBP.type = "bandpass";
    windBP.frequency.value = 700;
    windBP.Q.value = 0.5;
    const windMod = c.createGain();
    windMod.gain.value = 0.7;
    windGain = c.createGain();
    windGain.gain.value = 0;
    const ns = noiseSrc();
    ns.connect(windBP);
    windBP.connect(windMod);
    windMod.connect(windGain);
    windGain.connect(master);
    ns.start();
    const lfo = c.createOscillator();
    lfo.frequency.value = 0.07;
    const lg = c.createGain();
    lg.gain.value = 0.3;
    lfo.connect(lg);
    lg.connect(windMod.gain);
    lfo.start();
    // Vagues : bruit grave dont le volume gonfle et retombe lentement.
    const sl = c.createBiquadFilter();
    sl.type = "lowpass";
    sl.frequency.value = 450;
    const surfMod = c.createGain();
    surfMod.gain.value = 0.55;
    surfGain = c.createGain();
    surfGain.gain.value = 0;
    const ns2 = noiseSrc();
    ns2.connect(sl);
    sl.connect(surfMod);
    surfMod.connect(surfGain);
    surfGain.connect(master);
    ns2.start();
    const lfo2 = c.createOscillator();
    lfo2.frequency.value = 0.11;
    const lg2 = c.createGain();
    lg2.gain.value = 0.45;
    lfo2.connect(lg2);
    lg2.connect(surfMod.gain);
    lfo2.start();
    applyTheme();
  }

  function applyTheme() {
    if (!ctx) return;
    const th = THEMES[cur];
    const t = ctx.currentTime;
    windGain.gain.setTargetAtTime(th.wind, t, 2.5);
    windBP.frequency.setTargetAtTime(th.windCut, t, 2.5);
    surfGain.gain.setTargetAtTime(th.surf, t, 2.5);
    revSend.gain.setTargetAtTime(th.rev, t, 2.5);
    if (padBus) padBus.gain.setTargetAtTime(0, t, 1.2);
    padBus = ctx.createGain();
    padBus.gain.value = 1;
    padBus.connect(bus);
    padBus.connect(revSend);
    chordI = 0;
  }

  function pad(f: number, t: number, dur: number) {
    const c = audio();
    const th = THEMES[cur];
    const g = c.createGain();
    const lp = c.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = th.padCut;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(th.pad === "choir" ? 0.024 : 0.03, t + 4.5);
    g.gain.linearRampToValueAtTime(0.0001, t + dur);
    const os: OscillatorNode[] = [];
    if (th.pad === "choir") {
      [1, 1.006, 0.994].forEach((m) => {
        const o = c.createOscillator();
        o.type = "sawtooth";
        o.frequency.value = f * m;
        os.push(o);
      });
    } else {
      const a = c.createOscillator();
      const b = c.createOscillator();
      a.type = "triangle";
      b.type = "sine";
      a.frequency.value = f;
      b.frequency.value = f * 1.004;
      os.push(a, b);
    }
    os.forEach((o) => {
      o.connect(lp);
      o.start(t);
      o.stop(t + dur + 0.1);
    });
    lp.connect(g);
    g.connect(padBus!);
  }

  function note(f: number, t: number, voice: Voice) {
    const c = audio();
    const g = c.createGain();
    g.connect(bus);
    g.connect(revSend);
    g.connect(delaySend);
    if (voice === "flute") {
      const o = c.createOscillator();
      o.type = "sine";
      o.frequency.value = f;
      const vib = c.createOscillator();
      vib.frequency.value = 4.6;
      const vg = c.createGain();
      vg.gain.value = f * 0.006;
      vib.connect(vg);
      vg.connect(o.frequency);
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.07, t + 0.35);
      g.gain.linearRampToValueAtTime(0.055, t + 1.2);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 2.7);
      const bp = c.createBiquadFilter();
      bp.type = "bandpass";
      bp.frequency.value = f * 2;
      bp.Q.value = 4;
      const ng = c.createGain();
      ng.gain.setValueAtTime(0, t);
      ng.gain.linearRampToValueAtTime(0.012, t + 0.2);
      ng.gain.exponentialRampToValueAtTime(0.0001, t + 1.8);
      const ns = noiseSrc();
      ns.connect(bp);
      bp.connect(ng);
      ng.connect(g);
      o.connect(g);
      o.start(t);
      vib.start(t);
      ns.start(t);
      o.stop(t + 2.8);
      vib.stop(t + 2.8);
      ns.stop(t + 2.8);
    } else if (voice === "lute") {
      const o1 = c.createOscillator();
      const o2 = c.createOscillator();
      o1.type = "triangle";
      o2.type = "sine";
      o1.frequency.value = f;
      o2.frequency.value = f * 2;
      const lp = c.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.setValueAtTime(1500, t);
      lp.frequency.exponentialRampToValueAtTime(400, t + 0.7);
      const g2 = c.createGain();
      g2.gain.value = 0.3;
      o1.connect(lp);
      o2.connect(g2);
      g2.connect(lp);
      lp.connect(g);
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.09, t + 0.005);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 1.5);
      o1.start(t);
      o2.start(t);
      o1.stop(t + 1.6);
      o2.stop(t + 1.6);
    } else {
      [1, 2.01, 3.02].forEach((m, i) => {
        const o = c.createOscillator();
        o.type = "sine";
        o.frequency.value = f * m;
        const gg = c.createGain();
        gg.gain.value = [0.09, 0.035, 0.015][i];
        o.connect(gg);
        gg.connect(g);
        o.start(t);
        o.stop(t + 4.2);
      });
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(1, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 4);
    }
  }

  // Petits sons de nature propres à chaque décor.
  function bird(t: number, k: number) {
    const c = audio();
    const n = 2 + Math.floor(Math.random() * 3);
    const f0 = rr(2400, 3800);
    for (let i = 0; i < n; i++) {
      const o = c.createOscillator();
      const g = c.createGain();
      const tt = t + i * 0.14;
      o.type = "sine";
      o.frequency.setValueAtTime(f0, tt);
      o.frequency.exponentialRampToValueAtTime(f0 * 1.3, tt + 0.08);
      g.gain.setValueAtTime(0, tt);
      g.gain.linearRampToValueAtTime(0.011 * k, tt + 0.012);
      g.gain.linearRampToValueAtTime(0, tt + 0.1);
      o.connect(g);
      g.connect(bus);
      g.connect(revSend);
      o.start(tt);
      o.stop(tt + 0.12);
    }
  }

  function creak(t: number) {
    const c = audio();
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = "sine";
    o.frequency.setValueAtTime(780, t);
    o.frequency.exponentialRampToValueAtTime(540, t + 1.4);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.011, t + 0.4);
    g.gain.linearRampToValueAtTime(0, t + 1.4);
    o.connect(g);
    g.connect(bus);
    g.connect(revSend);
    o.start(t);
    o.stop(t + 1.5);
  }

  function quill(t: number) {
    const c = audio();
    const s = noiseSrc();
    const bp = c.createBiquadFilter();
    const g = c.createGain();
    bp.type = "bandpass";
    bp.frequency.value = 3200;
    bp.Q.value = 2;
    g.gain.setValueAtTime(0, t);
    for (let k = 0; k < 3; k++) {
      g.gain.linearRampToValueAtTime(0.016, t + k * 0.18 + 0.03);
      g.gain.linearRampToValueAtTime(0, t + k * 0.18 + 0.12);
    }
    s.connect(bp);
    bp.connect(g);
    g.connect(bus);
    s.start(t);
    s.stop(t + 0.7);
  }

  function gull(t: number) {
    const c = audio();
    for (let k = 0; k < 2; k++) {
      const o = c.createOscillator();
      const g = c.createGain();
      const tt = t + k * 0.65;
      const f = k ? 1400 : 1500;
      o.type = "sine";
      o.frequency.setValueAtTime(f, tt);
      o.frequency.exponentialRampToValueAtTime(f * 0.7, tt + 0.5);
      const vib = c.createOscillator();
      vib.frequency.value = 14;
      const vg = c.createGain();
      vg.gain.value = 40;
      vib.connect(vg);
      vg.connect(o.frequency);
      g.gain.setValueAtTime(0, tt);
      g.gain.linearRampToValueAtTime(k ? 0.007 : 0.011, tt + 0.08);
      g.gain.linearRampToValueAtTime(0, tt + 0.5);
      o.connect(g);
      g.connect(revSend);
      g.connect(bus);
      o.start(tt);
      vib.start(tt);
      o.stop(tt + 0.55);
      vib.stop(tt + 0.55);
    }
  }

  function crack(level: number) {
    const c = audio();
    const t = c.currentTime + 0.01;
    const len = Math.floor(c.sampleRate * 0.03);
    const b = c.createBuffer(1, len, c.sampleRate);
    const d = b.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
    const s = c.createBufferSource();
    s.buffer = b;
    const hp = c.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 1800 + Math.random() * 2500;
    const g = c.createGain();
    g.gain.value = level * (0.4 + Math.random() * 0.8);
    s.connect(hp);
    hp.connect(g);
    g.connect(bus);
    s.start(t);
  }

  function runEvent(e: NatureEvent) {
    if (!ctx || ctx.state !== "running") return;
    const t = ctx.currentTime + 0.05;
    if (e.k === "bird") bird(t, e.g);
    else if (e.k === "creak") creak(t);
    else if (e.k === "quill") quill(t);
    else if (e.k === "gull") gull(t);
    else if (e.k === "crackle") crack(e.g);
  }

  function startEvents() {
    tEv.forEach(clearTimeout);
    tEv = [];
    THEMES[cur].ev.forEach((e, idx) => {
      const loop = () => {
        tEv[idx] = setTimeout(
          () => {
            if (!playing) return;
            runEvent(e);
            loop();
          },
          rr(e.gap[0], e.gap[1]),
        );
      };
      loop();
    });
  }

  // Petits sons de réponse : carillon clair, ou note grave et sourde.
  function chime(f: number, t: number, peak?: number) {
    const c = audio();
    const g = c.createGain();
    g.connect(bus);
    g.connect(revSend);
    [1, 2].forEach((m, i) => {
      const o = c.createOscillator();
      o.type = "sine";
      o.frequency.value = f * m;
      const gg = c.createGain();
      gg.gain.value = i ? 0.25 : 1;
      o.connect(gg);
      gg.connect(g);
      o.start(t);
      o.stop(t + 1.1);
    });
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(peak || 0.16, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 1);
  }

  function thud(f: number, t: number) {
    const c = audio();
    const o = c.createOscillator();
    o.type = "triangle";
    o.frequency.setValueAtTime(f, t);
    o.frequency.exponentialRampToValueAtTime(f * 0.8, t + 0.3);
    const lp = c.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 480;
    const g = c.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.2, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.45);
    o.connect(lp);
    lp.connect(g);
    g.connect(bus);
    g.connect(revSend);
    o.start(t);
    o.stop(t + 0.5);
  }

  function fx(kind: SoundEffect) {
    if (!ctx || !playing || ctx.state !== "running") return;
    const th = THEMES[cur];
    const t = ctx.currentTime + 0.02;
    if (kind === "good") {
      chime(hz(th.root + 24), t);
      chime(hz(th.root + 31), t + 0.12);
    } else if (kind === "bad") {
      thud(hz(th.root + 12), t);
      thud(hz(th.root + 8), t + 0.16);
    } else if (kind === "win") {
      [0, 4, 7, 12].forEach((s, i) => chime(hz(th.root + 24 + s), t + i * 0.14, 0.13));
    }
  }

  function padLoop() {
    clearTimeout(tPad);
    if (!playing || !ctx) return;
    const th = THEMES[cur];
    if (ctx.state === "running") {
      const chord = th.chords[chordI++ % th.chords.length];
      const t = ctx.currentTime + 0.05;
      chord.forEach((s, i) => pad(hz(th.root + s), t + i * 0.25, 15));
    }
    tPad = setTimeout(padLoop, 11000);
  }

  function melLoop() {
    clearTimeout(tMel);
    if (!playing || !ctx) return;
    const th = THEMES[cur];
    if (ctx.state === "running" && Math.random() < 0.85) {
      const s = th.scale[Math.floor(Math.random() * th.scale.length)] + (Math.random() < 0.25 ? 12 : 0);
      note(hz(th.root + 12 + s), ctx.currentTime + 0.05, th.voice);
    }
    tMel = setTimeout(melLoop, rr(th.melGap[0], th.melGap[1]));
  }

  function halt() {
    clearTimeout(tPad);
    clearTimeout(tMel);
    tEv.forEach(clearTimeout);
    tEv = [];
  }

  return {
    supported: !!AC,
    start() {
      if (!AC) return;
      if (!ctx) build();
      const c = audio();
      void c.resume();
      master.gain.setTargetAtTime(vol * 0.5, c.currentTime, 1);
      if (!playing) {
        playing = true;
        padLoop();
        tMel = setTimeout(melLoop, 2500);
        startEvents();
      }
    },
    stop() {
      if (!ctx) return;
      playing = false;
      halt();
      master.gain.setTargetAtTime(0, ctx.currentTime, 0.4);
      setTimeout(() => {
        if (!playing && ctx && ctx.state === "running") void ctx.suspend();
      }, 2000);
    },
    volume(v: number) {
      vol = v;
      if (ctx && playing) master.gain.setTargetAtTime(vol * 0.5, ctx.currentTime, 0.1);
    },
    theme(k: DecorKey) {
      if (THEMES[k] && k !== cur) {
        cur = k;
        if (ctx) {
          applyTheme();
          if (playing) {
            padLoop();
            startEvents();
          }
        }
      }
    },
    pause() {
      if (ctx && playing) void ctx.suspend();
    },
    resume() {
      if (ctx && playing) void ctx.resume();
    },
    fx,
    isPlaying: () => playing,
  };
}

let instance: AmbientSound | null = null;

/** Moteur unique pour toute l'application (côté navigateur seulement). */
export function getAmbientSound(): AmbientSound {
  if (!instance) instance = createAmbientSound();
  return instance;
}
