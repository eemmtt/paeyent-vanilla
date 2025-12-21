export class NewRenderPassBuffer {
  /* 
  1, type: u8 + (3 * u8) padding;
  2, x0: f32;
  3, y0: f32;
  4, x1: f32;
  5, y1: f32;
  6, x2: f32;
  7, y2: f32;
  8, red: f32;
  9, green: f32;
  10, blue: f32;
  11, line_width: f32;     
  12, texture_width: f32;
  13, texture_height:  f32;
  14, radius: f32;
  15, softness: f32;
  16, noise_jitter: f32;
  = 64 bytes

  or if everything is moved to f16, we could fit in 32bytes
  i might want a transparency param instead of noise_jitter...
  */

  data: ArrayBuffer;
  view: DataView;
  top: number;
  capacity: number;

  readonly stride = 64; //bytes
  readonly offsetType = 0;
  readonly offsetX0 = 4;
  readonly offsetY0 = 8;
  readonly offsetX1 = 12;
  readonly offsetY1 = 16;
  readonly offsetX2 = 20;
  readonly offsetY2 = 24;
  readonly offsetRed = 28;
  readonly offsetGreen = 32;
  readonly offsetBlue = 36;
  readonly offsetLineWidth = 40;
  readonly offsetTextureWidth = 44;
  readonly offsetTextureHeight = 48;
  readonly offsetRadius = 52;
  readonly offsetSoftness = 56;
  readonly offsetJitter = 60;

  constructor(capacity: number = 256) {
    if (capacity > 32767 || capacity < 1) {
      console.warn("RenderPassBuffer capacity is int16 > 0");
      capacity = 256;
    }
    this.data = new ArrayBuffer(capacity * this.stride);
    this.view = new DataView(this.data);
    this.top = 0;
    this.capacity = capacity;
  }

  pushLine(
    type: number,
    x0: number,
    y0: number,
    x1: number,
    y1: number,
    r: number,
    g: number,
    b: number
  ): void {
    if (this.top === this.capacity - 1) {
      console.warn("RenderPassBuffer.push(): full, dropping event");
      return;
    }

    // TODO: add bounds checks...
    this.view.setUint8(this.top * this.stride + this.offsetType, type);
    this.view.setFloat32(this.top * this.stride + this.offsetX0, x0);
    this.view.setFloat32(this.top * this.stride + this.offsetY0, y0);
    this.view.setFloat32(this.top * this.stride + this.offsetX1, x1);
    this.view.setFloat32(this.top * this.stride + this.offsetY1, y1);
    this.view.setFloat32(this.top * this.stride + this.offsetRed, r);
    this.view.setFloat32(this.top * this.stride + this.offsetGreen, g);
    this.view.setFloat32(this.top * this.stride + this.offsetBlue, b);

    this.top++;
  }

  pushTriangle(
    type: number,
    x0: number,
    y0: number,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    r: number,
    g: number,
    b: number
  ): void {
    if (this.top === this.capacity - 1) {
      console.warn("RenderPassBuffer.push(): full, dropping event");
      return;
    }

    // TODO: add bounds checks...
    this.view.setUint8(this.top * this.stride + this.offsetType, type);
    this.view.setFloat32(this.top * this.stride + this.offsetX0, x0);
    this.view.setFloat32(this.top * this.stride + this.offsetY0, y0);
    this.view.setFloat32(this.top * this.stride + this.offsetX1, x1);
    this.view.setFloat32(this.top * this.stride + this.offsetY1, y1);
    this.view.setFloat32(this.top * this.stride + this.offsetX2, x2);
    this.view.setFloat32(this.top * this.stride + this.offsetY2, y2);
    this.view.setFloat32(this.top * this.stride + this.offsetRed, r);
    this.view.setFloat32(this.top * this.stride + this.offsetGreen, g);
    this.view.setFloat32(this.top * this.stride + this.offsetBlue, b);

    this.top++;
  }

  pushCircle(
    type: number,
    x0: number,
    y0: number,
    radius: number,
    r: number,
    g: number,
    b: number
  ): void {
    if (this.top === this.capacity - 1) {
      console.warn("RenderPassBuffer.push(): full, dropping event");
      return;
    }

    // TODO: add bounds checks...
    this.view.setUint8(this.top * this.stride + this.offsetType, type);
    this.view.setFloat32(this.top * this.stride + this.offsetX0, x0);
    this.view.setFloat32(this.top * this.stride + this.offsetY0, y0);
    this.view.setFloat32(this.top * this.stride + this.offsetRadius, radius);
    this.view.setFloat32(this.top * this.stride + this.offsetRed, r);
    this.view.setFloat32(this.top * this.stride + this.offsetGreen, g);
    this.view.setFloat32(this.top * this.stride + this.offsetBlue, b);

    this.top++;
  }

  pushRectangle(
    type: number,
    x0: number,
    y0: number,
    x1: number,
    y1: number,
    r: number,
    g: number,
    b: number
  ): void {
    if (this.top === this.capacity - 1) {
      console.warn("RenderPassBuffer.push(): full, dropping event");
      return;
    }

    // TODO: add bounds checks...
    this.view.setUint8(this.top * this.stride + this.offsetType, type);
    this.view.setFloat32(this.top * this.stride + this.offsetX0, x0);
    this.view.setFloat32(this.top * this.stride + this.offsetY0, y0);
    this.view.setFloat32(this.top * this.stride + this.offsetX1, x1);
    this.view.setFloat32(this.top * this.stride + this.offsetY1, y1);
    this.view.setFloat32(this.top * this.stride + this.offsetRed, r);
    this.view.setFloat32(this.top * this.stride + this.offsetGreen, g);
    this.view.setFloat32(this.top * this.stride + this.offsetBlue, b);

    this.top++;
  }

  pushClear(type: number) {
    if (this.top === this.capacity - 1) {
      console.warn("RenderPassBuffer.push(): full, dropping event");
      return;
    }

    this.view.setUint8(this.top * this.stride + this.offsetType, type);
    this.top++;
  }

  clear() {
    this.top = 0;
  }
}
