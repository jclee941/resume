/**
 * AutoApplier members the browser apply strategies (JobKorea, Saramin) use
 * through `this`; AutoApplier invokes them with `.call(this, job)` once its
 * page is open.
 *
 * @typedef {{ click(): Promise<unknown> }} ClickableElement
 *
 * @typedef {{
 *   goto(url: string, options?: { waitUntil?: string }): Promise<unknown>;
 *   title(): Promise<string>;
 *   $(selector: string): Promise<ClickableElement | null>;
 *   screenshot(options: { path: string }): Promise<unknown>;
 * }} BrowserStrategyPage
 *
 * @typedef {{
 *   sourceUrl: string;
 *   company?: string;
 *   title?: string;
 *   [key: string]: unknown;
 * }} BrowserStrategyJob
 *
 * @typedef {{
 *   page: BrowserStrategyPage;
 *   logger: {
 *     info(msg: string, ...args: unknown[]): void;
 *     error(msg: string, ...args: unknown[]): void;
 *   };
 *   sleep(ms: number): Promise<unknown>;
 *   findByText(
 *     tag: string,
 *     text: string,
 *     cssAlternative?: string | null
 *   ): Promise<ClickableElement | null>;
 *   findElementWithText(text: string): Promise<unknown>;
 *   appManager: {
 *     addApplication(job: BrowserStrategyJob): { id: string };
 *     updateStatus(applicationId: string, newStatus: string, note?: string): unknown;
 *     recordRetryMetric?: (event: string, payload: unknown) => void;
 *   };
 *   statsService?: { recordApplyRetryMetric?: (event: string, payload: unknown) => void };
 * }} BrowserStrategyHost
 */

export {};
