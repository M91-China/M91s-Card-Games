/**
 * @file storage.js
 * @description 本地存储封装（localStorage）
 * @author HappyCard Team
 * @date 2026-08
 */

class Storage {
  constructor(prefix = 'happycard_') {
    this.prefix = prefix;
    this._available = this._checkAvailable();
  }

  _checkAvailable() {
    if (typeof window === 'undefined' || !window.localStorage) return false;
    try {
      const k = '__test__';
      window.localStorage.setItem(k, '1');
      window.localStorage.removeItem(k);
      return true;
    } catch (e) {
      return false;
    }
  }

  /**
   * 读取并反序列化
   * @param {string} key
   * @param {*} defaultValue
   * @returns {*}
   */
  get(key, defaultValue = null) {
    if (!this._available) return defaultValue;
    try {
      const raw = window.localStorage.getItem(this.prefix + key);
      if (raw === null) return defaultValue;
      return JSON.parse(raw);
    } catch (e) {
      console.warn('[Storage] 读取失败:', key, e);
      return defaultValue;
    }
  }

  /**
   * 序列化并存储
   * @param {string} key
   * @param {*} value
   * @returns {boolean}
   */
  set(key, value) {
    if (!this._available) return false;
    try {
      window.localStorage.setItem(this.prefix + key, JSON.stringify(value));
      return true;
    } catch (e) {
      console.warn('[Storage] 写入失败:', key, e);
      return false;
    }
  }

  /**
   * 删除
   * @param {string} key
   */
  remove(key) {
    if (!this._available) return;
    window.localStorage.removeItem(this.prefix + key);
  }

  /**
   * 清空全部（当前前缀）
   */
  clearAll() {
    if (!this._available) return;
    const keys = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i);
      if (k && k.startsWith(this.prefix)) keys.push(k);
    }
    keys.forEach((k) => window.localStorage.removeItem(k));
  }
}

const storage = new Storage();

if (typeof window !== 'undefined') {
  window.Storage = Storage;
  window.storage = storage;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { Storage, storage };
}
