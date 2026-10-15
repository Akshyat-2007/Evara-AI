import React, { useEffect, useState } from 'react';
import { ArrowLeft, Printer, ShieldAlert, AlertTriangle, CheckCircle, Stethoscope, FileText, HelpCircle, Activity, Calendar, Lock } from 'lucide-react';
import { getTranslation } from '../i18n/translations.js';

export default function DoctorSummary({ sessionId, language = 'en', onBackToChat }) {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const t = getTranslation(language);

  useEffect(() => {
    async function fetchReport() {
      if (!sessionId) return;
      try {
        setLoading(true);
        const res = await fetch(`http://localhost:5000/api/report/${sessionId}`);
        if (!res.ok) {
          throw new Error('Failed to load doctor summary report.');
        }
        const data = await res.json();
        setReport(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchReport();
  }, [sessionId]);

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="report-loading-container">
        <div className="spinner" aria-hidden="true" />
        <p>Generating printable clinical summary...</p>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="report-error-container">
        <p className="error-text">⚠️ {error || 'Unable to generate summary.'}</p>
        <button onClick={onBackToChat} className="btn-secondary">
          {t.backToChat}
        </button>
      </div>
    );
  }

  const triagePriority = report.highestTriageLevel || 'self_care';
  const formattedDate = report.sessionDate
    ? new Date(report.sessionDate).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : new Date().toLocaleDateString();

  return (
    <div className="doctor-summary-page">
      {/* Top action toolbar - hidden when printing */}
      <div className="report-toolbar no-print">
        <button onClick={onBackToChat} className="btn-back">
          <ArrowLeft size={16} aria-hidden="true" />
          <span>{t.backToChat}</span>
        </button>
        <button onClick={handlePrint} className="btn-print">
          <Printer size={16} aria-hidden="true" />
          <span>{t.printReport}</span>
        </button>
      </div>

      {/* Main printable report container */}
      <article className="printable-report" id="printable-area">
        {/* Document Header */}
        <header className="report-doc-header">
          <div className="report-header-top">
            <div>
              <h1 className="report-app-title">Evara AI 🌸</h1>
              <p className="report-subtitle">Patient-Reported Symptom & Clinical Intake Summary</p>
            </div>
            <div className="report-meta-box">
              <div className="meta-row">
                <Calendar size={14} aria-hidden="true" />
                <span>{formattedDate}</span>
              </div>
              <div className="meta-row">
                <Lock size={14} aria-hidden="true" />
                <span className="mono-id">ID: {sessionId.slice(0, 8)}...</span>
              </div>
            </div>
          </div>

          {/* Persistent medical disclaimer */}
          <div className="report-disclaimer-box">
            <strong>Clinical Notice: </strong>
            <span>{report.disclaimer || t.disclaimer}</span>
          </div>
        </header>

        {/* Triage & Specialist Overview */}
        <section className="report-triage-banner">
          <div className="triage-status-block">
            <span className="triage-eyebrow">{t.report.triagePriority}</span>
            <div className={`triage-badge-pill triage-${triagePriority}`}>
              {triagePriority === 'urgent' && <ShieldAlert size={16} />}
              {triagePriority === 'routine_visit' && <AlertTriangle size={16} />}
              {triagePriority === 'self_care' && <CheckCircle size={16} />}
              <span>{t.triageLabels[triagePriority] || triagePriority}</span>
            </div>
          </div>

          <div className="specialist-block">
            <span className="specialist-eyebrow">{t.report.specialistHeading}</span>
            <div className="specialist-val">
              <Stethoscope size={16} className="stethoscope-icon" />
              <strong>{report.suggestedSpecialist || 'Gynecologist'}</strong>
            </div>
          </div>
        </section>

        {/* Section 1: English Clinical Summary */}
        <section className="report-section">
          <div className="report-section-header">
            <FileText size={18} className="report-sec-icon" />
            <h2>{t.report.clinicalSummary}</h2>
          </div>
          <div className="clinical-summary-box">
            <p className="clinical-text">{report.clinicalSummaryEn}</p>
          </div>
        </section>

        {/* Section 2: Identified Symptoms & Timeline */}
        {report.symptoms && report.symptoms.length > 0 && (
          <section className="report-section">
            <div className="report-section-header">
              <Activity size={18} className="report-sec-icon" />
              <h2>{t.sections.symptomsIdentified}</h2>
            </div>
            <div className="symptoms-grid">
              {report.symptoms.map((s, idx) => (
                <div key={idx} className="symptom-card-item">
                  <span className="symptom-name">{s.name}</span>
                  <span className="symptom-desc">{s.detail}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Section 3: Patient's verbatim regional phrasing */}
        {report.verbatimPatientInputs && report.verbatimPatientInputs.length > 0 && (
          <section className="report-section">
            <div className="report-section-header">
              <HelpCircle size={18} className="report-sec-icon" />
              <h2>{t.report.patientVerbatim}</h2>
            </div>
            <div className="verbatim-quotes-list">
              {report.verbatimPatientInputs.map((item, idx) => (
                <div key={idx} className="quote-box">
                  <span className="quote-mark">“</span>
                  <p className="verbatim-text">{item.text}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Section 4: Red Flag Alert History if applicable */}
        {report.redFlagEvents && report.redFlagEvents.length > 0 && (
          <section className="report-section redflag-warning-section">
            <div className="report-section-header">
              <ShieldAlert size={18} className="report-sec-icon red" />
              <h2 className="red-heading">Reported Critical Red-Flag Triggers</h2>
            </div>
            <ul className="redflag-list">
              {report.redFlagEvents.map((rf, idx) => (
                <li key={idx} className="redflag-item">
                  <strong>Trigger:</strong> {rf.term}
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Section 5: Clinician Discussion Points & Investigations */}
        <section className="report-section">
          <div className="report-section-header">
            <Stethoscope size={18} className="report-sec-icon" />
            <h2>{t.report.consultationQuestions}</h2>
          </div>
          <ul className="consultation-checklist">
            <li>Could these combined symptoms indicate Polycystic Ovary Syndrome (PCOS), insulin resistance, or thyroid involvement?</li>
            <li>Are pelvic ultrasonography (transabdominal/pelvic) and basal endocrine labs (LH, FSH, Total Testosterone, TSH, Fasting Insulin) indicated?</li>
            <li>What evidence-based lifestyle, nutritional, and medical strategies are recommended for long-term hormonal balance?</li>
          </ul>
        </section>

        {/* Footer print note */}
        <footer className="report-footer">
          <p className="footer-print-note">{t.report.printNote}</p>
          <p className="footer-timestamp">Evara AI Confidential Anonymous Intake • {formattedDate}</p>
        </footer>
      </article>
    </div>
  );
}
