/**
 * @file GuandanRule.js
 * @description 掼蛋规则引擎：级牌/逢人配、牌型判断、炸弹层级、比较、提示功能
 * @author HappyCard Team
 * @date 2026-08
 *
 * 掼蛋要点：
 *  - 两副牌108张，4人2v2（对家为队友）
 *  - 级牌：当前打X，X的牌点提升至2与小王之间；红桃X为逢人配（百搭）
 *  - 牌型：单张/对子/三张/三带二/顺子/连对(木板)/钢板(三连三张)/
 *          炸弹(4-8张同点)/同花顺(5张同花色顺子)/天王炸(4张王)
 *  - 炸弹权重：4炸<5炸<同花顺<6炸<7炸<8炸<天王炸
 */

class GuandanRule {
  /**
   * 判断一张牌是否为逢人配（红桃级牌）
   * @param {Card} card
   * @param {number} levelValue 级牌的原始牌值（2=15,3=3,...,A=14）
   * @returns {boolean}
   */
  static isWild(card, levelValue) {
    if (!card) return false;
    return card.suit === 'heart' && card.value === levelValue;
  }

  /**
   * 级牌用于比较的有效值（位于2与小王之间）
   * @param {Card} card
   * @param {number} levelValue
   * @returns {number}
   */
  static effValue(card, levelValue) {
    if (card.value === 17) return 17; // 大王
    if (card.value === 16) return 16; // 小王
    if (card.value === levelValue) return 15.5; // 级牌提升
    return card.value; // 3..15, 其中2=15
  }

  /**
   * 拆分牌：普通牌按值分组，逢人配单独列出
   * @param {Card[]} cards
   * @param {number} levelValue
   * @returns {{groups: Map<number, Card[]>, wilds: Card[]}}
   */
  static _splitCards(cards, levelValue) {
    const groups = new Map();
    const wilds = [];
    for (const c of cards) {
      if (this.isWild(c, levelValue)) {
        wilds.push(c);
      } else {
        if (!groups.has(c.value)) groups.set(c.value, []);
        groups.get(c.value).push(c);
      }
    }
    return { groups, wilds };
  }

  /**
   * 判断牌型
   * @param {Card[]} cards
   * @param {number} levelValue
   * @returns {{type:string, mainValue:number, length:number, isValid:boolean, bombWeight?:number, extra?:any}}
   */
  static judge(cards, levelValue) {
    if (!cards || cards.length === 0) {
      return { type: CardType.INVALID, mainValue: 0, length: 0, isValid: false };
    }
    const lv = levelValue || 15; // 默认打2
    const len = cards.length;
    const { groups, wilds } = this._splitCards(cards, lv);
    const wildCount = wilds.length;
    const values = [...groups.keys()].sort((a, b) => a - b);

    // 天王炸：4张王（2小+2大）
    if (len === 4 && wildCount === 0 && groups.size === 2 &&
        groups.has(16) && groups.has(17) &&
        groups.get(16).length === 2 && groups.get(17).length === 2) {
      return { type: CardType.SKY_BOMB, mainValue: 17, length: 4, isValid: true, bombWeight: 999 };
    }

    // 同花顺（5张同花色顺子，不含百搭）
    if (len === 5 && wildCount === 0) {
      const sf = this._checkStraightFlush(cards);
      if (sf) {
        return { type: CardType.STRAIGHT_FLUSH, mainValue: sf.top, length: 5, isValid: true, bombWeight: 5.5 };
      }
    }

    // 炸弹：4-8张同点（可用百搭凑）
    if (len >= 4 && len <= 8) {
      const bomb = this._checkBomb(groups, wildCount, len);
      if (bomb) {
        return {
          type: CardType.BOMB, mainValue: bomb.value, length: len, isValid: true,
          bombWeight: len, extra: { wildUsed: bomb.wildUsed }
        };
      }
    }

    // 单张
    if (len === 1) {
      const c = cards[0];
      return { type: CardType.SINGLE, mainValue: this.effValue(c, lv), length: 1, isValid: true };
    }

    // 对子（2张同点，可1张百搭）
    if (len === 2) {
      const pair = this._checkPair(groups, wildCount);
      if (pair) {
        return { type: CardType.PAIR, mainValue: pair.mainValue, length: 2, isValid: true };
      }
      return { type: CardType.INVALID, mainValue: 0, length: 2, isValid: false };
    }

    // 三张（3张同点，可百搭）
    if (len === 3) {
      const triple = this._checkTriple(groups, wildCount);
      if (triple) {
        return { type: CardType.TRIPLE, mainValue: triple.mainValue, length: 3, isValid: true };
      }
      return { type: CardType.INVALID, mainValue: 0, length: 3, isValid: false };
    }

    // 三带二（3+2，共5张）
    if (len === 5) {
      const tp = this._checkTriplePair(groups, wildCount, lv);
      if (tp) {
        return { type: CardType.TRIPLE_PAIR, mainValue: tp.mainValue, length: 5, isValid: true, extra: { pairValue: tp.pairValue } };
      }
    }

    // 顺子（5-12张连续单张，3-A，不含2和王，百搭可补缺）
    if (len >= 5 && len <= 12) {
      const st = this._checkStraight(groups, wildCount, len);
      if (st) {
        return { type: CardType.STRAIGHT, mainValue: st.top, length: len, isValid: true, extra: { wildUsed: st.wildUsed } };
      }
    }

    // 连对/木板（3对及以上连续对子，共6+张）
    if (len >= 6 && len % 2 === 0) {
      const ds = this._checkDoubleStraight(groups, wildCount, len);
      if (ds) {
        return { type: CardType.DOUBLE_STRAIGHT, mainValue: ds.top, length: len, isValid: true, extra: { wildUsed: ds.wildUsed } };
      }
    }

    // 钢板（2组及以上连续三张，共6+张）
    if (len >= 6 && len % 3 === 0) {
      const ts = this._checkTripleStraight(groups, wildCount, len);
      if (ts) {
        return { type: CardType.TRIPLE_STRAIGHT, mainValue: ts.top, length: len, isValid: true, extra: { wildUsed: ts.wildUsed } };
      }
    }

    return { type: CardType.INVALID, mainValue: 0, length: len, isValid: false };
  }

  /* ===================== 牌型检测辅助 ===================== */

  static _checkBomb(groups, wildCount, len) {
    // 某点数的实际张数 + 可用百搭 >= len，且该点数不是王（王炸单独处理）
    for (const [v, cs] of groups) {
      if (v >= 16) continue;
      if (cs.length + wildCount >= len && cs.length <= len) {
        return { value: v, wildUsed: len - cs.length };
      }
    }
    // 全百搭（2张）无法单独成炸，len>=4不可能
    return null;
  }

  static _checkPair(groups, wildCount) {
    // 0百搭：两同点
    if (wildCount === 0) {
      for (const [v, cs] of groups) {
        if (cs.length >= 2) return { mainValue: v };
      }
      return null;
    }
    // 1百搭 + 1任意牌
    if (wildCount === 1 && groups.size === 1) {
      const v = [...groups.keys()][0];
      return { mainValue: v };
    }
    // 2百搭：当级牌对子
    if (wildCount === 2 && groups.size === 0) {
      return { mainValue: 15.5 };
    }
    return null;
  }

  static _checkTriple(groups, wildCount) {
    if (wildCount === 0) {
      for (const [v, cs] of groups) {
        if (cs.length >= 3) return { mainValue: v };
      }
      return null;
    }
    if (wildCount === 1) {
      for (const [v, cs] of groups) {
        if (cs.length === 2) return { mainValue: v };
      }
      return null;
    }
    if (wildCount === 2) {
      for (const [v, cs] of groups) {
        if (cs.length === 1) return { mainValue: v };
      }
      return null;
    }
    return null;
  }

  /**
   * 三带二：一个三张 + 一个对子（可使用百搭，三张与对子点数不同）
   */
  static _checkTriplePair(groups, wildCount, levelValue) {
    // 枚举三张点数，剩余牌（含百搭余量）能否组成对子
    const entries = [...groups.entries()];
    for (const [v, cs] of entries) {
      if (v >= 16) continue;
      const needForTriple = Math.max(0, 3 - cs.length);
      if (needForTriple > wildCount) continue;
      const remainingWilds = wildCount - needForTriple;
      // 剩余牌中找点对子（不等于v）
      for (const [v2, cs2] of entries) {
        if (v2 === v) continue;
        const have = cs2.length;
        if (have + remainingWilds >= 2 && have <= 2) {
          return { mainValue: this.effValue({ value: v }, levelValue), pairValue: v2 };
        }
      }
      // 用2张剩余百搭组成级牌对子
      if (remainingWilds >= 2) {
        return { mainValue: this.effValue({ value: v }, levelValue), pairValue: 15.5 };
      }
    }
    return null;
  }

  static _checkStraight(groups, wildCount, len) {
    // 在 3..14 范围内滑窗，每个位置需至少1张（含百搭补位）
    const have = new Array(15).fill(0); // index 3..14
    for (const [v, cs] of groups) {
      if (v >= 3 && v <= 14) have[v] = cs.length;
    }
    for (let start = 3; start + len - 1 <= 14; start++) {
      let wildNeed = 0;
      let valid = true;
      for (let i = 0; i < len; i++) {
        if (have[start + i] === 0) wildNeed++;
        if (wildNeed > wildCount) { valid = false; break; }
      }
      if (valid && wildNeed <= wildCount) {
        return { top: start + len - 1, wildUsed: wildNeed };
      }
    }
    return null;
  }

  static _checkDoubleStraight(groups, wildCount, len) {
    const pairCount = len / 2;
    if (pairCount < 3) return null;
    const have = new Array(15).fill(0);
    for (const [v, cs] of groups) {
      if (v >= 3 && v <= 14) have[v] = Math.min(cs.length, 2);
    }
    for (let start = 3; start + pairCount - 1 <= 14; start++) {
      let wildNeed = 0;
      let valid = true;
      for (let i = 0; i < pairCount; i++) {
        const need = 2 - have[start + i];
        if (need > 0) wildNeed += need;
        if (wildNeed > wildCount) { valid = false; break; }
      }
      if (valid && wildNeed <= wildCount) {
        return { top: start + pairCount - 1, wildUsed: wildNeed };
      }
    }
    return null;
  }

  static _checkTripleStraight(groups, wildCount, len) {
    const tripleCount = len / 3;
    if (tripleCount < 2) return null;
    const have = new Array(15).fill(0);
    for (const [v, cs] of groups) {
      if (v >= 3 && v <= 14) have[v] = Math.min(cs.length, 3);
    }
    for (let start = 3; start + tripleCount - 1 <= 14; start++) {
      let wildNeed = 0;
      let valid = true;
      for (let i = 0; i < tripleCount; i++) {
        const need = 3 - have[start + i];
        if (need > 0) wildNeed += need;
        if (wildNeed > wildCount) { valid = false; break; }
      }
      if (valid && wildNeed <= wildCount) {
        return { top: start + tripleCount - 1, wildUsed: wildNeed };
      }
    }
    return null;
  }

  static _checkStraightFlush(cards) {
    const suits = new Set(cards.map(c => c.suit));
    if (suits.size !== 1) return null;
    if ([...suits][0] === 'joker') return null;
    const vals = cards.map(c => c.value).filter(v => v >= 3 && v <= 14).sort((a, b) => a - b);
    if (vals.length !== 5) return null;
    for (let i = 1; i < 5; i++) {
      if (vals[i] !== vals[i - 1] + 1) return null;
    }
    return { top: vals[4] };
  }

  /* ===================== 比较 ===================== */

  /**
   * 比较两手牌
   * @returns {number} 1=A大, -1=B大, 0=无法比较
   */
  static compare(cardsA, cardsB, levelValue) {
    const lv = levelValue || 15;
    const a = this.judge(cardsA, lv);
    const b = this.judge(cardsB, lv);
    if (!a.isValid || !b.isValid) return 0;

    const aBomb = this._bombWeight(a);
    const bBomb = this._bombWeight(b);

    if (aBomb > 0 && bBomb > 0) {
      if (aBomb > bBomb) return 1;
      if (aBomb < bBomb) return -1;
      if (a.type === b.type) {
        const aMain = this._mainEffValue(cardsA, a, lv);
        const bMain = this._mainEffValue(cardsB, b, lv);
        return aMain > bMain ? 1 : -1;
      }
      return -1;
    }
    if (aBomb > 0 && bBomb === 0) return 1;
    if (aBomb === 0 && bBomb > 0) return -1;

    if (a.type !== b.type || a.length !== b.length) return 0;

    // 普通牌型比较主值
    const aMain = this._mainEffValue(cardsA, a, lv);
    const bMain = this._mainEffValue(cardsB, b, lv);
    return aMain > bMain ? 1 : -1;
  }

  static _bombWeight(info) {
    if (info.type === CardType.SKY_BOMB) return 999;
    if (info.type === CardType.STRAIGHT_FLUSH) return 5.5;
    if (info.type === CardType.BOMB) return info.length;
    return 0;
  }

  /**
   * 计算牌型主值的有效牌值（考虑级牌提升）
   */
  static _mainEffValue(cards, info, levelValue) {
    if (info.type === CardType.STRAIGHT ||
        info.type === CardType.DOUBLE_STRAIGHT ||
        info.type === CardType.TRIPLE_STRAIGHT ||
        info.type === CardType.STRAIGHT_FLUSH) {
      return info.mainValue; // 顺子类以顶端点数为准（3..14）
    }
    // 找出现次数最多的非百搭牌作为主牌
    const { groups, wilds } = this._splitCards(cards, levelValue);
    let bestV = info.mainValue;
    let bestCount = -1;
    for (const [v, cs] of groups) {
      if (cs.length > bestCount) {
        bestCount = cs.length;
        bestV = v;
      }
    }
    if (bestCount < 0 && wilds.length > 0) return 15.5;
    return this.effValue({ value: bestV }, levelValue);
  }

  /* ===================== 提示 ===================== */

  /**
   * 找出所有能压过上家的出牌组合
   * @param {Hand|Card[]} hand
   * @param {Card[]} lastCards 上家牌（null=自由出牌）
   * @param {number} levelValue
   * @returns {Card[][]}
   */
  static findHints(hand, lastCards, levelValue) {
    const lv = levelValue || 15;
    const cards = hand.cards || hand;
    const { groups, wilds } = this._splitCards(cards, lv);
    const result = [];
    const seen = new Set();
    const addHint = (cs) => {
      if (!cs || cs.length === 0) return;
      const key = cs.map(c => c.id).sort().join(',');
      if (seen.has(key)) return;
      seen.add(key);
      result.push(cs);
    };

    if (!lastCards || lastCards.length === 0) {
      this._findAllSingles(groups, wilds, -1, lv).forEach(addHint);
      this._findAllPairs(groups, wilds, -1, lv).forEach(addHint);
      this._findAllTriples(groups, wilds, -1, lv).forEach(addHint);
      this._findAllStraights(groups, wilds).forEach(addHint);
      this._findAllDoubleStraights(groups, wilds).forEach(addHint);
      this._findAllTripleStraights(groups, wilds).forEach(addHint);
      this._findAllBombs(groups, wilds, 0, lv).forEach(addHint);
      result.sort((a, b) => this._hintSort(a, b, lv));
      return result.slice(0, 24);
    }

    const last = this.judge(lastCards, lv);
    if (!last.isValid) return [];

    const bWeight = this._bombWeight(last);

    if (bWeight > 0) {
      // 跟上炸弹/同花顺/天王炸
      if (last.type === CardType.SKY_BOMB) return [];
      this._findAllBombs(groups, wilds, bWeight, lv).forEach(addHint);
      if (last.type !== CardType.STRAIGHT_FLUSH) {
        this._findStraightFlushes(cards, 5.5).forEach(addHint);
      }
      this._findSkyBomb(groups).forEach(addHint);
      return result.sort((a, b) => this._hintSort(a, b, lv));
    }

    const mv = this._mainEffValue(lastCards, last, lv);

    switch (last.type) {
      case CardType.SINGLE:
        this._findAllSingles(groups, wilds, mv, lv).forEach(addHint);
        break;
      case CardType.PAIR:
        this._findAllPairs(groups, wilds, mv, lv).forEach(addHint);
        break;
      case CardType.TRIPLE:
        this._findAllTriples(groups, wilds, mv, lv).forEach(addHint);
        break;
      case CardType.TRIPLE_PAIR:
        this._findTriplePairs(groups, wilds, mv, lv).forEach(addHint);
        break;
      case CardType.STRAIGHT:
        this._findStraightsOfLength(groups, wilds, last.length, last.mainValue).forEach(addHint);
        break;
      case CardType.DOUBLE_STRAIGHT:
        this._findDoubleStraightsOfLength(groups, wilds, last.length, last.mainValue).forEach(addHint);
        break;
      case CardType.TRIPLE_STRAIGHT:
        this._findTripleStraightsOfLength(groups, wilds, last.length, last.mainValue).forEach(addHint);
        break;
      default:
        break;
    }

    // 任何非炸弹牌型都可用炸弹/同花顺/天王炸压
    this._findAllBombs(groups, wilds, 0, lv).forEach(addHint);
    this._findStraightFlushes(cards, 0).forEach(addHint);
    this._findSkyBomb(groups).forEach(addHint);

    return result.sort((a, b) => this._hintSort(a, b, lv));
  }

  /* ---------- 提示：基础牌型生成 ---------- */

  static _findAllSingles(groups, wilds, greaterThan, lv) {
    const out = [];
    for (const [v, cs] of groups) {
      if (this.effValue({ value: v }, lv) > greaterThan) out.push([cs[0]]);
    }
    for (const w of wilds) {
      if (15.5 > greaterThan) out.push([w]);
    }
    return out;
  }

  static _findAllPairs(groups, wilds, greaterThan, lv) {
    const out = [];
    for (const [v, cs] of groups) {
      if (cs.length >= 2 && this.effValue({ value: v }, lv) > greaterThan) {
        out.push(cs.slice(0, 2));
      } else if (cs.length === 1 && wilds.length >= 1 && this.effValue({ value: v }, lv) > greaterThan) {
        out.push([cs[0], wilds[0]]);
      }
    }
    if (wilds.length >= 2 && 15.5 > greaterThan) out.push(wilds.slice(0, 2));
    return out;
  }

  static _findAllTriples(groups, wilds, greaterThan, lv) {
    const out = [];
    for (const [v, cs] of groups) {
      if (cs.length >= 3 && this.effValue({ value: v }, lv) > greaterThan) {
        out.push(cs.slice(0, 3));
      } else if (cs.length === 2 && wilds.length >= 1 && this.effValue({ value: v }, lv) > greaterThan) {
        out.push([...cs.slice(0, 2), wilds[0]]);
      } else if (cs.length === 1 && wilds.length >= 2 && this.effValue({ value: v }, lv) > greaterThan) {
        out.push([cs[0], ...wilds.slice(0, 2)]);
      }
    }
    return out;
  }

  static _findTriplePairs(groups, wilds, greaterThan, lv) {
    const out = [];
    const triples = this._findAllTriples(groups, wilds, greaterThan, lv);
    for (const triple of triples) {
      const usedIds = new Set(triple.map(c => c.id));
      const remGroups = new Map();
      const remWilds = [];
      for (const [v, cs] of groups) {
        remGroups.set(v, cs.filter(c => !usedIds.has(c.id)));
      }
      for (const w of wilds) if (!usedIds.has(w.id)) remWilds.push(w);
      const pairs = this._findAllPairs(remGroups, remWilds, -1, lv);
      for (const p of pairs) out.push([...triple, ...p]);
    }
    return out;
  }

  static _findStraightsOfLength(groups, wilds, len, greaterThanTop) {
    const out = [];
    const have = new Array(15).fill(0);
    for (const [v, cs] of groups) {
      if (v >= 3 && v <= 14) have[v] = cs.length;
    }
    for (let start = 3; start + len - 1 <= 14; start++) {
      if (start + len - 1 <= greaterThanTop) continue;
      const combo = [];
      let wildNeed = 0;
      let valid = true;
      for (let i = 0; i < len; i++) {
        const v = start + i;
        if (have[v] > 0) combo.push(groups.get(v)[0]);
        else wildNeed++;
        if (wildNeed > wilds.length) { valid = false; break; }
      }
      if (valid && wildNeed <= wilds.length) {
        for (let i = 0; i < wildNeed; i++) combo.push(wilds[i]);
        out.push(combo);
      }
    }
    return out;
  }

  static _findDoubleStraightsOfLength(groups, wilds, len, greaterThanTop) {
    const pairCount = len / 2;
    const out = [];
    const have = new Array(15).fill(0);
    for (const [v, cs] of groups) {
      if (v >= 3 && v <= 14) have[v] = Math.min(cs.length, 2);
    }
    for (let start = 3; start + pairCount - 1 <= 14; start++) {
      if (start + pairCount - 1 <= greaterThanTop) continue;
      const combo = [];
      let wildNeed = 0;
      let valid = true;
      for (let i = 0; i < pairCount; i++) {
        const v = start + i;
        const give = Math.min(have[v], 2);
        for (let k = 0; k < give; k++) combo.push(groups.get(v)[k]);
        wildNeed += 2 - give;
        if (wildNeed > wilds.length) { valid = false; break; }
      }
      if (valid && wildNeed <= wilds.length) {
        for (let i = 0; i < wildNeed; i++) combo.push(wilds[i]);
        out.push(combo);
      }
    }
    return out;
  }

  static _findTripleStraightsOfLength(groups, wilds, len, greaterThanTop) {
    const tripleCount = len / 3;
    const out = [];
    const have = new Array(15).fill(0);
    for (const [v, cs] of groups) {
      if (v >= 3 && v <= 14) have[v] = Math.min(cs.length, 3);
    }
    for (let start = 3; start + tripleCount - 1 <= 14; start++) {
      if (start + tripleCount - 1 <= greaterThanTop) continue;
      const combo = [];
      let wildNeed = 0;
      let valid = true;
      for (let i = 0; i < tripleCount; i++) {
        const v = start + i;
        const give = Math.min(have[v], 3);
        for (let k = 0; k < give; k++) combo.push(groups.get(v)[k]);
        wildNeed += 3 - give;
        if (wildNeed > wilds.length) { valid = false; break; }
      }
      if (valid && wildNeed <= wilds.length) {
        for (let i = 0; i < wildNeed; i++) combo.push(wilds[i]);
        out.push(combo);
      }
    }
    return out;
  }

  static _findAllStraights(groups, wilds) {
    const out = [];
    for (let len = 5; len <= 12; len++) {
      this._findStraightsOfLength(groups, wilds, len, 2).forEach(c => out.push(c));
    }
    return out;
  }

  static _findAllDoubleStraights(groups, wilds) {
    const out = [];
    for (let pc = 3; pc <= 10; pc++) {
      this._findDoubleStraightsOfLength(groups, wilds, pc * 2, 2).forEach(c => out.push(c));
    }
    return out;
  }

  static _findAllTripleStraights(groups, wilds) {
    const out = [];
    for (let tc = 2; tc <= 6; tc++) {
      this._findTripleStraightsOfLength(groups, wilds, tc * 3, 2).forEach(c => out.push(c));
    }
    return out;
  }

  static _findAllBombs(groups, wilds, greaterThanWeight, lv) {
    const out = [];
    for (const [v, cs] of groups) {
      if (v >= 16) continue;
      for (let size = 4; size <= 8; size++) {
        if (size > cs.length + wilds.length) break;
        if (size < cs.length) continue; // 用尽量多的实际牌
        if (size <= greaterThanWeight) continue;
        const wildNeed = size - cs.length;
        if (wildNeed < 0 || wildNeed > wilds.length) continue;
        const combo = cs.slice(0, size);
        for (let i = 0; i < wildNeed; i++) combo.push(wilds[i]);
        out.push(combo);
      }
    }
    return out;
  }

  static _findStraightFlushes(allCards, greaterThanWeight) {
    if (5.5 <= greaterThanWeight) return [];
    const out = [];
    const bySuit = new Map();
    for (const c of allCards) {
      if (c.suit === 'joker' || c.value < 3 || c.value > 14) continue;
      if (!bySuit.has(c.suit)) bySuit.set(c.suit, new Map());
      const m = bySuit.get(c.suit);
      if (!m.has(c.value)) m.set(c.value, c);
    }
    for (const [, m] of bySuit) {
      const vals = [...m.keys()].sort((a, b) => a - b);
      for (let i = 0; i + 4 < vals.length; i++) {
        let ok = true;
        for (let k = 1; k < 5; k++) {
          if (vals[i + k] !== vals[i] + k) { ok = false; break; }
        }
        if (ok) {
          const combo = [0, 1, 2, 3, 4].map(k => m.get(vals[i + k]));
          out.push(combo);
        }
      }
    }
    return out;
  }

  static _findSkyBomb(groups) {
    const small = groups.get(16);
    const big = groups.get(17);
    if (small && big && small.length >= 2 && big.length >= 2) {
      return [[...small.slice(0, 2), ...big.slice(0, 2)]];
    }
    return [];
  }

  static _hintSort(a, b, lv) {
    const ia = this.judge(a, lv);
    const ib = this.judge(b, lv);
    const wa = this._bombWeight(ia);
    const wb = this._bombWeight(ib);
    if (wa !== wb) return wa - wb;
    if (a.length !== b.length) return a.length - b.length;
    const ma = this._mainEffValue(a, ia, lv);
    const mb = this._mainEffValue(b, ib, lv);
    return ma - mb;
  }

  /**
   * 将级牌等级（2..A）转换为牌值
   * @param {string|number} rank
   * @returns {number}
   */
  static levelToValue(rank) {
    if (typeof rank === 'number') return rank;
    const map = { '2': 15, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8,
      '9': 9, '10': 10, J: 11, Q: 12, K: 13, A: 14 };
    return map[rank] != null ? map[rank] : 15;
  }

  /**
   * 牌值转显示名
   */
  static valueToLevelDisplay(v) {
    const map = { 3: '3', 4: '4', 5: '5', 6: '6', 7: '7', 8: '8', 9: '9',
      10: '10', 11: 'J', 12: 'Q', 13: 'K', 14: 'A', 15: '2' };
    return map[v] || String(v);
  }
}

if (typeof window !== 'undefined') {
  window.GuandanRule = GuandanRule;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = GuandanRule;
}
