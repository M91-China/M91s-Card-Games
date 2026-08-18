/**
 * @file HandEvaluator.js
 * @description 手牌评估器：牌力评分、牌型拆解、最少出牌手数估算
 * @author HappyCard Team
 * @date 2026-08
 */

class HandEvaluator {
  /**
   * 按点数分组手牌
   * @param {Card[]} cards
   * @returns {Map<number, Card[]>}
   */
  static groupByValue(cards) {
    const map = new Map();
    for (const c of cards) {
      if (!map.has(c.value)) map.set(c.value, []);
      map.get(c.value).push(c);
    }
    return map;
  }

  /**
   * 统计手牌结构
   * @param {Card[]} cards
   * @param {number} [levelValue] 掼蛋级牌值（可选）
   * @returns {Object}
   */
  static analyze(cards, levelValue) {
    const groups = this.groupByValue(cards);
    const result = {
      singles: 0,      // 单张点数
      pairs: 0,        // 对子点数
      triples: 0,      // 三张点数
      bombs: 0,        // 炸弹点数
      bombCards: 0,    // 炸弹总张数
      rocket: false,   // 王炸
      skyBomb: false,  // 天王炸（掼蛋）
      straightFlush: 0, // 同花顺数量（掼蛋）
      bigCards: 0,     // A及以上牌张数
      lowCards: 0,     // 7以下牌张数
      totalCards: cards.length,
      groups: []
    };

    for (const [value, cs] of groups) {
      const count = cs.length;
      result.groups.push({ value, count, cards: cs });

      if (value >= 14) result.bigCards += count;
      if (value <= 8 && value >= 3) result.lowCards += count;

      if (count === 1) result.singles++;
      else if (count === 2) result.pairs++;
      else if (count === 3) result.triples++;
      else if (count >= 4) {
        result.bombs++;
        result.bombCards += count;
      }
    }

    // 王炸（斗地主：双王）
    if (groups.has(16) && groups.has(17)) {
      result.rocket = true;
    }

    // 天王炸（掼蛋：4张王）
    if (levelValue && groups.has(16) && groups.has(17)) {
      const sj = groups.get(16).length;
      const bj = groups.get(17).length;
      if (sj >= 2 && bj >= 2) result.skyBomb = true;
    }

    // 同花顺检测（掼蛋）
    if (levelValue) {
      result.straightFlush = this._countStraightFlush(cards);
    }

    return result;
  }

  /**
   * 统计同花顺数量（简单检测：同花色5张连续）
   * @param {Card[]} cards
   * @returns {number}
   */
  static _countStraightFlush(cards) {
    const bySuit = new Map();
    for (const c of cards) {
      if (c.value < 3 || c.value > 15) continue;
      if (!bySuit.has(c.suit)) bySuit.set(c.suit, []);
      bySuit.get(c.suit).push(c.value);
    }
    let count = 0;
    for (const vals of bySuit.values()) {
      vals.sort((a, b) => a - b);
      let consecutive = 1;
      for (let i = 1; i < vals.length; i++) {
        if (vals[i] === vals[i - 1] + 1) {
          consecutive++;
          if (consecutive >= 5) count++;
        } else {
          consecutive = 1;
        }
      }
    }
    return count;
  }

  /**
   * 估算最少出牌手数（贪心拆解）
   * 策略：优先炸弹 > 飞机/连对/顺子 > 三张带牌 > 对子 > 单张
   * @param {Card[]} cards
   * @param {boolean} [isGuandan=false]
   * @param {number} [levelValue]
   * @returns {number}
   */
  static estimateMinTurns(cards, isGuandan = false, levelValue) {
    if (cards.length === 0) return 0;

    // 复制一份用于拆解
    const remaining = cards.map(c => ({ value: c.value, suit: c.suit, id: c.id }));
    let turns = 0;

    const group = () => {
      const m = new Map();
      for (const c of remaining) {
        if (!m.has(c.value)) m.set(c.value, []);
        m.get(c.value).push(c);
      }
      return m;
    };

    const remove = (toRemove) => {
      const ids = new Set(toRemove.map(c => c.id));
      for (let i = remaining.length - 1; i >= 0; i--) {
        if (ids.has(remaining[i].id)) remaining.splice(i, 1);
      }
    };

    // 1. 王炸/天王炸
    const g = group();
    if (g.has(16) && g.has(17)) {
      if (isGuandan && g.get(16).length >= 2 && g.get(17).length >= 2) {
        remove([...g.get(16).slice(0, 2), ...g.get(17).slice(0, 2)]);
        turns++;
      } else if (!isGuandan) {
        remove([g.get(16)[0], g.get(17)[0]]);
        turns++;
      }
    }

    // 2. 炸弹（4张及以上同点）
    let g2 = group();
    for (const [v, cs] of g2) {
      if (cs.length >= 4 && v >= 3 && v <= 15) {
        remove(cs.slice(0, 4));
        turns++;
      }
    }

    // 3. 顺子（5张连续单张，3-A）
    let g3 = group();
    let straightFound = true;
    while (straightFound) {
      straightFound = false;
      const vals = [...g3.keys()].filter(v => v >= 3 && v <= 14 && g3.get(v).length >= 1)
        .sort((a, b) => a - b);
      let bestLen = 0, bestStart = -1;
      for (let i = 0; i < vals.length; i++) {
        let len = 1;
        while (i + len < vals.length && vals[i + len] === vals[i] + len) len++;
        if (len >= 5 && len > bestLen) { bestLen = len; bestStart = vals[i]; }
      }
      if (bestStart >= 0) {
        const straight = [];
        for (let v = bestStart; v < bestStart + bestLen; v++) {
          straight.push(g3.get(v)[0]);
        }
        remove(straight);
        turns++;
        g3 = group();
        straightFound = true;
      }
    }

    // 4. 连对（3对连续）
    let g4 = group();
    let dsFound = true;
    while (dsFound) {
      dsFound = false;
      const vals = [...g4.keys()].filter(v => v >= 3 && v <= 14 && g4.get(v).length >= 2)
        .sort((a, b) => a - b);
      let bestLen = 0, bestStart = -1;
      for (let i = 0; i < vals.length; i++) {
        let len = 1;
        while (i + len < vals.length && vals[i + len] === vals[i] + len) len++;
        if (len >= 3 && len > bestLen) { bestLen = len; bestStart = vals[i]; }
      }
      if (bestStart >= 0) {
        const ds = [];
        for (let v = bestStart; v < bestStart + bestLen; v++) {
          ds.push(...g4.get(v).slice(0, 2));
        }
        remove(ds);
        turns++;
        g4 = group();
        dsFound = true;
      }
    }

    // 5. 飞机（连续三张，斗地主可带牌；掼蛋钢板不带）
    let g5 = group();
    let planeFound = true;
    while (planeFound) {
      planeFound = false;
      const vals = [...g5.keys()].filter(v => v >= 3 && v <= 15 && g5.get(v).length >= 3)
        .sort((a, b) => a - b);
      let bestLen = 0, bestStart = -1;
      for (let i = 0; i < vals.length; i++) {
        let len = 1;
        while (i + len < vals.length && vals[i + len] === vals[i] + len) len++;
        if (len >= 2 && len > bestLen) { bestLen = len; bestStart = vals[i]; }
      }
      if (bestStart >= 0) {
        const plane = [];
        for (let v = bestStart; v < bestStart + bestLen; v++) {
          plane.push(...g5.get(v).slice(0, 3));
        }
        remove(plane);
        turns++;
        // 斗地主：飞机带单张/对子
        if (!isGuandan) {
          let g5b = group();
          const singles = [];
          for (const [v, cs] of g5b) {
            if (v >= 3 && v <= 15 && cs.length === 1) singles.push(...cs);
            if (singles.length >= bestLen) break;
          }
          if (singles.length >= bestLen) {
            remove(singles.slice(0, bestLen));
          } else {
            let g5c = group();
            const pairs = [];
            for (const [v, cs] of g5c) {
              if (v >= 3 && v <= 15 && cs.length >= 2) pairs.push(...cs.slice(0, 2));
              if (pairs.length >= bestLen * 2) break;
            }
            if (pairs.length >= bestLen * 2) remove(pairs.slice(0, bestLen * 2));
          }
        }
        g5 = group();
        planeFound = true;
      }
    }

    // 6. 三张带牌（斗地主：三带一/三带二）
    let g6 = group();
    for (const [v, cs] of g6) {
      if (cs.length === 3 && v >= 3 && v <= 15) {
        remove(cs);
        turns++;
        if (!isGuandan) {
          let g6b = group();
          // 优先带单张
          let found = false;
          for (const [v2, cs2] of g6b) {
            if (v2 !== v && cs2.length === 1 && v2 >= 3 && v2 <= 15) {
              remove(cs2); found = true; break;
            }
          }
          if (!found) {
            for (const [v2, cs2] of g6b) {
              if (v2 !== v && cs2.length >= 2 && v2 >= 3 && v2 <= 15) {
                remove(cs2.slice(0, 2)); break;
              }
            }
          }
        }
      }
    }

    // 7. 对子
    let g7 = group();
    for (const [v, cs] of g7) {
      if (cs.length >= 2 && v >= 3 && v <= 15) {
        remove(cs.slice(0, 2));
        turns++;
      }
    }

    // 8. 剩余单张（每张一手）
    turns += remaining.filter(c => c.value >= 3 && c.value <= 15).length;
    // 王
    turns += remaining.filter(c => c.value >= 16).length;

    return turns;
  }

  /**
   * 评估斗地主手牌牌力（0-100）
   * @param {Card[]} cards
   * @returns {Object} { score, breakdown }
   */
  static evaluateDoudizhu(cards) {
    const analysis = this.analyze(cards);
    const minTurns = this.estimateMinTurns(cards, false);

    let score = 0;
    const breakdown = {};

    // 大牌分（A=2, 2=4, 小王=6, 大王=8 per card）
    let bigScore = 0;
    for (const c of cards) {
      if (c.value === 14) bigScore += 2;       // A
      else if (c.value === 15) bigScore += 4;  // 2
      else if (c.value === 16) bigScore += 6;  // 小王
      else if (c.value === 17) bigScore += 8;  // 大王
    }
    breakdown.bigCards = bigScore;
    score += bigScore;

    // 炸弹分（每个+10）
    breakdown.bombs = analysis.bombs * 10;
    score += analysis.bombs * 10;

    // 王炸（+15）
    if (analysis.rocket) {
      breakdown.rocket = 15;
      score += 15;
    }

    // 手数分（手数越少越好，基准10手，每少一手+4）
    const turnsScore = Math.max(0, (10 - minTurns)) * 4;
    breakdown.turns = turnsScore;
    score += turnsScore;

    // 牌型结构分：对子+2，三张+4，减少单张冗余
    const structScore = analysis.pairs * 2 + analysis.triples * 4 - analysis.singles * 1.5;
    breakdown.structure = Math.max(0, structScore);
    score += Math.max(0, structScore);

    // 低牌惩罚（单张小牌过多，每张超过3张惩罚）
    const lowSingles = cards.filter(c => c.value <= 7 && c.value >= 3).length;
    const penalty = Math.max(0, lowSingles - 4) * 2;
    breakdown.lowPenalty = -penalty;
    score -= penalty;

    // 牌张控制力：A/2/王数量多意味着能控制出牌权
    const controlCount = cards.filter(c => c.value >= 14).length;
    const controlBonus = controlCount * 1.5;
    breakdown.control = controlBonus;
    score += controlBonus;

    score = Math.max(0, Math.min(100, Math.round(score)));

    return { score, analysis, minTurns, breakdown };
  }

  /**
   * 评估掼蛋手牌牌力（0-100）
   * @param {Card[]} cards
   * @param {number} levelValue
   * @returns {Object}
   */
  static evaluateGuandan(cards, levelValue) {
    const analysis = this.analyze(cards, levelValue);
    const minTurns = this.estimateMinTurns(cards, true, levelValue);

    let score = 0;
    const breakdown = {};

    // 级牌和大牌
    let bigScore = 0;
    for (const c of cards) {
      const eff = levelValue && c.value === levelValue ? 15.5 : c.value;
      if (eff >= 14) bigScore += 2;
      if (eff >= 16) bigScore += 3;
    }
    breakdown.bigCards = bigScore;
    score += bigScore;

    // 炸弹层级分
    let bombScore = 0;
    bombScore += analysis.bombs * 6;
    bombScore += analysis.straightFlush * 10;
    if (analysis.skyBomb) bombScore += 20;
    breakdown.bombs = bombScore;
    score += bombScore;

    // 逢人配（百搭）加分
    const wildCount = cards.filter(c => levelValue && c.suit === 'heart' && c.value === levelValue).length;
    breakdown.wild = wildCount * 4;
    score += wildCount * 4;

    // 手数分
    breakdown.turns = Math.max(0, (12 - minTurns)) * 3;
    score += Math.max(0, (12 - minTurns)) * 3;

    // 结构奖励
    breakdown.structure = (analysis.pairs + analysis.triples * 1.5) * 0.8;
    score += (analysis.pairs + analysis.triples * 1.5) * 0.8;

    score = Math.max(0, Math.min(100, Math.round(score)));

    return { score, analysis, minTurns, breakdown };
  }

  /**
   * 评估出牌选择的优劣（用于跟牌决策）
   * 返回分数越高越应该出
   * @param {Card[]} choice 候选出牌
   * @param {Card[]} hand 当前手牌（出牌后剩余）
   * @param {Object} context
   * @returns {number}
   */
  static evaluatePlay(choice, hand, context) {
    const info = context.rule.judge(choice, context.levelValue);
    if (!info.isValid) return -999;

    const remainingAfter = hand.cards.length - choice.length;
    let score = 0;

    // 出完牌：极高分
    if (remainingAfter === 0) return 1000;

    // 出的牌越少越好（保留实力）
    score -= choice.length * 0.5;

    // 炸弹惩罚（不轻易炸）
    if (info.type === 'bomb') score -= 15;
    if (info.type === 'rocket' || info.type === 'sky_bomb') score -= 20;
    if (info.type === 'straight_flush') score -= 12;

    // 主牌越小越好（跟牌时出小牌）
    score -= info.mainValue * 0.3;

    // 如果出牌后手牌很少（冲刺），加分
    if (remainingAfter <= 3) score += 20;
    else if (remainingAfter <= 6) score += 8;

    // 出牌后减少手数
    const afterTurns = this.estimateMinTurns(
      hand.cards.filter(c => !choice.includes(c)),
      context.isGuandan,
      context.levelValue
    );
    score += (context.currentTurns - afterTurns) * 3;

    return score;
  }
}

if (typeof window !== 'undefined') {
  window.HandEvaluator = HandEvaluator;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = HandEvaluator;
}
