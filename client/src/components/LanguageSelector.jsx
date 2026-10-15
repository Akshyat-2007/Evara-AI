import React from 'react';
import { Globe } from 'lucide-react';
import { SUPPORTED_LANGUAGES } from '../i18n/translations.js';

export default function LanguageSelector({ currentLanguage, onSelectLanguage }) {
  return (
    <div className="language-selector-wrapper">
      <label htmlFor="language-select" className="sr-only">
        Select Language
      </label>
      <div className="select-container">
        <Globe size={16} className="globe-icon" aria-hidden="true" />
        <select
          id="language-select"
          className="language-dropdown"
          value={currentLanguage}
          onChange={(e) => onSelectLanguage(e.target.value)}
          aria-label="Select conversation language"
        >
          {SUPPORTED_LANGUAGES.map((lang) => (
            <option key={lang.code} value={lang.code}>
              {lang.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
