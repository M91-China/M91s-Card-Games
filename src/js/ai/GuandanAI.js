/**
 * @file GuandanAI.js
 * @description 高级掼蛋AI：基于记牌器、手牌评估和队友配合的出牌策略
 * @author HappyCard Team
 * @date 2026-08
 */

class GuandanAI {
  /**
   * @param {CardCounter} counter
   */
  constructor(counter) {
    this.counter = counter;
  }

  /**
   * 进贡选牌：进贡最大的非百搭、非王牌
   * @param {Hand} hand
   * @param {number} levelValue
   * @returns {Card}
   */
  chooseTributeCard(hand, levelValue) {
    const eligible = hand.cards.filter(c => {
      if (c.value >= 16) return false;
      if (GuandanRule.isWild(c, levelValue)) return false;
      return true;
    });
    eligible.sort((a, b) => GuandanRule.effValue(b, levelValue) - GuandanRule.effValue(a, levelValue));
    return eligible[0] || hand.cards[0];
  }

  /**
   * 还贡选牌：还一张10以下的牌
   * @param {Hand} hand
   * @param {number} levelValue
   * @returns {Card|null}
   */
  chooseReturnCard(hand, levelValue) {
    const eligible = hand.cards.filter(c => {
      if (c.value > 10) return false;
      if (c.value >= 16) return false;
      if (GuandanRule.isWild(c, levelValue)) return false;
      return true;
    });
    eligible.sort((a, b) => a.value - b.value);
    return eligible[0] || null;
  }

  /**
   * 出牌决策
   * @param {Hand} hand
   * @param {Object|null} lastPlay { cards, info, player }
   * @param {Object} context { currentPlayer, teamOf, hands, currentLevelValue, placements }
   * @returns {Card[]|null}
   */
  decidePlay(hand, lastPlay, context) {
    const idx = context.currentPlayer;
    const levelValue = context.currentLevelValue;
    const lastCards = (lastPlay && lastPlay.player !== idx) ? lastPlay.cards : null;
    const freeToPlay = !lastCards;

    if (freeToPlay) {
      return this._freePlay(hand, context, levelValue);
    } else {
      return this._followPlay(hand, lastPlay, context, levelValue);
    }
  }

  /**
   * 自由出牌策略
   */
  _freePlay(hand, context, levelValue) {
    const cards = hand.cards;
    const idx = context.currentPlayer;
    const myTeam = context.teamOf[idx];

    // 残局：手牌≤6张时搜索必胜路线
    if (cards.length <= 6) {
      const winMove = this._findWinningMove(hand, null, context, levelValue);
      if (winMove) return winMove;
    }

    const hints = GuandanRule.findHints(hand, null, levelValue);
    if (!hints || hints.length === 0) return null;

    // 能一次出完
    const allIn = hints.find(h => h.length === cards.length);
    if (allIn) return allIn;

    // 检查队友是否快走完（队友手牌≤4），如果是则出队友容易接的牌型
    const partnerIdx = context.teamOf.findIndex((t, i) => t === myTeam && i !== idx);
    const partnerCount = partnerIdx >= 0 ? this.counter.getRemainingCount(partnerIdx) : 27;

    if (partnerCount >= 0 && partnerCount <= 4 && partnerIdx !== idx) {
      // 队友快走完：出单张（让队友有机会用大牌接）或对子
      const feedChoice = this._chooseFeedCard(hints, partnerCount, levelValue);
      if (feedChoice) return feedChoice;
    }

    const eval_ = HandEvaluator.evaluateGuandan(cards, levelValue);
    const minTurns = eval_.minTurns;

    // 评分选择最优出牌
    const scored = hints.map(h => {
      const info = GuandanRule.judge(h, levelValue);
      let s = 0;

      // 出牌后剩余手数
      const remaining = cards.filter(c => !h.includes(c));
      const afterTurns = HandEvaluator.estimateMinTurns(remaining, true, levelValue);
      s += (minTurns - afterTurns) * 10;

      // 长牌型优先（减少手牌）
      const longTypes = ['straight', 'double_straight', 'triple_straight',
        'triple_pair', 'straight_flush'];
      if (longTypes.includes(info.type) && h.length >= 5) s += 12;

      // 不轻易用炸弹/同花顺/天王炸
      if (info.type === 'bomb') s -= 20;
      if (info.type === 'straight_flush') s -= 25;
      if (info.type === 'sky_bomb') s -= 30;

      // 出小牌
      s -= info.mainValue * 0.4;

      // 单张/对子优先出小牌
      if (info.type === 'single') s -= (16 - info.mainValue) * 0.5;
      if (info.type === 'pair') s -= (16 - info.mainValue) * 0.3;

      // 手牌少时倾向多出
      if (cards.length <= 8) s += h.length * 0.4;

      // 队友快走完时，出小牌喂牌
      if (partnerCount <= 6 && info.mainValue <= 10) s += 5;

      return { cards: h, info, score: s };
    });

    scored.sort((a, b) => b.score - a.score);

    // 10%概率选第二优解
    if (scored.length > 1 && Math.random() < 0.1) {
      return scored[1].cards;
    }
    return scored[0].cards;
  }

  /**
   * 选择喂牌（队友快走完时出容易接的牌）
   */
  _chooseFeedCard(hints, partnerCount, levelValue) {
    // 队友牌很少，出最小单张
    const singles = hints.filter(h => h.length === 1);
    if (singles.length > 0) {
      singles.sort((a, b) => a[0].value - b[0].value);
      return singles[0];
    }
    // 出最小对子
    const pairs = hints.filter(h => {
      const info = GuandanRule.judge(h, levelValue);
      return info.type === 'pair';
    });
    if (pairs.length > 0) {
      pairs.sort((a, b) => GuandanRule.judge(a, levelValue).mainValue - GuandanRule.judge(b, levelValue).mainValue);
      return pairs[0];
    }
    return null;
  }

  /**
   * 跟牌策略
   */
  _followPlay(hand, lastPlay, context, levelValue) {
    const cards = hand.cards;
    const idx = context.currentPlayer;
    const myTeam = context.teamOf[idx];
    const leader = lastPlay.player;
    const leaderTeam = context.teamOf[leader];
    const lastInfo = lastPlay.info;

    const hints = GuandanRule.findHints(hand, lastPlay.cards, levelValue);
    if (!hints || hints.length === 0) return null;

    // 残局搜索
    if (cards.length <= 6) {
      const winMove = this._findWinningMove(hand, lastPlay, context, levelValue);
      if (winMove) return winMove;
    }

    const isTeammate = myTeam === leaderTeam;

    // 队友领出：不压（除非自己快走完或队友牌很小需要帮忙）
    if (isTeammate) {
      // 自己手牌≤3张且能出完，压
      if (cards.length <= 3) {
        const allIn = hints.find(h => h.length === cards.length);
        if (allIn) return allIn;
      }
      // 队友出的牌很小（≤8），而自己有大牌可以接手控制局面，可以压
      if (lastInfo.mainValue <= 8 && cards.length <= 8) {
        const nonBomb = this._filterNonBomb(hints, levelValue);
        if (nonBomb.length > 0) {
          // 但只有当自己手牌结构好（手数少）时才接
          const eval_ = HandEvaluator.evaluateGuandan(cards, levelValue);
          if (eval_.minTurns <= 4) return nonBomb[0];
        }
      }
      return null; // 不压队友
    }

    // 对手领出：需要跟牌或炸弹
    const nonBomb = this._filterNonBomb(hints, levelValue);
    const bombs = this._filterBombs(hints, levelValue);

    // 判断是否需要用炸弹
    const shouldBomb = this._shouldUseBomb(hand, lastPlay, context, levelValue);

    if (shouldBomb && bombs.length > 0) {
      bombs.sort((a, b) => this._bombWeight(a, levelValue) - this._bombWeight(b, levelValue));
      return bombs[0];
    }

    // 普通跟牌：选最小能压的非炸弹
    if (nonBomb.length > 0) {
      nonBomb.sort((a, b) => {
        const ia = GuandanRule.judge(a, levelValue);
        const ib = GuandanRule.judge(b, levelValue);
        return ia.mainValue - ib.mainValue;
      });

      // 评估是否值得跟牌
      const choice = nonBomb[0];
      const remaining = cards.filter(c => !choice.includes(c));
      const afterTurns = HandEvaluator.estimateMinTurns(remaining, true, levelValue);
      const eval_ = HandEvaluator.evaluateGuandan(cards, levelValue);

      // 如果跟牌后手数增加太多，考虑不跟（除非对手危险）
      if (afterTurns > eval_.minTurns + 2) {
        // 检查下家对手是否危险
        const nextIdx = (idx + 1) % 4;
        const nextCount = this.counter.getRemainingCount(nextIdx);
        const nextIsEnemy = context.teamOf[nextIdx] !== myTeam;
        if (!nextIsEnemy || nextCount > 6) {
          // 下家是队友或不危险，选择不跟
          // 但如果是末家（队友已出完），必须尽量跟
          const activePlayers = 4 - context.placements.length;
          if (activePlayers > 2) return null;
        }
      }

      return choice;
    }

    // 只有炸弹
    if (bombs.length > 0 && shouldBomb) {
      bombs.sort((a, b) => this._bombWeight(a, levelValue) - this._bombWeight(b, levelValue));
      return bombs[0];
    }

    return null;
  }

  /**
   * 判断是否应该用炸弹
   */
  _shouldUseBomb(hand, lastPlay, context, levelValue) {
    const cards = hand.cards;
    const idx = context.currentPlayer;
    const myTeam = context.teamOf[idx];
    const leader = lastPlay.player;

    // 下家对手手牌数
    const nextIdx = (idx + 1) % 4;
    const nextCount = this.counter.getRemainingCount(nextIdx);
    const nextIsEnemy = context.teamOf[nextIdx] !== myTeam;

    // 对手手牌≤3张，必须炸
    if (nextIsEnemy && nextCount <= 3) return true;

    // 对手手牌≤5张且自己手牌不多，炸
    if (nextIsEnemy && nextCount <= 5 && cards.length <= 12) return true;

    // 对手领出大牌（A以上），考虑炸
    if (lastPlay.info.mainValue >= 15 && cards.length <= 14) {
      // 但如果炸弹不多，留着
      const eval_ = HandEvaluator.evaluateGuandan(cards, levelValue);
      if (eval_.analysis.bombs >= 1) return true;
    }

    // 自己手牌很少（≤4），有机会走完，炸
    if (cards.length <= 4) return true;

    // 有多个炸弹，可以用一个
    const eval_ = HandEvaluator.evaluateGuandan(cards, levelValue);
    if (eval_.analysis.bombs + eval_.analysis.straightFlush >= 2 && cards.length <= 10) {
      return true;
    }

    // 对方已有人出完（头游是对方），需要阻止对方拿二游
    if (context.placements.length > 0) {
      const firstPlayer = context.placements[0];
      if (context.teamOf[firstPlayer] !== myTeam) {
        // 对方已拿头游，尽量阻止二游
        const remainingOpponents = [];
        for (let i = 0; i < 4; i++) {
          if (!context.placements.includes(i) && context.teamOf[i] !== myTeam && i !== idx) {
            remainingOpponents.push(i);
          }
        }
        if (remainingOpponents.some(i => this.counter.getRemainingCount(i) <= 6)) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * 残局搜索：寻找必胜出牌
   */
  _findWinningMove(hand, lastPlay, context, levelValue) {
    const cards = hand.cards;
    const hints = GuandanRule.findHints(hand, lastPlay ? lastPlay.cards : null, levelValue);
    if (!hints || hints.length === 0) return null;

    // 能一次出完
    const allIn = hints.find(h => h.length === cards.length);
    if (allIn) return allIn;

    // 手牌≤5张：搜索"出一手后剩余能一手出完"
    if (cards.length <= 5) {
      for (const h of hints) {
        const info = GuandanRule.judge(h, levelValue);
        if (this._isBombType(info.type)) continue;

        const remaining = cards.filter(c => !h.includes(c));
        if (remaining.length === 0) return h;

        const tempHand = new Hand(remaining);
        const remHints = GuandanRule.findHints(tempHand, null, levelValue);
        if (remHints && remHints.some(rh => rh.length === remaining.length)) {
          // 剩余能一手出完，检查当前出的牌是否可能大
          if (info.mainValue >= 12 || this._isLikelyUnbeatable(h, context, levelValue)) {
            return h;
          }
        }
      }
    }

    // 队友快走完时，如果自己有炸弹且对手在压制，用炸弹夺回出牌权给队友
    if (cards.length <= 6 && lastPlay) {
      const idx = context.currentPlayer;
      const myTeam = context.teamOf[idx];
      const partnerIdx = context.teamOf.findIndex((t, i) => t === myTeam && i !== idx);
      if (partnerIdx >= 0) {
        const partnerCount = this.counter.getRemainingCount(partnerIdx);
        if (partnerCount <= 3) {
          // 队友差一手，用炸弹夺回出牌权
          const bombs = this._filterBombs(hints, levelValue);
          if (bombs.length > 0) {
            bombs.sort((a, b) => this._bombWeight(a, levelValue) - this._bombWeight(b, levelValue));
            return bombs[0];
          }
        }
      }
    }

    return null;
  }

  /**
   * 判断一手牌是否很可能压不过
   */
  _isLikelyUnbeatable(cards, context, levelValue) {
    const info = GuandanRule.judge(cards, levelValue);
    const idx = context.currentPlayer;
    if (info.type === 'sky_bomb') return true;
    if (info.type === 'straight_flush') {
      // 同花顺需要更大的同花顺或天王炸才能压
      return !this.counter.remaining(16) >= 2; // 简化
    }
    if (info.type === 'bomb') {
      return this.counter.isBombDominant(info.mainValue,
        { cards: context.hands[idx].cards }, true);
    }
    if (info.type === 'single') {
      return this.counter.isControlling(info.mainValue,
        { cards: context.hands[idx].cards });
    }
    return false;
  }

  _filterNonBomb(hints, levelValue) {
    return hints.filter(h => !this._isBombType(GuandanRule.judge(h, levelValue).type));
  }

  _filterBombs(hints, levelValue) {
    return hints.filter(h => this._isBombType(GuandanRule.judge(h, levelValue).type));
  }

  _isBombType(type) {
    return type === 'bomb' || type === 'straight_flush' || type === 'sky_bomb';
  }

  _bombWeight(cards, levelValue) {
    const info = GuandanRule.judge(cards, levelValue);
    return info.bombWeight || info.mainValue;
  }
}

if (typeof window !== 'undefined') {
  window.GuandanAI = GuandanAI;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = GuandanAI;
}
