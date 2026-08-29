/**
 * src/context/AuthContext.jsx
 * Canonical path for AuthContext per project spec.
 * Re-exports from the original implementation so both
 * import paths work without duplication:
 *   import { useAuth } from '../context/AuthContext'
 *   import { useAuth } from '../contexts/AuthContext'
 */
export { AuthProvider, useAuth } from '../contexts/AuthContext';
