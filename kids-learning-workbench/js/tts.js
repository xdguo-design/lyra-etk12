/**
 * 语音模块 — 优先使用自然音色（Edge 神经语音），失败再回退浏览器朗读
 */
const TTS = {
  proxyBase: (typeof location !== "undefined" && location.origin)
    ? `${location.origin}/tts`
    : "http://127.0.0.1:8765/tts",

  _audio: null,
  _preferNatural: true,

  stop() {
    try {
      if (window.speechSynthesis) speechSynthesis.cancel();
    } catch (e) {}
    if (this._audio) {
      try {
        this._audio.pause();
        this._audio.src = "";
      } catch (e) {}
      this._audio = null;
    }
  },

  async speak(text, lang = "zh-CN") {
    if (!text || !String(text).trim()) return;
    const state = typeof Store !== "undefined" ? Store.load() : { sound: true };
    if (state.sound === false) return;

    this.stop();
    const isEn = String(lang).toLowerCase().startsWith("en");
    const proxyLang = isEn ? "en" : "zh";

    if (this._preferNatural) {
      const ok = await this._speakNatural(String(text).trim(), proxyLang);
      if (ok) return;
    }
    this._speakBrowser(String(text).trim(), isEn ? "en-US" : "zh-CN");
  },

  _speakNatural(text, lang) {
    return new Promise((resolve) => {
      try {
        const url = `${this.proxyBase}?lang=${encodeURIComponent(lang)}&text=${encodeURIComponent(text)}`;
        const audio = new Audio();
        this._audio = audio;
        let settled = false;
        const done = (ok) => {
          if (settled) return;
          settled = true;
          resolve(ok);
        };
        audio.onended = () => done(true);
        audio.onerror = () => done(false);
        const timer = setTimeout(() => {
          try { audio.pause(); } catch (e) {}
          done(false);
        }, 8000);
        audio.onloadeddata = () => clearTimeout(timer);
        audio.src = url;
        audio.play().then(() => {
          clearTimeout(timer);
        }).catch(() => {
          clearTimeout(timer);
          done(false);
        });
      } catch (e) {
        resolve(false);
      }
    });
  },

  _speakBrowser(text, lang) {
    if (!window.speechSynthesis) return;
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang;
    u.rate = lang.startsWith("zh") ? 0.9 : 0.95;
    u.pitch = 1.15;
    u.volume = 1;

    const pickVoice = () => {
      const voices = speechSynthesis.getVoices() || [];
      if (!voices.length) return;
      const prefer = lang.startsWith("zh")
        ? [/xiaoxiao|xiaoyi|yaoyao|huihui|tingting|chinese.*female|zh-cn.*female/i, /zh-CN|chinese/i]
        : [/samantha|karen|moira|google us|en-us.*female|neural/i, /en-US|en_US/i];
      for (const re of prefer) {
        const v = voices.find((x) => re.test(x.name) || re.test(x.lang));
        if (v) {
          u.voice = v;
          break;
        }
      }
    };
    pickVoice();
    if (!speechSynthesis.getVoices().length) {
      speechSynthesis.onvoiceschanged = () => {
        pickVoice();
        speechSynthesis.speak(u);
      };
      setTimeout(() => {
        if (!u.voice) speechSynthesis.speak(u);
      }, 200);
      return;
    }
    speechSynthesis.speak(u);
  },

  playSuccess() {
    const state = typeof Store !== "undefined" ? Store.load() : { sound: true };
    if (state.sound === false) return;
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.setValueAtTime(523.25, ctx.currentTime);
      osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.1);
      osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.2);
      gain.gain.setValueAtTime(0.28, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.45);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.45);
    } catch (e) {}
  },

  playWrong() {
    const state = typeof Store !== "undefined" ? Store.load() : { sound: true };
    if (state.sound === false) return;
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "triangle";
      osc.frequency.setValueAtTime(220, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(180, ctx.currentTime + 0.2);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.28);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.28);
    } catch (e) {}
  }
};
