/**
 * @file Card.js
 * @description 单张扑克牌类
 * @author HappyCard Team
 * @date 2026-08
 */

class Card {
  /**
   * @param {string} suit 花色 spade/heart/diamond/club/joker
   * @param {string|number} rank 点数 3-10/J/Q/K/A/2 或 SMALL_JOKER/BIG_JOKER
   * @param {number} [deckId=0] 副牌编号（掼蛋两副牌用）
   */
  constructor(suit, rank, deckId = 0) {
    this.id = `${suit}_${rank}_${deckId}`;
    this.suit = suit;
    this.rank = rank;
    this.deckId = deckId;
    this.value = this._calcValue(rank);
    this.weight = this.value;
    this.isRed = suit === 'heart' || suit === 'diamond' || (suit === 'joker' && rank === 'BIG_JOKER');
    this.isJoker = suit === 'joker';
    this.isWild = false;
  }

  _calcValue(rank) {
    if (typeof rank === 'number') return rank;
    const map = {
      '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10,
      J: 11, Q: 12, K: 13, A: 14, '2': 15,
      SMALL_JOKER: 16, BIG_JOKER: 17
    };
    return map[rank] || 0;
  }

  /**
   * 获取显示文本
   * @returns {string}
   */
  get display() {
    if (this.isJoker) {
      return this.rank === 'BIG_JOKER' ? '大王' : '小王';
    }
    return String(this.rank);
  }

  /**
   * 获取花色符号
   * @returns {string}
   */
  get suitSymbol() {
    return window.Constants?.SUIT_SYMBOL?.[this.suit] || '';
  }

  /**
   * 转字符串
   * @returns {string}
   */
  toString() {
    if (this.isJoker) return this.display;
    return `${this.suitSymbol}${this.rank}`;
  }

  /**
   * 判断是否相同（不考虑 deckId）
   * @param {Card} other
   * @returns {boolean}
   */
  equals(other) {
    if (!other) return false;
    return this.suit === other.suit && this.rank === other.rank;
  }

  /**
   * 比较大小
   * @param {Card} other
   * @returns {number} 1=大, -1=小, 0=相等
   */
  compareTo(other) {
    if (!other) return 1;
    if (this.value > other.value) return 1;
    if (this.value < other.value) return -1;
    return 0;
  }

  /**
   * 克隆
   * @returns {Card}
   */
  clone() {
    const c = new Card(this.suit, this.rank, this.deckId);
    c.id = this.id;
    c.isWild = this.isWild;
    return c;
  }

  /**
   * 序列化为简单对象
   * @returns {Object}
   */
  toJSON() {
    return {
      id: this.id,
      suit: this.suit,
      rank: this.rank,
      deckId: this.deckId,
      value: this.value,
      isWild: this.isWild
    };
  }

  /**
   * 从对象反序列化
   * @param {Object} obj
   * @returns {Card}
   */
  static fromJSON(obj) {
    const c = new Card(obj.suit, obj.rank, obj.deckId || 0);
    c.id = obj.id || c.id;
    c.isWild = !!obj.isWild;
    return c;
  }
}

if (typeof window !== 'undefined') {
  window.Card = Card;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = Card;
}
