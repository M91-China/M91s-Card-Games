/**
 * @file CardRenderer.js
 * @description 扑克牌DOM渲染器（性能优化版：DocumentFragment、事件委托、缓存清理）
 * @author HappyCard Team
 * @date 2026-08
 */

class CardRenderer {
  constructor() {
    this.cardEls = new Map();
    this._containers = new WeakMap();
  }

  /**
   * 创建单张牌的DOM
   * @param {Card} card
   * @param {Object} [options]
   * @returns {HTMLElement}
   */
  createCardEl(card, options = {}) {
    const { size = 'normal', faceUp = true, selectable = false, onClick = null } = options;

    const el = document.createElement('div');
    el.className = `card size-${size} ${card.isRed ? 'red' : 'black'}`;
    if (card.isJoker) {
      el.classList.add(card.rank === 'BIG_JOKER' ? 'joker-big' : 'joker-small');
    }
    if (card.isWild) el.classList.add('wild-card');
    el.dataset.cardId = card.id;

    if (!faceUp) {
      el.appendChild(this._createBack());
    } else {
      el.appendChild(this._createFace(card));
    }

    if (selectable || onClick) {
      el.addEventListener('click', (e) => {
        if (selectable) el.classList.toggle('selected');
        if (onClick) onClick(card, el, e);
      }, { passive: true });
    }

    this.cardEls.set(card.id, el);
    return el;
  }

  _createBack() {
    const back = document.createElement('div');
    back.className = 'card-back';
    return back;
  }

  _createFace(card) {
    const face = document.createElement('div');
    face.className = 'card-face';

    if (card.isJoker) {
      const center = document.createElement('div');
      center.className = 'joker-center';
      center.innerHTML = card.rank === 'BIG_JOKER' ? 'JOKER<br>大王' : 'JOKER<br>小王';
      face.appendChild(center);
      return face;
    }

    const tl = document.createElement('div');
    tl.className = 'card-corner top-left';
    const tlRank = document.createElement('span');
    tlRank.className = 'card-rank';
    tlRank.textContent = card.display;
    const tlSuit = document.createElement('span');
    tlSuit.className = 'card-suit-small';
    tlSuit.textContent = card.suitSymbol;
    tl.appendChild(tlRank);
    tl.appendChild(tlSuit);

    const br = document.createElement('div');
    br.className = 'card-corner bottom-right';
    const brRank = document.createElement('span');
    brRank.className = 'card-rank';
    brRank.textContent = card.display;
    const brSuit = document.createElement('span');
    brSuit.className = 'card-suit-small';
    brSuit.textContent = card.suitSymbol;
    br.appendChild(brRank);
    br.appendChild(brSuit);

    const center = document.createElement('div');
    center.className = 'card-suit-center';
    center.textContent = card.suitSymbol;

    face.appendChild(tl);
    face.appendChild(br);
    face.appendChild(center);
    return face;
  }

  /**
   * 渲染手牌（横向扇形排列，使用 DocumentFragment + 事件委托）
   */
  renderHand(hand, container, options = {}) {
    const cards = hand.cards || hand;
    const { faceUp = true, selectable = true, onCardClick = null, overlap = 24 } = options;

    this._pruneCardEls(container);
    container.innerHTML = '';
    container.classList.add('hand-cards');
    container.style.contain = 'layout style paint';

    const size = 'normal';
    const cardWidth = 60;
    const totalWidth = (cards.length - 1) * (cardWidth - overlap) + cardWidth;
    container.style.width = `${totalWidth}px`;
    container.style.position = 'relative';
    container.style.height = 'var(--card-height)';

    const fragment = document.createDocumentFragment();
    const selectedSet = hand.selected;
    const cardData = [];

    cards.forEach((card, idx) => {
      const el = this.createCardEl(card, { size, faceUp, selectable: false });
      el.style.left = `${idx * (cardWidth - overlap)}px`;
      el.style.top = '0';
      el.style.zIndex = idx;
      if (selectedSet && selectedSet.has(card.id)) el.classList.add('selected');
      fragment.appendChild(el);
      cardData.push({ card, el });
    });

    container.appendChild(fragment);

    if (selectable || onCardClick) {
      this._setupHandDelegation(container, hand, cardData, selectable, onCardClick);
    }
  }

  _setupHandDelegation(container, hand, cardData, selectable, onCardClick) {
    if (this._containers.has(container)) {
      const old = this._containers.get(container);
      container.removeEventListener('click', old.handler, true);
    }

    const handler = (e) => {
      const cardEl = e.target.closest('.card');
      if (!cardEl || !container.contains(cardEl)) return;
      const data = cardData.find(d => d.el === cardEl);
      if (!data) return;
      const { card, el } = data;
      if (selectable && hand.toggleSelect) {
        hand.toggleSelect(card);
        el.classList.toggle('selected', hand.isSelected(card));
      }
      if (onCardClick) onCardClick(card, el, e);
    };

    container.addEventListener('click', handler, { passive: true, capture: true });
    this._containers.set(container, { handler, cardData });
  }

  _pruneCardEls(container) {
    const cached = this._containers.get(container);
    if (cached && cached.cardData) {
      for (const { card } of cached.cardData) {
        this.cardEls.delete(card.id);
      }
    }
  }

  /**
   * 渲染背面牌堆（对手手牌，使用 DocumentFragment）
   */
  renderBacks(count, container, options = {}) {
    const { overlap = 18 } = options;
    container.innerHTML = '';
    container.classList.add('opponent-hand');
    const w = 44;
    container.style.width = `${(count - 1) * (w - overlap) + w}px`;
    container.style.contain = 'layout style paint';

    const fragment = document.createDocumentFragment();
    for (let i = 0; i < count; i++) {
      const back = document.createElement('div');
      back.className = 'card-back';
      back.style.position = 'relative';
      back.style.marginLeft = i === 0 ? '0' : `-${overlap}px`;
      back.style.zIndex = i;
      fragment.appendChild(back);
    }
    container.appendChild(fragment);
  }

  /**
   * 渲染出牌（居中横向排列）
   */
  renderPlayedCards(cards, container, options = {}) {
    container.innerHTML = '';
    if (!cards || cards.length === 0) return;
    const wrap = document.createElement('div');
    wrap.className = 'played-cards';
    wrap.style.contain = 'layout style paint';
    const fragment = document.createDocumentFragment();
    cards.forEach((card) => {
      const el = this.createCardEl(card, { faceUp: true, selectable: false });
      fragment.appendChild(el);
    });
    wrap.appendChild(fragment);
    container.appendChild(wrap);
  }

  setSelected(card, selected) {
    const el = this.cardEls.get(card.id);
    if (el) el.classList.toggle('selected', selected);
  }

  highlightHints(cards) {
    this.clearHints();
    cards.forEach((c) => {
      const el = this.cardEls.get(c.id);
      if (el) el.classList.add('hint-glow');
    });
  }

  clearHints() {
    document.querySelectorAll('.card.hint-glow').forEach((el) => el.classList.remove('hint-glow'));
  }

  destroy() {
    this.cardEls.clear();
    this._containers = new WeakMap();
  }
}

if (typeof window !== 'undefined') {
  window.CardRenderer = CardRenderer;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = CardRenderer;
}
