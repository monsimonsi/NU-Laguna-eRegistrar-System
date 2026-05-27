import { useEffect, useRef } from 'react';
import '../styles/RejectionReasonModal.css';

const RejectionReasonModal = ({
  open,
  title,
  description,
  subjectLabel,
  subjectValue,
  reason,
  onReasonChange,
  onClose,
  onSubmit,
  submitLabel = 'Reject',
  isSubmitting = false,
  error = '',
}) => {
  const textareaRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    const timer = window.setTimeout(() => {
      textareaRef.current?.focus();
    }, 0);

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="rejection-modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="rejection-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="rejection-modal-title"
        aria-describedby="rejection-modal-description"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="rejection-modal-header">
          <div>
            <h4 id="rejection-modal-title">{title}</h4>
            <p id="rejection-modal-description">{description}</p>
          </div>
        </div>

        {subjectLabel && subjectValue && (
          <div className="rejection-modal-subject">
            <span className="rejection-modal-subject-label">{subjectLabel}</span>
            <span className="rejection-modal-subject-value">{subjectValue}</span>
          </div>
        )}

        <label className="rejection-modal-field">
          <span>Rejection reason</span>
          <textarea
            ref={textareaRef}
            value={reason}
            onChange={(event) => onReasonChange(event.target.value)}
            placeholder="Explain why this request is being rejected"
            rows={5}
            maxLength={500}
          />
        </label>

        <div className="rejection-modal-footnote">
          This reason will be saved with the alumni record and can be reviewed later.
        </div>

        {error && <div className="rejection-modal-error">{error}</div>}

        <div className="rejection-modal-actions">
          <button type="button" className="rejection-modal-cancel" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </button>
          <button type="button" className="rejection-modal-confirm" onClick={onSubmit} disabled={isSubmitting}>
            {isSubmitting ? 'Submitting...' : submitLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RejectionReasonModal;