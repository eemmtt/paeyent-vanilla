import type { Model } from "./Model";

export class CompositeUniform {
  data: Float32Array;
  readonly aligned_size: number;
  readonly num_bytes = 16;
  readonly bytes_size = 64;

  readonly offset_textureOffset_x = 0;
  readonly offset_textureOffset_y = 1;
  readonly offset_zoom = 2;
  readonly offset_textureWidth = 3;
  readonly offset_textureHeight = 4;
  readonly offset_viewportWidth = 5;
  readonly offset_viewportHeight = 6;
  readonly offset_gridMinZoom = 7;
  readonly offset_backgroundColor_r = 8;
  readonly offset_backgroundColor_g = 9;
  readonly offset_backgroundColor_b = 10;
  readonly offset_gridColor_r = 11;
  readonly offset_gridColor_g = 12;
  readonly offset_gridColor_b = 13;
  readonly offset_gridColor_a = 14;
  readonly offset_grid_lineWidth = 15;

  constructor(device: GPUDevice, canvas: HTMLCanvasElement) {
    this.data = new Float32Array(this.num_bytes);

    this.data[this.offset_textureOffset_x] = 0; //in dev px
    this.data[this.offset_textureOffset_y] = 0; //in dev px
    this.data[this.offset_zoom] = 1.0;
    this.data[this.offset_textureWidth] = canvas.width; //in dev px
    this.data[this.offset_textureHeight] = canvas.height; //in dev px
    this.data[this.offset_viewportWidth] = canvas.width; //in dev px
    this.data[this.offset_viewportHeight] = canvas.height; //in dev px
    this.data[this.offset_gridMinZoom] = 10;
    this.data[this.offset_backgroundColor_r] = 0.3;
    this.data[this.offset_backgroundColor_g] = 0.3;
    this.data[this.offset_backgroundColor_b] = 0.3;
    this.data[this.offset_gridColor_r] = 0;
    this.data[this.offset_gridColor_g] = 0;
    this.data[this.offset_gridColor_b] = 0;
    this.data[this.offset_gridColor_a] = 1;
    this.data[this.offset_grid_lineWidth] = 1.0;

    const alignment = device.limits.minUniformBufferOffsetAlignment;
    this.aligned_size = Math.ceil((this.num_bytes * 4) / alignment) * alignment;
  }

  updateDimensionsAndTransforms(model: Model) {
    this.set_texture_offset(
      model.texture_offset_x * model.dpr,
      model.texture_offset_y * model.dpr
    );
    this.set_viewport_width(model.deviceWidth);
    this.set_viewport_height(model.deviceHeight);
    this.set_zoom(model.zoom);
  }

  set_texture_offset(x: number, y: number) {
    this.data[this.offset_textureOffset_x] = x;
    this.data[this.offset_textureOffset_y] = y;
  }
  addOffsetX(increment: number) {
    this.data[this.offset_textureOffset_x] += increment;
  }
  addOffsetY(increment: number) {
    this.data[this.offset_textureOffset_y] += increment;
  }

  set_zoom(zoom: number) {
    this.data[this.offset_zoom] = zoom;
  }
  addZoom(increment: number) {
    this.data[this.offset_zoom] += increment;
  }
  get_zoom() {
    return this.data[this.offset_zoom];
  }

  set_viewport_width(width: number) {
    this.data[this.offset_viewportWidth] = width;
  }

  set_viewport_height(height: number) {
    this.data[this.offset_viewportHeight] = height;
  }

  set_grid_min_zoom(zoom: number) {
    this.data[this.offset_gridMinZoom] = zoom;
  }

  set_background_color(r: number, g: number, b: number) {
    this.data[this.offset_backgroundColor_r] = r;
    this.data[this.offset_backgroundColor_g] = g;
    this.data[this.offset_backgroundColor_b] = b;
  }

  set_grid_color(r: number, g: number, b: number, a: number) {
    this.data[this.offset_gridColor_r] = r;
    this.data[this.offset_gridColor_g] = g;
    this.data[this.offset_gridColor_b] = b;
    this.data[this.offset_gridColor_a] = a;
  }

  set_grid_line_width(width: number) {
    this.data[this.offset_grid_lineWidth] = width;
  }
}
