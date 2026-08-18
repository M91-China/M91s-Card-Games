/**
 * @file utils.js
 * @description 通用工具函数
 * @author HappyCard Team
 * @date 2026-08
 */

const Utils = {
  /**
   * 生成唯一ID
   * @param {string} prefix
   * @returns {string}
   */
  uid(prefix = 'id') {
    return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  },

  /**
   * 随机整数 [min, max]
   * @param {number} min
   * @param {number} max
   * @returns {number}
   */
  randInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  },

  /**
   * 从数组随机取一个元素
   * @param {Array} arr
   * @returns {*}
   */
  randPick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  },

  /**
   * Fisher-Yates 洗牌（原地）
   * @param {Array} arr
   * @param {number} times 洗牌次数
   * @returns {Array}
   */
  shuffle(arr, times = 3) {
    for (let t = 0; t < times; t++) {
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
    }
    return arr;
  },

  /**
   * 数字排序（默认升序）
   * @param {Array<number>} arr
   * @param {boolean} desc
   * @returns {Array<number>}
   */
  sortNum(arr, desc = false) {
    const copy = arr.slice();
    copy.sort((a, b) => (desc ? b - a : a - b));
    return copy;
  },

  /**
   * 按牌值排序 Card 对象
   * @param {Array<Card>} cards
   * @param {boolean} desc
   * @returns {Array<Card>}
   */
  sortCards(cards, desc = false) {
    const copy = cards.slice();
    copy.sort((a, b) => (desc ? b.compareTo(a) : a.compareTo(b)));
    return copy;
  },

  /**
   * 按 value 分组计数
   * @param {Array<Card>} cards
   * @returns {Map<number, Card[]>}
   */
  groupByValue(cards) {
    const map = new Map();
    for (const c of cards) {
      if (!map.has(c.value)) map.set(c.value, []);
      map.get(c.value).push(c);
    }
    return map;
  },

  /**
   * 按花色分组
   * @param {Array<Card>} cards
   * @returns {Map<string, Card[]>}
   */
  groupBySuit(cards) {
    const map = new Map();
    for (const c of cards) {
      if (!map.has(c.suit)) map.set(c.suit, []);
      map.get(c.suit).push(c);
    }
    return map;
  },

  /**
   * 统计每个 value 的数量
   * @param {Array<Card>} cards
   * @returns {Map<number, number>}
   */
  countByValue(cards) {
    const map = new Map();
    for (const c of cards) {
      map.set(c.value, (map.get(c.value) || 0) + 1);
    }
    return map;
  },

  /**
   * 深拷贝（简单JSON方式）
   * @param {*} obj
   * @returns {*}
   */
  clone(obj) {
    return JSON.parse(JSON.stringify(obj));
  },

  /**
   * 延时 Promise
   * @param {number} ms
   * @returns {Promise}
   */
  delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  },

  /**
   * 限制范围
   * @param {number} v
   * @param {number} min
   * @param {number} max
   * @returns {number}
   */
  clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
  },

  /**
   * 防抖
   * @param {Function} fn
   * @param {number} wait
   * @returns {Function}
   */
  debounce(fn, wait = 200) {
    let timer = null;
    return function (...args) {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), wait);
    };
  },

  /**
   * 节流
   * @param {Function} fn
   * @param {number} wait
   * @returns {Function}
   */
  throttle(fn, wait = 100) {
    let last = 0;
    return function (...args) {
      const now = Date.now();
      if (now - last >= wait) {
        last = now;
        fn.apply(this, args);
      }
    };
  },

  /**
   * 获取URL参数
   * @param {string} name
   * @returns {string|null}
   */
  getUrlParam(name) {
    if (typeof window === 'undefined') return null;
    const params = new URLSearchParams(window.location.search);
    return params.get(name);
  },

  /**
   * 是否调试模式
   * @returns {boolean}
   */
  isDebug() {
    if (this.getUrlParam('debug') === '1') return true;
    try {
      return localStorage.getItem('happycard_debug') === 'true';
    } catch (e) { return false; }
  },

  /**
   * 格式化时间
   * @param {Date|number} date
   * @param {string} fmt
   * @returns {string}
   */
  formatTime(date, fmt = 'YYYY-MM-DD HH:mm') {
    const d = date instanceof Date ? date : new Date(date);
    const pad = (n) => String(n).padStart(2, '0');
    return fmt
      .replace('YYYY', d.getFullYear())
      .replace('MM', pad(d.getMonth() + 1))
      .replace('DD', pad(d.getDate()))
      .replace('HH', pad(d.getHours()))
      .replace('mm', pad(d.getMinutes()))
      .replace('ss', pad(d.getSeconds()));
  },

  /**
   * 控制台日志（带模块前缀）
   * @param {string} module
   * @param  {...any} args
   */
  log(module, ...args) {
    if (this.isDebug()) {
      const time = this.formatTime(new Date(), 'HH:mm:ss');
      console.log(`%c[${time}][${module}]`, 'color:#0d8a4e;font-weight:bold', ...args);
    }
  },

  warn(module, ...args) {
    if (this.isDebug()) {
      const time = this.formatTime(new Date(), 'HH:mm:ss');
      console.warn(`[${time}][${module}]`, ...args);
    }
  }
};

if (typeof window !== 'undefined') {
  window.Utils = Utils;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = Utils;
}
