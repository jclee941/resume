'use strict';

/**
 * Minimal DOM double for portfolio browser-module tests: just enough tree, attribute, class and
 * event behaviour to exercise the modules without a browser. Selectors support comma lists and
 * compound selectors of tag, `.class`, `[attr]` and `[attr="value"]`.
 */

/**
 * @param {string} selector
 * @returns {Array<(element: any) => boolean>}
 */
function compileSelector(selector) {
  return selector.split(',').map((part) => {
    const tag = /^[a-z][a-z0-9-]*/i.exec(part.trim())?.[0];
    const classes = [...part.matchAll(/\.([\w-]+)/g)].map((match) => match[1]);
    const attrs = [...part.matchAll(/\[([\w-]+)(?:="([^"]*)")?\]/g)].map((match) => [
      match[1],
      match[2],
    ]);
    return (element) =>
      (!tag || element.tagName === tag.toUpperCase()) &&
      classes.every((name) => element.classList.contains(name)) &&
      attrs.every(([name, value]) =>
        value === undefined ? element.hasAttribute(name) : element.getAttribute(name) === value
      );
  });
}

function createFakeElement(tag = 'div') {
  const element = {
    nodeType: 1,
    tagName: tag.toUpperCase(),
    children: [],
    parentElement: null,
    attributes: {},
    dataset: {},
    style: {},
    listeners: {},
    rect: { left: 0, top: 0, width: 100, height: 100 },
    animations: [],
    get className() {
      return this.attributes.class || '';
    },
    set className(value) {
      this.attributes.class = String(value);
    },
    get textContent() {
      return this.children.map((child) => child.textContent).join('');
    },
    set textContent(value) {
      this.children = [{ nodeType: 3, textContent: String(value) }];
    },
    classList: {
      add: (...names) => names.forEach((name) => element.classList.toggle(name, true)),
      remove: (...names) => names.forEach((name) => element.classList.toggle(name, false)),
      contains: (name) => element.className.split(/\s+/).includes(name),
      toggle(name, force) {
        const names = element.className.split(/\s+/).filter(Boolean);
        const present = names.includes(name);
        const next = force === undefined ? !present : force;
        const kept = names.filter((item) => item !== name);
        element.className = (next ? [...kept, name] : kept).join(' ');
        return next;
      },
    },
    setAttribute(name, value) {
      this.attributes[name] = String(value);
    },
    getAttribute(name) {
      return Object.hasOwn(this.attributes, name) ? this.attributes[name] : null;
    },
    removeAttribute(name) {
      delete this.attributes[name];
    },
    hasAttribute(name) {
      return Object.hasOwn(this.attributes, name);
    },
    append(...nodes) {
      nodes.forEach((node) => this.appendChild(typeof node === 'string' ? text(node) : node));
    },
    appendChild(node) {
      node.parentElement?.removeChild?.(node);
      node.parentElement = this;
      this.children.push(node);
      return node;
    },
    prepend(node) {
      node.parentElement = this;
      this.children.unshift(node);
    },
    removeChild(node) {
      this.children = this.children.filter((child) => child !== node);
    },
    remove() {
      this.parentElement?.removeChild(this);
      this.parentElement = null;
    },
    addEventListener(type, handler) {
      (this.listeners[type] ||= []).push(handler);
    },
    click() {
      (this.listeners.click || []).forEach((handler) =>
        handler({ target: this, currentTarget: this, preventDefault() {} })
      );
    },
    matches(selector) {
      return compileSelector(selector).some((test) => test(this));
    },
    querySelectorAll(selector) {
      const tests = compileSelector(selector);
      const found = [];
      const visit = (node) => {
        node.children
          .filter((child) => child.nodeType === 1)
          .forEach((child) => {
            if (tests.some((test) => test(child))) found.push(child);
            visit(child);
          });
      };
      visit(this);
      return found;
    },
    querySelector(selector) {
      return this.querySelectorAll(selector)[0] || null;
    },
    closest(selector) {
      for (let node = this; node; node = node.parentElement) {
        if (node.matches(selector)) return node;
      }
      return null;
    },
    getBoundingClientRect() {
      return this.rect;
    },
    getClientRects() {
      return this.rect.width ? [this.rect] : [];
    },
    animate(keyframes, options) {
      const animation = {
        keyframes,
        options,
        cancelled: false,
        cancel() {
          this.cancelled = true;
        },
      };
      this.animations.push(animation);
      return animation;
    },
  };
  return element;
}

function text(value) {
  return { nodeType: 3, textContent: String(value) };
}

function createFakeDocument({ lang = 'ko', body } = {}) {
  const documentElement = createFakeElement('html');
  documentElement.lang = lang;
  return {
    documentElement,
    body: body || createFakeElement('body'),
    createElement: createFakeElement,
    createElementNS: (_namespace, tag) => createFakeElement(tag),
  };
}

module.exports = { createFakeElement, createFakeDocument };
