import type { HeartMood } from "./types";

export const BPM: Record<HeartMood, number> = { idle: 62, contract: 96, expand: 44, warn: 128 };

/**
 * Horloge cardiaque partagée : le cœur 3D, l'ECG et le son lisent la même phase.
 * `beats` avance en continu (pas de saut quand le rythme change).
 */
class HeartClock {
  beats = 0;
  bpm = BPM.idle;
  private lastNow = performance.now();

  /** À appeler en début de frame ; idempotent pour un même `now`. */
  update(bpm: number, now = performance.now()) {
    this.bpm = bpm;
    if (now === this.lastNow) return this.beats;
    const dt = Math.min((now - this.lastNow) / 1000, 0.25);
    this.lastNow = now;
    this.beats += dt * (bpm / 60);
    return this.beats;
  }

  /** Phase 0..1 dans le cycle courant. */
  phase() {
    return this.beats - Math.floor(this.beats);
  }

  /** Durée d'un battement en secondes. */
  period() {
    return 60 / this.bpm;
  }
}

export const heartClock = new HeartClock();
