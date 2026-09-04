export type CriticalityTier = 'tier-1' | 'tier-2' | 'tier-3';

// Operational table mapping service name or tag pattern to criticality tier.
// The team will maintain this file as an editable data structure.
export const serviceCriticality: Record<string, CriticalityTier> = {
  'auth-service': 'tier-1',
  'payment-gateway': 'tier-1',
  'checkout-api': 'tier-1',
  
  'user-profile': 'tier-2',
  'search-indexer': 'tier-2',
  
  'internal-dashboard': 'tier-3',
  'sandbox-env': 'tier-3'
};

export function getServiceCriticality(service: string): CriticalityTier | 'unknown' {
  return serviceCriticality[service] || 'unknown';
}
