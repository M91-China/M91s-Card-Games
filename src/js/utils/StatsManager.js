/**
 * @file StatsManager.js
 * @description 统计数据管理与成就检测
 * @author HappyCard Team
 * @date 2026-08
 */

class StatsManager {
  constructor(storageInstance) {
    this.storage = storageInstance || (typeof window !== 'undefined' ? window.storage : null);
    this.userManager = (typeof window !== 'undefined' ? window.userManager : null);
    this.STATS_KEY = 'stats';
    this.ACH_KEY = 'achievements';
  }

  _getCurrentUserStats() {
    const user = this.userManager && this.userManager.getCurrentUser ? this.userManager.getCurrentUser() : null;
    if (!user || !user.stats) return null;
    return user.stats;
  }

  /**
   * 单个游戏的默认统计结构
   */
  _defaultGameStats() {
    return {
      wins: 0,
      losses: 0,
      score: 0,
      totalGames: 0,
      landlordWins: 0,
      landlordLosses: 0,
      farmerWins: 0,
      farmerLosses: 0,
      bombs: 0,
      rockets: 0,
      straightFlushes: 0,
      skyBombs: 0,
      maxMultiplier: 0,
      maxLevel: 2,
      currentStreak: 0,
      maxStreak: 0,
      history: []
    };
  }

  /**
   * 读取并补齐统计结构（兼容旧数据）
   */
  getStats() {
    const currentUserStats = this._getCurrentUserStats();
    if (currentUserStats) {
      return currentUserStats;
    }

    const defaults = {
      doudizhu: this._defaultGameStats(),
      guandan: this._defaultGameStats()
    };
    let stats = null;
    try {
      stats = this.storage ? this.storage.get(this.STATS_KEY) : null;
    } catch (e) {
      stats = null;
    }
    if (!stats) stats = {};
    ['doudizhu', 'guandan'].forEach((g) => {
      stats[g] = Object.assign(this._defaultGameStats(), stats[g] || {});
      if (!Array.isArray(stats[g].history)) stats[g].history = [];
    });
    return stats;
  }

  /**
   * 持久化统计
   */
  _save(stats) {
    if (this.storage) this.storage.set(this.STATS_KEY, stats);
  }

  /**
   * 读取已解锁成就 { id: timestamp }
   */
  _getUnlocked() {
    try {
      return (this.storage && this.storage.get(this.ACH_KEY)) || {};
    } catch (e) {
      return {};
    }
  }

  _saveUnlocked(unlocked) {
    if (this.storage) this.storage.set(this.ACH_KEY, unlocked);
  }

  /**
   * 记录一局斗地主
   * @param {object} detail { isWin, multiplier, role, bombs, rockets, scoreDelta }
   * @returns {Array} 新解锁的成就列表
   */
  recordDoudizhu(detail) {
    const currentUser = this.userManager && this.userManager.getCurrentUser();
    if (currentUser) {
      const payload = {
        game: 'doudizhu',
        isWin: !!detail.isWin,
        role: detail.role || 'farmer',
        bombs: detail.bombs || 0,
        rockets: detail.rockets || 0,
        multiplayer: detail.multiplier || 1,
        scoreDelta: detail.scoreDelta || 0,
        detail: `${detail.role === 'landlord' ? '地主' : '农民'} · 倍数×${detail.multiplier || 1}`
      };
      this.userManager.saveGameResult(payload);
      return [];
    }

    const stats = this.getStats();
    const d = stats.doudizhu;
    d.totalGames++;
    if (detail.isWin) {
      d.wins++;
      d.currentStreak++;
      if (d.currentStreak > d.maxStreak) d.maxStreak = d.currentStreak;
      if (detail.role === 'landlord') d.landlordWins++;
      else d.farmerWins++;
    } else {
      d.losses++;
      d.currentStreak = 0;
      if (detail.role === 'landlord') d.landlordLosses++;
      else d.farmerLosses++;
    }
    d.score += detail.scoreDelta || 0;
    d.bombs += detail.bombs || 0;
    d.rockets += detail.rockets || 0;
    if ((detail.multiplier || 0) > d.maxMultiplier) d.maxMultiplier = detail.multiplier;
    d.history.unshift({
      time: new Date().toLocaleString('zh-CN'),
      result: detail.isWin ? '胜' : '负',
      detail: (detail.role === 'landlord' ? '地主' : '农民') + ' · 倍数×' + (detail.multiplier || 1),
      score: detail.scoreDelta || 0
    });
    if (d.history.length > 50) d.history.length = 50;
    this._save(stats);
    return this._checkAchievements(stats);
  }

  /**
   * 记录一局掼蛋
   * @param {object} detail { isWin, upLevel, bombs, straightFlushes, skyBombs, levelValue, scoreDelta }
   * @returns {Array} 新解锁的成就列表
   */
  recordGuandan(detail) {
    const currentUser = this.userManager && this.userManager.getCurrentUser();
    if (currentUser) {
      const payload = {
        game: 'guandan',
        isWin: !!detail.isWin,
        role: detail.role || 'team',
        bombs: detail.bombs || 0,
        rockets: detail.rockets || 0,
        upLevel: detail.upLevel || 0,
        multiplayer: detail.multiplier || 1,
        scoreDelta: detail.scoreDelta || 0,
        detail: `升${detail.upLevel || 0}级 · ${detail.levelDisplay || ''}`,
        partner: detail.partner || ''
      };
      this.userManager.saveGameResult(payload);
      return [];
    }

    const stats = this.getStats();
    const g = stats.guandan;
    g.totalGames++;
    if (detail.isWin) {
      g.wins++;
      g.currentStreak++;
      if (g.currentStreak > g.maxStreak) g.maxStreak = g.currentStreak;
    } else {
      g.losses++;
      g.currentStreak = 0;
    }
    g.score += detail.scoreDelta || 0;
    g.bombs += detail.bombs || 0;
    g.straightFlushes += detail.straightFlushes || 0;
    g.skyBombs += detail.skyBombs || 0;
    if ((detail.levelValue || 2) > g.maxLevel) g.maxLevel = detail.levelValue;
    g.history.unshift({
      time: new Date().toLocaleString('zh-CN'),
      result: detail.isWin ? '胜' : '负',
      detail: '升' + (detail.upLevel || 0) + '级 · 打' + (detail.levelDisplay || ''),
      score: detail.scoreDelta || 0
    });
    if (g.history.length > 50) g.history.length = 50;
    this._save(stats);
    return this._checkAchievements(stats);
  }

  /**
   * 检查成就解锁，返回新解锁列表
   */
  _checkAchievements(stats) {
    const unlocked = this._getUnlocked();
    const newly = [];
    const list = (typeof window !== 'undefined' && window.ACHIEVEMENTS) || [];
    const now = Date.now();
    list.forEach((a) => {
      if (!unlocked[a.id]) {
        let met = false;
        try {
          met = a.condition(stats);
        } catch (e) {
          met = false;
        }
        if (met) {
          unlocked[a.id] = now;
          newly.push(a);
        }
      }
    });
    if (newly.length > 0) this._saveUnlocked(unlocked);
    return newly;
  }

  /**
   * 获取所有成就状态
   * @returns {Array} [{ ...achievement, unlocked: bool, time: number|null }]
   */
  getAchievementStates() {
    const unlocked = this._getUnlocked();
    const list = (typeof window !== 'undefined' && window.ACHIEVEMENTS) || [];
    return list.map((a) => ({
      ...a,
      unlocked: !!unlocked[a.id],
      time: unlocked[a.id] || null
    }));
  }

  /**
   * 大厅汇总数据
   */
  getSummary() {
    const s = this.getStats();
    const wins = s.doudizhu.wins + s.guandan.wins;
    const losses = s.doudizhu.losses + s.guandan.losses;
    const total = wins + losses;
    return {
      wins,
      losses,
      total,
      score: s.doudizhu.score + s.guandan.score,
      winRate: total > 0 ? ((wins / total) * 100).toFixed(1) + '%' : '--',
      unlockedCount: Object.keys(this._getUnlocked()).length,
      totalAchievements: ((typeof window !== 'undefined' && window.ACHIEVEMENTS) || []).length
    };
  }

  /**
   * 重置所有统计和成就（危险操作）
   */
  resetAll() {
    if (this.storage) {
      this.storage.remove(this.STATS_KEY);
      this.storage.remove(this.ACH_KEY);
    }
  }
}

let statsManager = null;
if (typeof window !== 'undefined') {
  statsManager = new StatsManager(window.storage);
  window.StatsManager = StatsManager;
  window.statsManager = statsManager;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { StatsManager };
}
