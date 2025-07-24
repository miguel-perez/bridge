import { incrementCallCount, resetCallCount, getCallCount } from './call-counter.js';

describe('Call Counter', () => {
  beforeEach(() => {
    resetCallCount();
  });

  it('should start at 0', () => {
    expect(getCallCount()).toBe(0);
  });

  it('should increment count', () => {
    expect(incrementCallCount()).toBe(1);
    expect(getCallCount()).toBe(1);
  });

  it('should increment multiple times', () => {
    incrementCallCount();
    incrementCallCount();
    incrementCallCount();
    expect(getCallCount()).toBe(3);
  });

  it('should reset to 0', () => {
    incrementCallCount();
    incrementCallCount();
    expect(getCallCount()).toBe(2);

    resetCallCount();
    expect(getCallCount()).toBe(0);
  });
});
