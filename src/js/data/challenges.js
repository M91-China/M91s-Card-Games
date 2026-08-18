/**
 * 残局挑战关卡数据
 * 每个关卡定义三家手牌（玩家=地主，AI=农民）
 * 牌面用字符串简写：3-10, J, Q, K, A, 2, S(小王), B(大王)
 * 花色自动分配
 */

// 根据牌面字符串创建Card数组
function makeCards(str) {
  const suits = ['spade', 'heart', 'diamond', 'club'];
  const tokens = str.split(/[\s,]+/).filter(Boolean);
  const suitCount = {};
  return tokens.map(t => {
    if (t === 'S') return new Card('joker', 'SMALL_JOKER');
    if (t === 'B') return new Card('joker', 'BIG_JOKER');
    const rank = t;
    if (!suitCount[rank]) suitCount[rank] = 0;
    const suit = suits[suitCount[rank] % 4];
    suitCount[rank]++;
    return new Card(suit, rank);
  });
}

const CHALLENGES = [
  {
    id: 1,
    name: '第1关：单刀直入',
    desc: '你是地主，先出牌。手里有大牌，合理出牌即可获胜。',
    myCards: '3,4,5,6,7,8,9,10,J,Q,K,A,2,B',
    ai1Cards: '3,3,4,4,5,5,6,6,7,7,8,8,9',
    ai2Cards: '9,9,10,10,J,J,Q,Q,K,K,A,A,2'
  },
  {
    id: 2,
    name: '第2关：炸弹对决',
    desc: '你有炸弹，但对手也有。要把握出牌时机。',
    myCards: '3,3,3,4,5,6,7,8,9,10,J,Q,K,A,2,2,2,S',
    ai1Cards: '4,4,5,5,6,6,7,7,8,8,9,9,10,10',
    ai2Cards: 'J,Q,K,A,A,2,S,B,3,4,5,6,7'
  },
  {
    id: 3,
    name: '第3关：顺子奇兵',
    desc: '利用顺子一次性出掉多张牌，让对手措手不及。',
    myCards: '3,4,5,6,7,7,8,8,9,9,10,10,J,J,Q,Q,K',
    ai1Cards: '3,3,3,4,4,5,5,6,6,7,8,9,10',
    ai2Cards: 'K,K,A,A,A,2,2,S,B,J,Q,4'
  },
  {
    id: 4,
    name: '第4关：王炸在手',
    desc: '你有王炸，但需要决定何时使用。',
    myCards: '3,4,5,6,7,8,9,10,J,Q,K,A,S,B',
    ai1Cards: '3,3,4,4,5,5,6,6,7,7,8,8,9,9',
    ai2Cards: '10,10,J,J,Q,Q,K,K,A,A,2,2'
  },
  {
    id: 5,
    name: '第5关：残局大师',
    desc: '最复杂的残局，需要精确计算每一步。',
    myCards: '3,3,4,5,6,7,8,9,10,J,Q,K,A,2,S',
    ai1Cards: '3,4,4,5,5,6,6,7,7,8,8,9,9',
    ai2Cards: '10,10,J,J,Q,Q,K,K,A,A,A,2,B'
  }
];

if (typeof window !== 'undefined') {
  window.CHALLENGES = CHALLENGES;
  window.makeCards = makeCards;
}
