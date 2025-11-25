import { type RenderPass, wgpu_init } from "../graphics-webgpu";
import { resize_canvas } from "../main";
import {
  canvas2d_init,
  webgl2_init,
  type GraphicsCtxInitializer,
} from "./Graphics";
import type { Point } from "./Point";
import type { PolyUniform } from "./PolyUniform";

export interface Model {
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

  /* queues */
  pointerEventQueue: PointerEvent[];
  renderQueue: RenderPass[];

  /* drawing state */
  curr_tool: number; //used to index into toolhandlers. See tool.ts
  is_drawing: boolean;
  pos_a: Point;
  pos_b: Point;
  pos_c: Point;
  pts: Float32Array;
  num_pts: number;
}

export async function init_model(): Promise<Model> {
  const canvas = document.querySelector("canvas");
  if (!canvas) {
    throw Error("Failed to query canvas");
  }
  const dpr = window.devicePixelRatio || 1;
  resize_canvas(dpr, canvas);

  let available_graphics_ctxs: GraphicsCtxInitializer[] = [];
  if ("gpu" in navigator) {
    available_graphics_ctxs.push(wgpu_init);
  }
  if ("WebGL2RenderingContext" in window) {
    available_graphics_ctxs.push(webgl2_init);
  }
  if ("CanvasRenderingContext2D" in window) {
    available_graphics_ctxs.push(canvas2d_init);
  }

  for (const ctx_initializer of available_graphics_ctxs) {
    try {
      return await ctx_initializer(dpr, canvas);
    } catch (e) {
      console.error(e);
      continue;
    }
  }

  throw Error("Failed to initialize graphics context");
}
