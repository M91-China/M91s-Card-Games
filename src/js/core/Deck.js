/**
 * @file Deck.js
 * @description 牌堆类（洗牌、发牌）
 * @author HappyCard Team
 * @date 2026-08
 */

class Deck {
  /**
   * @param {number} [deckCount=1] 牌副数（1=54张，2=108张）
   */
  constructor(deckCount = 1) {
    this.deckCount = deckCount;
    this.cards = [];
    this._dealtIndex = 0;
    this.createDeck(deckCount);
  }

  /**
   * 创建牌堆
   * @param {number} count
   * @returns {Card[]}
   */
  createDeck(count = 1) {
    this.cards = [];
    this.deckCount = count;
    const suits = ['spade', 'heart', 'diamond', 'club'];
    const ranks = ['3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A', '2'];

    for (let d = 0; d < count; d++) {
      for (const suit of suits) {
        for (const rank of ranks) {
          this.cards.push(new Card(suit, rank, d));
        }
      }
      this.cards.push(new Card('joker', 'SMALL_JOKER', d));
      this.cards.push(new Card('joker', 'BIG_JOKER', d));
    }
    this._dealtIndex = 0;
    return this.cards;
  }

  /**
   * 洗牌
   * @param {number} [times=3]
   * @returns {Card[]}
   */
  shuffle(times = 3) {
    for (let t = 0; t < times; t++) {
      for (let i = this.cards.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
      }
    }
    this._dealtIndex = 0;
    return this.cards;
  }

  /**
   * 发牌给多个玩家
   * @param {number} playerCount
   * @param {number} [cardsPerPlayer] 每人发几张，默认平均分
   * @param {number} [bottomCount=0] 底牌数量
   * @returns {{hands: Card[][], bottom: Card[]}}
   */
  deal(playerCount, cardsPerPlayer, bottomCount = 0) {
    if (!cardsPerPlayer) {
      cardsPerPlayer = Math.floor((this.cards.length - bottomCount) / playerCount);
    }
    const hands = [];
    for (let i = 0; i < playerCount; i++) hands.push([]);

    let idx = 0;
    for (let i = 0; i < cardsPerPlayer; i++) {
      for (let p = 0; p < playerCount; p++) {
        if (idx < this.cards.length - bottomCount) {
          hands[p].push(this.cards[idx++]);
        }
      }
    }

    const bottom = [];
    for (let i = 0; i < bottomCount && idx < this.cards.length; i++) {
      bottom.push(this.cards[idx++]);
    }
    this._dealtIndex = idx;
    return { hands, bottom };
  }

  /**
   * 顺序发牌（每张轮流发给玩家，可用于发牌动画）
   * @param {number} playerCount
   * @returns {Generator<{card: Card, player: number}, void, unknown>}
   */
  *dealSequence(playerCount) {
    let p = 0;
    for (let i = 0; i < this.cards.length; i++) {
      yield { card: this.cards[i], player: p };
      p = (p + 1) % playerCount;
    }
  }

  /**
   * 抽 n 张
   * @param {number} n
   * @returns {Card[]}
   */
  draw(n = 1) {
    const result = [];
    for (let i = 0; i < n && this._dealtIndex < this.cards.length; i++) {
      result.push(this.cards[this._dealtIndex++]);
    }
    return result;
  }

  /**
   * 剩余牌数
   * @returns {number}
   */
  remaining() {
    return this.cards.length - this._dealtIndex;
  }

  /**
   * 重置发牌指针
   */
  reset() {
    this._dealtIndex = 0;
  }
}

if (typeof window !== 'undefined') {
  window.Deck = Deck;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = Deck;
}
