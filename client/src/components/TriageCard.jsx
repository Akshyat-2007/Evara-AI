import React from 'react';
import { ShieldAlert, AlertTriangle, CheckCircle, Stethoscope, FileText, HelpCircle, Activity } from 'lucide-react';
import { getTranslation } from '../i18n/translations.js';

export default function TriageCard({ data, language = 'en', isRedFlag = false }) {
  if (!data) return null;

  const t = getTranslation(language);
  const triageLevel = isRedFlag ? 'urgent' : data.triage_level || 'self_care';

  const triageConfig = {
    self_care: {
      colorClass: 'triage-green',
      icon: <CheckCircle size={18} className="triage-status-icon" aria-hidden="true" />,
      label: t.triageLabels.self_care,
      badgeText: 'Low Risk / Self-Care',
    },
    routine_visit: {
      colorClass: 'triage-amber',
      icon: <AlertTriangle size={18} className="triage-status-icon" aria-hidden="true" />,
      label: t.triageLabels.routine_visit,
      badgeText: 'Consultation Recommended',
    },
    urgent: {
      colorClass: 'triage-red',
      icon: <ShieldAlert size={20} className="triage-status-icon alert-pulse" aria-hidden="true" />,
      label: t.triageLabels.urgent,
      badgeText: 'Urgent Care Priority',
    },
  };

  const currentConfig = triageConfig[triageLevel] || triageConfig.routine_visit;

  return (
    <div className={`triage-card ${currentConfig.colorClass}`} role="region" aria-label="Clinical guidance card">
      {/* Header with status badge */}
      <div className="triage-header">
        <div className="triage-title-group">
          {currentConfig.icon}
          <h4 className="triage-title">{currentConfig.label}</h4>
        </div>
        <span className="triage-badge">{currentConfig.badgeText}</span>
      </div>

      {/* Recommended Specialist */}
      {data.suggested_specialist && (
        <div className="triage-specialist-row">
          <Stethoscope size={16} className="section-icon" aria-hidden="true" />
          <div className="specialist-details">
            <span className="specialist-label">{t.sections.specialist}:</span>
            <strong className="specialist-name">{data.suggested_specialist}</strong>
          </div>
        </div>
      )}

      {/* Identified Symptoms */}
      {data.symptoms && data.symptoms.length > 0 && (
        <div className="triage-symptoms-section">
          <div className="section-header">
            <Activity size={15} className="section-icon" aria-hidden="true" />
            <span className="section-title">{t.sections.symptomsIdentified}</span>
          </div>
          <div className="symptoms-tag-cloud">
            {data.symptoms.map((s, idx) => (
              <span key={idx} className="symptom-chip" title={s.detail || s.name}>
                {s.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Diagnostic Tests to Discuss */}
      {data.commonly_discussed_tests && data.commonly_discussed_tests.length > 0 && (
        <div className="triage-tests-section">
          <div className="section-header">
            <FileText size={15} className="section-icon" aria-hidden="true" />
            <span className="section-title">{t.sections.testsDiscussed}</span>
          </div>
          <ul className="tests-list">
            {data.commonly_discussed_tests.map((test, idx) => (
              <li key={idx} className="test-item">
                {test}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Questions for Doctor */}
      {data.questions_for_doctor && data.questions_for_doctor.length > 0 && (
        <div className="triage-questions-section">
          <div className="section-header">
            <HelpCircle size={15} className="section-icon" aria-hidden="true" />
            <span className="section-title">{t.sections.questionsForDoctor}</span>
          </div>
          <ul className="questions-list">
            {data.questions_for_doctor.map((q, idx) => (
              <li key={idx} className="question-item">
                "{q}"
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
