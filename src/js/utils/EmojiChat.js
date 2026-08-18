/**
 * 快捷互动组件 - 表情包和常用语
 * 在游戏中显示互动按钮，点击后展示表情/常用语，以气泡形式展示
 */
class EmojiChat {
  constructor(container, options = {}) {
    this.container = container;
    this.onSend = options.onSend || (() => {});
    this.panel = null;
    this.btn = null;
    this._build();
  }

  static get EMOJIS() {
    return ['👍', '👏', '🤣', '😎', '😭', '😡', '🤔', '🙏', '💪', '🎉', '💔', '🎯', '🔥', '💀', '🤡', '☕'];
  }

  static get PHRASES() {
    return [
      '打得好！', '快点吧~', '我等得花儿都谢了', '和你合作真是太愉快了',
      '你的牌打得也太好了吧', '不要走，决战到天亮', '交个朋友吧',
      '倒茶🍵', '你是MM还是GG', '再见啦~', '无语了...',
      '炸弹来啦！', '顺子！', '压死！', '过'
    ];
  }

  _build() {
    this.btn = document.createElement('button');
    this.btn.className = 'emoji-btn';
    this.btn.innerHTML = '💬';
    this.btn.title = '互动';
    this.btn.addEventListener('click', () => this._togglePanel());

    this.panel = document.createElement('div');
    this.panel.className = 'emoji-panel';
    this.panel.style.display = 'none';

    // 表情区
    const emojiSection = document.createElement('div');
    emojiSection.className = 'emoji-section';
    EmojiChat.EMOJIS.forEach(e => {
      const item = document.createElement('button');
      item.className = 'emoji-item';
      item.textContent = e;
      item.addEventListener('click', () => this._send(e));
      emojiSection.appendChild(item);
    });
    this.panel.appendChild(emojiSection);

    // 常用语区
    const phraseSection = document.createElement('div');
    phraseSection.className = 'phrase-section';
    EmojiChat.PHRASES.forEach(p => {
      const item = document.createElement('button');
      item.className = 'phrase-item';
      item.textContent = p;
      item.addEventListener('click', () => this._send(p));
      phraseSection.appendChild(item);
    });
    this.panel.appendChild(phraseSection);

    this.container.appendChild(this.btn);
    this.container.appendChild(this.panel);

    // 点击外部关闭
    document.addEventListener('click', (e) => {
      if (!this.panel.contains(e.target) && e.target !== this.btn) {
        this.panel.style.display = 'none';
      }
    });
  }

  _togglePanel() {
    this.panel.style.display = this.panel.style.display === 'none' ? 'block' : 'none';
  }

  _send(content) {
    this.panel.style.display = 'none';
    this.onSend(content);
  }

  /**
   * 在指定玩家位置显示气泡
   */
  static showBubble(seatElement, text, duration = 2500) {
    if (!seatElement) return;
    const old = seatElement.querySelector('.speech-bubble');
    if (old) old.remove();

    const bubble = document.createElement('div');
    bubble.className = 'speech-bubble player-bubble';
    bubble.textContent = text;
    bubble.style.position = 'absolute';
    bubble.style.top = '-36px';
    bubble.style.left = '50%';
    bubble.style.transform = 'translateX(-50%)';
    bubble.style.zIndex = '20';
    bubble.style.animation = 'bubblePop 0.2s ease-out';
    seatElement.appendChild(bubble);

    setTimeout(() => {
      if (bubble.parentElement) {
        bubble.style.transition = 'opacity 0.3s';
        bubble.style.opacity = '0';
        setTimeout(() => bubble.remove(), 300);
      }
    }, duration);
  }
}

// 全局暴露
if (typeof window !== 'undefined') {
  window.EmojiChat = EmojiChat;
}
