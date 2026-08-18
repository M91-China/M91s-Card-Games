/**
 * @file DoudizhuRule.js
 * @description 斗地主规则引擎：牌型判断、牌型比较、提示功能
 * @author HappyCard Team
 * @date 2026-08
 */

class DoudizhuRule {
  /**
   * 判断牌型
   * @param {Card[]} cards 选中的牌
   * @returns {{type:string, mainValue:number, length:number, isValid:boolean, extra?:any}}
   */
  static judge(cards) {
    if (!cards || cards.length === 0) {
      return { type: 'invalid', mainValue: 0, length: 0, isValid: false };
    }
    const sorted = cards.slice().sort((a, b) => a.value - b.value);
    const len = sorted.length;
    const counts = this._countByValue(sorted);
    const values = [...counts.keys()].sort((a, b) => a - b);

    // 王炸
    if (len === 2 && sorted[0].value === 16 && sorted[1].value === 17) {
      return { type: CardType.ROCKET, mainValue: 17, length: 2, isValid: true };
    }

    // 炸弹
    if (len === 4 && counts.size === 1) {
      return { type: CardType.BOMB, mainValue: values[0], length: 4, isValid: true };
    }

    switch (len) {
      case 1:
        return { type: CardType.SINGLE, mainValue: sorted[0].value, length: 1, isValid: true };
      case 2:
        if (counts.size === 1) {
          return { type: CardType.PAIR, mainValue: values[0], length: 2, isValid: true };
        }
        break;
      case 3:
        if (counts.size === 1) {
          return { type: CardType.TRIPLE, mainValue: values[0], length: 3, isValid: true };
        }
        break;
      case 4:
        // 三带一（3+1），注意不能是炸弹
        if (counts.size === 2) {
          for (const [v, c] of counts) {
            if (c === 3) return { type: CardType.TRIPLE_SINGLE, mainValue: v, length: 4, isValid: true };
          }
        }
        break;
      case 5:
        // 三带二（3+2）
        if (counts.size === 2) {
          let triple = 0, pair = 0;
          for (const [v, c] of counts) {
            if (c === 3) triple = v;
            if (c === 2) pair = v;
          }
          if (triple && pair) {
            return { type: CardType.TRIPLE_PAIR, mainValue: triple, length: 5, isValid: true };
          }
        }
        // 顺子5张
        if (this._isStraight(values)) {
          return { type: CardType.STRAIGHT, mainValue: values[values.length - 1], length: 5, isValid: true };
        }
        break;
      case 6:
        // 连对3对 / 四带二(4+1+1) / 飞机(2组三张) / 顺子6
        if (this._isDoubleStraight(values, counts)) {
          return { type: CardType.DOUBLE_STRAIGHT, mainValue: values[values.length - 1], length: 6, isValid: true };
        }
        if (this._isTripleStraight(values, counts)) {
          return { type: CardType.TRIPLE_STRAIGHT, mainValue: values[values.length - 1], length: 6, isValid: true };
        }
        if (this._isFourTwoSingle(counts)) {
          const four = [...counts.entries()].find(([, c]) => c === 4)[0];
          return { type: CardType.FOUR_TWO_SINGLE, mainValue: four, length: 6, isValid: true };
        }
        if ([...counts.values()].every(c => c === 1) && this._isStraight(values)) {
          return { type: CardType.STRAIGHT, mainValue: values[values.length - 1], length: 6, isValid: true };
        }
        break;
      default:
        break;
    }

    // 顺子（5-12张，3-A连续，不含2和王，每点数恰好1张）
    if (len >= 5 && len <= 12 && [...counts.values()].every(c => c === 1) && this._isStraight(values)) {
      return { type: CardType.STRAIGHT, mainValue: values[values.length - 1], length: len, isValid: true };
    }

    // 连对（6-20张，3-10对连续，每对2张）
    if (len >= 6 && len % 2 === 0 && this._isDoubleStraight(values, counts)) {
      return { type: CardType.DOUBLE_STRAIGHT, mainValue: values[values.length - 1], length: len, isValid: true };
    }

    // 飞机不带翅膀（纯三张连续，2组及以上）
    if (len >= 6 && len % 3 === 0 && this._isTripleStraight(values, counts)) {
      return { type: CardType.TRIPLE_STRAIGHT, mainValue: values[values.length - 1], length: len, isValid: true };
    }

    // 飞机带单张
    const ps = this._checkPlaneWithSingle(sorted, counts);
    if (ps) return ps;

    // 飞机带对子
    const pp = this._checkPlaneWithPair(sorted, counts);
    if (pp) return pp;

    // 四带二单张
    if (len === 6 && this._isFourTwoSingle(counts)) {
      const four = [...counts.entries()].find(([, c]) => c === 4)[0];
      return { type: CardType.FOUR_TWO_SINGLE, mainValue: four, length: 6, isValid: true };
    }

    // 四带二对
    if (len === 8 && this._isFourTwoPair(counts)) {
      const four = [...counts.entries()].find(([, c]) => c === 4)[0];
      return { type: CardType.FOUR_TWO_PAIR, mainValue: four, length: 8, isValid: true };
    }

    return { type: CardType.INVALID, mainValue: 0, length: len, isValid: false };
  }

  /**
   * 按 value 统计
   * @param {Card[]} cards
   * @returns {Map<number, number>}
   */
  static _countByValue(cards) {
    const m = new Map();
    for (const c of cards) m.set(c.value, (m.get(c.value) || 0) + 1);
    return m;
  }

  /**
   * 是否顺子（5+张连续，3-A，不含2和王）
   */
  static _isStraight(values) {
    if (values.length < 5) return false;
    for (const v of values) {
      if (v < 3 || v > 14) return false;
    }
    for (let i = 1; i < values.length; i++) {
      if (values[i] !== values[i - 1] + 1) return false;
    }
    return true;
  }

  /**
   * 是否连对（3+对连续，每点恰好2张）
   */
  static _isDoubleStraight(values, counts) {
    if (values.length < 3) return false;
    for (const v of values) {
      if (v < 3 || v > 14) return false;
      if (counts.get(v) !== 2) return false;
    }
    for (let i = 1; i < values.length; i++) {
      if (values[i] !== values[i - 1] + 1) return false;
    }
    return true;
  }

  /**
   * 是否飞机（连续三张，每组恰好3张，2组+）
   */
  static _isTripleStraight(values, counts) {
    if (values.length < 2) return false;
    for (const v of values) {
      if (v < 3 || v > 14) return false;
      if (counts.get(v) !== 3) return false;
    }
    for (let i = 1; i < values.length; i++) {
      if (values[i] !== values[i - 1] + 1) return false;
    }
    return true;
  }

  /**
   * 四带二单张（一个4张+两个不同单张）
   */
  static _isFourTwoSingle(counts) {
    if (counts.size !== 3) return false;
    let fourCount = 0;
    for (const [, c] of counts) {
      if (c === 4) fourCount++;
    }
    return fourCount === 1;
  }

  /**
   * 四带二对（一个4张+两个对子）
   */
  static _isFourTwoPair(counts) {
    if (counts.size !== 3) return false;
    let fourCount = 0, pairCount = 0;
    for (const [, c] of counts) {
      if (c === 4) fourCount++;
      if (c === 2) pairCount++;
    }
    return fourCount === 1 && pairCount === 2;
  }

  /**
   * 检查飞机带单张
   * 条件：存在n组连续三张(n>=2)，另外带n张单张（不能是三张本身那组，且带的牌不能构成新三张影响判断）
   */
  static _checkPlaneWithSingle(sorted, counts) {
    const len = sorted.length;
    if (len < 8 || len % 4 !== 0) return null;
    const n = len / 4; // 飞机组数
    // 找所有恰好3张的点（3-A）
    const triples = [];
    for (const [v, c] of counts) {
      if (c === 3 && v >= 3 && v <= 14) triples.push(v);
    }
    triples.sort((a, b) => a - b);
    // 找连续n组
    for (let i = 0; i + n <= triples.length; i++) {
      let ok = true;
      for (let j = 1; j < n; j++) {
        if (triples[i + j] !== triples[i] + j) { ok = false; break; }
      }
      if (!ok) continue;
      // 检查其余牌总数 = n
      let other = 0;
      for (const [v, c] of counts) {
        if (v >= triples[i] && v < triples[i] + n && c === 3) continue;
        other += c;
      }
      if (other === n) {
        return {
          type: CardType.PLANE_SINGLE,
          mainValue: triples[i] + n - 1,
          length: len,
          isValid: true,
          planeStart: triples[i],
          planeLen: n
        };
      }
    }
    return null;
  }

  /**
   * 检查飞机带对子
   * 条件：存在n组连续三张(n>=2)，另外带n个对子
   */
  static _checkPlaneWithPair(sorted, counts) {
    const len = sorted.length;
    if (len < 10 || len % 5 !== 0) return null;
    const n = len / 5;
    const triples = [];
    for (const [v, c] of counts) {
      if (c === 3 && v >= 3 && v <= 14) triples.push(v);
    }
    triples.sort((a, b) => a - b);
    for (let i = 0; i + n <= triples.length; i++) {
      let ok = true;
      for (let j = 1; j < n; j++) {
        if (triples[i + j] !== triples[i] + j) { ok = false; break; }
      }
      if (!ok) continue;
      let pairCount = 0;
      for (const [v, c] of counts) {
        if (v >= triples[i] && v < triples[i] + n && c === 3) continue;
        if (c === 2) pairCount++;
        else return null;
      }
      if (pairCount === n) {
        return {
          type: CardType.PLANE_PAIR,
          mainValue: triples[i] + n - 1,
          length: len,
          isValid: true,
          planeStart: triples[i],
          planeLen: n
        };
      }
    }
    return null;
  }

  /**
   * 比较两组牌
   * @param {Card[]} cardsA
   * @param {Card[]} cardsB 上家出的牌
   * @returns {number} 1=A大, -1=B大/不可比, 0=不可比
   */
  static compare(cardsA, cardsB) {
    const a = this.judge(cardsA);
    const b = this.judge(cardsB);
    if (!a.isValid || !b.isValid) return 0;

    // 王炸最大
    if (a.type === CardType.ROCKET) return 1;
    if (b.type === CardType.ROCKET) return -1;

    // 炸弹比较
    if (a.type === CardType.BOMB && b.type === CardType.BOMB) {
      return a.mainValue > b.mainValue ? 1 : -1;
    }
    if (a.type === CardType.BOMB && b.type !== CardType.BOMB) return 1;
    if (a.type !== CardType.BOMB && b.type === CardType.BOMB) return -1;

    // 普通牌型必须同类型同长度
    if (a.type !== b.type || a.length !== b.length) return 0;
    return a.mainValue > b.mainValue ? 1 : -1;
  }

  /**
   * 提示功能：找出所有能压过上家的出牌组合
   * @param {Hand|Card[]} hand 手牌
   * @param {Card[]} lastCards 上家牌（null表示自由出牌）
   * @returns {Card[][]} 从小到大排序的建议
   */
  static findHints(hand, lastCards) {
    const cards = hand.cards || hand;
    const result = [];
    const seen = new Set();

    const addHint = (cs) => {
      if (!cs || cs.length === 0) return;
      const key = cs.map((c) => c.id).sort().join(',');
      if (seen.has(key)) return;
      seen.add(key);
      result.push(cs);
    };

    if (!lastCards || lastCards.length === 0) {
      // 自由出牌：推荐各种最小的可出牌型
      this._findAllSingles(cards, -1).forEach(addHint);
      this._findAllPairs(cards, -1).forEach(addHint);
      this._findAllTriples(cards, -1).forEach(addHint);
      this._findAllStraights(cards).forEach(addHint);
      this._findAllDoubleStraights(cards).forEach(addHint);
      this._findAllTripleStraights(cards).forEach(addHint);
      this._findAllBombs(cards, -1).forEach(addHint);
      // 只取最小的几个建议
      result.sort((a, b) => this._hintSort(a, b));
      return result.slice(0, 20);
    }

    const last = this.judge(lastCards);
    if (!last.isValid) return [];

    const mv = last.mainValue;

    switch (last.type) {
      case CardType.SINGLE:
        this._findAllSingles(cards, mv).forEach(addHint);
        this._findAllBombs(cards, -1).forEach(addHint);
        this._findRocket(cards).forEach(addHint);
        break;
      case CardType.PAIR:
        this._findAllPairs(cards, mv).forEach(addHint);
        this._findAllBombs(cards, -1).forEach(addHint);
        this._findRocket(cards).forEach(addHint);
        break;
      case CardType.TRIPLE:
        this._findAllTriples(cards, mv).forEach(addHint);
        this._findAllBombs(cards, -1).forEach(addHint);
        this._findRocket(cards).forEach(addHint);
        break;
      case CardType.TRIPLE_SINGLE:
        this._findTripleSingles(cards, mv).forEach(addHint);
        this._findAllBombs(cards, -1).forEach(addHint);
        this._findRocket(cards).forEach(addHint);
        break;
      case CardType.TRIPLE_PAIR:
        this._findTriplePairs(cards, mv).forEach(addHint);
        this._findAllBombs(cards, -1).forEach(addHint);
        this._findRocket(cards).forEach(addHint);
        break;
      case CardType.STRAIGHT:
        this._findStraightsOfLength(cards, last.length, mv).forEach(addHint);
        this._findAllBombs(cards, -1).forEach(addHint);
        this._findRocket(cards).forEach(addHint);
        break;
      case CardType.DOUBLE_STRAIGHT:
        this._findDoubleStraightsOfLength(cards, last.length, mv).forEach(addHint);
        this._findAllBombs(cards, -1).forEach(addHint);
        this._findRocket(cards).forEach(addHint);
        break;
      case CardType.TRIPLE_STRAIGHT:
        this._findTripleStraightsOfLength(cards, last.length, mv).forEach(addHint);
        this._findAllBombs(cards, -1).forEach(addHint);
        this._findRocket(cards).forEach(addHint);
        break;
      case CardType.PLANE_SINGLE:
        this._findPlaneWithSingles(cards, last.length, mv).forEach(addHint);
        this._findAllBombs(cards, -1).forEach(addHint);
        this._findRocket(cards).forEach(addHint);
        break;
      case CardType.PLANE_PAIR:
        this._findPlaneWithPairs(cards, last.length, mv).forEach(addHint);
        this._findAllBombs(cards, -1).forEach(addHint);
        this._findRocket(cards).forEach(addHint);
        break;
      case CardType.FOUR_TWO_SINGLE:
        this._findFourTwoSingles(cards, mv).forEach(addHint);
        this._findAllBombs(cards, -1).forEach(addHint);
        this._findRocket(cards).forEach(addHint);
        break;
      case CardType.FOUR_TWO_PAIR:
        this._findFourTwoPairs(cards, mv).forEach(addHint);
        this._findAllBombs(cards, -1).forEach(addHint);
        this._findRocket(cards).forEach(addHint);
        break;
      case CardType.BOMB:
        this._findAllBombs(cards, mv).forEach(addHint);
        this._findRocket(cards).forEach(addHint);
        break;
      case CardType.ROCKET:
        // 没人能压王炸
        break;
      default:
        break;
    }

    result.sort((a, b) => this._hintSort(a, b));
    return result;
  }

  static _hintSort(a, b) {
    // 先按张数少优先，再按主牌值小优先
    if (a.length !== b.length) return a.length - b.length;
    const ja = this.judge(a), jb = this.judge(b);
    if (ja.mainValue !== jb.mainValue) return ja.mainValue - jb.mainValue;
    return 0;
  }

  // ---- 以下是各种牌型的枚举 ----

  static _groupByValue(cards) {
    const m = new Map();
    for (const c of cards) {
      if (!m.has(c.value)) m.set(c.value, []);
      m.get(c.value).push(c);
    }
    return m;
  }

  static _findAllSingles(cards, greaterThan) {
    const result = [];
    for (const c of cards) {
      if (c.value > greaterThan) result.push([c]);
    }
    return result;
  }

  static _findAllPairs(cards, greaterThan) {
    const groups = this._groupByValue(cards);
    const result = [];
    for (const [v, cs] of groups) {
      if (cs.length >= 2 && v > greaterThan && v < 16) {
        result.push(cs.slice(0, 2));
      }
    }
    return result;
  }

  static _findAllTriples(cards, greaterThan) {
    const groups = this._groupByValue(cards);
    const result = [];
    for (const [v, cs] of groups) {
      if (cs.length >= 3 && v > greaterThan && v < 16) {
        result.push(cs.slice(0, 3));
      }
    }
    return result;
  }

  static _findAllBombs(cards, greaterThan) {
    const groups = this._groupByValue(cards);
    const result = [];
    for (const [v, cs] of groups) {
      if (cs.length >= 4 && v > greaterThan && v < 16) {
        result.push(cs.slice(0, 4));
      }
    }
    return result;
  }

  static _findRocket(cards) {
    let small = null, big = null;
    for (const c of cards) {
      if (c.value === 16) small = c;
      if (c.value === 17) big = c;
    }
    if (small && big) return [[small, big]];
    return [];
  }

  static _findTripleSingles(cards, greaterThan) {
    const result = [];
    const groups = this._groupByValue(cards);
    const triples = [];
    for (const [v, cs] of groups) {
      if (cs.length >= 3 && v > greaterThan && v < 16) triples.push([v, cs]);
    }
    for (const [v, cs] of triples) {
      // 带牌：取不属于该三张点数的最小单张
      const other = cards.filter((c) => c.value !== v);
      if (other.length >= 1) {
        other.sort((a, b) => a.value - b.value);
        result.push([...cs.slice(0, 3), other[0]]);
      }
    }
    return result;
  }

  static _findTriplePairs(cards, greaterThan) {
    const result = [];
    const groups = this._groupByValue(cards);
    const triples = [];
    for (const [v, cs] of groups) {
      if (cs.length >= 3 && v > greaterThan && v < 16) triples.push([v, cs]);
    }
    for (const [v, cs] of triples) {
      // 找一个最小的对子（排除三张本身）
      let bestPair = null;
      for (const [pv, pcs] of groups) {
        if (pv !== v && pcs.length >= 2 && pv < 16) {
          if (!bestPair || pv < bestPair.value) bestPair = pcs[0].value;
        }
      }
      if (bestPair) {
        const pairCards = groups.get(bestPair).slice(0, 2);
        result.push([...cs.slice(0, 3), ...pairCards]);
      }
    }
    return result;
  }

  static _findAllStraights(cards) {
    const result = [];
    for (let len = 5; len <= 12; len++) {
      this._findStraightsOfLength(cards, len, -1).forEach((s) => result.push(s));
    }
    return result;
  }

  static _findStraightsOfLength(cards, len, greaterThan) {
    const groups = this._groupByValue(cards);
    const present = [];
    for (const v of groups.keys()) {
      if (v >= 3 && v <= 14) present.push(v);
    }
    present.sort((a, b) => a - b);
    const result = [];
    for (let i = 0; i + len <= present.length; i++) {
      let ok = true;
      for (let j = 1; j < len; j++) {
        if (present[i + j] !== present[i] + j) { ok = false; break; }
      }
      if (ok && present[i] + len - 1 > greaterThan) {
        const seg = [];
        for (let j = 0; j < len; j++) seg.push(groups.get(present[i] + j)[0]);
        result.push(seg);
      }
    }
    return result;
  }

  static _findAllDoubleStraights(cards) {
    const result = [];
    for (let pairs = 3; pairs <= 10; pairs++) {
      this._findDoubleStraightsOfLength(cards, pairs * 2, -1).forEach((s) => result.push(s));
    }
    return result;
  }

  static _findDoubleStraightsOfLength(cards, len, greaterThan) {
    const pairCount = len / 2;
    const groups = this._groupByValue(cards);
    const present = [];
    for (const [v, cs] of groups) {
      if (v >= 3 && v <= 14 && cs.length >= 2) present.push(v);
    }
    present.sort((a, b) => a - b);
    const result = [];
    for (let i = 0; i + pairCount <= present.length; i++) {
      let ok = true;
      for (let j = 1; j < pairCount; j++) {
        if (present[i + j] !== present[i] + j) { ok = false; break; }
      }
      if (ok && present[i] + pairCount - 1 > greaterThan) {
        const seg = [];
        for (let j = 0; j < pairCount; j++) seg.push(...groups.get(present[i] + j).slice(0, 2));
        result.push(seg);
      }
    }
    return result;
  }

  static _findAllTripleStraights(cards) {
    const result = [];
    for (let n = 2; n <= 6; n++) {
      this._findTripleStraightsOfLength(cards, n * 3, -1).forEach((s) => result.push(s));
    }
    return result;
  }

  static _findTripleStraightsOfLength(cards, len, greaterThan) {
    const n = len / 3;
    const groups = this._groupByValue(cards);
    const present = [];
    for (const [v, cs] of groups) {
      if (v >= 3 && v <= 14 && cs.length >= 3) present.push(v);
    }
    present.sort((a, b) => a - b);
    const result = [];
    for (let i = 0; i + n <= present.length; i++) {
      let ok = true;
      for (let j = 1; j < n; j++) {
        if (present[i + j] !== present[i] + j) { ok = false; break; }
      }
      if (ok && present[i] + n - 1 > greaterThan) {
        const seg = [];
        for (let j = 0; j < n; j++) seg.push(...groups.get(present[i] + j).slice(0, 3));
        result.push(seg);
      }
    }
    return result;
  }

  static _findPlaneWithSingles(cards, totalLen, greaterThan) {
    const n = totalLen / 4;
    const groups = this._groupByValue(cards);
    const tripleVals = [];
    for (const [v, cs] of groups) {
      if (v >= 3 && v <= 14 && cs.length >= 3) tripleVals.push(v);
    }
    tripleVals.sort((a, b) => a - b);
    const result = [];
    for (let i = 0; i + n <= tripleVals.length; i++) {
      let ok = true;
      for (let j = 1; j < n; j++) {
        if (tripleVals[i + j] !== tripleVals[i] + j) { ok = false; break; }
      }
      if (!ok) continue;
      if (tripleVals[i] + n - 1 <= greaterThan) continue;
      // 收集 n 张带牌（不能来自飞机的三张组）
      const planeSet = new Set();
      for (let j = 0; j < n; j++) planeSet.add(tripleVals[i] + j);
      const kickers = [];
      for (const c of cards) {
        if (!planeSet.has(c.value)) kickers.push(c);
      }
      if (kickers.length >= n) {
        kickers.sort((a, b) => a.value - b.value);
        const chosen = kickers.slice(0, n);
        const plane = [];
        for (let j = 0; j < n; j++) plane.push(...groups.get(tripleVals[i] + j).slice(0, 3));
        result.push([...plane, ...chosen]);
      }
    }
    return result;
  }

  static _findPlaneWithPairs(cards, totalLen, greaterThan) {
    const n = totalLen / 5;
    const groups = this._groupByValue(cards);
    const tripleVals = [];
    for (const [v, cs] of groups) {
      if (v >= 3 && v <= 14 && cs.length >= 3) tripleVals.push(v);
    }
    tripleVals.sort((a, b) => a - b);
    const result = [];
    for (let i = 0; i + n <= tripleVals.length; i++) {
      let ok = true;
      for (let j = 1; j < n; j++) {
        if (tripleVals[i + j] !== tripleVals[i] + j) { ok = false; break; }
      }
      if (!ok) continue;
      if (tripleVals[i] + n - 1 <= greaterThan) continue;
      const planeSet = new Set();
      for (let j = 0; j < n; j++) planeSet.add(tripleVals[i] + j);
      // 收集 n 个对子
      const pairVals = [];
      for (const [v, cs] of groups) {
        if (!planeSet.has(v) && cs.length >= 2 && v < 16) pairVals.push(v);
      }
      pairVals.sort((a, b) => a - b);
      if (pairVals.length >= n) {
        const plane = [];
        for (let j = 0; j < n; j++) plane.push(...groups.get(tripleVals[i] + j).slice(0, 3));
        const kickers = [];
        for (let j = 0; j < n; j++) kickers.push(...groups.get(pairVals[j]).slice(0, 2));
        result.push([...plane, ...kickers]);
      }
    }
    return result;
  }

  static _findFourTwoSingles(cards, greaterThan) {
    const groups = this._groupByValue(cards);
    const result = [];
    for (const [v, cs] of groups) {
      if (cs.length === 4 && v > greaterThan && v < 16) {
        const others = cards.filter((c) => c.value !== v);
        if (others.length >= 2) {
          others.sort((a, b) => a.value - b.value);
          result.push([...cs.slice(0, 4), others[0], others[1]]);
        }
      }
    }
    return result;
  }

  static _findFourTwoPairs(cards, greaterThan) {
    const groups = this._groupByValue(cards);
    const result = [];
    for (const [v, cs] of groups) {
      if (cs.length === 4 && v > greaterThan && v < 16) {
        const pairVals = [];
        for (const [pv, pcs] of groups) {
          if (pv !== v && pcs.length >= 2 && pv < 16) pairVals.push(pv);
        }
        pairVals.sort((a, b) => a - b);
        if (pairVals.length >= 2) {
          result.push([
            ...cs.slice(0, 4),
            ...groups.get(pairVals[0]).slice(0, 2),
            ...groups.get(pairVals[1]).slice(0, 2)
          ]);
        }
      }
    }
    return result;
  }
}

if (typeof window !== 'undefined') {
  window.DoudizhuRule = DoudizhuRule;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = DoudizhuRule;
}
