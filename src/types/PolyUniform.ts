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
    radius:    f32,     //4
    softness:  f32,     //4
    noise_jitter:  f32, //4
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
  readonly offset_texture_width = 13; //f32  4
  readonly offset_texture_height = 14; //f32 4
  readonly offset_radius = 15; //f32         4
  readonly offset_softness = 16; //f32       4
  readonly offset_noise_jitter = 17; //f32   4

  data: Float32Array;

  constructor(
    device: GPUDevice,
    textureDeviceWidth: number,
    textureDeviceHeight: number
  ) {
    this.data = new Float32Array(this.num_bytes);
    this.data.fill(-1.0);
    this.data.set([1, 1, 1, 1], this.offset_rgba);
    this.data[this.offset_line_width] = 2;
    this.data[this.offset_texture_width] = textureDeviceWidth;
    this.data[this.offset_texture_height] = textureDeviceHeight;
    this.data[this.offset_radius] = 6;
    this.data[this.offset_softness] = 0;
    this.data[this.offset_noise_jitter] = 0.1;

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

  set_texture_width(textureDeviceWidth: number) {
    this.data[this.offset_texture_width] = textureDeviceWidth;
  }

  set_texture_height(textureDeviceHeight: number) {
    this.data[this.offset_texture_height] = textureDeviceHeight;
  }

  set_radius(radius: number) {
    this.data[this.offset_radius] = radius;
  }
}
