export class MockR2ObjectBody {
  constructor(bytes) {
    this.bytes = bytes;
  }

  async text() {
    return this.bytes.toString('utf8');
  }

  async json() {
    return JSON.parse(this.bytes.toString('utf8'));
  }

  async arrayBuffer() {
    return this.bytes.buffer.slice(
      this.bytes.byteOffset,
      this.bytes.byteOffset + this.bytes.byteLength
    );
  }
}
