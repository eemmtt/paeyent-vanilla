import { wgpu_init, type RenderPass } from "../graphics-webgpu";
import { resize_canvas } from "../main";
import type { PolyUniform } from "./PolyUniform";

export interface GraphicsModel {
  /* rendering state */
  canvas: HTMLCanvasElement;
  format: GPUTextureFormat;
  device: GPUDevice;
  surface: GPUCanvasContext;
  is_surface_configured: Boolean;
  dpr: number;

  bg_texture: GPUTexture;
  fg_texture: GPUTexture;
  an_texture: GPUTexture;
  bg_texture_view: GPUTextureView;
  fg_texture_view: GPUTextureView;
  an_texture_view: GPUTextureView;

  poly_uniform: PolyUniform;
  poly_buffer: GPUBuffer;
  poly_bindgroup: GPUBindGroup;
  composite_bindgroup: GPUBindGroup;

  line_pipeline: GPURenderPipeline;
  fan_pipeline: GPURenderPipeline;
  composite_pipeline: GPURenderPipeline;
  renderQueue: RenderPass[];
}

export type GraphicsCtxInitializer = (
  dpr: number,
  canvas: HTMLCanvasElement
) => Promise<GraphicsModel>;

export async function webgl2_init(
  dpr: number,
  canvas: HTMLCanvasElement
): Promise<GraphicsModel> {
  throw Error("webgl2_init: not implemented");
}

export async function canvas2d_init(
  dpr: number,
  canvas: HTMLCanvasElement
): Promise<GraphicsModel> {
  throw Error("canvas2d_init: not implemented");
}

export async function graphics_build(): Promise<GraphicsModel> {
  const canvas = document.querySelector("canvas");
  if (!canvas) {
    throw Error("build_graphics_model: Failed to query canvas");
  }
  const dpr = window.devicePixelRatio || 1;
  resize_canvas(dpr, canvas);

  const graphics_ctxs: [GraphicsCtxInitializer, () => boolean][] = [
    [wgpu_init, () => "gpu" in navigator],
    [webgl2_init, () => "WebGL2RenderingContext" in window],
    [canvas2d_init, () => "CanvasRenderingContext2D" in window],
  ];

  for (const [initializer, is_available] of graphics_ctxs) {
    if (!is_available()) continue;
    try {
      return await initializer(dpr, canvas);
    } catch (e) {
      console.warn(
        `build_graphics_model: Failed to initialize ${initializer.name}:`,
        e
      );
    }
  }

  throw Error("build_graphics_model: Failed to initialize a graphics context");
}
