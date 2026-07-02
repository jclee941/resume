function createElement(tagName, className, text = '') {
  const element = document.createElement(tagName);
  if (className) element.className = className;
  if (text) element.textContent = text;
  return element;
}

export function createArchitectureElement(project) {
  const flow = createElement('div', 'architecture-flow');
  flow.setAttribute('role', 'group');
  flow.setAttribute('aria-label', `${project.title} architecture flow`);
  const steps = createArchitectureSteps(project.architecture);
  if (steps) flow.appendChild(steps);
  const diagram = createElement('div', 'architecture-diagram');
  diagram.tabIndex = 0;
  diagram.setAttribute('role', 'img');
  diagram.setAttribute('aria-label', `${project.title} architecture flow`);
  diagram.appendChild(createElement('pre', 'architecture-diagram__text', project.architecture));
  flow.appendChild(diagram);
  return flow;
}

function createArchitectureSteps(architecture) {
  const steps = architectureSteps(architecture);
  if (steps.length === 0) return null;

  const list = createElement('ol', 'architecture-steps');
  steps.forEach((step, index) => {
    const item = createElement('li', 'architecture-step');
    item.append(
      createElement('span', 'architecture-step__index', String(index + 1).padStart(2, '0')),
      createElement('span', 'architecture-step__label', step)
    );
    list.appendChild(item);
  });
  return list;
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
