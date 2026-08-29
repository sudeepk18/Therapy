/**
 * axiosInstance.js
 * Canonical entry point for API communication.
 * Re-exports the configured Axios instance from axios.js.
 *
 * All feature modules and components should import from here:
 *   import api from '../api/axiosInstance';
 */
export { default } from './axios';
