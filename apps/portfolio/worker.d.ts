/**
 * Type surface of the generated, gitignored `worker.js` (written by
 * `lib/worker-writer.js`). TypeScript resolves `./worker.js` imports to this
 * declaration first, so strict checking covers `entry.js` and
 * `lib/entry-router-utils/constants.js` without checking the generated bundle.
 * Keep it in sync with the exports the writer emits.
 */

export declare const CONTENT_LASTMOD: string;

declare const portfolioWorker: {
  fetch(request: Request, env: unknown, ctx: unknown): Promise<Response>;
};

export default portfolioWorker;
