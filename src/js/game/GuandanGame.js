/**
 * @file GuandanGame.js
 * @description 掼蛋游戏流程控制：发牌、进贡还贡、出牌轮转、AI配合、名次判定与升级
 * @author HappyCard Team
 * @date 2026-08
 */

class GuandanGame extends GameBase {
  constructor(options = {}) {
    super(options);
    // 队伍：0&3 为A队（我+对家），1&2 为B队
    this.teamOf = [0, 1, 1, 0];
    this.teamLevel = [15, 15]; // A队、B队当前级牌值（2=15 起）
    this.currentLevelValue = 15; // 本局级牌值
    this.wildCards = []; // 本局逢人配牌
    this.lastPlay = null;
    this.passCount = 0;
    this.placements = []; // 完成名次的玩家idx
    this.tributeQueue = []; // 进贡队列
    this._timer = null;
    this.matchOver = false;

    this.onStateChange = options.onStateChange || (() => {});
    this.onPlayCard = options.onPlayCard || (() => {});
    this.onPass = options.onPass || (() => {});
    this.onGameOver = options.onGameOver || (() => {});
    this.onMatchOver = options.onMatchOver || (() => {});
    this.onTribute = options.onTribute || (() => {});
    this.onLevelChange = options.onLevelChange || (() => {});
    this.onMessage = options.onMessage || (() => {});

    // 高级AI组件
    this.cardCounter = new CardCounter(2, 4);
    this.ai = new GuandanAI(this.cardCounter);
  }

  _setupPlayers() {
    this.players = [
      { id: 0, name: '我', avatar: '😎', isAI: false, team: 0 },
      { id: 1, name: '左家', avatar: '🤖', isAI: true, team: 1 },
      { id: 2, name: '右家', avatar: '🤖', isAI: true, team: 1 },
      { id: 3, name: '对家', avatar: '🤖', isAI: true, team: 0 }
    ];
  }

  _createDeck() {
    this.deck = new Deck(2);
    this.deck.shuffle(6);
  }

  /**
   * 开始新的一局
   */
  startNewGame() {
    if (this._timer) { clearTimeout(this._timer); this._timer = null; }
    this.lastPlay = null;
    this.passCount = 0;
    this.placements = [];
    this.tributeQueue = [];
    this.matchOver = false;

    this.setState(Constants.GameState.DEALING);
    this._createDeck();
    // 两副牌108张，4人各27张
    const { hands } = this.deck.deal(4, 27, 0);
    this.hands = hands.map(cs => new Hand(cs));
    this._markWildCards();

    // 重置记牌器
    this.cardCounter.reset();
    for (let i = 0; i < 4; i++) this.cardCounter.setInitialCount(i, 27);

    // 首局随机先手；否则上头游先出
    if (this.currentPlayer == null || this._headPlayer == null) {
      this.currentPlayer = Math.floor(Math.random() * 4);
    } else {
      this.currentPlayer = this._headPlayer;
    }
    this._headPlayer = null;

    // 若上局双下，先进行进贡还贡
    if (this._pendingTribute) {
      this._startTribute();
    } else {
      this._startPlaying();
    }
  }

  /**
   * 标记逢人配（红桃级牌）
   */
  _markWildCards() {
    this.wildCards = [];
    for (const hand of this.hands) {
      for (const c of hand.cards) {
        if (GuandanRule.isWild(c, this.currentLevelValue)) {
          c.isWild = true;
          this.wildCards.push(c);
        } else {
          c.isWild = false;
        }
      }
    }
  }

  _startPlaying() {
    this.setState(Constants.GameState.PLAYING);
    this.onStateChange(this.state);
    this.onMessage(this.players[this.currentPlayer].name + '先出');
    this._nextTurn();
  }

  /* ===================== 进贡还贡 ===================== */

  _startTribute() {
    this.setState(Constants.GameState.BIDDING); // 复用为进贡阶段
    this.onStateChange(this.state);
    const { losers, winners } = this._pendingTribute;
    // 末游(losers[1])向头游(winners[0])进贡；三游(losers[0])向二游(winners[1])
    this.tributeQueue = [
      { from: losers[1], to: winners[0] },
      { from: losers[0], to: winners[1] }
    ];
    this._doNextTribute();
  }

  _doNextTribute() {
    if (this.tributeQueue.length === 0) {
      this._pendingTribute = null;
      this._startPlaying();
      return;
    }
    const trib = this.tributeQueue.shift();
    const giver = this.hands[trib.from];
    // 进贡最大牌（非百搭、非王的最大有效牌）
    const tributeCard = this._pickTributeCard(giver);
    giver.removeCards([tributeCard]);
    this.hands[trib.to].addCards(tributeCard);
    this.onTribute(trib.from, trib.to, tributeCard, 'tribute');
    this.onMessage(this.players[trib.from].name + '向' + this.players[trib.to].name + '进贡');

    // 还贡：赢家还一张10以下的牌
    const returnCard = this._pickReturnCard(this.hands[trib.to]);
    if (returnCard) {
      this.hands[trib.to].removeCards([returnCard]);
      giver.addCards(returnCard);
      this.onTribute(trib.to, trib.from, returnCard, 'return');
    }
    this._timer = setTimeout(() => this._doNextTribute(), 900);
  }

  _pickTributeCard(hand) {
    const eligible = hand.cards.filter(c => !c.isWild && c.value < 16);
    eligible.sort((a, b) => GuandanRule.effValue(b, this.currentLevelValue) -
      GuandanRule.effValue(a, this.currentLevelValue));
    return eligible[0] || hand.cards[0];
  }

  _pickReturnCard(hand) {
    const eligible = hand.cards.filter(c => c.value <= 10 && !c.isWild && c.value < 16);
    eligible.sort((a, b) => a.value - b.value);
    return eligible[0] || null;
  }

  /* ===================== 出牌轮转 ===================== */

  _nextTurn() {
    if (this._checkRoundEnd()) return;
    const player = this.players[this.currentPlayer];
    if (player.isAI) {
      const delay = 600 + Math.random() * 800;
      this._timer = setTimeout(() => this._aiPlay(), delay);
    }
    // 玩家回合等待外部调用 playerPlay / playerPass
  }

  /**
   * 检查是否一圈结束（其余所有人都不出，回到上手者自由出）
   */
  _checkRoundEnd() {
    if (!this.lastPlay) return false;
    const activeCount = 4 - this.placements.length;
    const needPass = activeCount - 1;
    if (this.passCount >= needPass) {
      this.currentPlayer = this.lastPlay.player;
      this.lastPlay = null;
      this.passCount = 0;
      this._advanceToActive();
      this._nextTurn();
      return true;
    }
    return false;
  }

  _aiPlay() {
    const idx = this.currentPlayer;
    const context = {
      currentPlayer: idx,
      players: this.players,
      hands: this.hands,
      teamOf: this.teamOf,
      currentLevelValue: this.currentLevelValue,
      placements: this.placements
    };
    const chosen = this.ai.decidePlay(this.hands[idx], this.lastPlay, context);

    if (!chosen) {
      this._doPass();
    } else {
      this._doPlay(chosen);
    }
  }

  _doPlay(cards) {
    const idx = this.currentPlayer;
    const info = GuandanRule.judge(cards, this.currentLevelValue);
    this.hands[idx].removeCards(cards);
    this.lastPlay = { cards, info, player: idx };
    this.passCount = 0;
    this.cardCounter.observePlay(idx, cards, info);
    this.onPlayCard(idx, cards, info);

    if (this.hands[idx].cards.length === 0) {
      this._onPlayerEmpty(idx);
      return;
    }
    this.currentPlayer = (this.currentPlayer + 1) % 4;
    this._advanceToActive();
    if (this._timer) { clearTimeout(this._timer); this._timer = null; }
    this._nextTurn();
  }

  _doPass() {
    const idx = this.currentPlayer;
    this.passCount++;
    this.cardCounter.observePass(idx);
    this.onPass(idx);
    this.currentPlayer = (this.currentPlayer + 1) % 4;
    this._advanceToActive();
    if (this._timer) { clearTimeout(this._timer); this._timer = null; }
    this._nextTurn();
  }

  /**
   * 跳过已出完牌的玩家
   */
  _advanceToActive() {
    let guard = 0;
    while (this.placements.includes(this.currentPlayer) && guard < 4) {
      this.currentPlayer = (this.currentPlayer + 1) % 4;
      guard++;
    }
  }

  /**
   * 玩家出牌（外部调用）
   */
  playerPlay(cards) {
    if (this.state !== Constants.GameState.PLAYING) return { ok: false, msg: '当前不是出牌阶段' };
    if (this.currentPlayer !== 0) return { ok: false, msg: '还没轮到您' };
    const info = GuandanRule.judge(cards, this.currentLevelValue);
    if (!info.isValid) return { ok: false, msg: '不是有效的牌型' };
    if (this.lastPlay && this.lastPlay.player !== 0) {
      const cmp = GuandanRule.compare(cards, this.lastPlay.cards, this.currentLevelValue);
      if (cmp <= 0) return { ok: false, msg: '压不过上家的牌' };
    }
    this._doPlay(cards);
    return { ok: true };
  }

  playerPass() {
    if (this.state !== Constants.GameState.PLAYING) return { ok: false, msg: '当前不是出牌阶段' };
    if (this.currentPlayer !== 0) return { ok: false, msg: '还没轮到您' };
    if (!this.lastPlay || this.lastPlay.player === 0) {
      return { ok: false, msg: '您先出，不能不出' };
    }
    this._doPass();
    return { ok: true };
  }

  /* ===================== 名次与升级 ===================== */

  _onPlayerEmpty(idx) {
    this.placements.push(idx);
    this.onMessage(this.players[idx].name + '跑完了（第' + this.placements.length + '名）');

    if (this.placements.length === 1) {
      this._headPlayer = idx;
    }

    // 一队两人均已出完，或3人已出完 → 本局结束
    const teamEmpty = this._teamBothEmpty();
    if (this.placements.length >= 3 || teamEmpty) {
      // 补齐名次（剩余玩家按手牌数排序）
      this._fillPlacements();
      this._finishHand();
      return;
    }

    // 继续游戏（跳过该玩家）
    this.currentPlayer = (this.currentPlayer + 1) % 4;
    this._advanceToActive();
    if (this._timer) { clearTimeout(this._timer); this._timer = null; }
    this._nextTurn();
  }

  _teamBothEmpty() {
    const count = [0, 0];
    for (const idx of this.placements) count[this.teamOf[idx]]++;
    return count[0] === 2 || count[1] === 2;
  }

  _fillPlacements() {
    const remaining = [0, 1, 2, 3].filter(i => !this.placements.includes(i));
    remaining.sort((a, b) => this.hands[a].cards.length - this.hands[b].cards.length);
    for (const idx of remaining) this.placements.push(idx);
  }

  _finishHand() {
    if (this._timer) { clearTimeout(this._timer); this._timer = null; }
    this.setState(Constants.GameState.FINISHED);

    const first = this.placements[0];
    const second = this.placements[1];
    const winTeam = this.teamOf[first];
    const loseTeam = 1 - winTeam;
    this.winnerTeam = winTeam;

    // 升级数：双上(1,2同队)=3；1,3同队=2；1,4同队=1
    let upLevel = 1;
    if (this.teamOf[second] === winTeam) upLevel = 3;
    else if (this.teamOf[this.placements[2]] === winTeam) upLevel = 2;

    this.teamLevel[winTeam] = this._advanceLevel(this.teamLevel[winTeam], upLevel);
    this.currentLevelValue = this.teamLevel[winTeam];

    // 双下：负方进贡
    if (this.teamOf[second] === winTeam) {
      const winners = [first, second];
      const losers = [this.placements[2], this.placements[3]];
      this._pendingTribute = { winners, losers };
    } else {
      this._pendingTribute = null;
    }

    const result = {
      placements: this.placements.slice(),
      winTeam,
      upLevel,
      teamLevel: this.teamLevel.slice(),
      levelValue: this.currentLevelValue,
      message: (winTeam === 0 ? '我方' : '对方') + '获胜，升' + upLevel + '级！'
    };
    this.onStateChange(this.state);
    this.onLevelChange(result);
    this.onGameOver(result);

    // 打A获胜 → 整场结束
    if (this.teamLevel[winTeam] >= 14 && upLevel > 0 && this._reachedA(winTeam)) {
      this.matchOver = true;
      this.onMatchOver({ winTeam, teamLevel: this.teamLevel.slice() });
      return;
    }
  }

  _advanceLevel(current, steps) {
    // 级牌顺序：2(15),3,4,...,10,J,Q,K,A(14)
    const order = [15, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];
    let idx = order.indexOf(current);
    if (idx < 0) idx = 0;
    idx = Math.min(idx + steps, order.length - 1);
    return order[idx];
  }

  _reachedA(team) {
    return this.teamLevel[team] === 14;
  }

  /* ===================== 外部接口 ===================== */

  getMyHand() {
    return this.hands[0];
  }

  getLevelDisplay() {
    return GuandanRule.valueToLevelDisplay(this.currentLevelValue);
  }

  destroy() {
    if (this._timer) { clearTimeout(this._timer); this._timer = null; }
    super.destroy();
  }
}

if (typeof window !== 'undefined') {
  window.GuandanGame = GuandanGame;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = GuandanGame;
}
