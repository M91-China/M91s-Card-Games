/**
 * @file Renderer.js
 * @description 渲染器基类，提供DOM操作通用能力
 * @author HappyCard Team
 * @date 2026-08
 */

class Renderer {
  constructor(container) {
    this.container = typeof container === 'string' ? document.querySelector(container) : container;
    this.el = null;
  }

  /**
   * 创建元素
   * @param {string} tag
   * @param {Object} [attrs]
   * @param {Array|string} [children]
   * @returns {HTMLElement}
   */
  createEl(tag, attrs = {}, children) {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (k === 'class' || k === 'className') {
        el.className = v;
      } else if (k === 'style' && typeof v === 'object') {
        Object.assign(el.style, v);
      } else if (k.startsWith('on') && typeof v === 'function') {
        el.addEventListener(k.slice(2).toLowerCase(), v);
      } else if (k === 'dataset' && typeof v === 'object') {
        Object.assign(el.dataset, v);
      } else if (k === 'html') {
        el.innerHTML = v;
      } else if (k === 'text') {
        el.textContent = v;
      } else {
        el.setAttribute(k, v);
      }
    }
    if (children != null) {
      if (Array.isArray(children)) {
        children.forEach((c) => {
          if (c == null) return;
          el.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
        });
      } else if (typeof children === 'string') {
        el.textContent = children;
      } else {
        el.appendChild(children);
      }
    }
    return el;
  }

  /**
   * 清空容器
   */
  clear() {
    if (this.el) this.el.innerHTML = '';
  }

  /**
   * 显示/隐藏
   * @param {boolean} visible
   */
  setVisible(visible) {
    if (this.el) this.el.style.display = visible ? '' : 'none';
  }

  /**
   * 渲染（子类实现）
   */
  render() {
    throw new Error('Renderer.render() 必须由子类实现');
  }
}

if (typeof window !== 'undefined') {
  window.Renderer = Renderer;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = Renderer;
}
