import { createIconElement } from './project-card-formatting.js';

/**
 * @typedef {import('./project-deep-dive-overlay.js').DeepDiveMetric} DeepDiveMetric
 * @typedef {import('./project-deep-dive-overlay.js').DeepDiveTool} DeepDiveTool
 */

/**
 * @template {keyof HTMLElementTagNameMap} K
 * @param {K} tagName
 * @param {string} [className]
 * @param {string} [text]
 * @returns {HTMLElementTagNameMap[K]}
 */
export function createElement(tagName, className, text = '') {
  const element = document.createElement(tagName);
  if (className) element.className = className;
  if (text) element.textContent = text;
  return element;
}

/**
 * @param {string} key
 * @param {string} text
 * @returns {HTMLSpanElement}
 */
export function createKeyHint(key, text) {
  const hint = createElement('span', 'key-hint');
  hint.append(createElement('span', 'key-hint__key', key), document.createTextNode(` ${text}`));
  return hint;
}

/**
 * Digits and separators stay in the period's mono face; a localized word such
 * as the "current" marker gets its own span so it can use the label face.
 * @param {string} period
 * @returns {HTMLDivElement}
 */
export function createPeriod(period) {
  const element = createElement('div', 'deep-dive-header__period');
  period.split(/(\p{L}+)/u).forEach((part, index) => {
    if (!part) return;
    element.append(
      index % 2
        ? createElement('span', 'deep-dive-header__period-word', part)
        : document.createTextNode(part)
    );
  });
  return element;
}

/**
 * @param {string[]} achievements
 * @returns {HTMLUListElement}
 */
export function createAchievements(achievements) {
  const list = createElement('ul', 'achievements-list');
  achievements.forEach((achievement) => {
    const item = createElement('li', 'achievements-list__item');
    const check = createElement('span', 'achievements-list__check');
    check.appendChild(createIconElement('check', 'achievements-list__icon'));
    item.append(check, createElement('span', 'achievements-list__text', achievement));
    list.appendChild(item);
  });
  return list;
}

/**
 * @param {DeepDiveMetric[]} metrics
 * @returns {HTMLDivElement}
 */
export function createMetrics(metrics) {
  const grid = createElement('div', 'metrics-grid');
  metrics.forEach((metric) => {
    const card = createElement('div', 'metric-card');
    const value = createElement('div', 'metric-card__value', metric.value);
    value.dataset.target = metric.value;
    card.append(value, createElement('div', 'metric-card__label', metric.label));
    grid.appendChild(card);
  });
  return grid;
}

/**
 * @param {DeepDiveTool[]} tools
 * @returns {HTMLDivElement}
 */
export function createTools(tools) {
  const grid = createElement('div', 'tools-grid');
  tools.forEach((tool) => {
    const item = createElement('div', 'tool-item');
    const icon = createElement('span', 'tool-item__icon');
    icon.appendChild(createIconElement(tool.icon));
    item.append(icon, createElement('span', '', tool.name));
    grid.appendChild(item);
  });
  return grid;
}
