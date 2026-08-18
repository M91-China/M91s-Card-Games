/**
 * HappyCard Service Worker - 离线缓存支持
 */
const CACHE_NAME = 'happycard-v1';
const ASSETS = [
  './',
  './index.html',
  './doudizhu.html',
  './guandan.html',
  './replay.html',
  './css/reset.css',
  './css/variables.css',
  './css/cards.css',
  './css/animations.css',
  './css/hall.css',
  './css/doudizhu.css',
  './css/guandan.css',
  './css/mobile.css',
  './js/data/config.js',
  './js/data/achievements.js',
  './js/utils/utils.js',
  './js/utils/storage.js',
  './js/utils/StatsManager.js',
  './js/utils/ReplayManager.js',
  './js/utils/EmojiChat.js',
  './js/core/EventBus.js',
  './js/core/Card.js',
  './js/core/Deck.js',
  './js/core/Hand.js',
  './js/rules/DoudizhuRule.js',
  './js/rules/GuandanRule.js',
  './js/ui/Renderer.js',
  './js/ui/CardRenderer.js',
  './js/ui/Animation.js',
  './js/ui/SoundManager.js',
  './js/ui/UIManager.js',
  './js/game/GameBase.js',
  './js/game/DoudizhuGame.js',
  './js/game/GuandanGame.js',
  './js/ai/CardCounter.js',
  './js/ai/HandEvaluator.js',
  './js/ai/DoudizhuAI.js',
  './js/ai/GuandanAI.js'
];

// 安装：预缓存核心资源
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // 使用 addAll 但忽略单个失败
      return Promise.allSettled(
        ASSETS.map(url => cache.add(url).catch(() => {}))
      );
    }).then(() => self.skipWaiting())
  );
});

// 激活：清理旧缓存
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      );
    }).then(() => self.clients.claim())
  );
});

// 请求拦截：缓存优先，网络回退
self.addEventListener('fetch', (event) => {
  // 只处理 GET 请求
  if (event.request.method !== 'GET') return;

  // 跳过 chrome-extension 等非http请求
  if (!event.request.url.startsWith('http')) return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;

      return fetch(event.request).then((response) => {
        // 缓存成功的响应
        if (response && response.status === 200 && response.type === 'basic') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => {
        // 离线回退到首页
        if (event.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
      });
    })
  );
});
