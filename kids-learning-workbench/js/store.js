/**
 * 本地进度存储（localStorage）
 */
const Store = {
  KEY: "kids_workbench_v1",

  load() {
    try {
      const raw = localStorage.getItem(this.KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return this.defaultState();
  },

  defaultState() {
    return {
      stars: 0,
      sound: true,
      anim: true,
      aiEnabled: true,
      daily: {}
    };
  },

  save(state) {
    localStorage.setItem(this.KEY, JSON.stringify(state));
  },

  todayKey() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
  },

  isDone(subject) {
    const s = this.load();
    const day = s.daily[this.todayKey()] || {};
    return !!day[subject];
  },

  markDone(subject) {
    const s = this.load();
    const key = this.todayKey();
    if (!s.daily[key]) s.daily[key] = {};
    if (!s.daily[key][subject]) {
      s.daily[key][subject] = true;
      s.stars = (s.stars || 0) + 1;
      this.save(s);
      return true;
    }
    return false;
  },

  getTodayProgress() {
    const s = this.load();
    const day = s.daily[this.todayKey()] || {};
    const subjects = ["chinese", "math", "english", "geo", "astro", "games"];
    const done = subjects.filter(k => day[k]).length;
    return { done, total: subjects.length, day };
  },

  resetToday() {
    const s = this.load();
    delete s.daily[this.todayKey()];
    this.save(s);
  },

  setSound(on) {
    const s = this.load();
    s.sound = on;
    this.save(s);
  },

  setAnim(on) {
    const s = this.load();
    s.anim = on;
    this.save(s);
  },

  setAI(on) {
    const s = this.load();
    s.aiEnabled = on;
    this.save(s);
  }
};
