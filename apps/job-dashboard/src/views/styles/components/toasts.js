export const TOAST_STYLES = `
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
