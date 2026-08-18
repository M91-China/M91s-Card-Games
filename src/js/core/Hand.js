/**
 * @file Hand.js
 * @description 手牌类（排序、选牌、分组）
 * @author HappyCard Team
 * @date 2026-08
 */

class Hand {
  /**
   * @param {Card[]} [cards=[]]
   */
  constructor(cards = []) {
    this.cards = cards.slice();
    this.selected = new Set();
    this.sort();
  }

  /**
   * 添加牌
   * @param {Card|Card[]} cards
   */
  addCards(cards) {
    if (Array.isArray(cards)) {
      this.cards.push(...cards);
    } else {
      this.cards.push(cards);
    }
    this.sort();
  }

  /**
   * 移除牌
   * @param {Card[]} cards
   * @returns {Card[]} 被移除的牌
   */
  removeCards(cards) {
    const removeIds = new Set(cards.map((c) => c.id));
    const removed = [];
    this.cards = this.cards.filter((c) => {
      if (removeIds.has(c.id)) {
        removed.push(c);
        this.selected.delete(c.id);
        return false;
      }
      return true;
    });
    return removed;
  }

  /**
   * 排序
   * @param {string} [by='value'] value/suit
   * @param {boolean} [desc=false]
   */
  sort(by = 'value', desc = false) {
    if (by === 'suit') {
      this.cards.sort((a, b) => {
        if (a.suit !== b.suit) return a.suit.localeCompare(b.suit);
        return desc ? b.value - a.value : a.value - b.value;
      });
    } else {
      this.cards.sort((a, b) => {
        const r = desc ? b.value - a.value : a.value - b.value;
        return r;
      });
    }
  }

  /**
   * 选中一张牌
   * @param {Card|string} card
   */
  select(card) {
    const id = typeof card === 'string' ? card : card.id;
    this.selected.add(id);
  }

  /**
   * 取消选中
   * @param {Card|string} card
   */
  unselect(card) {
    const id = typeof card === 'string' ? card : card.id;
    this.selected.delete(id);
  }

  /**
   * 切换选中
   * @param {Card|string} card
   */
  toggleSelect(card) {
    const id = typeof card === 'string' ? card : card.id;
    if (this.selected.has(id)) this.selected.delete(id);
    else this.selected.add(id);
  }

  /**
   * 判断是否选中
   * @param {Card|string} card
   * @returns {boolean}
   */
  isSelected(card) {
    const id = typeof card === 'string' ? card : card.id;
    return this.selected.has(id);
  }

  /**
   * 清空选中
   */
  clearSelection() {
    this.selected.clear();
  }

  /**
   * 获取选中的牌（按手牌顺序）
   * @returns {Card[]}
   */
  getSelected() {
    return this.cards.filter((c) => this.selected.has(c.id));
  }

  /**
   * 全选
   */
  selectAll() {
    this.cards.forEach((c) => this.selected.add(c.id));
  }

  /**
   * 区间选择（用于 Shift 连选）
   * @param {Card} from
   * @param {Card} to
   */
  selectRange(from, to) {
    const fromIdx = this.cards.findIndex((c) => c.id === from.id);
    const toIdx = this.cards.findIndex((c) => c.id === to.id);
    if (fromIdx < 0 || toIdx < 0) return;
    const [start, end] = fromIdx < toIdx ? [fromIdx, toIdx] : [toIdx, fromIdx];
    for (let i = start; i <= end; i++) {
      this.selected.add(this.cards[i].id);
    }
  }

  /**
   * 查找所有对子
   * @returns {Map<number, Card[]>}
   */
  findPairs() {
    const result = new Map();
    const groups = this._groupByValue();
    for (const [value, cs] of groups) {
      if (cs.length >= 2 && value < 16) result.set(value, cs.slice(0, 2));
    }
    return result;
  }

  /**
   * 查找所有三张
   * @returns {Map<number, Card[]>}
   */
  findTriples() {
    const result = new Map();
    const groups = this._groupByValue();
    for (const [value, cs] of groups) {
      if (cs.length >= 3 && value < 16) result.set(value, cs.slice(0, 3));
    }
    return result;
  }

  /**
   * 查找所有炸弹（4张相同）
   * @returns {Map<number, Card[]>}
   */
  findBombs() {
    const result = new Map();
    const groups = this._groupByValue();
    for (const [value, cs] of groups) {
      if (cs.length >= 4 && value < 16) result.set(value, cs.slice(0, 4));
    }
    return result;
  }

  /**
   * 查找顺子（5张及以上连续单张，不含2和王）
   * @returns {Card[][]}
   */
  findStraights() {
    const groups = this._groupByValue();
    const values = [...groups.keys()].filter((v) => v >= 3 && v <= 14).sort((a, b) => a - b);
    const result = [];
    let start = 0;
    for (let i = 1; i <= values.length; i++) {
      if (i === values.length || values[i] !== values[i - 1] + 1) {
        const len = i - start;
        if (len >= 5) {
          for (let s = start; s <= i - 5; s++) {
            for (let e = s + 5; e <= i; e++) {
              const seg = values.slice(s, e);
              result.push(seg.map((v) => groups.get(v)[0]));
            }
          }
        }
        start = i;
      }
    }
    return result;
  }

  /**
   * 查找连对（3对及以上连续对子）
   * @returns {Card[][]}
   */
  findDoubleStraights() {
    const groups = this._groupByValue();
    const pairValues = [...groups.keys()]
      .filter((v) => v >= 3 && v <= 14 && groups.get(v).length >= 2)
      .sort((a, b) => a - b);
    const result = [];
    let start = 0;
    for (let i = 1; i <= pairValues.length; i++) {
      if (i === pairValues.length || pairValues[i] !== pairValues[i - 1] + 1) {
        const len = i - start;
        if (len >= 3) {
          for (let s = start; s <= i - 3; s++) {
            for (let e = s + 3; e <= i; e++) {
              const seg = pairValues.slice(s, e);
              const cards = [];
              seg.forEach((v) => cards.push(...groups.get(v).slice(0, 2)));
              result.push(cards);
            }
          }
        }
        start = i;
      }
    }
    return result;
  }

  /**
   * 按 value 分组
   * @returns {Map<number, Card[]>}
   */
  _groupByValue() {
    const map = new Map();
    for (const c of this.cards) {
      if (!map.has(c.value)) map.set(c.value, []);
      map.get(c.value).push(c);
    }
    return map;
  }

  /**
   * 按花色分组
   * @returns {Map<string, Card[]>}
   */
  _groupBySuit() {
    const map = new Map();
    for (const c of this.cards) {
      if (!map.has(c.suit)) map.set(c.suit, []);
      map.get(c.suit).push(c);
    }
    return map;
  }

  /**
   * 获取最小牌
   * @returns {Card}
   */
  getMinCard() {
    if (this.cards.length === 0) return null;
    return this.cards.reduce((min, c) => (c.value < min.value ? c : min), this.cards[0]);
  }

  /**
   * 获取最大牌
   * @returns {Card}
   */
  getMaxCard() {
    if (this.cards.length === 0) return null;
    return this.cards.reduce((max, c) => (c.value > max.value ? c : max), this.cards[0]);
  }

  /**
   * 张数
   */
  get size() {
    return this.cards.length;
  }

  /**
   * 清空
   */
  clear() {
    this.cards = [];
    this.selected.clear();
  }
}

if (typeof window !== 'undefined') {
  window.Hand = Hand;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = Hand;
}
