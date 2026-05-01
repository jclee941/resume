export const BADGE_STYLES = `
.badge {
  display: inline-flex;
  align-items: center;
  padding: 0.25rem 0.625rem;
  border-radius: var(--radius-sm);
  font-size: 0.75rem;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.025em;
}

.badge-ok { background: var(--color-success-bg); color: var(--color-success-text); }
.badge-applied { background: #1e40af; color: #93c5fd; }
.badge-interview { background: var(--color-warning-bg); color: var(--color-warning-text); }
.badge-offer { background: var(--color-success-bg); color: var(--color-success-text); }
.badge-rejected { background: var(--color-error-bg); color: var(--color-error-text); }
.badge-saved { background: #374151; color: #9ca3af; }
`;
