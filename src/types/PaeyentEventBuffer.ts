export class PaeyentEventBuffer {
  id: Uint8Array; // 0: PointerEventType | 1: UIEventType
  type: Uint8Array; // UIEventLookup value | PointerEventLookup value
  dataIdx: Int8Array; // data buffer idx

  top: number;
  capacity: number;

  constructor(capacity: number = 127) {
    if (capacity > 127) {
      console.warn("PaeyentEventBuffer capacity max value is 127");
      capacity = 127;
    }
    this.id = new Uint8Array(capacity);
    this.type = new Uint8Array(capacity);
    this.dataIdx = new Int8Array(capacity);
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
