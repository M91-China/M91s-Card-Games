/**
 * @file constants.js
 * @description 游戏全局常量定义
 * @author HappyCard Team
 * @date 2026-08
 */

/**
 * 花色枚举
 */
const Suit = {
  SPADE: 'spade',
  HEART: 'heart',
  DIAMOND: 'diamond',
  CLUB: 'club',
  JOKER: 'joker'
};

/**
 * 花色符号
 */
const SUIT_SYMBOL = {
  spade: '♠',
  heart: '♥',
  diamond: '♦',
  club: '♣',
  joker: ''
};

/**
 * 花色显示名
 */
const SUIT_NAME = {
  spade: '黑桃',
  heart: '红桃',
  diamond: '方块',
  club: '梅花',
  joker: '王牌'
};

/**
 * 牌型枚举（斗地主 + 掼蛋扩展）
 */
const CardType = {
  INVALID: 'invalid',
  SINGLE: 'single',
  PAIR: 'pair',
  TRIPLE: 'triple',
  TRIPLE_SINGLE: 'triple_single',
  TRIPLE_PAIR: 'triple_pair',
  STRAIGHT: 'straight',
  DOUBLE_STRAIGHT: 'double_straight',
  TRIPLE_STRAIGHT: 'triple_straight',
  PLANE_SINGLE: 'plane_single',
  PLANE_PAIR: 'plane_pair',
  FOUR_TWO_SINGLE: 'four_two_single',
  FOUR_TWO_PAIR: 'four_two_pair',
  BOMB: 'bomb',
  ROCKET: 'rocket',
  STRAIGHT_FLUSH: 'straight_flush',
  SKY_BOMB: 'sky_bomb'
};

/**
 * 牌型中文名
 */
const CARD_TYPE_NAME = {
  invalid: '无效',
  single: '单张',
  pair: '对子',
  triple: '三张',
  triple_single: '三带一',
  triple_pair: '三带二',
  straight: '顺子',
  double_straight: '连对',
  triple_straight: '飞机',
  plane_single: '飞机带单',
  plane_pair: '飞机带对',
  four_two_single: '四带二',
  four_two_pair: '四带两对',
  bomb: '炸弹',
  rocket: '王炸',
  straight_flush: '同花顺',
  sky_bomb: '天王炸'
};

/**
 * 玩家位置
 */
const Seat = {
  BOTTOM: 0,
  LEFT: 1,
  RIGHT: 2,
  TOP: 3
};

/**
 * 游戏类型
 */
const GameType = {
  DOUDIZHU: 'doudizhu',
  GUANDAN: 'guandan'
};

/**
 * 游戏状态
 */
const GameState = {
  IDLE: 'idle',
  DEALING: 'dealing',
  BIDDING: 'bidding',
  ROBBING: 'robbing',
  DOUBLING: 'doubling',
  PLAYING: 'playing',
  SETTLING: 'settling',
  FINISHED: 'finished'
};

/**
 * 难度等级
 */
const Difficulty = {
  EASY: 'easy',
  NORMAL: 'normal',
  HARD: 'hard',
  HELL: 'hell'
};

/**
 * 难度配置
 */
const DIFFICULTY_CONFIG = {
  easy: {
    name: '简单',
    cardCounting: false,
    cooperation: false,
    minimaxDepth: 0,
    optimalRate: 0.4,
    mistakeRate: 0.3
  },
  normal: {
    name: '普通',
    cardCounting: 'big',
    cooperation: 'basic',
    minimaxDepth: 2,
    optimalRate: 0.65,
    mistakeRate: 0.15
  },
  hard: {
    name: '困难',
    cardCounting: 'full',
    cooperation: 'full',
    minimaxDepth: 4,
    optimalRate: 0.85,
    mistakeRate: 0.05
  },
  hell: {
    name: '地狱',
    cardCounting: 'perfect',
    cooperation: 'deep',
    minimaxDepth: 6,
    optimalRate: 0.95,
    mistakeRate: 0.02
  }
};

/**
 * 斗地主牌值映射
 * 3=3, 4=4, ..., 10=10, J=11, Q=12, K=13, A=14, 2=15, 小王=16, 大王=17
 */
const VALUE_MAP = {
  '3': 3,
  '4': 4,
  '5': 5,
  '6': 6,
  '7': 7,
  '8': 8,
  '9': 9,
  '10': 10,
  J: 11,
  Q: 12,
  K: 13,
  A: 14,
  '2': 15,
  SMALL_JOKER: 16,
  BIG_JOKER: 17
};

/**
 * 牌值显示
 */
const RANK_DISPLAY = {
  3: '3',
  4: '4',
  5: '5',
  6: '6',
  7: '7',
  8: '8',
  9: '9',
  10: '10',
  11: 'J',
  12: 'Q',
  13: 'K',
  14: 'A',
  15: '2',
  16: '小',
  17: '大'
};

/**
 * 事件名称
 */
const Events = {
  CARD_SELECTED: 'card:selected',
  CARD_UNSELECTED: 'card:unselected',
  HAND_CHANGED: 'hand:changed',
  DEAL_START: 'deal:start',
  DEAL_CARD: 'deal:card',
  DEAL_DONE: 'deal:done',
  PLAY_CARD: 'play:card',
  PASS_TURN: 'play:pass',
  BID_SCORE: 'bid:score',
  LANDLORD_CONFIRMED: 'landlord:confirmed',
  GAME_OVER: 'game:over',
  GAME_RESTART: 'game:restart',
  AI_THINKING: 'ai:thinking',
  AI_PLAY: 'ai:play',
  TURN_CHANGE: 'turn:change',
  SHOW_TOAST: 'ui:toast',
  BOMB: 'effect:bomb',
  ROCKET: 'effect:rocket'
};

/**
 * 本地存储键
 */
const StorageKeys = {
  PLAYER_INFO: 'happycard_player_info',
  STATISTICS: 'happycard_statistics',
  SETTINGS: 'happycard_settings',
  HISTORY: 'happycard_history',
  ACHIEVEMENTS: 'happycard_achievements'
};

if (typeof window !== 'undefined') {
  window.Constants = {
    Suit,
    SUIT_SYMBOL,
    SUIT_NAME,
    CardType,
    CARD_TYPE_NAME,
    Seat,
    GameType,
    GameState,
    Difficulty,
    DIFFICULTY_CONFIG,
    VALUE_MAP,
    RANK_DISPLAY,
    Events,
    StorageKeys
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    Suit,
    SUIT_SYMBOL,
    SUIT_NAME,
    CardType,
    CARD_TYPE_NAME,
    Seat,
    GameType,
    GameState,
    Difficulty,
    DIFFICULTY_CONFIG,
    VALUE_MAP,
    RANK_DISPLAY,
    Events,
    StorageKeys
  };
}
