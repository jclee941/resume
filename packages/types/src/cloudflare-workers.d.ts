// The part of the `cloudflare:workers` module that the job-dashboard Workflow
// classes use, transcribed from the runtime types `wrangler types` generates.
// The full runtime types stay out of the strict program because their globals
// clash with the DOM types that the portfolio browser scripts rely on.
declare module 'cloudflare:workers' {
  export type WorkflowDurationLabel =
    'second' | 'minute' | 'hour' | 'day' | 'week' | 'month' | 'year';
  export type WorkflowSleepDuration = `${number} ${WorkflowDurationLabel}${'s' | ''}` | number;
  export type WorkflowBackoff = 'constant' | 'linear' | 'exponential';

  export type WorkflowStepConfig = {
    retries?: {
      limit: number;
      delay: WorkflowSleepDuration;
      backoff?: WorkflowBackoff;
    };
    timeout?: WorkflowSleepDuration;
  };

  export type WorkflowEvent<T> = {
    payload: Readonly<T>;
    timestamp: Date;
    instanceId: string;
    workflowName: string;
  };

  export abstract class WorkflowStep {
    // The engine awaits the callback's result, so synchronous callbacks are valid.
    do<T>(name: string, callback: () => T | Promise<T>): Promise<T>;
    do<T>(name: string, config: WorkflowStepConfig, callback: () => T | Promise<T>): Promise<T>;
    sleep(name: string, duration: WorkflowSleepDuration): Promise<void>;
    sleepUntil(name: string, timestamp: Date | number): Promise<void>;
  }

  export abstract class WorkflowEntrypoint<Env = unknown, T = unknown> {
    // workers-types marks ctx and env protected; they are ordinary properties at
    // runtime, and this repo's workflows pass `this` to helpers that read `env`.
    ctx: { waitUntil(promise: Promise<unknown>): void };
    env: Env;
    constructor(ctx: { waitUntil(promise: Promise<unknown>): void }, env: Env);
    run(event: Readonly<WorkflowEvent<T>>, step: WorkflowStep): Promise<unknown>;
  }
}
