import type { PointerType } from "./PaeyentEvent";

// only pointer data (for now??)
export class PaeyentEventDataBuffer {
  x: Float32Array;
  y: Float32Array;
  pressure: Float32Array;
  pointerType: Uint8Array; // 0: mouse | 1: pen | 2: touch

  top: number;
  capacity: number;

  constructor(capacity: number = 256) {
    if (capacity > 32767 || capacity < 1) {
      console.warn("PaeyentEventDataBuffer capacity is int16 > 0");
      capacity = 256;
    }
    this.x = new Float32Array(capacity);
    this.y = new Float32Array(capacity);
    this.pressure = new Float32Array(capacity);
    this.pointerType = new Uint8Array(capacity);
    this.top = 0;
    this.capacity = capacity;
  }

  // returns index of pushed data
  push(
    x: number,
    y: number,
    pressure: number,
    pointerType: PointerType
  ): number {
    if (this.top === this.capacity - 1) {
      console.warn("PaeyentEventDataBuffer.push(): full, dropping event");
      return -1;
    }

    this.x[this.top] = x;
    this.y[this.top] = y;
    this.pressure[this.top] = pressure;
    this.pointerType[this.top] =
      pointerType === "mouse" ? 0 : pointerType === "pen" ? 1 : 2;

    this.top++;
    return this.top - 1;
  }

  // returns index of replaced data
  replaceLast(
    x: number,
    y: number,
    pressure: number,
    pointerType: PointerType
  ): number {
    if (this.top === 0) {
      console.warn(
        "PaeyentEventDataBuffer.replaceLast(): empty, dropping event"
      );
      return -1;
    }

    this.x[this.top - 1] = x;
    this.y[this.top - 1] = y;
    this.pressure[this.top - 1] = pressure;
    this.pointerType[this.top - 1] =
      pointerType === "mouse" ? 0 : pointerType === "pen" ? 1 : 2;
    return this.top - 1;
  }

  clear(): void {
    this.top = 0;
  }
}
