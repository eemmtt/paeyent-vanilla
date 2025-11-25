import type { Point } from "./Point";

export class PolyUniform {
  /*
    pos_a:       [f32;2],    //8
    pos_b:       [f32;2],    //8
    pos_c:       [f32;2],    //8
    pos_d:       [f32;2],    //8
    pos_e:       [f32;2],    //8
    pos_f:       [f32;2],    //8
    pos_g:       [f32;2],    //8
    pos_h:       [f32;2],    //8
    pos_i:       [f32;2],    //8
    pos_j:       [f32;2],    //8
    pos_k:       [f32;2],    //8
    pos_l:       [f32;2],    //8
    pos_m:       [f32;2],    //8
    pos_n:       [f32;2],    //8
    pos_o:       [f32;2],    //8
    pos_p:       [f32;2],    //8
    rgba:        [f32;4],   //16
    line_width:     f32,     //4
    canvas_width:   f32,     //4
    canvas_height:  f32,     //4
    */
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
  readonly bytes_size = 156; // (16*2 + 4 + 3) * sizeof(f32) = 39 * 4 = 156, padded to 160

  // Position offsets (each position is 2 floats), 16 pts total
  readonly offset_pos_a = 0;
  readonly offset_pos_b = 2;
  readonly offset_pos_c = 4;
  readonly offset_pos_d = 6;
  readonly offset_pos_e = 8;
  readonly offset_pos_f = 10;
  readonly offset_pos_g = 12;
  readonly offset_pos_h = 14;
  readonly offset_pos_i = 16;
  readonly offset_pos_j = 18;
  readonly offset_pos_k = 20;
  readonly offset_pos_l = 22;
  readonly offset_pos_m = 24;
  readonly offset_pos_n = 26;
  readonly offset_pos_o = 28;
  readonly offset_pos_p = 30;

  // RGBA offset (4 floats)
  readonly offset_rgba = 32;

  // Other uniforms
  readonly offset_line_width = 36;
  readonly offset_canvas_width = 37;
  readonly offset_canvas_height = 38;

  data: Float32Array;

  constructor(device: GPUDevice, canvas: HTMLCanvasElement) {
    this.data = new Float32Array(39);
    this.data.fill(0);
    this.data.set([1, 1, 1, 1], this.offset_rgba);
    this.data.set([2], this.offset_line_width);
    this.data.set([canvas.width], this.offset_canvas_width);
    this.data.set([canvas.height], this.offset_canvas_height);

    const alignment = device.limits.minUniformBufferOffsetAlignment;
    this.aligned_size = Math.ceil((40 * 4) / alignment) * alignment;
  }

  set_pos(index: number, pt: Point) {
    if (index < 0 || index > 15) {
      throw new Error(`Position index must be 0-15, got ${index}`);
    }
    const offset = index * 2;
    this.data.set(pt, offset);
  }

  get_pos(index: number): Point {
    if (index < 0 || index > 15) {
      throw new Error(`Position index must be 0-15, got ${index}`);
    }
    const offset = index * 2;
    return [this.data[offset], this.data[offset + 1]];
  }

  set_rgba(r: number, g: number, b: number, a: number) {
    this.data.set([r, g, b, a], this.offset_rgba);
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

    for (let i = 0; i < 16; i++) {
      const offset = i * 2;
      const new_x = (this.data[offset] / old_width) * width;
      const new_y = (this.data[offset + 1] / old_height) * height;
      this.data.set([new_x, new_y], offset);
    }

    this.set_canvas_width(width);
    this.set_canvas_height(height);
  }
}
