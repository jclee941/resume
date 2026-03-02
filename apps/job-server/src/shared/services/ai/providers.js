/**
 * AI Provider implementations for Workers AI and OpenAI via AI Gateway.
 *
 * Workers AI: On-edge inference using Cloudflare's AI binding.
 * OpenAI: Proxied through Cloudflare AI Gateway for caching, rate limiting, and observability.
 *
 * @module ai/providers
 */

/**
 * Workers AI provider — runs models on Cloudflare's edge network.
 * Requires `AI` binding in wrangler.jsonc.
 */
export class WorkersAIProvider {
  /** @param {object} env - Cloudflare Worker environment bindings */
  constructor(env) {
    if (!env?.AI) {
      throw new Error('Workers AI binding (env.AI) is not configured');
    }
    this.ai = env.AI;
    this.name = 'workers-ai';
  }

  /**
   * Run a text generation model.
   * @param {string} model - Model identifier (e.g. '@cf/meta/llama-3.1-8b-instruct')
   * @param {object} options
   * @param {Array<{role: string, content: string}>} options.messages - Chat messages
   * @param {number} [options.max_tokens=512] - Maximum tokens to generate
   * @param {number} [options.temperature=0.7] - Sampling temperature
   * @returns {Promise<{text: string, model: string, provider: string, usage: object}>}
   */
  async complete(model, { messages, max_tokens = 512, temperature = 0.7 }) {
    const startTime = Date.now();

    const result = await this.ai.run(model, {
      messages,
      max_tokens,
      temperature,
    });

    const text =
      typeof result === 'string'
        ? result
        : (result?.response ?? result?.result ?? JSON.stringify(result));

    return {
      text,
      model,
      provider: this.name,
      latencyMs: Date.now() - startTime,
      usage: {
        prompt_tokens: estimateTokens(messages.map((m) => m.content).join(' ')),
        completion_tokens: estimateTokens(text),
        total_tokens: 0, // calculated below
      },
    };
  }

  /**
   * Generate text embeddings.
   * @param {string} model - Embedding model (e.g. '@cf/baai/bge-base-en-v1.5')
   * @param {string|string[]} text - Text to embed
   * @returns {Promise<{embeddings: number[][], model: string, provider: string}>}
   */
  async embed(model, text) {
    const input = Array.isArray(text) ? text : [text];
    const result = await this.ai.run(model, { text: input });

    return {
      embeddings: result?.data ?? result,
      model,
      provider: this.name,
    };
  }
}

/**
 * OpenAI provider — routes through Cloudflare AI Gateway for caching,
 * rate limiting, logging, and cost observability.
 *
 * AI Gateway URL format:
 *   https://gateway.ai.cloudflare.com/v1/{ACCOUNT_ID}/{GATEWAY_ID}/openai
 */
export class OpenAIProvider {
  /**
   * @param {object} options
   * @param {string} options.apiKey - OpenAI API key
   * @param {string} options.gatewayUrl - AI Gateway proxy URL
   * @param {number} [options.timeoutMs=30000] - Request timeout
   */
  constructor({ apiKey, gatewayUrl, timeoutMs = 30000 }) {
    if (!apiKey) throw new Error('OpenAI API key is required');
    if (!gatewayUrl) throw new Error('AI Gateway URL is required');

    this.apiKey = apiKey;
    this.gatewayUrl = gatewayUrl.replace(/\/$/, '');
    this.timeoutMs = timeoutMs;
    this.name = 'openai';
  }

  /**
   * Run a chat completion via AI Gateway.
   * @param {string} model - OpenAI model (e.g. 'gpt-4o-mini', 'gpt-4o')
   * @param {object} options
   * @param {Array<{role: string, content: string}>} options.messages
   * @param {number} [options.max_tokens=1024]
   * @param {number} [options.temperature=0.7]
   * @returns {Promise<{text: string, model: string, provider: string, usage: object}>}
   */
  async complete(model, { messages, max_tokens = 1024, temperature = 0.7 }) {
    const startTime = Date.now();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(`${this.gatewayUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ model, messages, max_tokens, temperature }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorBody = await response.text().catch(() => 'unknown');
        throw new Error(`OpenAI API error ${response.status}: ${errorBody}`);
      }

      const data = await response.json();
      const text = data.choices?.[0]?.message?.content ?? '';

      return {
        text,
        model: data.model ?? model,
        provider: this.name,
        latencyMs: Date.now() - startTime,
        usage: data.usage ?? {
          prompt_tokens: 0,
          completion_tokens: 0,
          total_tokens: 0,
        },
      };
    } finally {
      clearTimeout(timeout);
    }
  }

  /**
   * Generate embeddings via AI Gateway.
   * @param {string} model - Embedding model (e.g. 'text-embedding-3-small')
   * @param {string|string[]} text
   * @returns {Promise<{embeddings: number[][], model: string, provider: string}>}
   */
  async embed(model, text) {
    const input = Array.isArray(text) ? text : [text];
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(`${this.gatewayUrl}/embeddings`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ model, input }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`OpenAI embedding error ${response.status}`);
      }

      const data = await response.json();
      return {
        embeddings: data.data.map((d) => d.embedding),
        model: data.model ?? model,
        provider: this.name,
      };
    } finally {
      clearTimeout(timeout);
    }
  }
}

/**
 * Rough token estimator (4 chars ≈ 1 token).
 * Used when the provider doesn't return usage stats.
 * @param {string} text
 * @returns {number}
 */
function estimateTokens(text) {
  if (!text) return 0;
  return Math.ceil(text.length / 4);
}

/** Default model configurations */
export const MODEL_CATALOG = {
  // Workers AI models (on-edge, free/cheap)
  'workers-fast': {
    provider: 'workers-ai',
    model: '@cf/meta/llama-3.1-8b-instruct',
    tier: 'fast',
    costPer1kTokens: 0,
  },
  'workers-embed': {
    provider: 'workers-ai',
    model: '@cf/baai/bge-base-en-v1.5',
    tier: 'embed',
    costPer1kTokens: 0,
  },

  // OpenAI models (via AI Gateway)
  'openai-fast': {
    provider: 'openai',
    model: 'gpt-4o-mini',
    tier: 'fast',
    costPer1kTokens: 0.00015,
  },
  'openai-quality': {
    provider: 'openai',
    model: 'gpt-4o',
    tier: 'quality',
    costPer1kTokens: 0.005,
  },
  'openai-embed': {
    provider: 'openai',
    model: 'text-embedding-3-small',
    tier: 'embed',
    costPer1kTokens: 0.00002,
  },
};
