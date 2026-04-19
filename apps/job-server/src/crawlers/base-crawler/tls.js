export async function loadUndici() {
  if (this._undici || this._undiciLoadFailed) {
    return this._undici;
  }

  try {
    this._undici = await import('undici');
    return this._undici;
  } catch {
    this._undiciLoadFailed = true;
    return null;
  }
}

export function resolveFingerprint(proxyUrl) {
  if (!this.tlsOptions.enabled) {
    return this.currentFingerprint;
  }

  const forceRotate = this.tlsOptions.rotatePerRequest || proxyUrl !== this.currentProxy;

  if (proxyUrl) {
    this.currentFingerprint = this.tlsFingerprintManager.getForProxy(proxyUrl, {
      platform: this.tlsOptions.platform,
      browser: this.tlsOptions.browser,
      forceRotate,
    });
  } else if (forceRotate || !this.currentFingerprint) {
    this.currentFingerprint = this.tlsFingerprintManager.rotateFingerprint({
      platform: this.tlsOptions.platform,
      browser: this.tlsOptions.browser,
    });
  }

  if (this.currentFingerprint?.userAgent) {
    this.headers['User-Agent'] = this.currentFingerprint.userAgent;
  }

  this.currentProxy = proxyUrl;
  return this.currentFingerprint;
}

export async function resolveDispatcher(proxyUrl, fingerprint) {
  if (!this.tlsOptions.enabled) {
    return null;
  }

  const undici = await this._loadUndici();
  if (!undici) {
    return null;
  }

  const key = `${proxyUrl || 'direct'}::${fingerprint?.id || 'none'}`;
  if (this._dispatchers.has(key)) {
    return this._dispatchers.get(key);
  }

  const connect = this.tlsFingerprintManager.buildTlsConnectOptions(fingerprint);
  let dispatcher = null;

  if (proxyUrl && undici.ProxyAgent) {
    dispatcher = new undici.ProxyAgent({
      uri: proxyUrl,
      requestTls: connect,
    });
  } else if (undici.Agent) {
    dispatcher = new undici.Agent({
      connect,
      keepAliveTimeout: 5000,
      keepAliveMaxTimeout: 15000,
      connections: 10,
      pipelining: 0,
    });
  }

  if (dispatcher) {
    this._dispatchers.set(key, dispatcher);
  }

  return dispatcher;
}
