/**
 * @file Storage.js
 * @description 用户数据存储封装（纯前端 localStorage）
 * @author M91's Card Games Team
 * @date 2026-08
 */

class UserStorage {
  constructor(prefix = 'm91_user_') {
    this.prefix = prefix;
    this._available = this._checkAvailable();
  }

  _checkAvailable() {
    if (typeof window === 'undefined' || !window.localStorage) return false;
    try {
      const key = '__m91_storage_test__';
      window.localStorage.setItem(key, '1');
      window.localStorage.removeItem(key);
      return true;
    } catch (e) {
      return false;
    }
  }

  get(key, defaultValue = null) {
    if (!this._available) return defaultValue;
    try {
      const raw = window.localStorage.getItem(this.prefix + key);
      if (raw === null) return defaultValue;
      return JSON.parse(raw);
    } catch (e) {
      console.warn('[UserStorage] 读取失败:', key, e);
      return defaultValue;
    }
  }

  set(key, value) {
    if (!this._available) return false;
    try {
      window.localStorage.setItem(this.prefix + key, JSON.stringify(value));
      return true;
    } catch (e) {
      console.warn('[UserStorage] 写入失败:', key, e);
      return false;
    }
  }

  remove(key) {
    if (!this._available) return;
    window.localStorage.removeItem(this.prefix + key);
  }

  clearAll() {
    if (!this._available) return;
    const keys = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (key && key.startsWith(this.prefix)) keys.push(key);
    }
    keys.forEach((key) => window.localStorage.removeItem(key));
  }
}

const userStorage = new UserStorage();

if (typeof window !== 'undefined') {
  window.UserStorage = UserStorage;
  window.userStorage = userStorage;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { UserStorage, userStorage };
}
