import type { Point } from "./Point";

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
                              = 72 / 256
  */

  readonly aligned_size: number;
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

  constructor(device: GPUDevice, canvas: HTMLCanvasElement) {
    this.data = new Float32Array(39);
    this.data.fill(0);
    this.data.set([1, 1, 1, 1], this.offset_rgba);
    this.data[this.offset_line_width] = 2;
    this.data[this.offset_canvas_width] = canvas.width;
    this.data[this.offset_canvas_height] = canvas.height;
    this.data[this.offset_brush_radius] = 6;
    this.data[this.offset_brush_softness] = 0;
    this.data[this.offset_brush_noise_jitter] = 0.1;

    const alignment = device.limits.minUniformBufferOffsetAlignment;
    this.aligned_size = Math.ceil((18 * 4) / alignment) * alignment;
  }

  set_pos(index: number, x: number, y: number) {
    if (index < 0 || index > 4) {
      throw new Error(`Position index must be 0-4, got ${index}`);
    }
    this.data[index * 2] = x;
    this.data[index * 2 + 1] = y;
  }

  get_pos(index: number): Point {
    if (index < 0 || index > 4) {
      throw new Error(`Position index must be 0-4, got ${index}`);
    }
    return [this.data[index * 2], this.data[index * 2 + 1]];
  }

  set_rgba(r: number, g: number, b: number, a: number) {
    this.data[this.offset_rgba] = r;
    this.data[this.offset_rgba + 1] = g;
    this.data[this.offset_rgba + 2] = b;
    this.data[this.offset_rgba + 3] = a;
  }
  get_rgba(): [number, number, number, number] {
    return [
      this.data[this.offset_rgba],
      this.data[this.offset_rgba + 1],
      this.data[this.offset_rgba + 2],
      this.data[this.offset_rgba + 3],
    ];
  }

  set_line_width(width: number) {
    this.data[this.offset_line_width] = width;
  }
  get_line_width(): number {
    return this.data[this.offset_line_width];
  }

  set_canvas_width(width: number) {
    this.data[this.offset_canvas_width] = width;
  }
  get_canvas_width(): number {
    return this.data[this.offset_canvas_width];
  }

  set_canvas_height(height: number) {
    this.data[this.offset_canvas_height] = height;
  }
  get_canvas_height(): number {
    return this.data[this.offset_canvas_height];
  }

  update_dims(width: number, height: number) {
    const old_width = this.data[this.offset_canvas_width];
    const old_height = this.data[this.offset_canvas_height];

    for (let i = 0; i < 4; i++) {
      const new_x = (this.data[i * 2] / old_width) * width;
      const new_y = (this.data[i * 2 + 1] / old_height) * height;
      this.data[i * 2] = new_x;
      this.data[i * 2 + 1] = new_y;
    }

    this.data[this.offset_canvas_width] = width;
    this.data[this.offset_canvas_height] = height;
  }
}
