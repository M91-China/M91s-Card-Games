/**
 * @file DebugPanel.js
 * @description 可视化调试面板：FPS、游戏状态、事件日志、记牌器、AI决策
 * @author HappyCard Team
 * @date 2026-08
 */

class DebugPanel {
  /**
   * @param {Object} game 游戏实例（DoudizhuGame / GuandanGame）
   * @param {Object} [options]
   */
  constructor(game, options = {}) {
    this.game = game;
    this.options = options;
    this.visible = false;
    this._logs = [];
    this._maxLogs = 200;
    this._fps = 0;
    this._frames = 0;
    this._lastFpsTime = performance.now();
    this._rafId = null;
    this._activeTab = 'state';
    this._onGameEvent = this._onGameEvent.bind(this);
    this._onKeyDown = this._onKeyDown.bind(this);
    this._onMouseMove = this._onMouseMove.bind(this);
    this._onMouseUp = this._onMouseUp.bind(this);
    this._dragState = null;

    this._buildUI();
    this._bindKeyboard();
    this._startFpsLoop();
    this._hookGameLogs();

    if (this.fab) this.fab.style.display = 'flex';
  }

  /* ---------------- UI 构建 ---------------- */

  _buildUI() {
    const panel = document.createElement('div');
    panel.id = 'debug-panel';
    panel.innerHTML = `
      <div class="dp-header" id="dp-header">
        <span class="dp-title">🐛 Debug</span>
        <div class="dp-tabs">
          <button data-tab="state" class="dp-tab active">状态</button>
          <button data-tab="log" class="dp-tab">日志</button>
          <button data-tab="cards" class="dp-tab">记牌</button>
          <button data-tab="perf" class="dp-tab">性能</button>
        </div>
        <button class="dp-close" id="dp-close">✕</button>
      </div>
      <div class="dp-body">
        <div class="dp-pane active" data-pane="state" id="dp-state"></div>
        <div class="dp-pane" data-pane="log">
          <div class="dp-log-toolbar">
            <button id="dp-clear-log">清空</button>
            <label class="dp-filter-label"><input type="checkbox" id="dp-filter-state" checked> 状态</label>
            <label class="dp-filter-label"><input type="checkbox" id="dp-filter-play" checked> 出牌</label>
            <label class="dp-filter-label"><input type="checkbox" id="dp-filter-ai" checked> AI</label>
          </div>
          <div class="dp-log-list" id="dp-log-list"></div>
        </div>
        <div class="dp-pane" data-pane="cards" id="dp-cards"></div>
        <div class="dp-pane" data-pane="perf" id="dp-perf"></div>
      </div>
    `;
    document.body.appendChild(panel);

    const style = document.createElement('style');
    style.textContent = this._getCSS();
    document.head.appendChild(style);

    this.el = panel;
    this._bindUI();
  }

  _getCSS() {
    return `
      #debug-panel {
        position: fixed; top: 10px; right: 10px; z-index: 99999;
        width: 340px; max-height: 70vh; min-height: 200px;
        background: rgba(15, 23, 42, 0.96); color: #e2e8f0;
        border: 1px solid rgba(126, 182, 255, 0.4); border-radius: 10px;
        font-family: 'Consolas', 'Monaco', monospace; font-size: 12px;
        display: none; flex-direction: column; overflow: hidden;
        box-shadow: 0 8px 32px rgba(0,0,0,0.5); backdrop-filter: blur(8px);
      }
      #debug-panel.show { display: flex; }
      .dp-header {
        display: flex; align-items: center; gap: 6px;
        padding: 6px 10px; background: rgba(126, 182, 255, 0.12);
        cursor: move; user-select: none; flex-shrink: 0;
      }
      .dp-title { font-weight: bold; color: #7eb6ff; font-size: 13px; margin-right: auto; }
      .dp-tabs { display: flex; gap: 2px; }
      .dp-tab {
        padding: 3px 8px; font-size: 11px; border: none; border-radius: 4px;
        background: transparent; color: #94a3b8; cursor: pointer;
      }
      .dp-tab.active { background: rgba(126, 182, 255, 0.25); color: #fff; }
      .dp-tab:hover { color: #fff; }
      .dp-close {
        background: none; border: none; color: #94a3b8; cursor: pointer;
        font-size: 14px; padding: 0 4px;
      }
      .dp-close:hover { color: #ef5350; }
      .dp-body { flex: 1; overflow: hidden; display: flex; flex-direction: column; }
      .dp-pane { display: none; flex: 1; overflow-y: auto; padding: 8px 10px; }
      .dp-pane.active { display: block; }
      .dp-state-row { display: flex; justify-content: space-between; padding: 2px 0; border-bottom: 1px solid rgba(255,255,255,0.05); }
      .dp-state-label { color: #94a3b8; }
      .dp-state-value { color: #4caf50; font-weight: bold; }
      .dp-state-value.warn { color: #ffa726; }
      .dp-state-value.bad { color: #ef5350; }
      .dp-section-title { color: #7eb6ff; font-weight: bold; margin: 8px 0 4px; font-size: 11px; text-transform: uppercase; }
      .dp-log-toolbar { display: flex; gap: 8px; align-items: center; margin-bottom: 6px; flex-wrap: wrap; }
      .dp-log-toolbar button { padding: 2px 8px; font-size: 11px; background: rgba(255,255,255,0.1); color: #fff; border: 1px solid rgba(255,255,255,0.2); border-radius: 3px; cursor: pointer; }
      .dp-filter-label { display: flex; align-items: center; gap: 3px; font-size: 10px; color: #94a3b8; cursor: pointer; }
      .dp-log-list { max-height: 40vh; overflow-y: auto; }
      .dp-log-item { padding: 2px 0; border-bottom: 1px solid rgba(255,255,255,0.04); line-height: 1.4; word-break: break-all; }
      .dp-log-time { color: #64748b; margin-right: 4px; }
      .dp-log-type-state { color: #7eb6ff; }
      .dp-log-type-play { color: #4caf50; }
      .dp-log-type-ai { color: #ffa726; }
      .dp-log-type-warn { color: #ef5350; }
      .dp-card-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 2px; }
      .dp-card-cell { text-align: center; padding: 3px 0; border-radius: 3px; background: rgba(255,255,255,0.05); font-size: 11px; }
      .dp-card-cell.zero { opacity: 0.3; }
      .dp-card-cell.high { background: rgba(76,175,80,0.25); color: #4caf50; font-weight: bold; }
      .dp-card-cell.wild { background: rgba(255,167,38,0.25); color: #ffa726; }
      .dp-perf-row { display: flex; justify-content: space-between; padding: 2px 0; }
      .dp-perf-label { color: #94a3b8; }
      .dp-perf-value { color: #4caf50; }
      .dp-perf-value.warn { color: #ffa726; }
      .dp-perf-value.bad { color: #ef5350; }
      .dp-fab {
        position: fixed; bottom: 80px; right: 12px; z-index: 99998;
        width: 40px; height: 40px; border-radius: 50%;
        background: rgba(126,182,255,0.9); color: #0f1729;
        border: none; font-size: 18px; cursor: pointer;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        display: flex; align-items: center; justify-content: center;
      }
      .dp-fab:hover { background: #7eb6ff; transform: scale(1.1); }
    `;
  }

  _bindUI() {
    this.el.querySelector('.dp-tabs').addEventListener('click', (e) => {
      const btn = e.target.closest('.dp-tab');
      if (!btn) return;
      this._activeTab = btn.dataset.tab;
      this.el.querySelectorAll('.dp-tab').forEach(t => t.classList.toggle('active', t === btn));
      this.el.querySelectorAll('.dp-pane').forEach(p => {
        p.classList.toggle('active', p.dataset.pane === this._activeTab);
      });
      if (this._activeTab === 'state') this._refreshState();
      if (this._activeTab === 'cards') this._refreshCards();
      if (this._activeTab === 'perf') this._refreshPerf();
    });

    document.getElementById('dp-close').onclick = () => this.toggle(false);
    document.getElementById('dp-clear-log').onclick = () => {
      this._logs = [];
      this._renderLog();
    };

    ['dp-filter-state', 'dp-filter-play', 'dp-filter-ai'].forEach(id => {
      document.getElementById(id).onchange = () => this._renderLog();
    });

    this._makeDraggable();

    const fab = document.createElement('button');
    fab.className = 'dp-fab';
    fab.textContent = '🐛';
    fab.title = '调试面板 (Ctrl+Shift+D)';
    fab.onclick = () => this.toggle();
    document.body.appendChild(fab);
    this.fab = fab;
  }

  _makeDraggable() {
    const header = document.getElementById('dp-header');
    header.addEventListener('mousedown', (e) => {
      if (e.target.tagName === 'BUTTON') return;
      const rect = this.el.getBoundingClientRect();
      this._dragState = {
        offsetX: e.clientX - rect.left,
        offsetY: e.clientY - rect.top
      };
      e.preventDefault();
    });
    document.addEventListener('mousemove', this._onMouseMove);
    document.addEventListener('mouseup', this._onMouseUp);
  }

  _onMouseMove(e) {
    if (!this._dragState) return;
    this.el.style.left = (e.clientX - this._dragState.offsetX) + 'px';
    this.el.style.top = (e.clientY - this._dragState.offsetY) + 'px';
    this.el.style.right = 'auto';
  }

  _onMouseUp() {
    this._dragState = null;
  }

  _bindKeyboard() {
    document.addEventListener('keydown', this._onKeyDown);
  }

  _onKeyDown(e) {
    if (e.ctrlKey && e.shiftKey && e.key === 'D') {
      e.preventDefault();
      this.toggle();
    }
  }

  /* ---------------- FPS 循环 ---------------- */

  _startFpsLoop() {
    const loop = () => {
      this._frames++;
      const now = performance.now();
      if (now - this._lastFpsTime >= 1000) {
        this._fps = Math.round(this._frames * 1000 / (now - this._lastFpsTime));
        this._frames = 0;
        this._lastFpsTime = now;
        if (this.visible && this._activeTab === 'perf') this._refreshPerf();
      }
      this._rafId = requestAnimationFrame(loop);
    };
    this._rafId = requestAnimationFrame(loop);
  }

  /* ---------------- 游戏日志钩子 ---------------- */

  _hookGameLogs() {
    const g = this.game;
    if (!g) return;

    const origSetState = g.setState?.bind(g);
    if (origSetState) {
      g.setState = (state) => {
        origSetState(state);
        this._addLog('state', `状态 → ${this._stateLabel(state)}`);
        if (this.visible && this._activeTab === 'state') this._refreshState();
      };
    }

    const origOnPlay = g.onPlayCard?.bind(g);
    if (origOnPlay) {
      g.onPlayCard = (idx, cards, info) => {
        origOnPlay(idx, cards, info);
        const desc = cards ? cards.map(c => c.display).join(' ') : '';
        const type = info ? (info.type || '') : '';
        this._addLog('play', `P${idx} 出牌 [${type}] ${desc}`);
      };
    }

    const origOnPass = g.onPass?.bind(g);
    if (origOnPass) {
      g.onPass = (idx) => {
        origOnPass(idx);
        this._addLog('play', `P${idx} 不出`);
      };
    }

    const origOnBid = g.onBid?.bind(g);
    if (origOnBid) {
      g.onBid = (idx, score) => {
        origOnBid(idx, score);
        this._addLog('state', `P${idx} 叫分 ${score}`);
      };
    }

    const origOnGameOver = g.onGameOver?.bind(g);
    if (origOnGameOver) {
      g.onGameOver = (result) => {
        origOnGameOver(result);
        this._addLog('state', `游戏结束 ${JSON.stringify(result).slice(0, 80)}`);
      };
    }
  }

  /* ---------------- 公开方法 ---------------- */

  toggle(show) {
    this.visible = show !== undefined ? show : !this.visible;
    this.el.classList.toggle('show', this.visible);
    if (this.fab) this.fab.style.display = this.visible ? 'none' : 'flex';
    if (this.visible) {
      this._refreshState();
      if (this._activeTab === 'cards') this._refreshCards();
      if (this._activeTab === 'perf') this._refreshPerf();
      this._renderLog();
    }
  }

  logAI(message) {
    this._addLog('ai', message);
  }

  logWarn(message) {
    this._addLog('warn', message);
  }

  addLog(type, message) {
    this._addLog(type, message);
  }

  destroy() {
    cancelAnimationFrame(this._rafId);
    document.removeEventListener('keydown', this._onKeyDown);
    document.removeEventListener('mousemove', this._onMouseMove);
    document.removeEventListener('mouseup', this._onMouseUp);
    if (this.el) this.el.remove();
    if (this.fab) this.fab.remove();
  }

  /* ---------------- 内部刷新 ---------------- */

  _addLog(type, message) {
    const time = new Date().toLocaleTimeString('zh-CN', { hour12: false });
    this._logs.push({ time, type, message });
    if (this._logs.length > this._maxLogs) this._logs.shift();
    if (this.visible && this._activeTab === 'log') this._renderLog();
  }

  _onGameEvent() {}

  _refreshState() {
    const pane = document.getElementById('dp-state');
    if (!pane) return;
    const g = this.game;
    if (!g) { pane.innerHTML = '<div class="dp-state-value bad">无游戏实例</div>'; return; }

    const stateLabel = this._stateLabel(g.state);
    const myHand = g.getMyHand ? g.getMyHand() : (g.hands && g.hands[0]);
    const myCount = myHand ? myHand.cards.length : 0;

    let html = `
      <div class="dp-state-row"><span class="dp-state-label">游戏类型</span><span class="dp-state-value">${g.gameType || '-'}</span></div>
      <div class="dp-state-row"><span class="dp-state-label">游戏状态</span><span class="dp-state-value">${stateLabel}</span></div>
      <div class="dp-state-row"><span class="dp-state-label">当前玩家</span><span class="dp-state-value">P${g.currentPlayer}</span></div>
      <div class="dp-state-row"><span class="dp-state-label">我方手牌</span><span class="dp-state-value ${myCount <= 5 ? 'warn' : ''}">${myCount} 张</span></div>
    `;

    for (let i = 1; i < (g.hands ? g.hands.length : 0); i++) {
      const cnt = g.hands[i].cards.length;
      html += `<div class="dp-state-row"><span class="dp-state-label">P${i} 手牌</span><span class="dp-state-value ${cnt <= 3 ? 'warn' : ''}">${cnt} 张</span></div>`;
    }

    if (g.gameType === 'doudizhu') {
      html += `<div class="dp-state-row"><span class="dp-state-label">地主</span><span class="dp-state-value">P${g.landlord}</span></div>`;
      html += `<div class="dp-state-row"><span class="dp-state-label">倍数</span><span class="dp-state-value">×${g.multiplier || 1}</span></div>`;
      if (g.bidScores) {
        html += `<div class="dp-state-row"><span class="dp-state-label">叫分</span><span class="dp-state-value">${g.bidScores.map(s => s < 0 ? '-' : s).join(', ')}</span></div>`;
      }
    }

    if (g.gameType === 'guandan') {
      html += `<div class="dp-state-row"><span class="dp-state-label">级牌</span><span class="dp-state-value">${g.levelValue || '-'}</span></div>`;
      if (g.teamLevels) {
        html += `<div class="dp-state-row"><span class="dp-state-label">我方等级</span><span class="dp-state-value">${g.teamLevels[0]}</span></div>`;
        html += `<div class="dp-state-row"><span class="dp-state-label">对方等级</span><span class="dp-state-value">${g.teamLevels[1]}</span></div>`;
      }
    }

    if (g.lastPlay) {
      const cards = g.lastPlay.cards || [];
      html += `
        <div class="dp-section-title">上家出牌</div>
        <div class="dp-state-row"><span class="dp-state-label">玩家</span><span class="dp-state-value">P${g.lastPlay.player}</span></div>
        <div class="dp-state-row"><span class="dp-state-label">牌型</span><span class="dp-state-value">${g.lastPlay.info?.type || '-'}</span></div>
        <div class="dp-state-row"><span class="dp-state-label">牌面</span><span class="dp-state-value">${cards.map(c => c.display).join(' ')}</span></div>
      `;
    }

    pane.innerHTML = html;
  }

  _refreshCards() {
    const pane = document.getElementById('dp-cards');
    if (!pane) return;
    const g = this.game;
    const counter = g.cardCounter;
    if (!counter) { pane.innerHTML = '<div class="dp-state-value warn">无记牌器</div>'; return; }

    const values = [];
    for (let v = 3; v <= 15; v++) values.push(v);
    values.push(16, 17);

    const labels = { 3:'3',4:'4',5:'5',6:'6',7:'7',8:'8',9:'9',10:'10',11:'J',12:'Q',13:'K',14:'A',15:'2',16:'小王',17:'大王' };

    let html = '<div class="dp-section-title">剩余牌分布（按点数）</div><div class="dp-card-grid">';
    for (const v of values) {
      let remain = 0;
      if (typeof counter.remaining === 'function') {
        remain = counter.remaining(v);
      } else if (typeof counter.getRemaining === 'function') {
        remain = counter.getRemaining(v);
      }
      const cls = remain === 0 ? 'zero' : (remain >= 4 ? 'high' : '');
      const wildCls = (g.gameType === 'guandan' && v === g.levelValue) ? ' wild' : '';
      html += `<div class="dp-card-cell ${cls}${wildCls}">${labels[v]}<br><b>${remain}</b></div>`;
    }
    html += '</div>';

    const myHand = g.getMyHand ? g.getMyHand() : (g.hands && g.hands[0]);
    if (myHand && typeof counter.estimateBombsOutside === 'function') {
      const isGuandan = g.gameType === 'guandan';
      const bombs = counter.estimateBombsOutside(myHand, isGuandan);
      html += `<div class="dp-section-title">威胁评估</div>`;
      html += `<div class="dp-state-row"><span class="dp-state-label">外面推测炸弹数</span><span class="dp-state-value ${bombs > 0 ? 'warn' : ''}">${bombs}</span></div>`;
    }

    pane.innerHTML = html;
  }

  _refreshPerf() {
    const pane = document.getElementById('dp-perf');
    if (!pane) return;
    const mem = performance.memory;
    const fpsCls = this._fps >= 50 ? '' : (this._fps >= 30 ? 'warn' : 'bad');
    let html = `
      <div class="dp-perf-row"><span class="dp-perf-label">FPS</span><span class="dp-perf-value ${fpsCls}">${this._fps}</span></div>
    `;
    if (mem) {
      const usedMB = (mem.usedJSHeapSize / 1048576).toFixed(1);
      const totalMB = (mem.totalJSHeapSize / 1048576).toFixed(1);
      const limitMB = (mem.jsHeapSizeLimit / 1048576).toFixed(0);
      const memCls = mem.usedJSHeapSize / mem.jsHeapSizeLimit > 0.7 ? 'warn' : '';
      html += `
        <div class="dp-perf-row"><span class="dp-perf-label">已用内存</span><span class="dp-perf-value ${memCls}">${usedMB} MB</span></div>
        <div class="dp-perf-row"><span class="dp-perf-label">堆总量</span><span class="dp-perf-value">${totalMB} MB</span></div>
        <div class="dp-perf-row"><span class="dp-perf-label">堆上限</span><span class="dp-perf-value">${limitMB} MB</span></div>
      `;
    }
    const cardEls = document.querySelectorAll('.card').length;
    html += `<div class="dp-perf-row"><span class="dp-perf-label">DOM卡牌数</span><span class="dp-perf-value">${cardEls}</span></div>`;

    if (this.game) {
      const g = this.game;
      let totalPlays = 0;
      if (g.hands) {
        for (const h of g.hands) totalPlays += (h.cards ? h.cards.length : 0);
      }
      html += `<div class="dp-perf-row"><span class="dp-perf-label">总剩余手牌</span><span class="dp-perf-value">${totalPlays}</span></div>`;
    }

    html += `<div class="dp-section-title">操作</div>`;
    html += `<button id="dp-force-garbage" style="padding:4px 10px;margin:4px 0;font-size:11px;background:rgba(255,255,255,0.1);color:#fff;border:1px solid rgba(255,255,255,0.2);border-radius:3px;cursor:pointer;">手动 GC</button>`;
    pane.innerHTML = html;

    const gcBtn = document.getElementById('dp-force-garbage');
    if (gcBtn) gcBtn.onclick = () => {
      if (window.gc) { window.gc(); this._refreshPerf(); }
      else this.logWarn('手动GC需要 --js-flags="--expose-gc" 启动参数');
    };
  }

  _renderLog() {
    const list = document.getElementById('dp-log-list');
    if (!list) return;
    const showState = document.getElementById('dp-filter-state')?.checked !== false;
    const showPlay = document.getElementById('dp-filter-play')?.checked !== false;
    const showAI = document.getElementById('dp-filter-ai')?.checked !== false;

    const filtered = this._logs.filter(l => {
      if (l.type === 'state') return showState;
      if (l.type === 'play') return showPlay;
      if (l.type === 'ai') return showAI;
      return true;
    });

    const last50 = filtered.slice(-50);
    list.innerHTML = last50.map(l =>
      `<div class="dp-log-item"><span class="dp-log-time">${l.time}</span><span class="dp-log-type-${l.type}">[${l.type}]</span> ${this._escapeHTML(l.message)}</div>`
    ).join('');
    list.scrollTop = list.scrollHeight;
  }

  _stateLabel(state) {
    const labels = {
      idle: '空闲', dealing: '发牌', bidding: '叫分/进贡',
      robbing: '抢地主', doubling: '加倍',
      playing: '出牌中', settling: '结算', finished: '结束'
    };
    if (typeof state === 'number') {
      const states = ['idle', 'dealing', 'bidding', 'playing', 'settling', 'finished'];
      return labels[states[state]] || state;
    }
    return labels[state] || state;
  }

  _escapeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
}

if (typeof window !== 'undefined') {
  window.DebugPanel = DebugPanel;
}
