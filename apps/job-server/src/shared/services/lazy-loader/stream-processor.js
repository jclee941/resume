/**
 * @typedef {{ totalBytes: number, chunks: number }} StreamProgressInfo
 */

/**
 * @typedef {{
 *   onProgress?: (info: StreamProgressInfo) => void;
 * }} StreamProcessOptions
 */

/**
 * Stream processor for large responses
 */
export class StreamProcessor {
  /**
   * Process stream in chunks
   * @param {ReadableStream<Uint8Array>} stream
   * @param {(chunk: Uint8Array, info: StreamProgressInfo) => Promise<unknown> | unknown} processor - Process each chunk
   * @param {StreamProcessOptions} [options]
   * @returns {Promise<StreamProgressInfo>}
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
}
