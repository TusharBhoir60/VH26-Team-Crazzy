export type CriticalityTier = 'tier-1' | 'tier-2' | 'tier-3';

// Operational table mapping service name or tag pattern to criticality tier.
// The team will maintain this file as an editable data structure.
export const serviceCriticality: Record<string, CriticalityTier> = {
  'database-primary': 'tier-1',
  'payments-service': 'tier-1',
  'auth-service': 'tier-1',
  'api-gateway': 'tier-1',
  
  'checkout-service': 'tier-2',
  
  'frontend': 'tier-3'
};

export function getServiceCriticality(service: string): CriticalityTier | 'unknown' {
  return serviceCriticality[service] || 'unknown';
}
