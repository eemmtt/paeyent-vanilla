import { wgpu_init } from "./wgpu_initializers";
import type { Model, SessionSettings } from "../types/Model";
import type { CompositeUniform } from "../types/CompositeUniform";
import { DrawUniformBuffer } from "../types/DrawUniformBuffer";

export interface GraphicsModel {
  /* rendering state */
  canvas: HTMLCanvasElement;
  format: GPUTextureFormat;
  device: GPUDevice;
  surface: GPUCanvasContext;
  dpr: number;
  clientWidth: number;
  clientHeight: number;
  deviceWidth: number;
  deviceHeight: number;
  textureWidth: number;
  textureHeight: number;

  bg_texture: GPUTexture;
  fg_texture: GPUTexture;
  an_texture: GPUTexture;
  bg_texture_view: GPUTextureView;
  fg_texture_view: GPUTextureView;
  an_texture_view: GPUTextureView;
  clear_color: Color;
  maxRenderPasses: number;

  render: RenderFunction;
  updateImageDimensions: (model: Model) => void;
  drawUniformBuffer: DrawUniformBuffer;
  historyBuffer: DrawUniformBuffer;
  poly_buffer: GPUBuffer;
  poly_bindgroup: GPUBindGroup;

  composite_uniform: CompositeUniform;
  composite_uniform_buffer: GPUBuffer;
  composite_uniform_bindgroup: GPUBindGroup;
  composite_bindgroup: GPUBindGroup;
  composite_sampler: GPUSampler;

  line_pipeline: GPURenderPipeline;
  fan_pipeline: GPURenderPipeline;
  circle_pipeline: GPURenderPipeline;
  rectangle_pipeline: GPURenderPipeline;
  composite_pipeline: GPURenderPipeline;

  rpd_replaceFg: GPURenderPassDescriptor;
  rpd_replaceBg: GPURenderPassDescriptor;
  rpd_replaceAnno: GPURenderPassDescriptor;
  rpd_appendFg: GPURenderPassDescriptor;
  rpd_appendBg: GPURenderPassDescriptor;
  rpd_appendAnno: GPURenderPassDescriptor;
  rpd_replaceComposite: GPURenderPassDescriptor;

  /* scratch area (optional) */
  scratch_canvas?: HTMLCanvasElement;
  scratch_surface?: GPUCanvasContext;
  scratch_texture?: GPUTexture;
  scratch_texture_view?: GPUTextureView;
  scratch_pipeline?: GPURenderPipeline;
  scratch_grid_pipeline?: GPURenderPipeline;
  scratch_composite_pipeline?: GPURenderPipeline;
  scratch_bindgroup?: GPUBindGroup;
  scratch_composite_bindgroup?: GPUBindGroup;
  scratch_rpd_clear?: GPURenderPassDescriptor;
  scratch_rpd_append?: GPURenderPassDescriptor;
  scratch_rpd_composite?: GPURenderPassDescriptor;
  scratch_width?: number;
  scratch_height?: number;
}

export type Color = [number, number, number, number];
export type RenderFunction = (model: Model) => void;

export type GraphicsCtxInitializer = (
  canvas: HTMLCanvasElement,
  settings: SessionSettings
) => Promise<GraphicsModel>;

export async function webgl2_init(
  _canvas: HTMLCanvasElement
): Promise<GraphicsModel> {
  throw Error("webgl2_init: not implemented");
}

export async function canvas2d_init(
  _canvas: HTMLCanvasElement
): Promise<GraphicsModel> {
  throw Error("canvas2d_init: not implemented");
}

export async function graphics_build(
  settings: SessionSettings
): Promise<GraphicsModel> {
  const canvas = document.querySelector("canvas");
  if (!canvas) {
    throw Error("build_graphics_model: Failed to query canvas");
  }

  const graphics_ctxs: [GraphicsCtxInitializer, () => boolean][] = [
    [wgpu_init, () => "gpu" in navigator],
    [webgl2_init, () => "WebGL2RenderingContext" in window],
    [canvas2d_init, () => "CanvasRenderingContext2D" in window],
  ];

  for (const [initializer, is_available] of graphics_ctxs) {
    if (!is_available()) continue;
    try {
      return await initializer(canvas, settings);
    } catch (e) {
      console.warn(
        `build_graphics_model: Failed to initialize ${initializer.name}:`,
        e
      );
    }
  }

  throw Error("build_graphics_model: Failed to initialize a graphics context");
}
