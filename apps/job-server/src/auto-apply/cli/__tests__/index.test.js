import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

const CLI_PATH = new URL('../index.js', import.meta.url);
const LEGACY_CLI_PATH = new URL('../../cli.js', import.meta.url);

function runCli(args, cliPath = CLI_PATH) {
  return spawnSync(process.execPath, [cliPath.pathname, ...args], {
    cwd: process.cwd(),
    encoding: 'utf8',
  });
}

describe('auto-apply CLI process exits', () => {
  it('apply_queue without a queue path exits nonzero', () => {
    const result = runCli(['apply_queue']);

    assert.notStrictEqual(result.status, 0);
    assert.match(`${result.stdout}${result.stderr}`, /Provide a queue file/);
  });

  it('unknown command exits nonzero while help exits zero', () => {
    const help = runCli(['help']);
    const unknown = runCli(['unknown_command']);

    assert.strictEqual(help.status, 0);
    assert.notStrictEqual(unknown.status, 0);
  });

  it('legacy CLI path delegates to the current CLI entrypoint', () => {
    const unknown = runCli(['unknown_command'], LEGACY_CLI_PATH);

    assert.notStrictEqual(unknown.status, 0);
  });
});
