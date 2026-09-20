/**
 * Effets sonores synthétisés (Web Audio) : aucun fichier à charger.
 * lub-dub du cœur, bip du moniteur, tic de survol, carillon de résultat.
 */
class AudioEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  enabled = false;

  private ensure() {
    if (!this.ctx) {
      this.ctx = new AudioContext();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.7;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === "suspended") void this.ctx.resume();
    return { ctx: this.ctx, master: this.master! };
  }

  enable() {
    this.enabled = true;
    this.ensure();
  }

  disable() {
    this.enabled = false;
    void this.ctx?.suspend();
  }

  get now() {
    return this.ctx?.currentTime ?? 0;
  }

  /** Bruit sourd des valves : S1 (lub) grave et long, S2 (dub) plus sec. */
  thump(at: number, kind: "lub" | "dub", intensity = 1) {
    if (!this.enabled) return;
    const { ctx, master } = this.ensure();
    const t = Math.max(at, ctx.currentTime);
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 180;
    const f0 = kind === "lub" ? 68 : 56;
    const dur = kind === "lub" ? 0.16 : 0.11;
    osc.type = "sine";
    osc.frequency.setValueAtTime(f0, t);
    osc.frequency.exponentialRampToValueAtTime(f0 * 0.55, t + dur);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime((kind === "lub" ? 0.9 : 0.6) * intensity, t + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(filter).connect(gain).connect(master);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  /** Bip du moniteur sur le pic R. */
  beep(at: number, alert = false) {
    if (!this.enabled) return;
    const { ctx, master } = this.ensure();
    const t = Math.max(at, ctx.currentTime);
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = alert ? 1180 : 920;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(alert ? 0.12 : 0.07, t + 0.004);
    gain.gain.setValueAtTime(alert ? 0.12 : 0.07, t + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
    osc.connect(gain).connect(master);
    osc.start(t);
    osc.stop(t + 0.1);
  }

  /** Tic discret au survol d'un terme. */
  tick() {
    if (!this.enabled) return;
    const { ctx, master } = this.ensure();
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(1600, t);
    osc.frequency.exponentialRampToValueAtTime(900, t + 0.04);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.05, t + 0.003);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
    osc.connect(gain).connect(master);
    osc.start(t);
    osc.stop(t + 0.06);
  }

  /** Carillon de résultat : montant si préservé, descendant si atteint. */
  chime(kind: "safe" | "risk") {
    if (!this.enabled) return;
    const { ctx, master } = this.ensure();
    const notes = kind === "safe" ? [660, 880, 1100] : [520, 390, 330];
    notes.forEach((freq, i) => {
      const t = ctx.currentTime + i * 0.14;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = kind === "safe" ? "sine" : "triangle";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.16, t + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.32);
      osc.connect(gain).connect(master);
      osc.start(t);
      osc.stop(t + 0.35);
    });
  }
}

export const audio = new AudioEngine();
