function projectIdForCard(card) {
  return card.id.startsWith('project-') ? card.id.slice('project-'.length) : '';
}

export function collectCapabilityProjectCards() {
  return Array.from(document.querySelectorAll('#projects li.project-item'));
}

export function indexCapabilityProjectCards(cards) {
  return new Map(cards.map((card) => [projectIdForCard(card), card]));
}

export function tagCapabilityProjectCards(cards, capabilities) {
  const capabilitiesByProject = new Map();
  for (const capability of capabilities) {
    for (const projectId of capability.projectIds) {
      const assigned = capabilitiesByProject.get(projectId) || [];
      assigned.push(capability.id);
      capabilitiesByProject.set(projectId, assigned);
    }
  }

  for (const card of cards) {
    const projectId = projectIdForCard(card);
    const assigned = capabilitiesByProject.get(projectId) || [];
    if (assigned.length > 0) {
      card.dataset.capabilities = assigned.join(' ');
    } else {
      delete card.dataset.capabilities;
    }
  }
}

export function capabilityProjectName(card) {
  const title = card.querySelector('.project-link-title, .project-title');
  return (title?.textContent || '').replace('↗', '').replace(/\s+/g, ' ').trim();
}

export function clearCapabilityProjectState(cards) {
  for (const card of cards) {
    delete card.dataset.capabilityMatch;
    card.classList.remove('is-capability-match', 'is-capability-muted');
  }
}

export function applyCapabilityProjectState(cards, matchingCards) {
  const matches = new Set(matchingCards);
  for (const card of cards) {
    const isMatch = matches.has(card);
    card.dataset.capabilityMatch = String(isMatch);
    card.classList.toggle('is-capability-match', isMatch);
    card.classList.toggle('is-capability-muted', !isMatch);
  }
}
