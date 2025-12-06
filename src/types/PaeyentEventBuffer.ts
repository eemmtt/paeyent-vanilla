export class PaeyentEventBuffer {
  id: Uint8Array; // 0: PointerEventType | 1: UIEventType
  type: Uint8Array; // UIEventLookup value | PointerEventLookup value
  dataIdx: Int16Array; // data buffer idx

  top: number;
  capacity: number;

  constructor(capacity: number = 256) {
    if (capacity > 32767 || capacity < -32768) {
      console.warn("PaeyentEventBuffer capacity is int16");
      capacity = 256;
    }
    this.id = new Uint8Array(capacity);
    this.type = new Uint8Array(capacity);
    this.dataIdx = new Int16Array(capacity);
    this.top = 0;
    this.capacity = capacity;
  }

  // returns index of pushed data
  push(id: number, type: number, dataIdx: number): number {
    if (this.top === this.capacity - 1) {
      console.warn("PaeyentEventBuffer.push(): full, dropping event");
      return -1;
    }

    this.id[this.top] = id;
    this.type[this.top] = type;
    this.dataIdx[this.top] = dataIdx;
    this.top++;
    return this.top - 1;
  }

  replaceLast(id: number, type: number, dataIdx: number): number {
    if (this.top === 0) {
      console.warn("PaeyentEventBuffer.replaceLast(): empty, dropping event");
      return -1;
    }

    this.id[this.top - 1] = id;
    this.type[this.top - 1] = type;
    this.dataIdx[this.top - 1] = dataIdx;
    return this.top - 1;
  }

  clear(): void {
    this.top = 0;
  }
}
