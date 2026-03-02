/* CSS Variables & Base Styles */

export const VARIABLE_STYLES = `
* { box-sizing: border-box; margin: 0; padding: 0; }

/* Screen reader only class */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

/* Focus visible styles for accessibility */
:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 2px;
}

:root {
  --color-bg-primary: #0f172a;
  --color-bg-secondary: #1e293b;
  --color-bg-tertiary: #334155;
  --color-text-primary: #e2e8f0;
  --color-text-secondary: #94a3b8;
  --color-text-muted: #64748b;
  --color-accent: #60a5fa;
  --color-accent-hover: #3b82f6;
  --color-success: #10b981;
  --color-success-bg: #065f46;
  --color-success-text: #6ee7b7;
  --color-warning-bg: #7c2d12;
  --color-warning-text: #fdba74;
  --color-error: #ef4444;
  --color-error-bg: #7f1d1d;
  --color-error-text: #fca5a5;
  --color-border: #334155;
  --radius-sm: 0.25rem;
  --radius-md: 0.375rem;
  --radius-lg: 0.5rem;
  --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1);
  --transition-fast: 0.15s ease;
  --transition-normal: 0.2s ease;
}

/* Light theme */
[data-theme="light"] {
  --color-bg-primary: #f8fafc;
  --color-bg-secondary: #ffffff;
  --color-bg-tertiary: #f1f5f9;
  --color-text-primary: #1e293b;
  --color-text-secondary: #475569;
  --color-text-muted: #94a3b8;
  --color-border: #e2e8f0;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif;
  background: var(--color-bg-primary);
  color: var(--color-text-primary);
  padding: 1rem 2rem;
  line-height: 1.5;
}

h1 {
  color: var(--color-accent);
  margin-bottom: 1rem;
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
}

h2 {
  margin-bottom: 1rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.5rem;
}
`;
