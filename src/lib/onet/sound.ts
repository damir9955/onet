/**
 * Звуковой движок на Web Audio API.
 * Все звуки синтезируются на лету (осцилляторы + огибающие) —
 * никаких внешних аудиофайлов, игра полностью самодостаточна
 * и легко разворачивается на Vercel.
 */

export type SfxName =
  | 'select'
  | 'match'
  | 'combo'
  | 'wrong'
  | 'hint'
  | 'shuffle'
  | 'win'
  | 'lose'
  | 'tick'
  | 'click'
  | 'freeze';

class SoundEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private _enabled = true;

  get enabled(): boolean {
    return this._enabled;
  }

  setEnabled(v: boolean): void {
    this._enabled = v;
    if (v) this.ensure();
  }

  /** Ленивая инициализация — только после жеста пользователя */
  ensure(): void {
    if (typeof window === 'undefined') return;
    if (!this.ctx) {
      const AC: typeof AudioContext | undefined =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.18;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
  }

  private tone(
    freq: number,
    start: number,
    dur: number,
    type: OscillatorType = 'sine',
    gain = 1,
    slideTo?: number
  ): void {
    if (!this.ctx || !this.master) return;
    const t0 = this.ctx.currentTime + start;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo !== undefined) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(30, slideTo), t0 + dur);
    }
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(gain, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g);
    g.connect(this.master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  play(name: SfxName): void {
    if (!this._enabled) return;
    this.ensure();
    if (!this.ctx) return;
    switch (name) {
      case 'select':
        this.tone(620, 0, 0.08, 'sine', 0.5);
        break;
      case 'click':
        this.tone(440, 0, 0.06, 'triangle', 0.5);
        break;
      case 'match':
        this.tone(523.25, 0, 0.09, 'sine', 0.7);
        this.tone(783.99, 0.07, 0.12, 'sine', 0.7);
        break;
      case 'combo':
        this.tone(523.25, 0, 0.08, 'sine', 0.6);
        this.tone(659.25, 0.06, 0.08, 'sine', 0.6);
        this.tone(987.77, 0.12, 0.14, 'sine', 0.6);
        break;
      case 'wrong':
        this.tone(180, 0, 0.16, 'sawtooth', 0.35, 110);
        break;
      case 'hint':
        this.tone(880, 0, 0.1, 'triangle', 0.5);
        this.tone(1174.66, 0.09, 0.12, 'triangle', 0.5);
        break;
      case 'shuffle':
        for (let i = 0; i < 5; i++) {
          this.tone(300 + Math.random() * 500, i * 0.05, 0.06, 'triangle', 0.35);
        }
        break;
      case 'win':
        [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((f, i) => {
          this.tone(f, i * 0.11, 0.22, 'sine', 0.65);
        });
        break;
      case 'lose':
        [440, 349.23, 261.63].forEach((f, i) => {
          this.tone(f, i * 0.18, 0.3, 'sawtooth', 0.4);
        });
        break;
      case 'tick':
        this.tone(1200, 0, 0.03, 'square', 0.3);
        break;
      case 'freeze':
        // ледяное мерцание — нисходящие холодные ноты
        this.tone(1567.98, 0, 0.12, 'sine', 0.5);
        this.tone(1244.5, 0.08, 0.14, 'sine', 0.45);
        this.tone(932.33, 0.16, 0.22, 'sine', 0.4);
        break;
    }
  }
}

/** Синглтон, чтобы состояние звука сохранялось между экранами */
export const sound: SoundEngine = new SoundEngine();
