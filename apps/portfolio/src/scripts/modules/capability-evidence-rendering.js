import { CAPABILITY_UI_COPY } from './capability-evidence-data.js';

function createElement(tagName, className, text = '') {
  const element = document.createElement(tagName);
  if (className) element.className = className;
  if (text) element.textContent = text;
  return element;
}

export function renderCapabilityEvidence(capabilities, locale) {
  const existing = document.querySelector('.capability-evidence');
  if (existing) return existing;

  const skills = document.querySelector('#skills .container, #skills');
  if (!skills) throw new Error('capability evidence requires #skills');
  const copy = CAPABILITY_UI_COPY[locale];
  const region = createElement('section', 'capability-evidence');
  region.dataset.capabilityEvidence = 'true';
  region.setAttribute('aria-labelledby', 'capability-evidence-heading');

  const heading = createElement('h3', 'capability-evidence__heading', copy.heading);
  heading.id = 'capability-evidence-heading';
  const controls = createElement('div', 'capability-evidence__controls');
  controls.setAttribute('role', 'group');
  controls.setAttribute('aria-label', copy.region);
  for (const capability of capabilities) {
    const button = createElement('button', 'capability-control', capability.label);
    button.type = 'button';
    button.dataset.capabilityControl = capability.id;
    button.setAttribute('aria-pressed', 'false');
    controls.appendChild(button);
  }

  const status = createElement('p', 'capability-evidence__status');
  status.dataset.capabilityStatus = 'true';
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');
  status.setAttribute('aria-atomic', 'true');
  region.append(heading, controls, status);

  const sectionDescription = skills.querySelector(':scope > .section-description');
  if (sectionDescription) sectionDescription.insertAdjacentElement('afterend', region);
  else skills.prepend(region);
  return region;
}
