/**
 * @file SoundManager.js
 * @description 音效管理（Web Audio API 合成音效，无需音频文件）
 * @author HappyCard Team
 * @date 2026-08
 */

class SoundManager {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    this.volume = 0.6;
    this._initialized = false;
  }

  _init() {
    if (this._initialized) return;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) this.ctx = new AC();
      this._initialized = true;
    } catch (e) {
      console.warn('[SoundManager] 初始化失败', e);
    }
  }

  /**
   * 用户首次交互后解锁音频
   */
  unlock() {
    this._init();
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  setEnabled(enabled) {
    this.enabled = enabled;
  }

  setVolume(v) {
    this.volume = Math.max(0, Math.min(1, v));
  }

  _tone(freq, duration, type = 'sine', gain = 0.2, when = 0) {
    if (!this.enabled || !this.ctx) return;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    g.gain.value = gain * this.volume;
    osc.connect(g);
    g.connect(this.ctx.destination);
    const t = this.ctx.currentTime + when;
    osc.start(t);
    g.gain.setValueAtTime(gain * this.volume, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + duration);
    osc.stop(t + duration);
  }

  _noise(duration, gain = 0.2) {
    if (!this.enabled || !this.ctx) return;
    const bufferSize = this.ctx.sampleRate * duration;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    const g = this.ctx.createGain();
    g.gain.value = gain * this.volume;
    g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
    src.connect(g);
    g.connect(this.ctx.destination);
    src.start();
  }

  playDeal() {
    this._init();
    this._tone(800, 0.05, 'square', 0.08);
  }

  playPlayCard() {
    this._init();
    this._tone(600, 0.08, 'triangle', 0.15);
  }

  playPass() {
    this._init();
    this._tone(300, 0.15, 'sine', 0.12);
  }

  playSelect() {
    this._init();
    this._tone(1000, 0.03, 'sine', 0.06);
  }

  playBomb() {
    this._init();
    this._noise(0.4, 0.3);
    this._tone(80, 0.5, 'sawtooth', 0.25);
    this._tone(120, 0.4, 'square', 0.15, 0.05);
  }

  playRocket() {
    this._init();
    this._noise(0.6, 0.35);
    [200, 300, 400, 600, 800, 1000].forEach((f, i) => {
      this._tone(f, 0.3, 'sawtooth', 0.18, i * 0.08);
    });
  }

  playWin() {
    this._init();
    [523, 659, 784, 1047].forEach((f, i) => {
      this._tone(f, 0.2, 'triangle', 0.2, i * 0.12);
    });
  }

  playLose() {
    this._init();
    [400, 350, 300, 200].forEach((f, i) => {
      this._tone(f, 0.3, 'sine', 0.18, i * 0.15);
    });
  }

  playClick() {
    this._init();
    this._tone(1200, 0.04, 'square', 0.1);
  }

  playBid() {
    this._init();
    [600, 800].forEach((f, i) => this._tone(f, 0.1, 'triangle', 0.15, i * 0.08));
  }

  playCountdown() {
    this._init();
    this._tone(900, 0.08, 'sine', 0.12);
  }

  /**
   * 语音（TTS）
   * @param {string} text
   */
  speak(text) {
    if (!this.enabled) return;
    if (typeof speechSynthesis === 'undefined') return;
    try {
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'zh-CN';
      u.rate = 1.1;
      u.volume = this.volume;
      speechSynthesis.speak(u);
    } catch (e) {
      // ignore
    }
  }
}

const sound = new SoundManager();

if (typeof window !== 'undefined') {
  window.SoundManager = SoundManager;
  window.sound = sound;
  document.addEventListener('click', () => sound.unlock(), { once: true });
  document.addEventListener('touchstart', () => sound.unlock(), { once: true, passive: true });
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { SoundManager, sound };
}
