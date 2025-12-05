export class RenderPassBuffer {
  type: Uint8Array; // RenderPassLookup value
  dataIdx: Int8Array; // RenderPassDataBuffer idx

  top: number;
  capacity: number;

  constructor(capacity: number = 127) {
    if (capacity > 127) {
      console.warn("RenderPassBuffer max capacity is 127");
      capacity = 127;
    }
    this.type = new Uint8Array(capacity);
    this.dataIdx = new Int8Array(capacity);
    this.top = 0;
    this.capacity = capacity;
  }

  // returns index of pushed data
  push(type: number, dataIdx: number): number {
    if (this.top === this.capacity - 1) {
      console.warn("RenderPassBuffer.push(): full, dropping event");
      return -1;
    }

    this.type[this.top] = type;
    this.dataIdx[this.top] = dataIdx;
    this.top++;
    return this.top - 1;
  }

  replaceLast(type: number, dataIdx: number): number {
    if (this.top === 0) {
      console.warn("RenderPassBuffer.replaceLast(): empty, dropping event");
      return -1;
    }

    this.type[this.top - 1] = type;
    this.dataIdx[this.top - 1] = dataIdx;
    return this.top - 1;
  }

  clear(): void {
    this.top = 0;
  }
}
