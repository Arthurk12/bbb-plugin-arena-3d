import { MASTER_VOLUME } from './constants';
import { ArenaAudio, SoundId } from './types';

type Recipe = (ctx: AudioContext, out: AudioNode, at: number) => void;

const NOISE_SECONDS = 1;

const tone = (
  ctx: AudioContext,
  out: AudioNode,
  at: number,
  type: OscillatorType,
  from: number,
  to: number,
  duration: number,
  gain = 1,
) => {
  const osc = ctx.createOscillator();
  const env = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(from, at);
  osc.frequency.exponentialRampToValueAtTime(to, at + duration);
  env.gain.setValueAtTime(gain, at);
  env.gain.exponentialRampToValueAtTime(0.001, at + duration);
  osc.connect(env).connect(out);
  osc.start(at);
  osc.stop(at + duration);
};

const createNoiseBuffer = (ctx: AudioContext): AudioBuffer => {
  const buffer = ctx.createBuffer(1, ctx.sampleRate * NOISE_SECONDS, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i += 1) data[i] = Math.random() * 2 - 1;
  return buffer;
};

const noise = (
  ctx: AudioContext,
  out: AudioNode,
  at: number,
  buffer: AudioBuffer,
  cutoff: number,
  duration: number,
  gain = 1,
) => {
  const source = ctx.createBufferSource();
  const filter = ctx.createBiquadFilter();
  const env = ctx.createGain();
  source.buffer = buffer;
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(cutoff, at);
  env.gain.setValueAtTime(gain, at);
  env.gain.exponentialRampToValueAtTime(0.001, at + duration);
  source.connect(filter).connect(env).connect(out);
  source.start(at);
  source.stop(at + duration);
};

/** Every sound is synthesized: nothing to download, nothing to license. */
const recipes = (noiseBuffer: AudioBuffer): Record<SoundId, Recipe> => ({
  blaster: (ctx, out, at) => {
    tone(ctx, out, at, 'square', 900, 120, 0.14, 0.5);
    noise(ctx, out, at, noiseBuffer, 3000, 0.08, 0.4);
  },
  shotgun: (ctx, out, at) => {
    noise(ctx, out, at, noiseBuffer, 1800, 0.35, 1);
    tone(ctx, out, at, 'sawtooth', 160, 40, 0.25, 0.6);
  },
  hit: (ctx, out, at) => tone(ctx, out, at, 'sine', 1400, 1100, 0.06, 0.5),
  headshot: (ctx, out, at) => {
    tone(ctx, out, at, 'square', 1800, 1600, 0.05, 0.4);
    tone(ctx, out, at + 0.05, 'square', 2400, 2200, 0.06, 0.4);
  },
  frag: (ctx, out, at) => {
    tone(ctx, out, at, 'square', 523, 523, 0.1, 0.4);
    tone(ctx, out, at + 0.1, 'square', 659, 659, 0.1, 0.4);
    tone(ctx, out, at + 0.2, 'square', 784, 784, 0.18, 0.4);
  },
  jump: (ctx, out, at) => tone(ctx, out, at, 'sine', 220, 440, 0.12, 0.25),
  pad: (ctx, out, at) => {
    tone(ctx, out, at, 'sawtooth', 120, 900, 0.4, 0.4);
    noise(ctx, out, at, noiseBuffer, 800, 0.4, 0.3);
  },
  pain: (ctx, out, at) => tone(ctx, out, at, 'sawtooth', 260, 90, 0.18, 0.5),
  death: (ctx, out, at) => {
    tone(ctx, out, at, 'sawtooth', 300, 40, 0.8, 0.6);
    noise(ctx, out, at, noiseBuffer, 600, 0.6, 0.5);
  },
  pickup: (ctx, out, at) => {
    tone(ctx, out, at, 'triangle', 660, 660, 0.08, 0.5);
    tone(ctx, out, at + 0.08, 'triangle', 990, 990, 0.12, 0.5);
  },
  respawn: (ctx, out, at) => tone(ctx, out, at, 'triangle', 200, 800, 0.3, 0.4),
});

export const createArenaAudio = (): ArenaAudio => {
  const AudioContextClass = window.AudioContext
    ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextClass) {
    return {
      resume: () => {}, play: () => {}, setMuted: () => {}, dispose: () => {},
    };
  }
  const ctx = new AudioContextClass();
  const master = ctx.createGain();
  master.gain.value = MASTER_VOLUME;
  master.connect(ctx.destination);
  const sounds = recipes(createNoiseBuffer(ctx));
  let muted = false;

  return {
    resume: () => {
      if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    },
    play: (sound, volume = 1) => {
      if (muted || ctx.state !== 'running' || volume <= 0) return;
      const out = ctx.createGain();
      out.gain.value = Math.min(1, volume);
      out.connect(master);
      sounds[sound](ctx, out, ctx.currentTime);
    },
    setMuted: (value) => { muted = value; },
    dispose: () => { ctx.close().catch(() => {}); },
  };
};
