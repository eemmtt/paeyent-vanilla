export class PaeyentEventArray {
  id: Uint8Array; // 0: PointerEventType | 1: UIEventType
  type: Uint8Array; // UIEventLookup value | PointerEventLookup value
  dataIdx: Uint8Array; // data buffer idx

  top: number;
  capacity: number;

  constructor(capacity: number = 128) {
    this.id = new Uint8Array(capacity);
    this.type = new Uint8Array(capacity);
    this.dataIdx = new Uint8Array(capacity);
    this.top = 0;
    this.capacity = capacity;
  }

  // returns index of pushed data
  push(id: number, type: number, dataIdx: number): number {
    if (this.top === this.capacity - 1) {
      console.warn("PaeyentEventQueue.push(): full, dropping event");
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
      console.warn("PaeyentEventQueue.replaceLast(): empty, dropping event");
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
