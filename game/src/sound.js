// Ember & Tide — a tiny synthesized sound set (WebAudio oscillators, no audio
// files, no network). A short blip when a card is played, a low thud for
// damage, a rising chime for healing and a little arpeggio for victory.
// Browsers need a user gesture before audio starts, so unlock() is called on
// the first click or key press; until then every play() is a silent no-op.

export function createSound() {
  let context = null;
  let muted = false;

  function ensure() {
    if (context) return context;
    try {
      const AudioContext = window.AudioContext ?? window.webkitAudioContext;
      if (!AudioContext) return null;
      context = new AudioContext();
    } catch {
      context = null;
    }
    return context;
  }

  function tone(freq, startAt, duration, type, volume) {
    const ctx = ensure();
    if (!ctx || muted) return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, ctx.currentTime + startAt);
      gain.gain.linearRampToValueAtTime(volume, ctx.currentTime + startAt + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + startAt + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + startAt);
      osc.stop(ctx.currentTime + startAt + duration + 0.05);
    } catch {
      // Sound is garnish: a failure here must never break the game.
    }
  }

  const patterns = {
    play: () => { tone(520, 0, 0.09, 'triangle', 0.12); tone(780, 0.05, 0.1, 'triangle', 0.1); },
    error: () => { tone(160, 0, 0.12, 'square', 0.05); },
    end: () => { tone(330, 0, 0.08, 'sine', 0.1); },
    start: () => { tone(392, 0, 0.1, 'triangle', 0.12); tone(523, 0.08, 0.12, 'triangle', 0.12); tone(659, 0.16, 0.16, 'triangle', 0.12); },
    win: () => { [523, 659, 784, 1047].forEach((freq, i) => tone(freq, i * 0.11, 0.22, 'triangle', 0.13)); },
    loss: () => { [392, 330, 262].forEach((freq, i) => tone(freq, i * 0.16, 0.24, 'sine', 0.11)); },
  };

  return {
    unlock() {
      const ctx = ensure();
      if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {});
    },
    play(name) {
      if (muted) return;
      const pattern = patterns[name];
      if (pattern) pattern();
    },
    toggleMute() {
      muted = !muted;
      return muted;
    },
  };
}
