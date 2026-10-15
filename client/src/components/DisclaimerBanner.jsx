import React from 'react';
import { AlertCircle } from 'lucide-react';

export default function DisclaimerBanner({ text }) {
  return (
    <aside className="disclaimer-banner" role="alert" aria-live="polite">
      <div className="disclaimer-content">
        <AlertCircle className="disclaimer-icon" size={18} aria-hidden="true" />
        <span className="disclaimer-text">
          {text || 'This tool gives information only. It does not diagnose. Please consult a doctor.'}
        </span>
      </div>
    </aside>
  );
}
