export class RenderPassDataBuffer {
  //toolType: Uint8Array;
  x0: Float32Array;
  y0: Float32Array;
  x1: Float32Array;
  y1: Float32Array;
  x2: Float32Array;
  y2: Float32Array;
  red: Float32Array;
  green: Float32Array;
  blue: Float32Array;

  top: number;
  capacity: number;

  constructor(capacity: number = 256) {
    if (capacity > 32767 || capacity < 1) {
      console.warn("RenderPassDataBuffer capacity is int16 > 0");
      capacity = 256;
    }

    //this.toolType = new Uint8Array(capacity);
    this.x0 = new Float32Array(capacity);
    this.y0 = new Float32Array(capacity);
    this.x1 = new Float32Array(capacity);
    this.y1 = new Float32Array(capacity);
    this.x2 = new Float32Array(capacity);
    this.y2 = new Float32Array(capacity);
    this.red = new Float32Array(capacity);
    this.green = new Float32Array(capacity);
    this.blue = new Float32Array(capacity);
    this.top = 0;
    this.capacity = capacity;
  }

  // returns index of pushed data
  push(
    //toolType: number,
    x0: number,
    y0: number,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    red: number,
    green: number,
    blue: number
  ): number {
    if (this.top === this.capacity - 1) {
      console.warn("RenderPassDataBuffer.push(): full, dropping event");
      return -1;
    }

    //this.toolType[this.top] = toolType;
    this.x0[this.top] = x0;
    this.y0[this.top] = y0;
    this.x1[this.top] = x1;
    this.y1[this.top] = y1;
    this.x2[this.top] = x2;
    this.y2[this.top] = y2;
    this.red[this.top] = red;
    this.green[this.top] = green;
    this.blue[this.top] = blue;

    this.top++;
    return this.top - 1;
  }

  // returns index of replaced data
  replaceLast(
    //toolType: number,
    x0: number,
    y0: number,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    red: number,
    green: number,
    blue: number
  ): number {
    if (this.top === 0) {
      console.warn("RenderPassDataBuffer.replaceLast(): empty, dropping event");
      return -1;
    } //BOOKMARK ->

    //this.toolType[this.top - 1] = toolType;
    this.x0[this.top - 1] = x0;
    this.y0[this.top - 1] = y0;
    this.x1[this.top - 1] = x1;
    this.y1[this.top - 1] = y1;
    this.x2[this.top - 1] = x2;
    this.y2[this.top - 1] = y2;
    this.red[this.top - 1] = red;
    this.green[this.top - 1] = green;
    this.blue[this.top - 1] = blue;

    return this.top - 1;
  }

  clear(): void {
    this.top = 0;
  }
}
