import { escapeHtml } from './project-card-formatting.js';

export function renderArchitecture(project) {
  return `<div class="architecture-flow" role="group" aria-label="${escapeHtml(project.title)} architecture flow">
    ${renderArchitectureSteps(project.architecture)}
    <div class="architecture-diagram" tabindex="0" role="img" aria-label="${escapeHtml(project.title)} architecture flow">
      <pre class="architecture-diagram__text">${escapeHtml(project.architecture)}</pre>
    </div>
  </div>`;
}

function renderArchitectureSteps(architecture) {
  const steps = architectureSteps(architecture);
  if (steps.length === 0) return '';

  return `<ol class="architecture-steps">
    ${steps
      .map(
        (step, index) => `<li class="architecture-step">
          <span class="architecture-step__index">${String(index + 1).padStart(2, '0')}</span>
          <span class="architecture-step__label">${escapeHtml(step)}</span>
        </li>`
      )
      .join('')}
  </ol>`;
}

function architectureSteps(architecture) {
  const steps = [];
  let activeBoxes = [];

  for (const line of architecture.split('\n')) {
    const cells = architectureLineCells(line);

    if (cells.length === 0) {
      steps.push(...activeBoxes.map((box) => box.parts.join(' ')));
      activeBoxes = [];
      continue;
    }

    const nextBoxes = [];
    for (const cell of cells) {
      const box = activeBoxes.find((item) => Math.abs(item.start - cell.start) <= 2);
      if (box) {
        box.parts.push(cell.text);
        nextBoxes.push(box);
      } else {
        nextBoxes.push({ start: cell.start, parts: [cell.text] });
      }
    }

    for (const box of activeBoxes) {
      if (!nextBoxes.includes(box)) {
        steps.push(box.parts.join(' '));
      }
    }
    activeBoxes = nextBoxes;
  }

  steps.push(...activeBoxes.map((box) => box.parts.join(' ')));
  return steps.filter(Boolean);
}

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
