/**
 * @file GameBase.js
 * @description 游戏基类，封装通用流程（初始化、发牌、状态管理）
 * @author HappyCard Team
 * @date 2026-08
 */

class GameBase {
  /**
   * @param {Object} options
   * @param {string} options.container 容器选择器
   * @param {string} options.gameType
   */
  constructor(options = {}) {
    this.container = typeof options.container === 'string'
      ? document.querySelector(options.container)
      : options.container;
    this.gameType = options.gameType || 'doudizhu';
    this.state = window.Constants.GameState.IDLE;
    this.deck = null;
    this.hands = [];
    this.bottomCards = [];
    this.players = [];
    this.currentPlayer = 0;
    this.cardRenderer = new window.CardRenderer();
    this.debug = window.Utils.isDebug();
    this._init();
  }

  _init() {
    this._setupPlayers();
    if (this.debug) {
      window.Utils.log(this.gameType, '调试模式已开启');
    }
  }

  _setupPlayers() {
    // 子类实现
  }

  setState(state) {
    this.state = state;
    if (this.debug) window.Utils.log(this.gameType, '状态切换 ->', state);
  }

  /**
   * 开始新局
   */
  start() {
    this.setState(window.Constants.GameState.DEALING);
    this._createDeck();
    this._deal();
  }

  _createDeck() {
    // 子类实现
  }

  _deal() {
    // 子类实现
  }

  /**
   * 重新开始
   */
  restart() {
    this.hands = [];
    this.bottomCards = [];
    this.currentPlayer = 0;
    if (this.container) this.container.innerHTML = '';
    this.start();
  }

  destroy() {
    this.cardRenderer.destroy();
    if (this.container) this.container.innerHTML = '';
  }
}

if (typeof window !== 'undefined') {
  window.GameBase = GameBase;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = GameBase;
}
