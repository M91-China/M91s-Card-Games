/**
 * @file achievements.js
 * @description 成就定义与解锁条件
 * @author HappyCard Team
 * @date 2026-08
 */

/**
 * 成就分类
 */
const AchievementCategory = {
  DOUDIZHU: 'doudizhu',
  GUANDAN: 'guandan',
  GENERAL: 'general'
};

/**
 * 成就列表
 *
 * 统计数据结构（stats）：
 * {
 *   doudizhu: {
 *     wins, losses, score, totalGames,
 *     landlordWins, landlordLosses, farmerWins, farmerLosses,
 *     bombs, rockets, maxMultiplier, currentStreak, maxStreak,
 *     history: []
 *   },
 *   guandan: {
 *     wins, losses, score, totalGames,
 *     bombs, straightFlushes, skyBombs, maxLevel,
 *     currentStreak, maxStreak, history: []
 *   }
 * }
 */
const ACHIEVEMENTS = [
  /* ---------------- 通用成就 ---------------- */
  {
    id: 'first_game',
    name: '初出茅庐',
    desc: '完成第一局游戏',
    icon: '🎮',
    category: AchievementCategory.GENERAL,
    condition: (s) => (s.doudizhu.totalGames || 0) + (s.guandan.totalGames || 0) >= 1
  },
  {
    id: 'first_win',
    name: '旗开得胜',
    desc: '赢得第一局游戏',
    icon: '🏆',
    category: AchievementCategory.GENERAL,
    condition: (s) => (s.doudizhu.wins || 0) + (s.guandan.wins || 0) >= 1
  },
  {
    id: 'all_rounder',
    name: '全能选手',
    desc: '斗地主和掼蛋各完成一局',
    icon: '🌟',
    category: AchievementCategory.GENERAL,
    condition: (s) => (s.doudizhu.totalGames || 0) >= 1 && (s.guandan.totalGames || 0) >= 1
  },
  {
    id: 'streak_3',
    name: '连胜达人',
    desc: '任意模式连胜3局',
    icon: '🔥',
    category: AchievementCategory.GENERAL,
    condition: (s) =>
      (s.doudizhu.maxStreak || 0) >= 3 || (s.guandan.maxStreak || 0) >= 3
  },
  {
    id: 'veteran_50',
    name: '百战老兵',
    desc: '累计完成50局游戏',
    icon: '🎖️',
    category: AchievementCategory.GENERAL,
    condition: (s) =>
      (s.doudizhu.totalGames || 0) + (s.guandan.totalGames || 0) >= 50
  },
  {
    id: 'score_5000',
    name: '大赢家',
    desc: '累计积分达到5000',
    icon: '💰',
    category: AchievementCategory.GENERAL,
    condition: (s) => (s.doudizhu.score || 0) + (s.guandan.score || 0) >= 5000
  },

  /* ---------------- 斗地主成就 ---------------- */
  {
    id: 'ddz_first',
    name: '斗地主新手',
    desc: '完成第一局斗地主',
    icon: '🃏',
    category: AchievementCategory.DOUDIZHU,
    condition: (s) => (s.doudizhu.totalGames || 0) >= 1
  },
  {
    id: 'ddz_first_win',
    name: '斗地主首胜',
    desc: '赢得第一局斗地主',
    icon: '🥇',
    category: AchievementCategory.DOUDIZHU,
    condition: (s) => (s.doudizhu.wins || 0) >= 1
  },
  {
    id: 'ddz_bomb',
    name: '炸弹专家',
    desc: '在斗地主中累计打出10次炸弹',
    icon: '💣',
    category: AchievementCategory.DOUDIZHU,
    condition: (s) => (s.doudizhu.bombs || 0) >= 10
  },
  {
    id: 'ddz_rocket',
    name: '王炸降临',
    desc: '在斗地主中打出王炸',
    icon: '👑',
    category: AchievementCategory.DOUDIZHU,
    condition: (s) => (s.doudizhu.rockets || 0) >= 1
  },
  {
    id: 'ddz_landlord_king',
    name: '地主之王',
    desc: '作为地主获胜5次',
    icon: '🤴',
    category: AchievementCategory.DOUDIZHU,
    condition: (s) => (s.doudizhu.landlordWins || 0) >= 5
  },
  {
    id: 'ddz_farmer_hero',
    name: '农民领袖',
    desc: '作为农民获胜10次',
    icon: '🌾',
    category: AchievementCategory.DOUDIZHU,
    condition: (s) => (s.doudizhu.farmerWins || 0) >= 10
  },
  {
    id: 'ddz_high_multi',
    name: '高倍赢家',
    desc: '以5倍及以上倍数获胜',
    icon: '💎',
    category: AchievementCategory.DOUDIZHU,
    condition: (s) => (s.doudizhu.maxMultiplier || 0) >= 5
  },
  {
    id: 'ddz_20_wins',
    name: '斗地主老手',
    desc: '累计赢得20局斗地主',
    icon: '🎯',
    category: AchievementCategory.DOUDIZHU,
    condition: (s) => (s.doudizhu.wins || 0) >= 20
  },

  /* ---------------- 掼蛋成就 ---------------- */
  {
    id: 'gd_first',
    name: '掼蛋新手',
    desc: '完成第一局掼蛋',
    icon: '🎴',
    category: AchievementCategory.GUANDAN,
    condition: (s) => (s.guandan.totalGames || 0) >= 1
  },
  {
    id: 'gd_first_win',
    name: '掼蛋首胜',
    desc: '赢得第一局掼蛋',
    icon: '🥈',
    category: AchievementCategory.GUANDAN,
    condition: (s) => (s.guandan.wins || 0) >= 1
  },
  {
    id: 'gd_straight_flush',
    name: '同花顺',
    desc: '在掼蛋中打出同花顺',
    icon: '🃏',
    category: AchievementCategory.GUANDAN,
    condition: (s) => (s.guandan.straightFlushes || 0) >= 1
  },
  {
    id: 'gd_sky_bomb',
    name: '天王炸',
    desc: '在掼蛋中打出天王炸',
    icon: '☄️',
    category: AchievementCategory.GUANDAN,
    condition: (s) => (s.guandan.skyBombs || 0) >= 1
  },
  {
    id: 'gd_bomb_master',
    name: '炸弹大师',
    desc: '在掼蛋中累计打出15次炸弹',
    icon: '🧨',
    category: AchievementCategory.GUANDAN,
    condition: (s) => (s.guandan.bombs || 0) >= 15
  },
  {
    id: 'gd_level_10',
    name: '步步高升',
    desc: '掼蛋等级升到J（11）以上',
    icon: '📈',
    category: AchievementCategory.GUANDAN,
    condition: (s) => (s.guandan.maxLevel || 2) >= 11
  },
  {
    id: 'gd_10_wins',
    name: '掼蛋老手',
    desc: '累计赢得10局掼蛋',
    icon: '🏅',
    category: AchievementCategory.GUANDAN,
    condition: (s) => (s.guandan.wins || 0) >= 10
  }
];

const CATEGORY_NAMES = {
  [AchievementCategory.GENERAL]: '综合',
  [AchievementCategory.DOUDIZHU]: '斗地主',
  [AchievementCategory.GUANDAN]: '掼蛋'
};

if (typeof window !== 'undefined') {
  window.AchievementCategory = AchievementCategory;
  window.ACHIEVEMENTS = ACHIEVEMENTS;
  window.CATEGORY_NAMES = CATEGORY_NAMES;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { AchievementCategory, ACHIEVEMENTS, CATEGORY_NAMES };
}
