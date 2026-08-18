/**
 * @file config.js
 * @description 游戏配置（难度参数、动画时长、AI参数）
 * @author HappyCard Team
 * @date 2026-08
 */

const Config = {
  version: '0.1.0',

  animation: {
    dealInterval: 30,
    dealDuration: 1500,
    cardFly: 200,
    collect: 250,
    boom: 600,
    rocket: 800,
    aiThinkMin: 600,
    aiThinkMax: 1400
  },

  sound: {
    defaultVolume: 0.6,
    enabled: true
  },

  doudizhu: {
    playerCount: 3,
    handCards: 17,
    bottomCards: 3,
    totalCards: 54,
    bidTime: 30,
    playTime: 30,
    baseScore: 1,
    maxBomb: 8,
    springBonus: true
  },

  guandan: {
    playerCount: 4,
    handCards: 27,
    deckCount: 2,
    totalCards: 108,
    playTime: 30,
    startLevel: 2,
    maxLevel: 14
  },

  ai: {
    handEval: {
      bigCardWeight: {
        17: 10,
        16: 8,
        15: 4,
        14: 2
      },
      bombScore: 15,
      rocketScore: 30,
      straightBonus: 3,
      doubleStraightBonus: 4,
      planeBonus: 5,
      loosePenalty: -1,
      gapPenalty: -2,
      singleControlBonus: 2
    },
    bid: {
      call3: 75,
      call2: 60,
      call1: 45,
      lastPositionCall1: 30
    },
    endgame: {
      threshold: 8,
      maxDepth: 6,
      timeLimit: 2000
    }
  },

  ui: {
    cardOverlap: 24,
    selectedOffset: 15,
    hoverPreview: true,
    showCardShadow: true
  }
};

if (typeof window !== 'undefined') {
  window.Config = Config;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = Config;
}
