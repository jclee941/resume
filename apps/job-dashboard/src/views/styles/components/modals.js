export const MODAL_STYLES = `
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
`;
