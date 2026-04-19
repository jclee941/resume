/**
 * Stream processor for large responses
 */
export class StreamProcessor {
  #logger;

  constructor(options = {}) {
    this.#logger = options.logger || console;
  }

  /**
   * Process stream in chunks
   * @param {ReadableStream} stream
   * @param {Function} processor - Process each chunk
   * @param {Object} options
   */
  async process(stream, processor, options = {}) {
    const { onProgress } = options;
    const reader = stream.getReader();

    let totalBytes = 0;
    let chunks = 0;

    try {
      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        totalBytes += value.length;
        chunks++;

        await processor(value, { totalBytes, chunks });

        if (onProgress && chunks % 10 === 0) {
          onProgress({ totalBytes, chunks });
        }
      }

      return { totalBytes, chunks };
    } finally {
      reader.releaseLock();
    }
  }

  /**
   * Stream JSON parser
   * @param {ReadableStream} stream
   * @returns {AsyncGenerator}
   */
  async *parseJSONStream(stream) {
    const reader = stream.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed) {
            try {
              yield JSON.parse(trimmed);
            } catch (_e) {
              this.#logger.debug('Failed to parse JSON line:', trimmed);
            }
          }
        }
      }

      if (buffer.trim()) {
        try {
          yield JSON.parse(buffer);
        } catch (_e) {
          this.#logger.debug('Failed to parse final JSON buffer');
        }
      }
    } finally {
      reader.releaseLock();
    }
  }
}
