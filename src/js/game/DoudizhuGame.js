/**
 * @file DoudizhuGame.js
 * @description 斗地主游戏流程控制：叫地主、AI出牌、轮转、胜负判定
 * @author HappyCard Team
 * @date 2026-08
 */

class DoudizhuGame extends GameBase {
  constructor(options = {}) {
    super(options);
    this.landlord = -1;
    this.lastPlay = null;
    this.passCount = 0;
    this.multiplier = 1;
    this.bidScores = [-1, -1, -1];
    this.bidTurn = 0;
    this.maxBid = 0;
    this.maxBidPlayer = -1;
    this._bidStartPlayer = 0;
    this._timer = null;
    this.onStateChange = options.onStateChange || (() => {});
    this.onPlayCard = options.onPlayCard || (() => {});
    this.onPass = options.onPass || (() => {});
    this.onBid = options.onBid || (() => {});
    this.onGameOver = options.onGameOver || (() => {});
    this.onMessage = options.onMessage || (() => {});

    // 高级AI组件
    this.cardCounter = new CardCounter(1, 3);
    this.ai = new DoudizhuAI(this.cardCounter);
  }

  _setupPlayers() {
    this.players = [
      { id: 0, name: '我', avatar: '😎', isAI: false, role: 'farmer' },
      { id: 1, name: '电脑A', avatar: '🤖', isAI: true, role: 'farmer' },
      { id: 2, name: '电脑B', avatar: '🤖', isAI: true, role: 'farmer' }
    ];
  }

  _createDeck() {
    this.deck = new Deck(1);
    this.deck.shuffle(5);
  }

  /**
   * 开始新局
   */
  startNewGame() {
    this.landlord = -1;
    this.lastPlay = null;
    this.passCount = 0;
    this.multiplier = 1;
    this.bidScores = [-1, -1, -1];
    this.maxBid = 0;
    this.maxBidPlayer = -1;
    this.players.forEach(p => { p.role = 'farmer'; });
    if (this._timer) { clearTimeout(this._timer); this._timer = null; }

    this.setState(Constants.GameState.DEALING);
    this._createDeck();
    const { hands, bottom } = this.deck.deal(3, 17, 3);
    this.hands = hands.map(cs => new Hand(cs));
    this.bottomCards = bottom;
    this.currentPlayer = 0;

    // 重置记牌器
    this.cardCounter.reset();
    for (let i = 0; i < 3; i++) this.cardCounter.setInitialCount(i, 17);

    this.onStateChange(this.state);
    this._startBidding();
    return { hands: this.hands, bottom: this.bottomCards };
  }

  /**
   * 开始叫地主
   */
  _startBidding() {
    this.setState(Constants.GameState.BIDDING);
    this._bidStartPlayer = Math.floor(Math.random() * 3);
    this.bidTurn = this._bidStartPlayer;
    this.maxBid = 0;
    this.maxBidPlayer = -1;
    this.bidScores = [-1, -1, -1];
    this.onStateChange(this.state);
    this._nextBid();
  }

  /**
   * 处理下一个叫分
   */
  _nextBid() {
    if (this._bidComplete()) {
      this._finishBidding();
      return;
    }
    const player = this.players[this.bidTurn];
    this.onBid(this.bidTurn, -1);
    if (player.isAI) {
      const delay = 600 + Math.random() * 800;
      this._timer = setTimeout(() => {
        let score = this._aiBidScore(this.bidTurn);
        if (score > 0 && score <= this.maxBid) score = 0;
        this._doBid(this.bidTurn, score);
      }, delay);
    }
  }

  /**
   * 判断叫分是否结束：三人都叫过 或 有人叫3分
   */
  _bidComplete() {
    if (this.maxBid >= 3) return true;
    const called = this.bidScores.filter(s => s >= 0).length;
    // 只要有过叫分且三人都轮过一次
    return called >= 3;
  }

  /**
   * 执行叫分
   */
  _doBid(playerIdx, score) {
    this.bidScores[playerIdx] = score;
    if (score > this.maxBid) {
      this.maxBid = score;
      this.maxBidPlayer = playerIdx;
    }
    this.onBid(playerIdx, score);
    this.bidTurn = (this.bidTurn + 1) % 3;
    this._nextBid();
  }

  /**
   * 玩家叫分（外部调用）
   */
  playerBid(score) {
    if (this.state !== Constants.GameState.BIDDING) return;
    if (this.bidTurn !== 0) return;
    if (this._timer) { clearTimeout(this._timer); this._timer = null; }
    // 不能叫比当前最高分低的分（0分=不叫除外）
    if (score > 0 && score <= this.maxBid) {
      this.onMessage('请叫高于' + this.maxBid + '分或选择不叫');
      return;
    }
    this._doBid(0, score);
  }

  /**
   * AI叫分策略（使用高级AI评估）
   */
  _aiBidScore(playerIdx) {
    return this.ai.decideBid(this.hands[playerIdx], this.maxBid);
  }

  /**
   * 叫分结束，确定地主并发底牌
   */
  _finishBidding() {
    if (this.maxBidPlayer < 0 || this.maxBid === 0) {
      this.onMessage('无人叫地主，重新发牌');
      this._timer = setTimeout(() => this.startNewGame(), 1500);
      return;
    }
    this.landlord = this.maxBidPlayer;
    this.players[this.landlord].role = 'landlord';
    this.multiplier = this.maxBid;

    const landlordHand = this.hands[this.landlord];
    this.bottomCards.forEach(c => landlordHand.addCards(c));
    landlordHand.sort();

    // 更新记牌器：地主20张，农民17张
    this.cardCounter.setInitialCount(this.landlord, 20);

    this.setState(Constants.GameState.PLAYING);
    this.currentPlayer = this.landlord;
    this.lastPlay = null;
    this.passCount = 0;
    this.onStateChange(this.state);
    this.onMessage(this.players[this.landlord].name + '成为地主！');
    this._nextTurn();
  }

  /**
   * 下一轮出牌
   */
  _nextTurn() {
    if (this._checkWin()) return;
    const player = this.players[this.currentPlayer];
    if (player.isAI) {
      const delay = 700 + Math.random() * 900;
      this._timer = setTimeout(() => this._aiPlay(), delay);
    }
    // 玩家回合等待外部调用 playerPlay / playerPass
  }

  /**
   * AI出牌逻辑（使用高级AI）
   */
  _aiPlay() {
    const context = {
      currentPlayer: this.currentPlayer,
      players: this.players,
      hands: this.hands,
      landlord: this.landlord
    };
    const chosen = this.ai.decidePlay(this.hands[this.currentPlayer], this.lastPlay, context);

    if (!chosen) {
      this._doPass();
    } else {
      this._doPlay(chosen);
    }
  }

  /**
   * 执行出牌
   */
  _doPlay(cards) {
    const playerIdx = this.currentPlayer;
    const info = DoudizhuRule.judge(cards);
    this.hands[playerIdx].removeCards(cards);
    this.lastPlay = { cards, info, player: playerIdx };
    this.passCount = 0;
    this.cardCounter.observePlay(playerIdx, cards, info);
    this.onPlayCard(playerIdx, cards, info);
    this.currentPlayer = (this.currentPlayer + 1) % 3;
    if (this._timer) { clearTimeout(this._timer); this._timer = null; }
    this._nextTurn();
  }

  /**
   * 执行不出
   */
  _doPass() {
    const playerIdx = this.currentPlayer;
    this.passCount++;
    this.cardCounter.observePass(playerIdx);
    this.onPass(playerIdx);
    // 如果连续两家不出（除最后出牌者外），清空lastPlay，自由出牌
    if (this.passCount >= 2) {
      this.lastPlay = null;
      this.passCount = 0;
    }
    this.currentPlayer = (this.currentPlayer + 1) % 3;
    if (this._timer) { clearTimeout(this._timer); this._timer = null; }
    this._nextTurn();
  }

  /**
   * 玩家出牌（外部调用）
   */
  playerPlay(cards) {
    if (this.state !== Constants.GameState.PLAYING) return { ok: false, msg: '当前不是出牌阶段' };
    if (this.currentPlayer !== 0) return { ok: false, msg: '还没轮到您' };
    const info = DoudizhuRule.judge(cards);
    if (!info.isValid) return { ok: false, msg: '不是有效的牌型' };
    if (this.lastPlay && this.lastPlay.player !== 0) {
      const cmp = DoudizhuRule.compare(cards, this.lastPlay.cards);
      if (cmp <= 0) return { ok: false, msg: '压不过上家的牌' };
    }
    this._doPlay(cards);
    return { ok: true };
  }

  /**
   * 玩家不出（外部调用）
   */
  playerPass() {
    if (this.state !== Constants.GameState.PLAYING) return { ok: false, msg: '当前不是出牌阶段' };
    if (this.currentPlayer !== 0) return { ok: false, msg: '还没轮到您' };
    if (!this.lastPlay || this.lastPlay.player === 0) {
      return { ok: false, msg: '您先出，不能不出' };
    }
    this._doPass();
    return { ok: true };
  }

  /**
   * 检查胜负
   */
  _checkWin() {
    for (let i = 0; i < 3; i++) {
      if (this.hands[i].cards.length === 0) {
        this._finishGame(i);
        return true;
      }
    }
    return false;
  }

  /**
   * 游戏结束
   */
  _finishGame(winnerIdx) {
    if (this._timer) { clearTimeout(this._timer); this._timer = null; }
    this.setState(Constants.GameState.FINISHED);
    const winnerRole = this.players[winnerIdx].role;
    const isLandlordWin = winnerRole === 'landlord';
    this.winner = isLandlordWin ? 'landlord' : 'farmer';
    this.winnerIdx = winnerIdx;
    const result = {
      winner: winnerIdx,
      winnerRole,
      isLandlordWin,
      landlord: this.landlord,
      multiplier: this.multiplier,
      message: isLandlordWin ? '地主获胜！' : '农民获胜！'
    };
    this.onStateChange(this.state);
    this.onGameOver(result);
  }

  /**
   * 获取当前玩家的手牌
   */
  getMyHand() {
    return this.hands[0];
  }

  /**
   * 获取可叫的最高分（限制只能往上叫）
   */
  getAvailableBids() {
    if (this.state !== Constants.GameState.BIDDING || this.bidTurn !== 0) return [];
    const available = [0];
    for (let s = this.maxBid + 1; s <= 3; s++) available.push(s);
    return available;
  }

  /**
   * 销毁
   */
  destroy() {
    if (this._timer) { clearTimeout(this._timer); this._timer = null; }
    super.destroy();
  }
}

if (typeof window !== 'undefined') {
  window.DoudizhuGame = DoudizhuGame;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = DoudizhuGame;
}
