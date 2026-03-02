/* Component Styles */

export const COMPONENT_STYLES = `
.card {
  background: var(--color-bg-secondary);
  border-radius: var(--radius-lg);
  padding: 1.5rem;
  margin-bottom: 1rem;
  box-shadow: var(--shadow-sm);
}

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

table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 1rem;
}

th, td {
  padding: 0.75rem 1rem;
  text-align: left;
  border-bottom: 1px solid var(--color-border);
}

th {
  color: var(--color-text-secondary);
  font-weight: 500;
  font-size: 0.875rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

tr {
  transition: background var(--transition-fast);
}

tr:hover {
  background: var(--color-bg-tertiary);
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border: none;
  border-radius: var(--radius-md);
  cursor: pointer;
  font-size: 0.875rem;
  font-weight: 500;
  transition: all var(--transition-normal);
  white-space: nowrap;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-primary {
  background: var(--color-accent-hover);
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #2563eb;
  transform: translateY(-1px);
}

.btn-secondary {
  background: #475569;
  color: white;
}

.btn-secondary:hover:not(:disabled) {
  background: #64748b;
}

.btn-danger {
  background: #dc2626;
  color: white;
}

.btn-danger:hover:not(:disabled) {
  background: #b91c1c;
}

.btn-sm {
  padding: 0.375rem 0.75rem;
  font-size: 0.75rem;
}

.btn-icon {
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 0.375rem;
  color: var(--color-text-secondary);
  border-radius: var(--radius-sm);
  transition: all var(--transition-fast);
}

.btn-icon:hover {
  color: var(--color-text-primary);
  background: var(--color-bg-tertiary);
}

.actions {
  display: flex;
  gap: 0.5rem;
}

.toolbar {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  align-items: center;
}

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

.modal {
  display: none;
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.75);
  backdrop-filter: blur(4px);
  z-index: 1000;
  justify-content: center;
  align-items: center;
  padding: 1rem;
}

.modal.active {
  display: flex;
}

.modal-content {
  background: var(--color-bg-secondary);
  border-radius: var(--radius-lg);
  padding: 2rem;
  width: 100%;
  max-width: 500px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: var(--shadow-md);
  animation: modalSlideIn 0.2s ease;
}

@keyframes modalSlideIn {
  from {
    opacity: 0;
    transform: translateY(-20px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.modal-header h3 {
  color: var(--color-accent);
  font-size: 1.25rem;
}

.close-btn {
  background: none;
  border: none;
  color: var(--color-text-secondary);
  font-size: 1.5rem;
  cursor: pointer;
  padding: 0.25rem;
  line-height: 1;
  transition: color var(--transition-fast);
}

.close-btn:hover {
  color: var(--color-text-primary);
}

.form-group {
  margin-bottom: 1.25rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  color: var(--color-text-secondary);
  font-size: 0.875rem;
  font-weight: 500;
}

.form-group input,
.form-group select,
.form-group textarea {
  width: 100%;
  background: var(--color-bg-primary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 0.75rem;
  color: var(--color-text-primary);
  transition: border-color var(--transition-fast);
}

.form-group input:focus,
.form-group select:focus,
.form-group textarea:focus {
  outline: none;
  border-color: var(--color-accent-hover);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.form-group textarea {
  min-height: 100px;
  resize: vertical;
}

.form-actions {
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
  margin-top: 1.5rem;
}

.toast {
  position: fixed;
  bottom: 2rem;
  right: 2rem;
  background: var(--color-success-bg);
  color: var(--color-success-text);
  padding: 1rem 1.5rem;
  border-radius: var(--radius-lg);
  z-index: 2000;
  display: none;
  animation: toastSlideIn 0.3s ease;
  box-shadow: var(--shadow-md);
}

.toast.error {
  background: var(--color-error-bg);
  color: var(--color-error-text);
}

.toast.active {
  display: block;
}

@keyframes toastSlideIn {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}
`;
