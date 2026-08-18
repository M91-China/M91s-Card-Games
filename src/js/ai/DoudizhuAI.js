/**
 * @file DoudizhuAI.js
 * @description 高级斗地主AI：基于记牌器和手牌评估的叫分/出牌策略，含残局搜索
 * @author HappyCard Team
 * @date 2026-08
 */

class DoudizhuAI {
  /**
   * @param {CardCounter} counter
   */
  constructor(counter) {
    this.counter = counter;
  }

  /**
   * 叫分决策
   * @param {Hand} hand
   * @param {number} maxBid 当前最高分
   * @returns {number} 0-3
   */
  decideBid(hand, maxBid) {
    const eval_ = HandEvaluator.evaluateDoudizhu(hand.cards);
    const score = eval_.score;
    const analysis = eval_.analysis;

    let bid = 0;
    if (score >= 50) bid = 3;
    else if (score >= 38) bid = 2;
    else if (score >= 26) bid = 1;
    else bid = 0;

    // 不能叫低于当前最高分的分
    if (bid > 0 && bid <= maxBid) {
      // 如果牌力够强但被前面的人压了，可以跳叫
      if (score >= 55 && maxBid < 3) bid = Math.min(3, maxBid + 1);
      else bid = 0;
    }

    return bid;
  }

  /**
   * 出牌决策
   * @param {Hand} hand
   * @param {Object|null} lastPlay { cards, info, player }
   * @param {Object} context { currentPlayer, players, hands, landlord }
   * @returns {Card[]|null} 选择的牌，null表示不出
   */
  decidePlay(hand, lastPlay, context) {
    const isLandlord = context.players[context.currentPlayer].role === 'landlord';
    const lastCards = (lastPlay && lastPlay.player !== context.currentPlayer) ? lastPlay.cards : null;
    const freeToPlay = !lastCards;

    if (freeToPlay) {
      return this._freePlay(hand, context, isLandlord);
    } else {
      return this._followPlay(hand, lastPlay, context, isLandlord);
    }
  }

  /**
   * 自由出牌策略
   */
  _freePlay(hand, context, isLandlord) {
    const cards = hand.cards;

    // 残局搜索：手牌≤6张时，寻找能一次出完或必胜的路线
    if (cards.length <= 6) {
      const winMove = this._findWinningMove(hand, null, context);
      if (winMove) return winMove;
    }

    const hints = DoudizhuRule.findHints(hand, null);
    if (!hints || hints.length === 0) return null;

    const eval_ = HandEvaluator.evaluateDoudizhu(cards);
    const minTurns = eval_.minTurns;

    // 如果只剩一手牌能出完，直接出
    const allIn = hints.find(h => h.length === cards.length);
    if (allIn) return allIn;

    // 策略：根据手数和手牌结构选择最优出牌
    // 优先出长牌型（减少手数），但避免拆掉炸弹
    const scored = hints.map(h => {
      const info = DoudizhuRule.judge(h);
      let s = 0;

      // 出牌后剩余手数（越少越好）
      const remaining = cards.filter(c => !h.includes(c));
      const afterTurns = HandEvaluator.estimateMinTurns(remaining, false);
      s += (minTurns - afterTurns) * 10;

      // 长牌型优先
      const longTypes = ['straight', 'double_straight', 'triple_straight',
        'plane_single', 'plane_pair', 'triple_single', 'triple_pair'];
      if (longTypes.includes(info.type) && h.length >= 5) s += 15;
      if (info.type === 'triple_single' || info.type === 'triple_pair') s += 5;

      // 不拆炸弹
      if (info.type === 'bomb' || info.type === 'rocket') s -= 25;

      // 出小牌（主牌值小的优先）
      s -= info.mainValue * 0.5;

      // 出单张/对子时优先小牌
      if (info.type === 'single' || info.type === 'pair') {
        s -= (20 - info.mainValue) * 0.3;
      }

      // 如果手牌少，倾向于出能尽快走完的牌
      if (cards.length <= 8) {
        s += h.length * 0.5;
      }

      return { cards: h, info, score: s };
    });

    scored.sort((a, b) => b.score - a.score);

    // 多样性：15%概率选择第二优解，避免AI太死板
    if (scored.length > 1 && Math.random() < 0.15) {
      return scored[1].cards;
    }
    return scored[0].cards;
  }

  /**
   * 跟牌策略
   */
  _followPlay(hand, lastPlay, context, isLandlord) {
    const cards = hand.cards;
    const lastInfo = lastPlay.info;
    const leader = lastPlay.player;

    const hints = DoudizhuRule.findHints(hand, lastPlay.cards);
    if (!hints || hints.length === 0) return null;

    // 残局搜索
    if (cards.length <= 6) {
      const winMove = this._findWinningMove(hand, lastPlay, context);
      if (winMove) return winMove;
    }

    // 判断上家身份
    const leaderIsLandlord = context.players[leader].role === 'landlord';
    const myRole = isLandlord ? 'landlord' : 'farmer';
    const isTeammate = !isLandlord && !leaderIsLandlord; // 两个农民是队友

    // 农民不压队友的牌（除非自己快走完或队友出的牌很小）
    if (isTeammate) {
      const teammateHandSize = this.counter.getRemainingCount(leader);
      // 队友手牌很少（可能要走完），不压
      if (teammateHandSize <= 5) return null;
      // 队友出的牌较大（A以上），不压
      if (lastInfo.mainValue >= 14) return null;
    }

    // 分离炸弹和非炸弹
    const nonBomb = [];
    const bombs = [];
    for (const h of hints) {
      const info = DoudizhuRule.judge(h);
      if (info.type === 'bomb' || info.type === 'rocket') {
        bombs.push({ cards: h, info });
      } else {
        nonBomb.push({ cards: h, info });
      }
    }

    // 判断是否需要用炸弹
    const shouldBomb = this._shouldUseBomb(hand, lastPlay, context, isLandlord);

    if (shouldBomb && bombs.length > 0) {
      // 用最小的炸弹
      bombs.sort((a, b) => a.info.mainValue - b.info.mainValue);
      return bombs[0].cards;
    }

    // 普通跟牌：选最小能压的非炸弹
    if (nonBomb.length > 0) {
      nonBomb.sort((a, b) => a.info.mainValue - b.info.mainValue);

      // 农民跟队友的牌：不压
      if (isTeammate) {
        return null;
      }

      const choice = nonBomb[0];
      const remaining = cards.filter(c => !choice.cards.includes(c));
      const afterTurns = HandEvaluator.estimateMinTurns(remaining, false);
      const eval_ = HandEvaluator.evaluateDoudizhu(cards);

      // 跟牌后手数大幅增加，考虑不跟
      if (afterTurns > eval_.minTurns + 2) {
        const nextIdx = (context.currentPlayer + 1) % 3;
        const nextCount = this.counter.getRemainingCount(nextIdx);
        // 下家还不危险，可以不跟
        if (nextCount > 5) return null;
      }

      // 农民策略：地主出小单张/小对子时，可以选择不跟，
      // 让地主继续获得出牌权出小牌（队友在后面可以压）
      if (!isLandlord && lastInfo.mainValue <= 10) {
        const nextIdx = (context.currentPlayer + 1) % 3;
        const nextIsTeammate = context.players[nextIdx].role !== 'landlord';
        // 如果下家是队友且队友牌还多，不跟小牌，让队友决定
        if (nextIsTeammate && cards.length > 8) {
          // 60%概率不跟小牌（保留实力，让队友处理）
          if (Math.random() < 0.6) return null;
        }
      }

      return choice.cards;
    }

    // 只有炸弹选项
    if (bombs.length > 0 && shouldBomb) {
      bombs.sort((a, b) => a.info.mainValue - b.info.mainValue);
      return bombs[0].cards;
    }

    return null; // 不出
  }

  /**
   * 判断是否应该用炸弹
   */
  _shouldUseBomb(hand, lastPlay, context, isLandlord) {
    const cards = hand.cards;
    const leader = lastPlay.player;

    // 下家手牌数（威胁程度）
    const nextIdx = (context.currentPlayer + 1) % 3;
    const nextCount = this.counter.getRemainingCount(nextIdx);
    const nextIsLandlord = context.players[nextIdx].role === 'landlord';

    // 对手手牌≤3张，必须炸（阻止对手走完）
    if (nextCount <= 3) {
      const opponentIsEnemy = isLandlord ? true : nextIsLandlord;
      if (opponentIsEnemy) return true;
    }

    // 对手手牌≤5张且自己手牌也不多，考虑炸
    if (nextCount <= 5) {
      const opponentIsEnemy = isLandlord ? true : nextIsLandlord;
      if (opponentIsEnemy && cards.length <= 10) return true;
    }

    // 地主：农民出大牌（2或王），考虑炸
    if (isLandlord && lastPlay.info.mainValue >= 15) {
      return cards.length <= 12;
    }

    // 自己手牌很少（≤4），有机会走完，炸
    if (cards.length <= 4) return true;

    // 记牌器判断：如果炸弹是场上最大的，可以在中后期使用
    const eval_ = HandEvaluator.evaluateDoudizhu(cards);
    if (eval_.analysis.bombs >= 2 && cards.length <= 10) {
      return true; // 有多个炸弹，可以用一个
    }

    return false;
  }

  /**
   * 残局搜索：寻找必胜出牌
   * 搜索深度限制为3层，评估"我出→对方反应→我再出"的路线
   */
  _findWinningMove(hand, lastPlay, context) {
    const cards = hand.cards;

    // 如果能一次出完，直接出
    const hints = DoudizhuRule.findHints(hand, lastPlay ? lastPlay.cards : null);
    if (!hints || hints.length === 0) return null;

    const allIn = hints.find(h => h.length === cards.length);
    if (allIn) return allIn;

    // 手牌≤4张时，搜索"出一手后剩余是否能在一轮内出完"
    if (cards.length <= 4) {
      for (const h of hints) {
        const info = DoudizhuRule.judge(h);
        if (info.type === 'bomb' || info.type === 'rocket') continue; // 残局不轻易炸

        const remaining = cards.filter(c => !h.includes(c));
        if (remaining.length === 0) return h;

        // 检查剩余牌是否能组成一手牌
        const tempHand = new Hand(remaining);
        const remHints = DoudizhuRule.findHints(tempHand, null);
        if (remHints && remHints.some(rh => rh.length === remaining.length)) {
          // 剩余牌能一手出完，出这手
          // 但需要确认对手大概率压不过（简化：如果出的牌够大）
          if (info.mainValue >= 12 || this._isLikelyUnbeatable(h, context)) {
            return h;
          }
        }
      }
    }

    // 手牌≤6张时，找最小的能压制的牌，保留大牌收尾
    if (cards.length <= 6 && lastPlay) {
      const nonBomb = hints.filter(h => {
        const t = DoudizhuRule.judge(h).type;
        return t !== 'bomb' && t !== 'rocket';
      });
      if (nonBomb.length > 0) {
        nonBomb.sort((a, b) => DoudizhuRule.judge(a).mainValue - DoudizhuRule.judge(b).mainValue);
        return nonBomb[0];
      }
    }

    return null;
  }

  /**
   * 判断一手牌是否很可能压不过（基于记牌器）
   */
  _isLikelyUnbeatable(cards, context) {
    const info = DoudizhuRule.judge(cards);
    if (info.type === 'rocket') return true;
    if (info.type === 'bomb') {
      return this.counter.isBombDominant(info.mainValue, { cards: context.hands[context.currentPlayer].cards }, false);
    }
    // 单张/对子：检查外面是否还有更大的牌
    if (info.type === 'single') {
      return this.counter.isControlling(info.mainValue, { cards: context.hands[context.currentPlayer].cards });
    }
    if (info.type === 'pair') {
      for (let v = info.mainValue + 1; v <= 15; v++) {
        if (this.counter.remaining(v) >= 2) return false;
      }
      return true;
    }
    return false;
  }
}

if (typeof window !== 'undefined') {
  window.DoudizhuAI = DoudizhuAI;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = DoudizhuAI;
}
