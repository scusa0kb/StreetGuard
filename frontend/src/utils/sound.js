// SoundManager via Web Audio API (sem arquivos externos)
// Padrões: "alert", "proximity", "safe"

class SoundManager {
  constructor() {
    this.ctx = null;
    this.enabled = false;
    this.volume = 0.7;
  }

  async enable() {
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return false;
      if (!this.ctx) this.ctx = new Ctx();
      if (this.ctx.state === "suspended") await this.ctx.resume();
      this.enabled = true;
      return true;
    } catch {
      return false;
    }
  }

  disable() {
    this.enabled = false;
  }

  _tone(freq = 440, durationMs = 160, type = "sine", peak = 0.6, when = 0) {
    if (!this.enabled || !this.ctx) return;
    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime + when);

    const start = ctx.currentTime + when;
    const end = start + durationMs / 1000;
    const v = (this.volume || 0.7) * peak;

    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.001, v), start + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, end);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(start);
    osc.stop(end + 0.01);
  }

  play(kind = "alert") {
    if (!this.enabled || !this.ctx) return;
    switch (kind) {
      case "alert": {
        [440, 660, 880].forEach((f, i) => this._tone(f, 130, "triangle", 0.7, i * 0.12));
        break;
      }
      case "proximity": {
        [523, 392].forEach((f, i) => this._tone(f, 160, "sine", 0.7, i * 0.15));
        break;
      }
      case "safe": {
        this._tone(523, 220, "sine", 0.5, 0);
        break;
      }
      default:
        break;
    }
  }
}

let singleton;
export function getSoundManager() {
  if (!singleton) singleton = new SoundManager();
  return singleton;
}