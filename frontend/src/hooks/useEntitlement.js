import { useAuth } from '../contexts/AuthContext';

/**
 * useEntitlement
 *
 * Checks whether the currently logged-in therapist has access to a
 * given feature based on their subscription tier.
 *
 * Tier hierarchy:  free < basic < pro < enterprise
 *
 * Usage:
 *   const { can, tier } = useEntitlement();
 *   if (!can('analytics'))  return <UpgradeBanner feature="analytics" />;
 *
 * @returns {{ can: (feature: string) => boolean, tier: string }}
 */

// Features available per tier
const TIER_FEATURES = {
  free: [
    'dashboard',
    'clients',         // up to 5
    'sessions',        // up to 10/month
    'notes',           // basic SOAP/DAP
    'leads',           // up to 10
  ],
  basic: [
    'dashboard',
    'clients',
    'sessions',
    'notes',
    'leads',
    'payments',
    'client_portal',   // public booking page
  ],
  pro: [
    'dashboard',
    'clients',
    'sessions',
    'notes',
    'leads',
    'payments',
    'client_portal',
    'analytics',       // revenue & session charts
    'packages',        // session bundles
    'custom_branding', // portal branding
    'video_sessions',  // Daily.co integration
  ],
  enterprise: [
    'dashboard',
    'clients',
    'sessions',
    'notes',
    'leads',
    'payments',
    'client_portal',
    'analytics',
    'packages',
    'custom_branding',
    'video_sessions',
    'team',            // multi-therapist
    'advanced_reports',
    'api_access',
  ],
};

export function useEntitlement() {
  const { user } = useAuth();

  // Default to 'free' if not set
  const tier = user?.subscriptionTier || 'free';
  const features = TIER_FEATURES[tier] ?? TIER_FEATURES.free;

  /**
   * Check if a feature is available on the current tier.
   * @param {string} feature
   * @returns {boolean}
   */
  const can = (feature) => features.includes(feature);

  return { can, tier, features };
}
