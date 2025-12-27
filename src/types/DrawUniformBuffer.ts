import { RenderPassLookup } from "../graphics/wgpu_render";

export class DrawUniformBuffer {
  /* 
  ---  meta data ---
  1, type: u8 + (3 * u8) padding;
  --- uniform data ---
  2, x0: f32;
  3, y0: f32;
  4, x1: f32;
  5, y1: f32;
  6, x2: f32;
  7, y2: f32;
  8, red: f32;
  9, green: f32;
  10, blue: f32;
  11, alpha: f32;
  12, line_width: f32;     
  13, radius: f32;
  14, softness: f32;
  15, noise_jitter: f32;
  16, texture_width: f32;
  17, texture_height: f32;
  = 68 bytes
  */

  data: ArrayBuffer;
  view: DataView;
  top: number;
  capacity: number;
  alignedSize: number; //bytes

  readonly stride = 68; //bytes
  readonly metaStride = 4; //bytes
  readonly uniformStride = 64; //bytes

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
  readonly offsetAlpha = 40;
  readonly offsetLineWidth = 44;
  readonly offsetRadius = 48;
  readonly offsetSoftness = 52;
  readonly offsetJitter = 56;
  readonly offsetTextureWidth = 60;
  readonly offsetTextureHeight = 64;

  constructor(device: GPUDevice, capacity: number = 256) {
    if (capacity > Number.MAX_SAFE_INTEGER || capacity < 1) {
      console.warn("DrawUniformBuffer capacity must be a positive integer");
      capacity = 256;
    }
    this.data = new ArrayBuffer(capacity * this.stride);
    this.view = new DataView(this.data);
    this.top = 0;
    this.capacity = capacity;

    const alignment = device.limits.minUniformBufferOffsetAlignment;
    this.alignedSize = Math.ceil(this.uniformStride / alignment) * alignment;
  }

  pushLineReplaceFg(
    x0: number,
    y0: number,
    x1: number,
    y1: number,
    r: number,
    g: number,
    b: number
  ): number {
    if (this.top === this.capacity - 1) {
      console.warn(
        "DrawUniformBuffer.pushLineReplaceFg(): full, dropping event"
      );
      return -1;
    }

    this.view.setUint8(
      this.top * this.stride + this.offsetType,
      RenderPassLookup["line-fg"]
    );
    this.setf32(this.top * this.stride + this.offsetX0, x0);
    this.setf32(this.top * this.stride + this.offsetY0, y0);
    this.setf32(this.top * this.stride + this.offsetX1, x1);
    this.setf32(this.top * this.stride + this.offsetY1, y1);
    this.setf32(this.top * this.stride + this.offsetRed, r);
    this.setf32(this.top * this.stride + this.offsetGreen, g);
    this.setf32(this.top * this.stride + this.offsetBlue, b);
    this.setf32(this.top * this.stride + this.offsetAlpha, 1.0);
    this.setf32(this.top * this.stride + this.offsetLineWidth, 2);

    return this.top++;
  }

  pushLineAppendBg(
    x0: number,
    y0: number,
    x1: number,
    y1: number,
    r: number,
    g: number,
    b: number
  ): void {
    if (this.top === this.capacity - 1) {
      console.warn(
        "DrawUniformBuffer.pushLineAppendBg(): full, dropping event"
      );
      return;
    }

    this.view.setUint8(
      this.top * this.stride + this.offsetType,
      RenderPassLookup["line-bg"]
    );
    this.setf32(this.top * this.stride + this.offsetX0, x0);
    this.setf32(this.top * this.stride + this.offsetY0, y0);
    this.setf32(this.top * this.stride + this.offsetX1, x1);
    this.setf32(this.top * this.stride + this.offsetY1, y1);
    this.setf32(this.top * this.stride + this.offsetRed, r);
    this.setf32(this.top * this.stride + this.offsetGreen, g);
    this.setf32(this.top * this.stride + this.offsetBlue, b);
    this.setf32(this.top * this.stride + this.offsetAlpha, 1.0);
    this.setf32(this.top * this.stride + this.offsetLineWidth, 2);

    this.top++;
  }

  pushTriangleReplaceFg(
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
      console.warn(
        "DrawUniformBuffer.pushTriangleReplaceFg(): full, dropping event"
      );
      return;
    }

    this.view.setUint8(
      this.top * this.stride + this.offsetType,
      RenderPassLookup["fan-fg"]
    );
    this.setf32(this.top * this.stride + this.offsetX0, x0);
    this.setf32(this.top * this.stride + this.offsetY0, y0);
    this.setf32(this.top * this.stride + this.offsetX1, x1);
    this.setf32(this.top * this.stride + this.offsetY1, y1);
    this.setf32(this.top * this.stride + this.offsetX2, x2);
    this.setf32(this.top * this.stride + this.offsetY2, y2);
    this.setf32(this.top * this.stride + this.offsetRed, r);
    this.setf32(this.top * this.stride + this.offsetGreen, g);
    this.setf32(this.top * this.stride + this.offsetBlue, b);
    this.setf32(this.top * this.stride + this.offsetAlpha, 1.0);

    this.top++;
  }

  pushTriangleAppendBg(
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
      console.warn(
        "DrawUniformBuffer.pushTriangleAppendBg(): full, dropping event"
      );
      return;
    }

    this.view.setUint8(
      this.top * this.stride + this.offsetType,
      RenderPassLookup["fan-bg"]
    );
    this.setf32(this.top * this.stride + this.offsetX0, x0);
    this.setf32(this.top * this.stride + this.offsetY0, y0);
    this.setf32(this.top * this.stride + this.offsetX1, x1);
    this.setf32(this.top * this.stride + this.offsetY1, y1);
    this.setf32(this.top * this.stride + this.offsetX2, x2);
    this.setf32(this.top * this.stride + this.offsetY2, y2);
    this.setf32(this.top * this.stride + this.offsetRed, r);
    this.setf32(this.top * this.stride + this.offsetGreen, g);
    this.setf32(this.top * this.stride + this.offsetBlue, b);
    this.setf32(this.top * this.stride + this.offsetAlpha, 1.0);

    this.top++;
  }

  pushCircleReplaceAnno(
    x: number,
    y: number,
    radius: number,
    r: number,
    g: number,
    b: number
  ): void {
    if (this.top === this.capacity - 1) {
      console.warn(
        "DrawUniformBuffer.pushCircleReplaceAnno(): full, dropping event"
      );
      return;
    }

    this.view.setUint8(
      this.top * this.stride + this.offsetType,
      RenderPassLookup["circle-replace-anno"]
    );
    this.setf32(this.top * this.stride + this.offsetX0, x);
    this.setf32(this.top * this.stride + this.offsetY0, y);
    this.setf32(this.top * this.stride + this.offsetRadius, radius);
    this.setf32(this.top * this.stride + this.offsetRed, r);
    this.setf32(this.top * this.stride + this.offsetGreen, g);
    this.setf32(this.top * this.stride + this.offsetBlue, b);
    this.setf32(this.top * this.stride + this.offsetAlpha, 1.0);
    this.setf32(this.top * this.stride + this.offsetLineWidth, 1);

    this.top++;
  }

  pushCircleAppendAnno(
    x: number,
    y: number,
    radius: number,
    r: number,
    g: number,
    b: number
  ): void {
    if (this.top === this.capacity - 1) {
      console.warn(
        "DrawUniformBuffer.pushCircleAppendAnno(): full, dropping event"
      );
      return;
    }

    this.view.setUint8(
      this.top * this.stride + this.offsetType,
      RenderPassLookup["circle-append-anno"]
    );
    this.setf32(this.top * this.stride + this.offsetX0, x);
    this.setf32(this.top * this.stride + this.offsetY0, y);
    this.setf32(this.top * this.stride + this.offsetRadius, radius);
    this.setf32(this.top * this.stride + this.offsetRed, r);
    this.setf32(this.top * this.stride + this.offsetGreen, g);
    this.setf32(this.top * this.stride + this.offsetBlue, b);
    this.setf32(this.top * this.stride + this.offsetAlpha, 1.0);
    this.setf32(this.top * this.stride + this.offsetLineWidth, 1);

    this.top++;
  }

  pushRectangleReplaceAnno(
    left: number,
    top: number,
    right: number,
    bottom: number,
    r: number,
    g: number,
    b: number
  ): void {
    if (this.top === this.capacity - 1) {
      console.warn(
        "DrawUniformBuffer.pushRectangleReplaceAnno(): full, dropping event"
      );
      return;
    }

    this.view.setUint8(
      this.top * this.stride + this.offsetType,
      RenderPassLookup["rectangle-replace-anno"]
    );
    this.setf32(this.top * this.stride + this.offsetX0, left);
    this.setf32(this.top * this.stride + this.offsetY0, top);
    this.setf32(this.top * this.stride + this.offsetX1, right);
    this.setf32(this.top * this.stride + this.offsetY1, bottom);
    this.setf32(this.top * this.stride + this.offsetRed, r);
    this.setf32(this.top * this.stride + this.offsetGreen, g);
    this.setf32(this.top * this.stride + this.offsetBlue, b);
    this.setf32(this.top * this.stride + this.offsetAlpha, 1.0);
    this.setf32(this.top * this.stride + this.offsetLineWidth, 1);

    this.top++;
  }

  pushRectangleAppendAnno(
    left: number,
    top: number,
    right: number,
    bottom: number,
    r: number,
    g: number,
    b: number
  ): void {
    if (this.top === this.capacity - 1) {
      console.warn(
        "DrawUniformBuffer.pushRectangleAppendAnno(): full, dropping event"
      );
      return;
    }

    this.view.setUint8(
      this.top * this.stride + this.offsetType,
      RenderPassLookup["rectangle-append-anno"]
    );
    this.setf32(this.top * this.stride + this.offsetX0, left);
    this.setf32(this.top * this.stride + this.offsetY0, top);
    this.setf32(this.top * this.stride + this.offsetX1, right);
    this.setf32(this.top * this.stride + this.offsetY1, bottom);
    this.setf32(this.top * this.stride + this.offsetRed, r);
    this.setf32(this.top * this.stride + this.offsetGreen, g);
    this.setf32(this.top * this.stride + this.offsetBlue, b);
    this.setf32(this.top * this.stride + this.offsetAlpha, 1.0);
    this.setf32(this.top * this.stride + this.offsetLineWidth, 1);

    this.top++;
  }

  pushClearFg() {
    if (this.top === this.capacity - 1) {
      console.warn("DrawUniformBuffer.pushClearFg(): full, dropping event");
      return;
    }

    this.view.setUint8(
      this.top * this.stride + this.offsetType,
      RenderPassLookup["clear-fg"]
    );
    this.top++;
  }

  pushClearBg() {
    if (this.top === this.capacity - 1) {
      console.warn("DrawUniformBuffer.pushClearBg(): full, dropping event");
      return;
    }

    this.view.setUint8(
      this.top * this.stride + this.offsetType,
      RenderPassLookup["clear-bg"]
    );
    this.top++;
  }

  pushClearAnno() {
    if (this.top === this.capacity - 1) {
      console.warn("DrawUniformBuffer.pushClearAnno(): full, dropping event");
      return;
    }

    this.view.setUint8(
      this.top * this.stride + this.offsetType,
      RenderPassLookup["clear-anno"]
    );
    this.top++;
  }

  pushClearAll() {
    if (this.top === this.capacity - 1) {
      console.warn("DrawUniformBuffer.pushClearAll(): full, dropping event");
      return;
    }

    this.view.setUint8(
      this.top * this.stride + this.offsetType,
      RenderPassLookup["clear-all"]
    );
    this.top++;
  }

  pushFromBuffer(fromBuffer: DrawUniformBuffer, fromIdx: number) {
    if (this.top === this.capacity - 1) {
      console.warn(
        "DrawUniformBuffer.pushFromBuffer(): recipient full, dropping event"
      );
      return;
    }

    if (fromIdx < 0 || fromIdx >= fromBuffer.top) {
      console.warn(
        "DrawUniformBuffer.pushFromBuffer(): fromIdx out of bounds",
        fromIdx
      );
      return;
    }

    const fromByteOffset = fromIdx * this.stride;
    const toByteOffset = this.top * this.stride;

    // Copy the type (u8)
    this.view.setUint8(
      toByteOffset + this.offsetType,
      fromBuffer.view.getUint8(fromByteOffset + fromBuffer.offsetType)
    );

    // Copy all f32 uniform values
    this.setf32(
      toByteOffset + this.offsetX0,
      fromBuffer.getf32(fromByteOffset + fromBuffer.offsetX0)
    );
    this.setf32(
      toByteOffset + this.offsetY0,
      fromBuffer.getf32(fromByteOffset + fromBuffer.offsetY0)
    );
    this.setf32(
      toByteOffset + this.offsetX1,
      fromBuffer.getf32(fromByteOffset + fromBuffer.offsetX1)
    );
    this.setf32(
      toByteOffset + this.offsetY1,
      fromBuffer.getf32(fromByteOffset + fromBuffer.offsetY1)
    );
    this.setf32(
      toByteOffset + this.offsetX2,
      fromBuffer.getf32(fromByteOffset + fromBuffer.offsetX2)
    );
    this.setf32(
      toByteOffset + this.offsetY2,
      fromBuffer.getf32(fromByteOffset + fromBuffer.offsetY2)
    );
    this.setf32(
      toByteOffset + this.offsetRed,
      fromBuffer.getf32(fromByteOffset + fromBuffer.offsetRed)
    );
    this.setf32(
      toByteOffset + this.offsetGreen,
      fromBuffer.getf32(fromByteOffset + fromBuffer.offsetGreen)
    );
    this.setf32(
      toByteOffset + this.offsetBlue,
      fromBuffer.getf32(fromByteOffset + fromBuffer.offsetBlue)
    );
    this.setf32(
      toByteOffset + this.offsetAlpha,
      fromBuffer.getf32(fromByteOffset + fromBuffer.offsetAlpha)
    );
    this.setf32(
      toByteOffset + this.offsetLineWidth,
      fromBuffer.getf32(fromByteOffset + fromBuffer.offsetLineWidth)
    );
    this.setf32(
      toByteOffset + this.offsetRadius,
      fromBuffer.getf32(fromByteOffset + fromBuffer.offsetRadius)
    );
    this.setf32(
      toByteOffset + this.offsetSoftness,
      fromBuffer.getf32(fromByteOffset + fromBuffer.offsetSoftness)
    );
    this.setf32(
      toByteOffset + this.offsetJitter,
      fromBuffer.getf32(fromByteOffset + fromBuffer.offsetJitter)
    );
    this.setf32(
      toByteOffset + this.offsetTextureWidth,
      fromBuffer.getf32(fromByteOffset + fromBuffer.offsetTextureWidth)
    );
    this.setf32(
      toByteOffset + this.offsetTextureHeight,
      fromBuffer.getf32(fromByteOffset + fromBuffer.offsetTextureHeight)
    );

    this.top++;
  }

  getType(index: number): number {
    return this.view.getUint8(index * this.stride + this.offsetType);
  }

  setTextureDims(
    index: number,
    textureDeviceWidth: number,
    textureDeviceHeight: number
  ) {
    if (index < 0 || index >= this.top) {
      console.warn(
        "DrawUniformBuffer.setTextureDims(): received invalid index",
        index
      );
      return;
    }

    this.setf32(
      index * this.stride + this.offsetTextureWidth,
      textureDeviceWidth
    );
    this.setf32(
      index * this.stride + this.offsetTextureHeight,
      textureDeviceHeight
    );
  }

  setf32(byteOffset: number, value: number) {
    // little-endian set
    this.view.setFloat32(byteOffset, value, true);
  }

  getf32(byteOffset: number) {
    // little-endian get
    return this.view.getFloat32(byteOffset, true);
  }

  getDataAt(index: number) {
    if (index < 0 || index >= this.top) {
      console.warn(
        "DrawUniformBuffer.getDataAt(): received invalid index",
        index
      );
      return null;
    }

    return {
      type: this.view.getUint8(index * this.stride + this.offsetType),
      x0: this.getf32(index * this.stride + this.offsetX0),
      y0: this.getf32(index * this.stride + this.offsetY0),
      x1: this.getf32(index * this.stride + this.offsetX1),
      y1: this.getf32(index * this.stride + this.offsetY1),
      x2: this.getf32(index * this.stride + this.offsetX2),
      y2: this.getf32(index * this.stride + this.offsetY2),
      red: this.getf32(index * this.stride + this.offsetRed),
      green: this.getf32(index * this.stride + this.offsetGreen),
      blue: this.getf32(index * this.stride + this.offsetBlue),
      alpha: this.getf32(index * this.stride + this.offsetAlpha),
      lineWidth: this.getf32(index * this.stride + this.offsetLineWidth),
      radius: this.getf32(index * this.stride + this.offsetRadius),
      softness: this.getf32(index * this.stride + this.offsetSoftness),
      jitter: this.getf32(index * this.stride + this.offsetJitter),
      textureWidth: this.getf32(index * this.stride + this.offsetTextureWidth),
      textureHeight: this.getf32(
        index * this.stride + this.offsetTextureHeight
      ),
    };
  }

  clear() {
    this.top = 0;
  }
}
