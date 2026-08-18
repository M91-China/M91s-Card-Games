/**
 * @file Animation.js
 * @description 动画控制器（发牌、出牌、炸弹、金币粒子等）
 * @author HappyCard Team
 * @date 2026-08
 */

class AnimationController {
  constructor() {
    this._animating = false;
  }

  get isAnimating() {
    return this._animating;
  }

  /**
   * 发牌动画
   * @param {Object} params
   * @param {Card[]} params.cards 要发的牌（按顺序）
   * @param {number[]} params.playerSeq 每张牌对应的玩家索引
   * @param {HTMLElement} params.fromEl 起点元素
   * @param {HTMLElement[]} params.targetAreas 目标容器
   * @param {Function} [params.onCardDealt]
   * @param {Function} [params.onComplete]
   * @param {number} [params.interval=30]
   */
  async dealCards(params) {
    const { cards, playerSeq, fromEl, targetAreas, onCardDealt, onComplete, interval = 30 } = params;
    this._animating = true;

    const fromRect = fromEl.getBoundingClientRect();
    const fromX = fromRect.left;
    const fromY = fromRect.top;

    for (let i = 0; i < cards.length; i++) {
      const card = cards[i];
      const pIdx = playerSeq[i];
      const target = targetAreas[pIdx];
      if (!target) continue;

      const tmpEl = this._createTempCard(card);
      document.body.appendChild(tmpEl);
      tmpEl.style.transform = `translate3d(${fromX}px, ${fromY}px, 0)`;

      const targetRect = target.getBoundingClientRect();
      const offsetX = pIdx === 1 ? -20 : pIdx === 2 ? 20 : 0;
      const toX = targetRect.left + offsetX;
      const toY = targetRect.top;

      await this._nextFrame();
      tmpEl.style.transition = `transform ${0.3}s ease-out, opacity 0.3s`;
      tmpEl.style.transform = `translate3d(${toX}px, ${toY}px, 0)`;

      await Utils.delay(interval);
      tmpEl.remove();
      if (onCardDealt) onCardDealt(card, pIdx, i);
    }

    this._animating = false;
    if (onComplete) onComplete();
  }

  _createTempCard(card) {
    const el = document.createElement('div');
    el.className = `card ${card.isRed ? 'red' : 'black'}`;
    el.style.cssText = 'position:fixed;z-index:var(--z-animation);width:60px;height:84px;will-change:transform;top:0;left:0;';
    el.innerHTML = `<div class="card-back"></div>`;
    return el;
  }

  _nextFrame() {
    return new Promise((r) => requestAnimationFrame(() => r()));
  }

  /**
   * 屏幕震动
   * @param {number} [duration=600]
   */
  shake(duration = 600) {
    const target = document.querySelector('.game-container, .ddz-container, .gd-container') || document.body;
    target.classList.add('screen-shake');
    setTimeout(() => target.classList.remove('screen-shake'), duration);
  }

  /**
   * 炸弹效果
   * @param {HTMLElement} [originEl]
   * @param {string} [text='炸弹']
   */
  boom(originEl, text = '炸弹') {
    this.shake(600);

    const flash = document.createElement('div');
    flash.className = 'boom-flash';
    document.body.appendChild(flash);
    setTimeout(() => flash.remove(), 600);

    const txt = document.createElement('div');
    txt.className = 'boom-text';
    txt.textContent = text;
    document.body.appendChild(txt);
    setTimeout(() => txt.remove(), 1200);
  }

  /**
   * 王炸效果
   */
  rocket() {
    this.boom(null, '王炸');
    setTimeout(() => {
      const flash = document.createElement('div');
      flash.style.cssText = `position:fixed;inset:0;background:radial-gradient(circle,rgba(255,215,0,0.6) 0%,transparent 70%);z-index:149;pointer-events:none;animation:boom-flash 800ms ease-out forwards;`;
      document.body.appendChild(flash);
      setTimeout(() => flash.remove(), 800);
    }, 200);
  }

  /**
   * 金币粒子下落
   * @param {number} [count=40]
   */
  coins(count = 40) {
    for (let i = 0; i < count; i++) {
      const coin = document.createElement('div');
      coin.className = 'coin-particle';
      coin.style.left = `${Math.random() * 100}vw`;
      coin.style.animationDuration = `${1.5 + Math.random() * 1.5}s`;
      coin.style.animationDelay = `${Math.random() * 0.5}s`;
      document.body.appendChild(coin);
      setTimeout(() => coin.remove(), 3500);
    }
  }

  /**
   * 淡入
   * @param {HTMLElement} el
   * @returns {Promise}
   */
  fadeIn(el) {
    el.classList.remove('fade-out');
    el.classList.add('fade-in');
    return Utils.delay(250);
  }

  /**
   * 淡出
   * @param {HTMLElement} el
   * @returns {Promise}
   */
  fadeOut(el) {
    el.classList.remove('fade-in');
    el.classList.add('fade-out');
    return Utils.delay(250);
  }
}

const animation = new AnimationController();

if (typeof window !== 'undefined') {
  window.AnimationController = AnimationController;
  window.animation = animation;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { AnimationController, animation };
}
