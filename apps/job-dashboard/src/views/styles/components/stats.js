export const STAT_STYLES = `
.stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 1rem;
}

.stat {
  text-align: center;
  cursor: pointer;
  padding: 0.75rem;
  border-radius: var(--radius-md);
  transition: all var(--transition-normal);
  border: 1px solid transparent;
}

.stat:hover {
  background: var(--color-bg-tertiary);
  border-color: var(--color-border);
  transform: translateY(-2px);
}

.stat:active {
  transform: translateY(0);
}

.stat-value {
  font-size: 2rem;
  font-weight: 700;
  color: var(--color-accent);
  line-height: 1.2;
}

.stat-label {
  font-size: 0.875rem;
  color: var(--color-text-secondary);
  margin-top: 0.25rem;
}
`;
