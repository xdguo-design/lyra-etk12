/**
 * 游戏乐园：数字连线 · 颜色规律 · 小迷宫
 * 专为 3–8 岁设计，大按钮、即时反馈
 */
const Games = {
  current: null,

  openHub(container) {
    container.innerHTML = `
      <div class="lesson-title">🎮 游戏乐园</div>
      <p class="lesson-desc">选一个好玩的，练观察力和动脑筋～</p>
      <div class="game-hub-grid">
        <button class="game-hub-card" data-game="connect">
          <span class="emoji">🔢</span>
          <span class="name">数字连线</span>
          <span class="hint">按 1→9 点亮</span>
        </button>
        <button class="game-hub-card" data-game="pattern">
          <span class="emoji">🌈</span>
          <span class="name">颜色规律</span>
          <span class="hint">找下一个颜色</span>
        </button>
        <button class="game-hub-card" data-game="maze">
          <span class="emoji">🧩</span>
          <span class="name">小迷宫</span>
          <span class="hint">走到星星</span>
        </button>
      </div>
    `;
    container.querySelectorAll("[data-game]").forEach(btn => {
      btn.onclick = () => {
        const g = btn.dataset.game;
        if (g === "connect") this.startConnect(container);
        else if (g === "pattern") this.startPattern(container);
        else if (g === "maze") this.startMaze(container);
      };
    });
  },

  startConnect(container) {
    this.current = "connect";
    const order = [1,2,3,4,5,6,7,8,9];
    const positions = order.map((n, i) => {
      const angle = (i / 9) * Math.PI * 2 - Math.PI / 2;
      const r = 38;
      return { n, x: 50 + r * Math.cos(angle), y: 50 + r * Math.sin(angle) };
    });
    this._connect = { next: 1, positions, lines: [] };
    container.innerHTML = `
      <div class="lesson-title">🔢 数字连线</div>
      <p class="lesson-desc">按顺序点 1 → 2 → … → 9</p>
      <div class="connect-board" id="connect-board">
        <svg class="connect-svg" id="connect-svg" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet"></svg>
      </div>
      <div class="feedback" id="feedback"></div>
      <button class="primary-btn" id="btn-connect-restart">再玩一次</button>
      <button class="secondary-btn" id="btn-back-hub">返回游戏列表</button>
    `;
    const board = document.getElementById("connect-board");
    const svg = document.getElementById("connect-svg");
    positions.forEach(p => {
      const dot = document.createElement("button");
      dot.className = "connect-dot";
      dot.textContent = p.n;
      dot.style.left = p.x + "%";
      dot.style.top = p.y + "%";
      dot.dataset.n = p.n;
      board.appendChild(dot);
      dot.onclick = () => this._onConnectTap(p.n, dot, board, svg);
    });
    document.getElementById("btn-connect-restart").onclick = () => this.startConnect(container);
    document.getElementById("btn-back-hub").onclick = () => this.openHub(container);
  },

  _onConnectTap(n, dot, board, svg) {
    const st = this._connect;
    if (n !== st.next) {
      TTS.playWrong();
      const fb = document.getElementById("feedback");
      if (fb) { fb.textContent = "要按顺序点哦，下一个是 " + st.next; fb.className = "feedback bad"; }
      return;
    }
    dot.classList.add("lit");
    TTS.playSuccess();
    if (st.next > 1) {
      const prev = st.positions.find(p => p.n === st.next - 1);
      const cur = st.positions.find(p => p.n === st.next);
      if (prev && cur) {
        const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
        line.setAttribute("x1", prev.x);
        line.setAttribute("y1", prev.y);
        line.setAttribute("x2", cur.x);
        line.setAttribute("y2", cur.y);
        line.setAttribute("stroke", "#ff9f43");
        line.setAttribute("stroke-width", "1.5");
        line.setAttribute("stroke-linecap", "round");
        svg.appendChild(line);
      }
    }
    st.next++;
    if (st.next > 9) {
      const fb = document.getElementById("feedback");
      if (fb) { fb.textContent = "全部连好啦！真厉害 ⭐"; fb.className = "feedback good"; }
      TTS.speak("全部连好啦，真厉害！");
      if (typeof App !== "undefined") setTimeout(() => App.completeSubject("games"), 1000);
    }
  },

  startPattern(container) {
    this.current = "pattern";
    const colors = [
      { id: "r", css: "#ff6b6b", name: "红" },
      { id: "y", css: "#ffe566", name: "黄" },
      { id: "b", css: "#54a0ff", name: "蓝" },
      { id: "g", css: "#1dd1a1", name: "绿" }
    ];
    const seqLen = 4 + Math.floor(Math.random() * 2);
    const pattern = [];
    for (let i = 0; i < seqLen; i++) pattern.push(colors[i % colors.length]);
    const answer = pattern[pattern.length - 1];
    const shown = pattern.slice(0, -1);
    const opts = [answer, ...colors.filter(c => c.id !== answer.id)].slice(0, 4);
    opts.sort(() => Math.random() - 0.5);
    this._pattern = { answer: answer.id };
    container.innerHTML = `
      <div class="lesson-title">🌈 颜色规律</div>
      <p class="lesson-desc">看规律，下一个是什么颜色？</p>
      <div class="pattern-row" id="pattern-row"></div>
      <div class="pattern-opts" id="pattern-opts"></div>
      <div class="feedback" id="feedback"></div>
      <button class="primary-btn" id="btn-pattern-next">再来一题</button>
      <button class="secondary-btn" id="btn-back-hub">返回游戏列表</button>
    `;
    const row = document.getElementById("pattern-row");
    shown.forEach(c => {
      const d = document.createElement("div");
      d.className = "pattern-dot";
      d.style.background = c.css;
      row.appendChild(d);
    });
    const q = document.createElement("div");
    q.className = "pattern-dot pattern-q";
    q.textContent = "?";
    row.appendChild(q);
    const optBox = document.getElementById("pattern-opts");
    opts.forEach(c => {
      const btn = document.createElement("button");
      btn.className = "pattern-opt";
      btn.style.background = c.css;
      btn.onclick = () => this._onPatternPick(c.id, btn, optBox);
      optBox.appendChild(btn);
    });
    document.getElementById("btn-pattern-next").onclick = () => this.startPattern(container);
    document.getElementById("btn-back-hub").onclick = () => this.openHub(container);
  },

  _onPatternPick(id, btn, optBox) {
    const ok = id === this._pattern.answer;
    optBox.querySelectorAll("button").forEach(b => (b.disabled = true));
    const fb = document.getElementById("feedback");
    if (ok) {
      btn.classList.add("correct");
      if (fb) { fb.textContent = "找对啦！⭐"; fb.className = "feedback good"; }
      TTS.playSuccess();
      TTS.speak("找对啦！");
      if (typeof App !== "undefined") setTimeout(() => App.completeSubject("games"), 900);
    } else {
      btn.classList.add("wrong");
      if (fb) { fb.textContent = "再看看规律哦"; fb.className = "feedback bad"; }
      TTS.playWrong();
    }
  },

  startMaze(container) {
    this.current = "maze";
    const size = 5;
    const grid = Array.from({ length: size }, () => Array(size).fill(0));
    for (let i = 0; i < size * 2; i++) {
      const r = Math.floor(Math.random() * size);
      const c = Math.floor(Math.random() * size);
      if (!(r === 0 && c === 0) && !(r === size - 1 && c === size - 1)) grid[r][c] = 1;
    }
    const start = { r: 0, c: 0 };
    const end = { r: size - 1, c: size - 1 };
    this._maze = { grid, pos: { ...start }, end, won: false };
    container.innerHTML = `
      <div class="lesson-title">🧩 小迷宫</div>
      <p class="lesson-desc">用方向键走到 ⭐</p>
      <div class="maze-board" id="maze-board"></div>
      <div class="maze-controls">
        <button class="maze-btn" data-d="up">↑</button>
        <div>
          <button class="maze-btn" data-d="left">←</button>
          <button class="maze-btn" data-d="down">↓</button>
          <button class="maze-btn" data-d="right">→</button>
        </div>
      </div>
      <div class="feedback" id="feedback"></div>
      <button class="primary-btn" id="btn-maze-restart">换一张图</button>
      <button class="secondary-btn" id="btn-back-hub">返回游戏列表</button>
    `;
    this._renderMaze();
    container.querySelectorAll("[data-d]").forEach(btn => {
      btn.onclick = () => this._mazeMove(btn.dataset.d);
    });
    document.getElementById("btn-maze-restart").onclick = () => this.startMaze(container);
    document.getElementById("btn-back-hub").onclick = () => this.openHub(container);
  },

  _renderMaze() {
    const board = document.getElementById("maze-board");
    if (!board || !this._maze) return;
    const { grid, pos, end } = this._maze;
    board.innerHTML = "";
    board.style.gridTemplateColumns = `repeat(${grid.length}, 1fr)`;
    for (let r = 0; r < grid.length; r++) {
      for (let c = 0; c < grid.length; c++) {
        const cell = document.createElement("div");
        cell.className = "maze-cell";
        if (grid[r][c] === 1) cell.classList.add("wall");
        if (r === pos.r && c === pos.c) cell.textContent = "🧒";
        else if (r === end.r && c === end.c) cell.textContent = "⭐";
        board.appendChild(cell);
      }
    }
  },

  _mazeMove(dir) {
    if (!this._maze || this._maze.won) return;
    const { grid, pos, end } = this._maze;
    let { r, c } = pos;
    if (dir === "up") r--;
    if (dir === "down") r++;
    if (dir === "left") c--;
    if (dir === "right") c++;
    if (r < 0 || c < 0 || r >= grid.length || c >= grid.length) return;
    if (grid[r][c] === 1) {
      TTS.playWrong();
      return;
    }
    this._maze.pos = { r, c };
    this._checkMazeWin();
    this._renderMaze();
  },

  _checkMazeWin() {
    const { pos, end } = this._maze;
    if (pos.r === end.r && pos.c === end.c) {
      this._maze.won = true;
      const fb = document.getElementById("feedback");
      if (fb) {
        fb.textContent = "找到小星星啦！真厉害 ⭐";
        fb.className = "feedback good";
      }
      TTS.speak("找到小星星啦，真厉害！");
      if (typeof App !== "undefined") {
        setTimeout(() => App.completeSubject("games"), 800);
      }
    }
  }
};
