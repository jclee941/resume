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
    do<T>(name: string, callback: () => Promise<T>): Promise<T>;
    do<T>(name: string, config: WorkflowStepConfig, callback: () => Promise<T>): Promise<T>;
    sleep(name: string, duration: WorkflowSleepDuration): Promise<void>;
    sleepUntil(name: string, timestamp: Date | number): Promise<void>;
  }

  export abstract class WorkflowEntrypoint<Env = unknown, T = unknown> {
    protected ctx: { waitUntil(promise: Promise<unknown>): void };
    protected env: Env;
    constructor(ctx: { waitUntil(promise: Promise<unknown>): void }, env: Env);
    run(event: Readonly<WorkflowEvent<T>>, step: WorkflowStep): Promise<unknown>;
  }
}
