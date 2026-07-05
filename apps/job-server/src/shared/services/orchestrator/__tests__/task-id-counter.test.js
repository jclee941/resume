import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  TaskIdCounter,
  nextTaskId,
  resetTaskIdCounter,
} from '../progress-tracker/task-id-counter.js';

describe('TaskIdCounter (issue #16 / P0-5 Slice A)', () => {
  it('starts at 0; next() returns 1, 2, 3, ...', () => {
    const c = new TaskIdCounter();
    assert.equal(c.next(), 1);
    assert.equal(c.next(), 2);
    assert.equal(c.next(), 3);
  });

  it('peek() returns current value without advancing', () => {
    const c = new TaskIdCounter();
    c.next();
    c.next();
    assert.equal(c.peek(), 2);
    assert.equal(c.peek(), 2);
    assert.equal(c.next(), 3);
  });

  it('reset() rewinds the sequence', () => {
    const c = new TaskIdCounter();
    c.next();
    c.next();
    c.next();
    assert.equal(c.peek(), 3);
    c.reset();
    assert.equal(c.peek(), 0);
    assert.equal(c.next(), 1);
  });

  it('start option seeds the initial value', () => {
    const c = new TaskIdCounter({ start: 100 });
    assert.equal(c.next(), 101);
  });

  it('two instances are isolated (the whole point of Slice A)', () => {
    const a = new TaskIdCounter();
    const b = new TaskIdCounter();
    a.next();
    a.next();
    a.next();
    assert.equal(a.peek(), 3);
    assert.equal(b.peek(), 0);
    b.next();
    assert.equal(a.peek(), 3);
    assert.equal(b.peek(), 1);
  });

  it('private state is not enumerable / accessible from outside', () => {
    const c = new TaskIdCounter();
    c.next();
    assert.equal(Object.keys(c).length, 0);
    assert.equal(c.n, undefined);
    assert.equal(c['#n'], undefined);
  });
});

describe('nextTaskId / resetTaskIdCounter (singleton API — back-compat)', () => {
  it('produces task-N strings using a shared counter', () => {
    resetTaskIdCounter();
    assert.equal(nextTaskId(), 'task-1');
    assert.equal(nextTaskId(), 'task-2');
    resetTaskIdCounter();
    assert.equal(nextTaskId(), 'task-1');
  });

  it('singleton survives across calls in the same module instance', () => {
    resetTaskIdCounter();
    nextTaskId();
    nextTaskId();
    nextTaskId();
    assert.equal(nextTaskId(), 'task-4');
  });
});
