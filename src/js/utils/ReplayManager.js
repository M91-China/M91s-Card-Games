/**
 * @file ReplayManager.js
 * @description 对局回放：录制、保存、加载、播放控制
 * @author HappyCard Team
 * @date 2026-08
 */

class ReplayManager {
  constructor(storageInstance) {
    this.storage = storageInstance || (typeof window !== 'undefined' ? window.storage : null);
    this.REPLAY_KEY = 'replays';
    this.MAX_REPLAYS = 20;
  }

  /**
   * 创建一个录制器
   * @param {string} gameType 'doudizhu' | 'guandan'
   * @param {object} meta 额外元信息
   * @returns {ReplayRecorder}
   */
  createRecorder(gameType, meta = {}) {
    return new ReplayRecorder(gameType, meta);
  }

  /**
   * 保存回放
   * @param {ReplayRecorder} recorder
   * @returns {string} replayId
   */
  save(recorder) {
    const data = recorder.toJSON();
    const list = this._getList();
    list.unshift(data);
    if (list.length > this.MAX_REPLAYS) list.length = this.MAX_REPLAYS;
    this._saveList(list);
    return data.id;
  }

  /**
   * 获取回放列表
   */
  getList() {
    return this._getList();
  }

  /**
   * 加载单个回放
   */
  load(id) {
    const list = this._getList();
    return list.find((r) => r.id === id) || null;
  }

  /**
   * 删除回放
   */
  remove(id) {
    const list = this._getList().filter((r) => r.id !== id);
    this._saveList(list);
  }

  /**
   * 清空所有回放
   */
  clear() {
    this._saveList([]);
  }

  _getList() {
    try {
      return (this.storage && this.storage.get(this.REPLAY_KEY)) || [];
    } catch (e) {
      return [];
    }
  }

  _saveList(list) {
    if (this.storage) this.storage.set(this.REPLAY_KEY, list);
  }

  /**
   * 将序列化的牌数据还原为 Card 对象
   */
  static deserializeCards(cardData) {
    if (!cardData || !Array.isArray(cardData)) return [];
    return cardData.map((c) => new Card(c.suit, c.rank, c.deckId || 0));
  }

  /**
   * 将 Card 数组序列化为可 JSON 化的数据
   */
  static serializeCards(cards) {
    if (!cards) return [];
    return cards.map((c) => ({ suit: c.suit, rank: c.rank, deckId: c.deckId || 0 }));
  }
}

/**
 * 回放录制器
 */
class ReplayRecorder {
  constructor(gameType, meta = {}) {
    this.id = 'rpl_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
    this.gameType = gameType;
    this.date = new Date().toLocaleString('zh-CN');
    this.meta = meta;
    this.events = [];
    this.initialHands = [];
    this.bottomCards = [];
    this.result = null;
  }

  /**
   * 记录初始发牌
   */
  recordDeal(hands, bottomCards) {
    this.initialHands = hands.map((h) => ReplayManager.serializeCards(h.cards || h));
    this.bottomCards = ReplayManager.serializeCards(bottomCards || []);
    this._addEvent('deal', { handCount: this.initialHands.length });
  }

  /**
   * 记录叫分
   */
  recordBid(player, score) {
    this._addEvent('bid', { player, score });
  }

  /**
   * 记录出牌
   */
  recordPlay(player, cards, info) {
    this._addEvent('play', {
      player,
      cards: ReplayManager.serializeCards(cards),
      cardType: info ? info.type : null
    });
  }

  /**
   * 记录不出
   */
  recordPass(player) {
    this._addEvent('pass', { player });
  }

  /**
   * 记录掼蛋进贡
   */
  recordTribute(from, to, cards) {
    this._addEvent('tribute', {
      from,
      to,
      cards: ReplayManager.serializeCards(cards)
    });
  }

  /**
   * 记录还贡
   */
  recordReturn(from, to, cards) {
    this._addEvent('return', {
      from,
      to,
      cards: ReplayManager.serializeCards(cards)
    });
  }

  /**
   * 记录等级变化（掼蛋）
   */
  recordLevel(winTeam, upLevel, teamLevels) {
    this._addEvent('level', { winTeam, upLevel, teamLevels });
  }

  /**
   * 记录游戏结束
   */
  recordGameOver(result) {
    this.result = result;
    this._addEvent('gameover', result || {});
  }

  _addEvent(type, data) {
    this.events.push({ type, time: Date.now(), ...data });
  }

  toJSON() {
    return {
      id: this.id,
      gameType: this.gameType,
      date: this.date,
      meta: this.meta,
      initialHands: this.initialHands,
      bottomCards: this.bottomCards,
      events: this.events,
      result: this.result,
      moveCount: this.events.filter((e) => e.type === 'play' || e.type === 'pass').length
    };
  }
}

if (typeof window !== 'undefined') {
  window.ReplayManager = ReplayManager;
  window.ReplayRecorder = ReplayRecorder;
  window.replayManager = new ReplayManager(window.storage);
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ReplayManager, ReplayRecorder };
}
