/**
 * Stream processor for large responses
 */
export class StreamProcessor {
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
}
