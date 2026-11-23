import { clamp } from "./utils.js";

export class AudioManager {
  constructor(settings) {
    this.settings = { ...settings };
    this.ctx = null;
    this.master = null;
    this.compressor = null;
    this.noiseBuffer = null;
    this.ambient = null;
    this.ambientStarted = false;
    this.paused = false;
    this.heartbeatTimer = 0;
    this.heartbeatPulse = 0;
  }

  async unlock() {
    if (!this.ctx) this.createContext();
    if (!this.ctx) return;
    if (this.ctx.state === "suspended") {
      try {
        await this.ctx.resume();
      } catch {
        // The browser may refuse until the next gesture. Every menu button unlocks audio.
      }
    }
  }

  createContext() {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;

    this.ctx = new AudioContext();
    this.compressor = this.ctx.createDynamicsCompressor();
    this.compressor.threshold.value = -18;
    this.compressor.knee.value = 18;
    this.compressor.ratio.value = 8;
    this.compressor.attack.value = 0.003;
    this.compressor.release.value = 0.22;

    this.master = this.ctx.createGain();
    this.master.connect(this.compressor);
    this.compressor.connect(this.ctx.destination);

    this.noiseBuffer = this.createNoiseBuffer(2);
    this.applyMasterVolume();
    this.createAmbient();
  }

  createNoiseBuffer(seconds) {
    const length = Math.max(1, Math.floor(this.ctx.sampleRate * seconds));
    const buffer = this.ctx.createBuffer(1, length, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) {
      data[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }

  createAmbient() {
    const now = this.ctx.currentTime;
    const ambientGain = this.ctx.createGain();
    ambientGain.gain.value = 0;

    const filter = this.ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 180;
    filter.Q.value = 0.8;

    const drone = this.ctx.createOscillator();
    drone.type = "sine";
    drone.frequency.value = 41.2;

    const droneTwo = this.ctx.createOscillator();
    droneTwo.type = "triangle";
    droneTwo.frequency.value = 55;

    const droneGain = this.ctx.createGain();
    droneGain.gain.value = 0.5;

    const air = this.ctx.createBufferSource();
    air.buffer = this.noiseBuffer;
    air.loop = true;
    const airFilter = this.ctx.createBiquadFilter();
    airFilter.type = "bandpass";
    airFilter.frequency.value = 280;
    airFilter.Q.value = 0.6;
    const airGain = this.ctx.createGain();
    airGain.gain.value = 0.16;

    drone.connect(droneGain);
    droneTwo.connect(droneGain);
    droneGain.connect(filter);
    air.connect(airFilter);
    airFilter.connect(airGain);
    airGain.connect(filter);
    filter.connect(ambientGain);
    ambientGain.connect(this.master);

    const lfo = this.ctx.createOscillator();
    lfo.type = "sine";
    lfo.frequency.value = 0.07;
    const lfoGain = this.ctx.createGain();
    lfoGain.gain.value = 0.006;
    lfo.connect(lfoGain);
    lfoGain.connect(ambientGain.gain);

    drone.start(now);
    droneTwo.start(now);
    air.start(now);
    lfo.start(now);

    this.ambient = { ambientGain, filter, airFilter };
  }

  applyMasterVolume() {
    if (!this.master || !this.ctx) return;
    const target = this.settings.muted ? 0 : Math.pow(this.settings.volume, 1.5);
    this.master.gain.cancelScheduledValues(this.ctx.currentTime);
    this.master.gain.setTargetAtTime(target, this.ctx.currentTime, 0.03);
  }

  updateSettings(settings) {
    this.settings = { ...settings };
    this.applyMasterVolume();
  }

  setPaused(paused) {
    this.paused = paused;
    if (!this.ambient || !this.ctx) return;
    const target = !this.ambientStarted || paused ? 0 : 0.028;
    this.ambient.ambientGain.gain.setTargetAtTime(target, this.ctx.currentTime, 0.2);
  }

  startAmbient() {
    this.ambientStarted = true;
    this.paused = false;
    this.heartbeatTimer = 0;
    if (!this.ambient || !this.ctx) return;
    this.ambient.ambientGain.gain.setTargetAtTime(0.028, this.ctx.currentTime, 0.8);
  }

  stopAmbient() {
    this.ambientStarted = false;
    this.heartbeatTimer = 0;
    if (!this.ambient || !this.ctx) return;
    this.ambient.ambientGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.35);
  }

  setThreat(threat) {
    if (!this.ambient || !this.ctx) return;
    const now = this.ctx.currentTime;
    const level = clamp(threat, 0, 1);
    if (this.ambientStarted && !this.paused) {
      this.ambient.ambientGain.gain.setTargetAtTime(0.028 + level * 0.036, now, 0.4);
    }
    this.ambient.filter.frequency.setTargetAtTime(180 + level * 260, now, 0.4);
    this.ambient.airFilter.frequency.setTargetAtTime(280 + level * 900, now, 0.4);
  }

  updateHeartbeat(dt, threat, active) {
    if (!active || this.paused || !this.ctx) {
      this.heartbeatTimer = 0;
      return;
    }
    const level = clamp(threat, 0, 1);
    this.heartbeatTimer -= dt;
    if (this.heartbeatTimer <= 0) {
      this.heartbeatTimer = 1.2 - level * 0.82;
      this.playHeartbeat(0.18 + level * 0.32);
    }
  }

  playHeartbeat(intensity) {
    if (!this.ctx || !this.master) return;
    const now = this.ctx.currentTime;
    this.playThump(now, intensity);
    this.playThump(now + 0.18, intensity * 0.62);
  }

  playThump(time, intensity) {
    const oscillator = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(62, time);
    oscillator.frequency.exponentialRampToValueAtTime(34, time + 0.16);
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.001, intensity), time + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.18);
    oscillator.connect(gain);
    gain.connect(this.master);
    oscillator.start(time);
    oscillator.stop(time + 0.2);
  }

  footstep() {
    if (!this.ctx || !this.master || this.paused) return;
    const now = this.ctx.currentTime;
    const source = this.ctx.createBufferSource();
    source.buffer = this.noiseBuffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = 150 + Math.random() * 130;
    filter.Q.value = 1.1;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.055, now + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.09);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);
    source.start(now);
    source.stop(now + 0.11);
  }

  countdownBeep(final = false) {
    if (!this.ctx || !this.master) return;
    const now = this.ctx.currentTime;
    const oscillator = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    oscillator.type = "sine";
    oscillator.frequency.value = final ? 520 : 340;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.09, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + (final ? 0.32 : 0.12));
    oscillator.connect(gain);
    gain.connect(this.master);
    oscillator.start(now);
    oscillator.stop(now + 0.35);
  }

  wake() {
    if (!this.ctx || !this.master) return;
    const now = this.ctx.currentTime;
    const oscillator = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    oscillator.type = "sawtooth";
    oscillator.frequency.setValueAtTime(58, now);
    oscillator.frequency.exponentialRampToValueAtTime(24, now + 1.4);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.12, now + 0.08);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.5);
    const filter = this.ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 180;
    oscillator.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);
    oscillator.start(now);
    oscillator.stop(now + 1.6);
  }

  jumpscare() {
    if (!this.ctx || !this.master) return;
    const now = this.ctx.currentTime;

    const noise = this.ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;
    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = "highpass";
    noiseFilter.frequency.value = 500;
    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.0001, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.28, now + 0.01);
    noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.55);
    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.master);
    noise.start(now);
    noise.stop(now + 0.6);

    const oscillator = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    oscillator.type = "sawtooth";
    oscillator.frequency.setValueAtTime(110, now);
    oscillator.frequency.exponentialRampToValueAtTime(28, now + 0.7);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.3, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.8);
    oscillator.connect(gain);
    gain.connect(this.master);
    oscillator.start(now);
    oscillator.stop(now + 0.85);
  }

  victory() {
    if (!this.ctx || !this.master) return;
    const now = this.ctx.currentTime;
    const notes = [392, 493.88, 587.33, 783.99];
    notes.forEach((frequency, index) => {
      const start = now + index * 0.11;
      const oscillator = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      oscillator.type = "sine";
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.09, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.7);
      oscillator.connect(gain);
      gain.connect(this.master);
      oscillator.start(start);
      oscillator.stop(start + 0.75);
    });
  }

  click() {
    if (!this.ctx || !this.master) return;
    const now = this.ctx.currentTime;
    const oscillator = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    oscillator.type = "triangle";
    oscillator.frequency.setValueAtTime(640, now);
    oscillator.frequency.exponentialRampToValueAtTime(420, now + 0.05);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.035, now + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.07);
    oscillator.connect(gain);
    gain.connect(this.master);
    oscillator.start(now);
    oscillator.stop(now + 0.08);
  }

  stopGameplay() {
    this.stopAmbient();
    this.heartbeatTimer = 0;
  }
}
