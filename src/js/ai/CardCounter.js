/**
 * @file CardCounter.js
 * @description 记牌器：跟踪已出牌，推算剩余牌分布，判断牌张控制力
 * @author HappyCard Team
 * @date 2026-08
 */

class CardCounter {
  /**
   * @param {number} deckCount 副牌数（斗地主1=54张，掼蛋2=108张）
   * @param {number} playerCount 玩家数
   */
  constructor(deckCount = 1, playerCount = 3) {
    this.deckCount = deckCount;
    this.playerCount = playerCount;
    this.reset();
  }

  reset() {
    // 每个点数的总张数：3-15普通牌每副4张，16小王1张/副，17大王1张/副
    this.totalByRank = new Map();
    for (let v = 3; v <= 15; v++) this.totalByRank.set(v, 4 * this.deckCount);
    this.totalByRank.set(16, this.deckCount); // 小王
    this.totalByRank.set(17, this.deckCount); // 大王

    // 已出牌张数（按点数）
    this.playedByRank = new Map();
    for (let v = 3; v <= 17; v++) this.playedByRank.set(v, 0);

    // 每个玩家已出的牌（用于高级分析）
    this.playedByPlayer = new Map();
    for (let i = 0; i < this.playerCount; i++) this.playedByPlayer.set(i, []);

    // 玩家剩余手牌数
    this.playerRemaining = new Map();
    for (let i = 0; i < this.playerCount; i++) this.playerRemaining.set(i, 0);

    // 连续不出计数
    this.passCount = 0;
    // 已出炸弹数
    this.bombsPlayed = 0;
    // 已出同花顺/天王炸（掼蛋）
    this.specialPlayed = 0;
  }

  /**
   * 设置初始手牌数
   * @param {number} playerIdx
   * @param {number} count
   */
  setInitialCount(playerIdx, count) {
    this.playerRemaining.set(playerIdx, count);
  }

  /**
   * 记录一次出牌
   * @param {number} playerIdx
   * @param {Card[]} cards
   * @param {Object} [info] judge 返回的牌型信息
   */
  observePlay(playerIdx, cards, info) {
    for (const c of cards) {
      const v = c.value;
      if (this.playedByRank.has(v)) {
        this.playedByRank.set(v, this.playedByRank.get(v) + 1);
      }
    }
    this.playedByPlayer.get(playerIdx).push(...cards);
    this.playerRemaining.set(playerIdx, this.playerRemaining.get(playerIdx) - cards.length);

    if (info) {
      if (info.type === 'bomb') this.bombsPlayed++;
      if (info.type === 'straight_flush' || info.type === 'sky_bomb') this.specialPlayed++;
    }
    this.passCount = 0;
  }

  /**
   * 记录一次不出
   * @param {number} playerIdx
   */
  observePass(playerIdx) {
    this.passCount++;
  }

  /**
   * 获取某点数剩余张数
   * @param {number} rank
   * @returns {number}
   */
  remaining(rank) {
    const total = this.totalByRank.get(rank) || 0;
    const played = this.playedByRank.get(rank) || 0;
    return Math.max(0, total - played);
  }

  /**
   * 获取某点数在其他玩家手中的剩余张数（减去自己手牌中的数量）
   * @param {number} rank
   * @param {Hand|Card[]} myHand
   * @returns {number}
   */
  remainingOutside(rank, myHand) {
    const myCards = myHand.cards || myHand;
    let myCount = 0;
    for (const c of myCards) {
      if (c.value === rank) myCount++;
    }
    return this.remaining(rank) - myCount;
  }

  /**
   * 判断某张牌（按有效点数）是否为当前场上该牌型的最大牌
   * 即：所有比它大的牌都已出完（针对单张/对子等简单牌型）
   * @param {number} rank 牌的有效点数
   * @param {Hand|Card[]} myHand
   * @param {number} [needCount=1] 需要该点数有多少张才可控
   * @returns {boolean}
   */
  isControlling(rank, myHand, needCount = 1) {
    if (rank >= 17) return true; // 大王是单张最大
    // 检查比rank大的所有点数是否都已出完（在外无剩余）
    for (let v = rank + 1; v <= 17; v++) {
      if (this.remainingOutside(v, myHand) > 0) return false;
    }
    // 该点数在自己手中至少有 needCount 张
    const myCards = myHand.cards || myHand;
    let myCount = 0;
    for (const c of myCards) {
      if (c.value === rank) myCount++;
    }
    return myCount >= needCount;
  }

  /**
   * 判断自己手牌中的炸弹是否可能是最大炸弹
   * @param {number} bombRank 炸弹点数
   * @param {Hand|Card[]} myHand
   * @param {boolean} [isGuandan=false]
   * @returns {boolean}
   */
  isBombDominant(bombRank, myHand, isGuandan = false) {
    if (!isGuandan) {
      // 斗地主：比该点数大的4张炸都已出完，且王炸已出或不存在
      for (let v = bombRank + 1; v <= 15; v++) {
        if (this.remainingOutside(v, myHand) >= 4) return false;
      }
      // 王炸是否还在外面
      if (this.remainingOutside(16, myHand) >= 1 && this.remainingOutside(17, myHand) >= 1) return false;
      return true;
    }
    // 掼蛋：更大的同张数炸弹、同花顺、天王炸
    for (let v = bombRank + 1; v <= 15; v++) {
      if (this.remainingOutside(v, myHand) >= 4) return false;
    }
    // 天王炸（双王4张）
    if (this.deckCount >= 2) {
      if (this.remainingOutside(16, myHand) >= 2 && this.remainingOutside(17, myHand) >= 2) return false;
    }
    return true;
  }

  /**
   * 获取某玩家剩余手牌数
   * @param {number} playerIdx
   * @returns {number}
   */
  getRemainingCount(playerIdx) {
    return this.playerRemaining.get(playerIdx) || 0;
  }

  /**
   * 获取所有玩家剩余手牌数
   * @returns {Map<number, number>}
   */
  getAllRemaining() {
    return new Map(this.playerRemaining);
  }

  /**
   * 获取剩余牌总数
   * @returns {number}
   */
  totalRemaining() {
    let sum = 0;
    for (const v of this.playerRemaining.values()) sum += v;
    return sum;
  }

  /**
   * 获取剩余牌的点数分布摘要
   * @returns {Object} rank -> count
   */
  getRemainingDistribution() {
    const dist = {};
    for (const [rank, total] of this.totalByRank) {
      const played = this.playedByRank.get(rank) || 0;
      const rem = total - played;
      if (rem > 0) dist[rank] = rem;
    }
    return dist;
  }

  /**
   * 估计外面还有多少炸弹（不含自己手中的）
   * @param {Hand|Card[]} myHand
   * @param {boolean} [isGuandan=false]
   * @returns {number}
   */
  estimateBombsOutside(myHand, isGuandan = false) {
    let count = 0;
    const myCards = myHand.cards || myHand;
    const myRankCount = new Map();
    for (const c of myCards) {
      myRankCount.set(c.value, (myRankCount.get(c.value) || 0) + 1);
    }
    for (let v = 3; v <= 15; v++) {
      const outside = this.remaining(v) - (myRankCount.get(v) || 0);
      if (outside >= 4) count += Math.floor(outside / 4);
    }
    if (!isGuandan) {
      if (this.remaining(16) - (myRankCount.get(16) || 0) >= 1 &&
          this.remaining(17) - (myRankCount.get(17) || 0) >= 1) {
        count++;
      }
    } else if (this.deckCount >= 2) {
      if (this.remaining(16) - (myRankCount.get(16) || 0) >= 2 &&
          this.remaining(17) - (myRankCount.get(17) || 0) >= 2) {
        count++;
      }
    }
    return count;
  }

  /**
   * 获取出牌统计摘要（用于AI决策）
   * @param {Hand|Card[]} myHand
   * @param {boolean} [isGuandan=false]
   * @returns {Object}
   */
  getSummary(myHand, isGuandan = false) {
    const myCards = myHand.cards || myHand;
    const myRankCount = new Map();
    for (const c of myCards) {
      myRankCount.set(c.value, (myRankCount.get(c.value) || 0) + 1);
    }

    // 我手中的大牌（A以上）
    let myBigCards = 0;
    for (const c of myCards) {
      if (c.value >= 14) myBigCards++;
    }

    // 外面剩余的大牌
    let outsideBigCards = 0;
    for (let v = 14; v <= 17; v++) {
      outsideBigCards += this.remaining(v) - (myRankCount.get(v) || 0);
    }

    return {
      bombsPlayed: this.bombsPlayed,
      bombsOutside: this.estimateBombsOutside(myHand, isGuandan),
      myBigCards,
      outsideBigCards,
      totalRemaining: this.totalRemaining(),
      passCount: this.passCount,
      distribution: this.getRemainingDistribution()
    };
  }
}

if (typeof window !== 'undefined') {
  window.CardCounter = CardCounter;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = CardCounter;
}
