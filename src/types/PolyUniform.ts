import type { Model } from "./Model";

export class PolyUniform {
  /*
    pos_a:      [f32;2],     //8
    pos_b:      [f32;2],     //8
    pos_c:      [f32;2],     //8
    pos_d:      [f32;2],     //8
    rgba:       [f32;4],     //16
    line_width:     f32,     //4
    canvas_width:   f32,     //4
    canvas_height:  f32,     //4
    brush_radius    f32,     //4
    brush_softness  f32,     //4
    brush_noise_jitter  f32, //4
                              = (18 * 4 = 72) / 256
  */

  readonly aligned_size: number;
  readonly num_bytes = 18;
  readonly bytes_size = 72; // (4*2 + 4 + 6) * sizeof(f32) = 18 * 4 = 72

  //offsets
  readonly offset_pos_a = 0; //[f32;2] 8
  readonly offset_pos_b = 2; //[f32;2] 8
  readonly offset_pos_c = 4; //[f32;2] 8
  readonly offset_pos_d = 6; //[f32;2] 8

  readonly offset_rgba = 8; //[f32;4]  16
  readonly offset_line_width = 12; //f32    4
  readonly offset_canvas_width = 13; //f32  4
  readonly offset_canvas_height = 14; //f32 4
  readonly offset_brush_radius = 15; //f32         4
  readonly offset_brush_softness = 16; //f32       4
  readonly offset_brush_noise_jitter = 17; //f32   4

  data: Float32Array;

  constructor(
    device: GPUDevice,
    canvasClientWidth: number,
    canvasClientHeight: number
  ) {
    this.data = new Float32Array(this.num_bytes);
    this.data.fill(0);
    this.data.set([1, 1, 1, 1], this.offset_rgba);
    this.data[this.offset_line_width] = 2;
    this.data[this.offset_canvas_width] = canvasClientWidth;
    this.data[this.offset_canvas_height] = canvasClientHeight;
    this.data[this.offset_brush_radius] = 6;
    this.data[this.offset_brush_softness] = 0;
    this.data[this.offset_brush_noise_jitter] = 0.1;

    const alignment = device.limits.minUniformBufferOffsetAlignment;
    this.aligned_size = Math.ceil((this.num_bytes * 4) / alignment) * alignment;
  }

  set_pos(index: number, x: number, y: number) {
    if (index < 0 || index > 4) {
      throw new Error(`Position index must be 0-4, got ${index}`);
    }
    this.data[index * 2] = x;
    this.data[index * 2 + 1] = y;
  }

  set_rgba(r: number, g: number, b: number, a: number) {
    this.data[this.offset_rgba] = r;
    this.data[this.offset_rgba + 1] = g;
    this.data[this.offset_rgba + 2] = b;
    this.data[this.offset_rgba + 3] = a;
  }

  set_line_width(width: number) {
    this.data[this.offset_line_width] = width;
  }

  set_canvas_width(clientWidth: number) {
    this.data[this.offset_canvas_width] = clientWidth;
  }

  set_canvas_height(clientHeight: number) {
    this.data[this.offset_canvas_height] = clientHeight;
  }

  updateDimensions(model: Model) {
    if (
      this.data[this.offset_canvas_width] === model.clientWidth &&
      this.data[this.offset_canvas_height] === model.clientHeight
    ) {
      return;
    }

    // update positions a -> d
    for (let i = 0; i < 4; i++) {
      this.data[i * 2] *=
        model.clientWidth / this.data[this.offset_canvas_width];
      this.data[i * 2 + 1] *=
        model.clientHeight / this.data[this.offset_canvas_height];
    }

    this.data[this.offset_canvas_width] = model.clientWidth;
    this.data[this.offset_canvas_height] = model.clientHeight;
  }
}
