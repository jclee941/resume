/* Layout & Responsive Styles */

export const LAYOUT_STYLES = `
.empty-state {
  text-align: center;
  padding: 3rem;
  color: var(--color-text-muted);
}

.loading {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
}

.loading::after {
  content: '';
  width: 1rem;
  height: 1rem;
  border: 2px solid var(--color-border);
  border-top-color: var(--color-accent);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.automation-status {
  margin-top: 1rem;
  padding: 1rem;
  background: var(--color-bg-primary);
  border-radius: var(--radius-md);
  border-left: 3px solid var(--color-accent-hover);
  display: none;
}

.automation-status.visible {
  display: block;
}

.automation-status.success {
  border-left-color: var(--color-success);
}

.automation-status.error {
  border-left-color: var(--color-error);
}

.keyboard-hint {
  font-size: 0.75rem;
  color: var(--color-text-muted);
  margin-left: auto;
}

kbd {
  display: inline-block;
  padding: 0.125rem 0.375rem;
  font-family: monospace;
  font-size: 0.75rem;
  background: var(--color-bg-tertiary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
}

@media (max-width: 768px) {
  body {
    padding: 1rem;
  }

  h1 {
    font-size: 1.5rem;
  }

  h2 {
    flex-direction: column;
    align-items: flex-start;
  }

  .toolbar {
    width: 100%;
    flex-direction: column;
    align-items: stretch;
  }

  .search-box {
    min-width: 100%;
  }

  table {
    font-size: 0.875rem;
  }

  th, td {
    padding: 0.5rem;
  }

  .hide-mobile {
    display: none;
  }

  .card {
    padding: 1rem;
  }

  .stat-value {
    font-size: 1.5rem;
  }

  .modal-content {
    padding: 1.5rem;
  }
}

@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}

.loading-overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.8);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  gap: 1rem;
}

.loading-spinner {
  width: 48px;
  height: 48px;
  border: 3px solid var(--color-bg-tertiary);
  border-top-color: var(--color-accent);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.loading-text {
  color: var(--color-text-secondary);
  font-size: 0.875rem;
}

.skeleton {
  background: linear-gradient(90deg, var(--color-bg-tertiary) 25%, var(--color-bg-secondary) 50%, var(--color-bg-tertiary) 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: var(--radius-md);
}

@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

.skeleton-stat { height: 4rem; }
.skeleton-row { height: 3rem; margin-bottom: 0.5rem; }

.error-banner {
  background: var(--color-error-bg);
  border: 1px solid var(--color-error);
  color: var(--color-error-text);
  padding: 1rem;
  border-radius: var(--radius-md);
  margin-bottom: 1rem;
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.error-banner button {
  margin-left: auto;
  background: var(--color-error);
  color: white;
  border: none;
  padding: 0.375rem 0.75rem;
  border-radius: var(--radius-sm);
  cursor: pointer;
}

.kbd-help {
  position: fixed;
  bottom: 1rem;
  right: 1rem;
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: 1rem;
  font-size: 0.75rem;
  color: var(--color-text-secondary);
  box-shadow: var(--shadow-md);
  z-index: 100;
  max-width: 200px;
}

.kbd-help h4 {
  color: var(--color-text-primary);
  margin-bottom: 0.5rem;
  font-size: 0.875rem;
}

.kbd-help ul {
  list-style: none;
}

.kbd-help li {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.25rem 0;
}

.kbd-help kbd {
  background: var(--color-bg-tertiary);
  padding: 0.125rem 0.375rem;
  border-radius: var(--radius-sm);
  font-family: monospace;
  font-size: 0.7rem;
}

.kbd-help-toggle {
  position: fixed;
  bottom: 1rem;
  right: 1rem;
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  color: var(--color-text-secondary);
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.25rem;
  z-index: 99;
}

.theme-toggle {
  background: transparent;
  border: 1px solid var(--color-border);
  color: var(--color-text-secondary);
  padding: 0.5rem;
  border-radius: var(--radius-md);
  cursor: pointer;
  font-size: 1.25rem;
  transition: all var(--transition-fast);
}

.theme-toggle:hover {
  background: var(--color-bg-tertiary);
  color: var(--color-text-primary);
}

@media (max-width: 600px) {
  .kbd-help { display: none; }
  .kbd-help-toggle { display: none; }
}
`;
