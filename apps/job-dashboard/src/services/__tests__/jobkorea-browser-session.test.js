import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { withJobKoreaBrowserSession } from '../jobkorea-browser-session.js';

function fixture() {
  const socket = new EventTarget();
  socket.accept = mock.fn();
  socket.send = mock.fn();
  socket.close = mock.fn();
  const browser = { close: mock.fn(async () => {}) };
  const connect = mock.fn(async () => browser);
  const fetchImpl = mock.fn(async () => ({ status: 101, webSocket: socket }));
  const env = {
    REMEMBER_BROWSER_ACCOUNT_ID: 'account',
    REMEMBER_BROWSER_API_TOKEN: 'secret-token',
  };
  return { env, socket, browser, connect, fetchImpl };
}

describe('JobKorea browser over Cloudflare REST CDP', () => {
  it('uses authenticated REST egress and closes the browser after the callback', async () => {
    const f = fixture();
    const result = await withJobKoreaBrowserSession(
      f.env,
      async (browser) => {
        assert.equal(browser, f.browser);
        assert.equal(f.browser.close.mock.callCount(), 0);
        return 'read editor';
      },
      { fetchImpl: f.fetchImpl, puppeteer: { connect: f.connect } }
    );
    assert.equal(result, 'read editor');
    const [url, init] = f.fetchImpl.mock.calls[0].arguments;
    assert.equal(
      url,
      'https://api.cloudflare.com/client/v4/accounts/account/browser-run/devtools/browser'
    );
    assert.equal(init.headers.Authorization, 'Bearer secret-token');
    assert.equal(init.headers.Upgrade, 'websocket');
    assert.equal(f.socket.accept.mock.callCount(), 1);
    assert.equal(f.browser.close.mock.callCount(), 1);
    const { transport } = f.connect.mock.calls[0].arguments[0];
    const receive = mock.fn();
    const closed = mock.fn();
    transport.onmessage = receive;
    transport.onclose = closed;
    socketEvent(f.socket, 'message', '{"id":1}');
    f.socket.dispatchEvent(new Event('close'));
    transport.send('command');
    transport.close();
    assert.equal(receive.mock.calls[0].arguments[0], '{"id":1}');
    assert.equal(closed.mock.callCount(), 1);
    assert.equal(f.socket.send.mock.calls[0].arguments[0], 'command');
    assert.equal(f.socket.close.mock.callCount(), 2);
  });

  it('closes the browser when editor work fails without hiding the failure', async () => {
    const f = fixture();
    await assert.rejects(
      withJobKoreaBrowserSession(
        f.env,
        async () => {
          throw new Error('editor failed');
        },
        { fetchImpl: f.fetchImpl, puppeteer: { connect: f.connect } }
      ),
      /editor failed/
    );
    assert.equal(f.browser.close.mock.callCount(), 1);
  });

  it('closes an acquired socket when the caller deadline expires before connection', async () => {
    const f = fixture();
    let checks = 0;
    const assertOpen = mock.fn(() => {
      if (++checks === 2) throw new Error('window closed');
    });
    await assert.rejects(
      withJobKoreaBrowserSession(f.env, async () => {}, {
        assertOpen,
        fetchImpl: f.fetchImpl,
        puppeteer: { connect: f.connect },
      }),
      /window closed/
    );
    assert.equal(f.connect.mock.callCount(), 0);
    assert.equal(f.socket.close.mock.callCount(), 1);
  });

  it('rejects unavailable credentials or a failed upgrade before invoking the callback', async () => {
    const f = fixture();
    const run = mock.fn();
    await assert.rejects(
      withJobKoreaBrowserSession({}, run, {
        fetchImpl: f.fetchImpl,
      }),
      /Browser Run credentials/
    );
    assert.equal(f.fetchImpl.mock.callCount(), 0);
    await assert.rejects(
      withJobKoreaBrowserSession(f.env, run, {
        fetchImpl: async () => ({ status: 403 }),
      }),
      /403/
    );
    assert.equal(run.mock.callCount(), 0);
  });
});

function socketEvent(socket, type, data) {
  socket.dispatchEvent(new MessageEvent(type, { data }));
}
