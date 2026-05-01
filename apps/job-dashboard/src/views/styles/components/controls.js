export const CONTROL_STYLES = `
.search-box {
  background: var(--color-bg-primary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 0.5rem 1rem;
  color: var(--color-text-primary);
  min-width: 200px;
  transition: border-color var(--transition-fast);
}

.search-box:focus {
  outline: none;
  border-color: var(--color-accent-hover);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

select {
  background: var(--color-bg-primary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 0.5rem 0.75rem;
  color: var(--color-text-primary);
  cursor: pointer;
  transition: border-color var(--transition-fast);
}

select:focus {
  outline: none;
  border-color: var(--color-accent-hover);
}
`;
