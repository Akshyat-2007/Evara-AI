/**
 * Central API configuration
 * Automatically switches between local development and deployed production URLs.
 */
export const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
