import { type RenderPass } from "../graphics-webgpu";
import { menu_build } from "../ui/menu";
import { graphics_build } from "./Graphics";
import type { PolyUniform } from "./PolyUniform";

// TODO: cleanup composition of Model from Graphics, Drawing, and Menu Models
export interface Model {
  /* graphics state */
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

  /* drawing state */
  curr_tool: number; //used to index into toolhandlers. See tool.ts
  is_drawing: boolean;
  pts: Float32Array;
  num_pts: number;
  pointerEventQueue: PointerEvent[];

  /* menu state */
  menu_container: Element;
  button_container: Element;
  modal_container: HTMLDivElement;
  modal_content: HTMLDivElement;
  modal_body: HTMLDivElement;
  modal_about_section: HTMLElement;
  modal_settings_section: HTMLElement;
  modal_settings_form: HTMLFormElement;
  modal_close_button: HTMLButtonElement;
  modal_save_button: HTMLButtonElement;
  modal_share_button: HTMLButtonElement;
  modal_end_session_button: HTMLButtonElement;
  modal_start_session_button: HTMLButtonElement;

  menu_button: HTMLButtonElement;
  fan_button: HTMLButtonElement;
  line_button: HTMLButtonElement;
  brush_button: HTMLButtonElement;

  is_modal_open: boolean;
  UIEventQueue: UIEvent[];

  /* session state */
  session_state: SessionState;
  constraint_type: "none" | "time" | "actions";
  constraint_time_minutes?: number;
  constraint_time_seconds?: number;
  constraint_actions?: number;
  color_picker_type: "rgb" | "hsv";
  scratch_area: boolean;
}

export type SessionState = "in-session" | "end-session";
export type UIEventType = "start-session" | "end-session";
export interface UIEvent {
  type: UIEventType;
}

export interface SessionOptions {
  constraint_type: "none" | "time" | "actions";
  constraint_time_minutes?: number;
  constraint_time_seconds?: number;
  constraint_actions?: number;
  color_picker_type: "rgb" | "hsv";
  scratch_area: boolean;
}

// TODO: use session configuration, build menu-container etc.
export async function model_init(options: SessionOptions): Promise<Model> {
  const session_state: SessionState = "in-session";
  const menu_model = menu_build(options, session_state);
  const drawing_model = {
    curr_tool: 0,
    is_drawing: false,
    pts: new Float32Array(32),
    num_pts: 0,
    pointerEventQueue: [],
  };
  const graphics_model = await graphics_build();

  return {
    ...graphics_model,
    ...drawing_model,
    ...menu_model,
    session_state: "in-session",
    ...options,
  };
}

export function session_end(event: UIEvent, model: Model) {
  //update model.session_state to "end-session"
  //update menu-container to end session contents:
  // 1. "->" menu button in the bottom right which opens the end-session modal
  // 2. a session description line under the canvas (or scratch area, if present)
  //    The description line contains the date, time, and the constraints used (e.g., time elapsed of the session (not currently implemented))
  //home the canvas view, if applicable (not currently implemented)
}

export function session_start(event: UIEvent, model: Model) {
  //update model.session_state to "in-session"
  //update menu-container to in-session contents using the SessionOptions struct:
  //  (same as when init_model() is called)
  //clear the canvas with a RenderPass "clear-all"
}
