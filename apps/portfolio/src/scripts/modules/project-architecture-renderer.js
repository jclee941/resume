/**
 * @template {keyof HTMLElementTagNameMap} K
 * @param {K} tagName
 * @param {string} className
 * @param {string} [text='']
 * @returns {HTMLElementTagNameMap[K]}
 */
function createElement(tagName, className, text = '') {
  const element = document.createElement(tagName);
  if (className) element.className = className;
  if (text) element.textContent = text;
  return element;
}

/**
 * @param {{ title: string, architecture: string }} project
 * @returns {HTMLDivElement}
 */
export function createArchitectureElement(project) {
  const flow = createElement('div', 'architecture-flow');
  flow.setAttribute('role', 'group');
  flow.setAttribute('aria-label', `${project.title} architecture flow`);
  const steps = createArchitectureSteps(project.architecture);
  if (steps) {
    flow.appendChild(steps);
    return flow;
  }
  const diagram = createElement('div', 'architecture-diagram');
  diagram.tabIndex = 0;
  diagram.setAttribute('role', 'img');
  diagram.setAttribute('aria-label', `${project.title} architecture flow`);
  diagram.appendChild(createElement('pre', 'architecture-diagram__text', project.architecture));
  flow.appendChild(diagram);
  return flow;
}

/**
 * @param {string} architecture
 * @returns {HTMLOListElement|null}
 */
function createArchitectureSteps(architecture) {
  const steps = architectureSteps(architecture);
  if (steps.length < 2) return null;

  const list = createElement('ol', 'architecture-steps');
  steps.forEach((step, index) => {
    const item = createElement('li', 'architecture-step');
    if (index > 0 && step.caption) {
      item.classList.add('architecture-step--captioned');
      item.appendChild(createElement('span', 'architecture-step__caption', step.caption));
    }
    item.append(
      createElement('span', 'architecture-step__index', String(index + 1).padStart(2, '0')),
      createElement('span', 'architecture-step__label', step.label)
    );
    list.appendChild(item);
  });
  return list;
}

/**
 * @typedef {Object} ArchitectureStep
 * @property {string} label
 * @property {string} [caption]
 */

/**
 * @typedef {Object} ArchitectureBox
 * @property {number} start
 * @property {string[]} parts
 * @property {string} [caption]
 */

/**
 * @typedef {Object} ArchitectureCell
 * @property {number} start
 * @property {string} text
 */

/**
 * @param {ArchitectureBox} box
 * @returns {ArchitectureStep}
 */
function finalizeBox(box) {
  const label = box.parts.join(' ').replace(/\s+/g, ' ').trim();
  return box.caption ? { label, caption: box.caption } : { label };
}

/**
 * @param {string} architecture
 * @returns {ArchitectureStep[]}
 */
export function architectureSteps(architecture) {
  /** @type {ArchitectureStep[]} */
  const steps = [];
  /** @type {ArchitectureBox[]} */
  let activeBoxes = [];
  /** @type {string[]} */
  let pendingCaptions = [];

  for (const line of String(architecture || '').split('\n')) {
    const cells = architectureLineCells(line);

    if (cells.length === 0) {
      if (activeBoxes.length > 0) {
        steps.push(...activeBoxes.map(finalizeBox));
        activeBoxes = [];
      }
      const caption = line
        .replace(/[┌┐└┘├┤┬┴┼─│▼▽↓↑←→]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
      if (caption && steps.length > 0) {
        pendingCaptions.push(caption);
      }
      continue;
    }

    /** @type {ArchitectureBox[]} */
    const nextBoxes = [];
    for (const cell of cells) {
      const box = activeBoxes.find((item) => Math.abs(item.start - cell.start) <= 2);
      if (box) {
        box.parts.push(cell.text);
        nextBoxes.push(box);
      } else {
        const caption = pendingCaptions.length > 0 ? pendingCaptions.join(' ') : '';
        pendingCaptions = [];
        nextBoxes.push({
          start: cell.start,
          parts: [cell.text],
          ...(caption ? { caption } : {}),
        });
      }
    }

    for (const box of activeBoxes) {
      if (!nextBoxes.includes(box)) {
        steps.push(finalizeBox(box));
      }
    }
    activeBoxes = nextBoxes;
  }

  steps.push(...activeBoxes.map(finalizeBox));
  return steps.filter((step) => Boolean(step.label));
}

/**
 * @param {string} line
 * @returns {ArchitectureCell[]}
 */
function architectureLineCells(line) {
  const cells = [];
  const pattern = /│([^│]+)│/g;
  let match = pattern.exec(line);

  while (match) {
    const text = match[1].trim();
    if (text) {
      cells.push({ start: match.index, text });
    }
    match = pattern.exec(line);
  }

  return cells;
}
