import { getRelatedServices, isUpstreamOf } from '../traversal';

const mockGraph = {
  "db": { service: "db", depends_on: [] },
  "backend": { service: "backend", depends_on: ["db"] },
  "api": { service: "api", depends_on: ["backend"] },
  "frontend": { service: "frontend", depends_on: ["api"] },
  "auth": { service: "auth", depends_on: ["db"] },
  "isolated": { service: "isolated", depends_on: [] }
};

describe('Topology Traversal', () => {
  describe('getRelatedServices', () => {
    it('finds upstream and downstream services', () => {
      const related = getRelatedServices('api', mockGraph);
      // api depends on backend, which depends on db.
      // frontend depends on api.
      expect(related.has('backend')).toBe(true);
      expect(related.has('db')).toBe(true);
      expect(related.has('frontend')).toBe(true);
      expect(related.has('auth')).toBe(false); // auth shares a DB but isn't strictly upstream/downstream of API unless we traverse up and then down, which depends on logic
    });

    it('returns empty for unknown service', () => {
      const related = getRelatedServices('unknown-service', mockGraph);
      expect(related.size).toBe(0);
    });

    it('respects hop limits', () => {
      // api -> backend (1 hop) -> db (2 hops)
      const related = getRelatedServices('api', mockGraph, 1);
      expect(related.has('backend')).toBe(true);
      expect(related.has('db')).toBe(false);
    });
  });

  describe('isUpstreamOf', () => {
    it('returns true if service is upstream', () => {
      expect(isUpstreamOf('db', 'frontend', mockGraph)).toBe(true);
      expect(isUpstreamOf('backend', 'api', mockGraph)).toBe(true);
    });

    it('returns false if service is downstream', () => {
      expect(isUpstreamOf('frontend', 'db', mockGraph)).toBe(false);
    });

    it('returns false if isolated', () => {
      expect(isUpstreamOf('isolated', 'frontend', mockGraph)).toBe(false);
    });
  });
});
