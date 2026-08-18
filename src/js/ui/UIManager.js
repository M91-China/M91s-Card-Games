/**
 * @file UIManager.js
 * @description UI管理器：所有DOM操作统一入口，包含Toast、模态框、气泡等
 * @author HappyCard Team
 * @date 2026-08
 */

class UIManager {
  constructor() {
    this.toastContainer = null;
    this.modalStack = [];
  }

  /**
   * Toast 提示
   * @param {string} text
   * @param {number} [duration=1800]
   */
  toast(text, duration = 1800) {
    if (!this.toastContainer) {
      this.toastContainer = document.createElement('div');
      this.toastContainer.style.cssText = 'position:fixed;top:25%;left:50%;transform:translateX(-50%);z-index:200;pointer-events:none;display:flex;flex-direction:column;align-items:center;gap:8px;';
      document.body.appendChild(this.toastContainer);
    }
    const el = document.createElement('div');
    el.className = 'toast fade-in';
    el.textContent = text;
    this.toastContainer.appendChild(el);
    setTimeout(() => {
      el.classList.add('fade-out');
      setTimeout(() => el.remove(), 250);
    }, duration);
  }

  /**
   * 模态弹窗
   * @param {Object} options
   * @param {string} options.title
   * @param {string|HTMLElement} options.content
   * @param {Array<{text:string,type?:string,onClick?:Function}>} options.buttons
   * @param {boolean} [options.maskClosable=false]
   * @returns {HTMLElement}
   */
  modal(options) {
    const { title, content, buttons = [], maskClosable = false } = options;
    const mask = document.createElement('div');
    mask.className = 'modal-mask fade-in';

    const box = document.createElement('div');
    box.className = 'modal-box modal-enter';

    if (title) {
      const t = document.createElement('div');
      t.className = 'modal-title';
      t.textContent = title;
      box.appendChild(t);
    }

    const body = document.createElement('div');
    body.className = 'modal-body';
    if (typeof content === 'string') body.innerHTML = content;
    else if (content) body.appendChild(content);
    box.appendChild(body);

    if (buttons.length > 0) {
      const btnWrap = document.createElement('div');
      btnWrap.style.cssText = 'display:flex;gap:12px;justify-content:center;margin-top:20px;';
      buttons.forEach((b) => {
        const btn = document.createElement('button');
        btn.className = `btn btn-${b.type || 'primary'} btn-press`;
        btn.textContent = b.text;
        btn.addEventListener('click', () => {
          if (b.onClick) b.onClick(box, close);
          else close();
        });
        btnWrap.appendChild(btn);
      });
      box.appendChild(btnWrap);
    }

    mask.appendChild(box);
    if (maskClosable) {
      mask.addEventListener('click', (e) => {
        if (e.target === mask) close();
      });
    }

    const close = () => {
      mask.classList.add('fade-out');
      setTimeout(() => mask.remove(), 250);
      this.modalStack = this.modalStack.filter((m) => m !== mask);
    };

    document.body.appendChild(mask);
    this.modalStack.push(mask);
    return box;
  }

  /**
   * 确认弹窗
   * @param {string} title
   * @param {string} content
   * @param {Function} onOk
   * @param {Function} [onCancel]
   */
  confirm(title, content, onOk, onCancel) {
    return this.modal({
      title,
      content,
      buttons: [
        { text: '取消', type: 'gray', onClick: (b, close) => { close(); if (onCancel) onCancel(); } },
        { text: '确定', type: 'primary', onClick: (b, close) => { close(); if (onOk) onOk(); } }
      ]
    });
  }

  /**
   * 说话气泡（AI出牌/不出时显示）
   * @param {HTMLElement} anchorEl
   * @param {string} text
   * @param {number} [duration=1500]
   */
  speechBubble(anchorEl, text, duration = 1500) {
    if (!anchorEl) return;
    const rect = anchorEl.getBoundingClientRect();
    const bubble = document.createElement('div');
    bubble.className = 'speech-bubble';
    bubble.textContent = text;
    bubble.style.left = `${rect.left + rect.width / 2}px`;
    bubble.style.top = `${rect.top - 40}px`;
    bubble.style.transform = 'translateX(-50%)';
    document.body.appendChild(bubble);
    setTimeout(() => {
      bubble.classList.add('fade-out');
      setTimeout(() => bubble.remove(), 250);
    }, duration);
  }

  /**
   * 创建圆形倒计时
   * @param {HTMLElement} container
   * @param {number} seconds
   * @param {Function} [onTimeout]
   * @returns {{destroy: Function, pause: Function, resume: Function}}
   */
  countdown(container, seconds, onTimeout) {
    const el = document.createElement('div');
    el.className = 'countdown';
    let remaining = seconds;
    el.textContent = remaining;
    container.appendChild(el);

    let timer = setInterval(() => {
      remaining--;
      el.textContent = remaining;
      if (remaining <= 5) el.classList.add('countdown-urgent');
      if (remaining <= 0) {
        clearInterval(timer);
        if (onTimeout) onTimeout();
      }
    }, 1000);

    return {
      destroy() {
        clearInterval(timer);
        el.remove();
      },
      pause() { clearInterval(timer); },
      resume() {
        timer = setInterval(() => {
          remaining--;
          el.textContent = remaining;
          if (remaining <= 0) {
            clearInterval(timer);
            if (onTimeout) onTimeout();
          }
        }, 1000);
      }
    };
  }

  /**
   * 创建头像
   * @param {string} emoji
   * @param {string} name
   * @param {Object} [opts]
   * @returns {HTMLElement}
   */
  createPlayerSeat(emoji, name, opts = {}) {
    const wrap = document.createElement('div');
    wrap.className = `seat-info ${opts.team ? 'team-' + opts.team : ''}`;
    wrap.innerHTML = `
      <div class="seat-avatar ${opts.team ? 'team-' + opts.team : ''}">${emoji}</div>
      <div style="display:flex;flex-direction:column;gap:2px;">
        <div class="seat-name">${name}</div>
        <div class="seat-card-count">${opts.cardCount != null ? opts.cardCount + '张' : ''}</div>
      </div>
    `;
    if (opts.isLandlord) {
      const badge = document.createElement('div');
      badge.className = 'landlord-badge';
      badge.textContent = '地主';
      wrap.appendChild(badge);
    }
    return wrap;
  }
}

const uiManager = new UIManager();

if (typeof window !== 'undefined') {
  window.UIManager = UIManager;
  window.uiManager = uiManager;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { UIManager, uiManager };
}
