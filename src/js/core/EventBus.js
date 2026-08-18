/**
 * @file EventBus.js
 * @description 全局事件总线，用于模块间解耦通信
 * @author HappyCard Team
 * @date 2026-08
 */

class EventBus {
  constructor() {
    this._events = new Map();
  }

  /**
   * 监听事件
   * @param {string} event
   * @param {Function} handler
   * @param {*} context
   * @returns {Function} 取消监听函数
   */
  on(event, handler, context = null) {
    if (!this._events.has(event)) {
      this._events.set(event, []);
    }
    this._events.get(event).push({ handler, context, once: false });
    return () => this.off(event, handler);
  }

  /**
   * 监听一次
   * @param {string} event
   * @param {Function} handler
   * @param {*} context
   * @returns {Function}
   */
  once(event, handler, context = null) {
    if (!this._events.has(event)) {
      this._events.set(event, []);
    }
    this._events.get(event).push({ handler, context, once: true });
    return () => this.off(event, handler);
  }

  /**
   * 取消监听
   * @param {string} event
   * @param {Function} handler
   */
  off(event, handler) {
    const list = this._events.get(event);
    if (!list) return;
    if (!handler) {
      this._events.delete(event);
      return;
    }
    const idx = list.findIndex((l) => l.handler === handler);
    if (idx >= 0) list.splice(idx, 1);
    if (list.length === 0) this._events.delete(event);
  }

  /**
   * 触发事件
   * @param {string} event
   * @param  {...any} args
   */
  emit(event, ...args) {
    const list = this._events.get(event);
    if (!list || list.length === 0) return;
    const snapshot = list.slice();
    for (const item of snapshot) {
      try {
        item.handler.apply(item.context, args);
      } catch (e) {
        console.error(`[EventBus] 事件处理异常: ${event}`, e);
      }
      if (item.once) {
        this.off(event, item.handler);
      }
    }
  }

  /**
   * 清空所有事件
   */
  clear() {
    this._events.clear();
  }

  /**
   * 获取事件监听器数量
   * @param {string} event
   * @returns {number}
   */
  listenerCount(event) {
    const list = this._events.get(event);
    return list ? list.length : 0;
  }
}

const eventBus = new EventBus();

if (typeof window !== 'undefined') {
  window.EventBus = EventBus;
  window.eventBus = eventBus;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { EventBus, eventBus };
}
