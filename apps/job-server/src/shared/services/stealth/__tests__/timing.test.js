import { beforeEach, describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { HumanizedTimer, randomDelay } from '../timing.js';

function sequence(values) {
  let index = 0;
  return () => {
    const value = values[index];
    index += 1;
    return value;
  };
}

beforeEach(() => {
  mock.restoreAll();
  mock.timers.reset();
});

describe('HumanizedTimer', () => {
  it('uses default config and merges custom config', () => {
    const defaultTimer = new HumanizedTimer();
    assert.equal(defaultTimer.config.minDelay, 800);
    assert.equal(defaultTimer.config.maxDelay, 3000);
    assert.equal(defaultTimer.getLastDelay(), 0);

    const customTimer = new HumanizedTimer({ minDelay: 100, maxDelay: 200 });
    assert.equal(customTimer.config.minDelay, 100);
    assert.equal(customTimer.config.maxDelay, 200);
    assert.equal(customTimer.config.burstProbability, 0.15);
    assert.equal(customTimer.config.longPauseProbability, 0.08);
  });

  it('wait uses burst branch', async () => {
    const timer = new HumanizedTimer();
    mock.timers.enable({ apis: ['setTimeout'] });
    mock.method(Math, 'random', sequence([0, 0.5]));

    const promise = timer.wait();
    assert.equal(timer.getLastDelay(), 350);
    mock.timers.tick(350);
    await promise;
    assert.equal(timer.getLastDelay(), 350);
  });

  it('wait uses long pause branch', async () => {
    const timer = new HumanizedTimer();
    mock.timers.enable({ apis: ['setTimeout'] });
    mock.method(Math, 'random', sequence([0.16, 0.5]));

    const promise = timer.wait();
    assert.equal(timer.getLastDelay(), 10000);
    mock.timers.tick(10000);
    await promise;
    assert.equal(timer.getLastDelay(), 10000);
  });

  it('wait uses normal gaussian branch', async () => {
    const timer = new HumanizedTimer();
    mock.timers.enable({ apis: ['setTimeout'] });
    mock.method(Math, 'random', sequence([0.5, 0.2, 0.4, 0.6]));

    const promise = timer.wait();
    assert.equal(timer.getLastDelay(), 1680);
    mock.timers.tick(1680);
    await promise;
    assert.equal(timer.getLastDelay(), 1680);
  });

  it('waitBetweenPages applies multiplier and stores delay', async () => {
    const timer = new HumanizedTimer();
    mock.timers.enable({ apis: ['setTimeout'] });
    mock.method(Math, 'random', sequence([0.5, 0.3, 0.3, 0.3]));

    const promise = timer.waitBetweenPages();
    assert.equal(timer.getLastDelay(), 4380);
    mock.timers.tick(4380);
    await promise;
    assert.equal(timer.getLastDelay(), 4380);
  });

  it('reset clears last delay', () => {
    const timer = new HumanizedTimer();
    timer._lastDelay = 123;
    assert.equal(timer.getLastDelay(), 123);
    timer.reset();
    assert.equal(timer.getLastDelay(), 0);
  });
});

describe('randomDelay', () => {
  it('resolves with rounded random timeout', async () => {
    mock.timers.enable({ apis: ['setTimeout'] });
    mock.method(Math, 'random', () => 0.5);

    const promise = randomDelay(10, 20);
    mock.timers.tick(15);
    await promise;
  });
});
