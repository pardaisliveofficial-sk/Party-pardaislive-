/**
 * Pure Web Audio API Sound Effects for Store Experience
 * Works on all modern browsers without loading external MP3 files.
 */

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

export function playStoreAudio(type: 'coin' | 'engine' | 'fanfare' | 'chime' | 'dragon' | 'equip') {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    if (type === 'coin') {
      // Golden Coin Purchase Chime (Bling-bling!)
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = 'sine';
      osc2.type = 'triangle';

      osc1.frequency.setValueAtTime(987.77, now); // B5
      osc1.frequency.setValueAtTime(1318.51, now + 0.08); // E6

      osc2.frequency.setValueAtTime(1975.53, now); // B6
      osc2.frequency.setValueAtTime(2637.02, now + 0.08); // E7

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.35);
      osc2.stop(now + 0.35);
    } else if (type === 'engine') {
      // Hypercar & Ghost Motorcycle Roaring Engine Rev
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';

      osc.frequency.setValueAtTime(90, now);
      osc.frequency.exponentialRampToValueAtTime(320, now + 0.25);
      osc.frequency.exponentialRampToValueAtTime(180, now + 0.55);
      osc.frequency.exponentialRampToValueAtTime(450, now + 0.85);

      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 1.1);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 1.1);
    } else if (type === 'fanfare') {
      // Royal Fanfare & Coronation Trumpet
      const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * 0.1);

        gain.gain.setValueAtTime(0, now + idx * 0.1);
        gain.gain.linearRampToValueAtTime(0.2, now + idx * 0.1 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.1 + 0.4);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + idx * 0.1);
        osc.stop(now + idx * 0.1 + 0.45);
      });
    } else if (type === 'chime') {
      // Fairy Pegasus / Magic Star Chime
      const freqs = [1046.5, 1318.5, 1567.98, 2093.0];
      freqs.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.06);

        gain.gain.setValueAtTime(0.15, now + idx * 0.06);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.06 + 0.35);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + idx * 0.06);
        osc.stop(now + idx * 0.06 + 0.4);
      });
    } else if (type === 'dragon') {
      // Deep Mythic Beast / Lion Roar Rumble
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';

      osc.frequency.setValueAtTime(140, now);
      osc.frequency.linearRampToValueAtTime(70, now + 0.4);
      osc.frequency.linearRampToValueAtTime(50, now + 0.9);

      gain.gain.setValueAtTime(0.22, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 1.0);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 1.0);
    } else if (type === 'equip') {
      // Crisp Equip Click
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(659.25, now);
      osc.frequency.setValueAtTime(880, now + 0.05);

      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.2);
    }
  } catch (err) {
    // Ignore audio autoplay restrictions
  }
}

let activeMusicOscs: OscillatorNode[] = [];
let activeMusicGains: GainNode[] = [];

export function stopMusicSnippet() {
  try {
    activeMusicOscs.forEach((o) => {
      try {
        o.stop();
        o.disconnect();
      } catch {}
    });
    activeMusicGains.forEach((g) => {
      try {
        g.disconnect();
      } catch {}
    });
    activeMusicOscs = [];
    activeMusicGains = [];
  } catch {}
}

export function playMusicSnippet(trackType = 'vibe') {
  try {
    stopMusicSnippet();
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // Musical melody notes (Arpeggiated chords)
    const melody = [
      { f: 440.0, d: 0.35, t: 0.0 }, // A4
      { f: 554.37, d: 0.35, t: 0.25 }, // C#5
      { f: 659.25, d: 0.35, t: 0.5 }, // E5
      { f: 880.0, d: 0.6, t: 0.75 }, // A5
      { f: 783.99, d: 0.4, t: 1.25 }, // G5
      { f: 659.25, d: 0.5, t: 1.6 }, // E5
      { f: 587.33, d: 0.7, t: 2.0 }, // D5
    ];

    melody.forEach((note) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = trackType === 'acoustic' ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(note.f, now + note.t);

      gain.gain.setValueAtTime(0, now + note.t);
      gain.gain.linearRampToValueAtTime(0.18, now + note.t + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, now + note.t + note.d);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + note.t);
      osc.stop(now + note.t + note.d);

      activeMusicOscs.push(osc);
      activeMusicGains.push(gain);
    });
  } catch (e) {
    // ignore
  }
}

