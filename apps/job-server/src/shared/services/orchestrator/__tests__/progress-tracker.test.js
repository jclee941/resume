import { describe, it, beforeEach, afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { ProgressTracker } from '../progress-tracker.js';

describe('ProgressTracker', { concurrency: 1 }, () => {
  let tracker;

  beforeEach(() => {
    mock.restoreAll();
    tracker = new ProgressTracker();
  });

  afterEach(() => {
    tracker.destroy();
    mock.restoreAll();
  });

  it('adds tasks and emits lifecycle events', () => {
    const events = [];
    for (const eventName of [
      'task:added',
      'task:started',
      'task:progress',
      'task:completed',
      'task:failed',
      'task:cancelled',
      'progress',
      'complete',
    ]) {
      tracker.on(eventName, (payload) => events.push({ eventName, payload }));
    }

    const okTask = tracker.addTask('wanted', 'search', { itemsTotal: 10, metadata: { a: 1 } });
    const failTask = tracker.addTask('saramin', 'search');
    const cancelTask = tracker.addTask('jobkorea', 'search');

    tracker.startTask(okTask);
    tracker.updateProgress(okTask, { itemsProcessed: 4, metadata: { b: 2 } });
    tracker.updateProgress(okTask, { progress: 150 });
    tracker.completeTask(okTask, { jobs: 4 });

    tracker.startTask(failTask);
    tracker.failTask(failTask, new Error('boom'));

    tracker.startTask(cancelTask);
    tracker.cancelTask(cancelTask);

    const added = events.filter((e) => e.eventName === 'task:added');
    const started = events.filter((e) => e.eventName === 'task:started');
    const progressed = events.filter((e) => e.eventName === 'task:progress');
    const completed = events.filter((e) => e.eventName === 'task:completed');
    const failed = events.filter((e) => e.eventName === 'task:failed');
    const cancelled = events.filter((e) => e.eventName === 'task:cancelled');
    const overall = events.filter((e) => e.eventName === 'progress');
    const done = events.filter((e) => e.eventName === 'complete');

    assert.equal(added.length, 3);
    assert.equal(started.length, 3);
    assert.equal(progressed.length, 2);
    assert.equal(completed.length, 1);
    assert.equal(failed.length, 1);
    assert.equal(cancelled.length, 1);
    assert.ok(overall.length >= 3);
    assert.equal(done.length, 1);

    const task = tracker.getTask(okTask);
    assert.equal(task.status, 'completed');
    assert.equal(task.progress, 100);
    assert.deepEqual(task.metadata, { a: 1, b: 2, result: { jobs: 4 } });
  });

  it('updates progress without explicit progress and completes without result payload', () => {
    const id = tracker.addTask('wanted', 'search', { itemsTotal: 5 });
    tracker.startTask(id);
    tracker.updateProgress(id, { itemsProcessed: 2 });
    assert.equal(tracker.getTask(id).progress, 40);

    tracker.updateProgress(id, { itemsProcessed: 2, itemsTotal: 0 });
    assert.equal(tracker.getTask(id).progress, 40);

    tracker.completeTask(id);
    assert.equal(tracker.getTask(id).metadata.result, undefined);
  });

  it('computes completed duration from createdAt when task was never started', () => {
    let now = 10_000;
    mock.method(Date, 'now', () => now);
    const id = tracker.addTask('wanted', 'search');

    now += 250;
    tracker.completeTask(id, { jobs: 1 });

    const task = tracker.getTask(id);
    assert.equal(task.status, 'completed');
    assert.equal(task.startedAt, null);
    assert.equal(task.completedAt - task.createdAt, 250);
  });

  it('computes failed duration from createdAt when task was never started', () => {
    let now = 20_000;
    mock.method(Date, 'now', () => now);
    const id = tracker.addTask('saramin', 'search');

    now += 400;
    tracker.failTask(id, new Error('no-start-fail'));

    const task = tracker.getTask(id);
    assert.equal(task.status, 'failed');
    assert.equal(task.startedAt, null);
    assert.equal(task.completedAt - task.createdAt, 400);
  });

  it('throws for unknown task id', () => {
    assert.throws(() => tracker.getTask('missing'), /Task not found/);
    assert.throws(() => tracker.startTask('missing'), /Task not found/);
  });

  it('filters tasks by platform status and type', () => {
    const t1 = tracker.addTask('wanted', 'search');
    const t2 = tracker.addTask('wanted', 'detail');
    const t3 = tracker.addTask('saramin', 'search');

    tracker.startTask(t1);
    tracker.completeTask(t1);
    tracker.startTask(t2);
    tracker.cancelTask(t2);
    tracker.startTask(t3);
    tracker.failTask(t3, new Error('failed'));

    assert.equal(tracker.getTasks({ platform: 'wanted' }).length, 2);
    assert.equal(tracker.getTasks({ status: 'completed' }).length, 1);
    assert.equal(tracker.getTasks({ type: 'search' }).length, 2);
    assert.equal(
      tracker.getTasks({ platform: 'wanted', status: 'cancelled', type: 'detail' }).length,
      1
    );

    const summary = tracker.getPlatformSummary();
    assert.equal(summary.wanted.total, 2);
    assert.equal(summary.wanted.completed, 1);
    assert.equal(summary.wanted.cancelled, 1);
    assert.equal(summary.saramin.failed, 1);
  });

  it('cancelTask skips completed and failed tasks', () => {
    const completed = tracker.addTask('wanted', 'search');
    tracker.startTask(completed);
    tracker.completeTask(completed);

    const failed = tracker.addTask('saramin', 'search');
    tracker.startTask(failed);
    tracker.failTask(failed, new Error('x'));

    tracker.cancelTask(completed);
    tracker.cancelTask(failed);

    assert.equal(tracker.getTask(completed).status, 'completed');
    assert.equal(tracker.getTask(failed).status, 'failed');
    assert.equal(tracker.getOverallProgress().counters.cancelled, 0);
  });

  it('computes completion states and overall progress', () => {
    assert.equal(tracker.isComplete(), false);

    const a = tracker.addTask('wanted', 'search');
    const b = tracker.addTask('saramin', 'search');
    tracker.startTask(a);
    assert.equal(tracker.isComplete(), false);

    tracker.completeTask(a);
    tracker.startTask(b);
    tracker.cancelTask(b);
    assert.equal(tracker.isComplete(), true);

    const overall = tracker.getOverallProgress();
    assert.equal(overall.totalTasks, 2);
    assert.equal(overall.progress, 100);
    assert.equal(overall.counters.completed, 1);
    assert.equal(overall.counters.cancelled, 1);
    assert.equal(typeof overall.elapsedMs, 'number');
    assert.equal(typeof overall.tasksPerSecond, 'number');
  });

  it('returns zero tasksPerSecond when elapsed time is zero', () => {
    const now = 5000;
    mock.method(Date, 'now', () => now);
    const fresh = new ProgressTracker();

    const id = fresh.addTask('wanted', 'search');
    fresh.startTask(id);
    fresh.completeTask(id);

    const overall = fresh.getOverallProgress();
    assert.equal(overall.elapsedMs, 0);
    assert.equal(overall.tasksPerSecond, 0);
    fresh.destroy();
  });

  it('reset clears state and task id counter', () => {
    const first = tracker.addTask('wanted', 'search');
    const second = tracker.addTask('wanted', 'search');
    assert.equal(first, 'task-1');
    assert.equal(second, 'task-2');

    tracker.reset();
    assert.equal(tracker.getTasks().length, 0);
    assert.equal(tracker.getOverallProgress().totalTasks, 0);

    const afterReset = tracker.addTask('wanted', 'search');
    assert.equal(afterReset, 'task-1');
  });

  it('destroy removes listeners and state', () => {
    tracker.addTask('wanted', 'search');
    tracker.on('progress', () => {});
    assert.ok(tracker.listenerCount('progress') > 0);

    tracker.destroy();

    assert.equal(tracker.getTasks().length, 0);
    assert.equal(tracker.listenerCount('progress'), 0);
  });
});
