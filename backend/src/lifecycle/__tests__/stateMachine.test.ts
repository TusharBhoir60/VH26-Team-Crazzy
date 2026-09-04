import { evaluateState } from '../stateMachine';
import { FLAP_WINDOW_MS, STALE_TIMEOUT_MS } from '../config';
import { LifecycleHistory } from '../types';

describe('Lifecycle State Machine', () => {
  it('should initialize a new alert as firing', () => {
    const history = evaluateState('firing', null, 1000);
    expect(history.state).toBe('firing');
    expect(history.transitions).toHaveLength(1);
    expect(history.transitions[0]!.state).toBe('firing');
  });

  it('should transition to resolved', () => {
    const initial: LifecycleHistory = {
      state: 'firing',
      transitions: [{ state: 'firing', at: new Date(1000).toISOString() }],
      lastTransitionAt: new Date(1000).toISOString(),
    };
    const history = evaluateState('resolved', initial, 2000);
    expect(history.state).toBe('resolved');
    expect(history.transitions).toHaveLength(2);
    expect(history.transitions[1]!.state).toBe('resolved');
  });

  it('should detect flapping after threshold crossed', () => {
    let history: LifecycleHistory | null = null;
    let now = 1000;
    
    // 1st transition
    history = evaluateState('firing', history, now);
    
    // 2nd transition
    now += 1000;
    history = evaluateState('resolved', history, now);
    
    // 3rd transition
    now += 1000;
    history = evaluateState('firing', history, now);
    
    // 4th transition (should trigger flapping threshold=4)
    now += 1000;
    history = evaluateState('resolved', history, now);
    
    expect(history.state).toBe('flapping');
    expect(history.transitions).toHaveLength(4);
  });

  it('should settle back to firing if flapping stops for FLAP_WINDOW_MS', () => {
    let history: LifecycleHistory = {
      state: 'flapping',
      transitions: [
        { state: 'firing', at: new Date(1000).toISOString() },
        { state: 'resolved', at: new Date(2000).toISOString() },
        { state: 'firing', at: new Date(3000).toISOString() },
        { state: 'resolved', at: new Date(4000).toISOString() }
      ],
      lastTransitionAt: new Date(4000).toISOString(),
    };
    
    // Fast forward past FLAP_WINDOW_MS + 1000 and receive 'firing'
    const now = 4000 + FLAP_WINDOW_MS + 1000;
    history = evaluateState('firing', history, now);
    
    expect(history.state).toBe('firing');
    // Only the new firing transition should be in the window now
    expect(history.transitions).toHaveLength(1);
  });

  it('should become stale if no updates for STALE_TIMEOUT_MS', () => {
    const initial: LifecycleHistory = {
      state: 'firing',
      transitions: [{ state: 'firing', at: new Date(1000).toISOString() }],
      lastTransitionAt: new Date(1000).toISOString(),
    };
    
    // Fast forward past STALE_TIMEOUT_MS + 1000
    const now = 1000 + STALE_TIMEOUT_MS + 1000;
    // Receive 'firing' again (but this is just a ping, not a new transition since it was already firing)
    const history = evaluateState('firing', initial, now);
    
    expect(history.state).toBe('stale');
  });
});
