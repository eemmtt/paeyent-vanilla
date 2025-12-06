import { menu_build } from "../ui/initializers";
import {
  graphics_build,
  type Color,
  type RenderFunction,
} from "../graphics/Graphics";
import type { PolyUniform } from "./PolyUniform";
import { PaeyentEventBuffer } from "./PaeyentEventBuffer";
import { PaeyentEventDataBuffer } from "./PaeyentEventDataBuffer";
import type { RenderPassBuffer } from "./RenderPassBuffer";
import type { RenderPassDataBuffer } from "./RenderPassDataBuffer";
import type { PaeyentEventHandler } from "../EventHandlers";
import {
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onKeyDown,
  onWindowResize,
  onSliderRed,
  onSliderGreen,
  onSliderBlue,
  onMenuButton,
  onBrushButton,
  onFanButton,
  onLineButton,
  onModalContainer,
  onModalCloseButton,
  onRadioConstraintTypeNone,
  onRadioConstraintTypeTime,
  onConstraintTimeMinutes,
  onConstraintTimeSeconds,
  onRadioConstraintTypeActions,
  onConstraintActionsCount,
  onRadioColorpickerTypeRgb,
  onRadioColorpickerTypeHsv,
  onRadioScratchYes,
  onRadioScratchNo,
  onModalStartSessionButton,
  onModalEndSessionButton,
  onModalSaveButton,
  onModalShareButton,
  onModalAboutSection,
} from "../EventHandlers";

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
  clear_color: Color;

  poly_uniform: PolyUniform;
  poly_buffer: GPUBuffer;
  poly_bindgroup: GPUBindGroup;
  composite_bindgroup: GPUBindGroup;

  line_pipeline: GPURenderPipeline;
  fan_pipeline: GPURenderPipeline;
  composite_pipeline: GPURenderPipeline;

  render: RenderFunction;
  renderPassBuffer: RenderPassBuffer;
  renderPassDataBuffer: RenderPassDataBuffer;

  /* drawing state */
  curr_tool: number; //used to index into toolhandlers. See tool.ts
  is_drawing: boolean;
  pts: Float32Array;
  num_pts: number;
  color: Float32Array;
  eventBuffer: PaeyentEventBuffer;
  eventDataBuffer: PaeyentEventDataBuffer;
  pointerEventVoid: PointerEvent;

  /* menu state */
  menu_container: Element;
  color_picker_container: Element;
  button_container: Element;
  modal_container: HTMLDivElement;
  modal_content: HTMLDivElement;
  modal_body: HTMLDivElement;
  modal_about_section: HTMLDetailsElement;
  modal_close_button: HTMLButtonElement;
  modal_save_button: HTMLButtonElement;
  modal_share_button: HTMLButtonElement;
  modal_end_session_button: HTMLButtonElement;
  modal_start_session_button: HTMLButtonElement;

  modal_settings_section: HTMLElement;
  modal_settings_form: HTMLFormElement;
  radio_constraint_type_none: HTMLInputElement;
  radio_constraint_type_time: HTMLInputElement;
  constraint_type_time_inputgroup: HTMLDivElement;
  constraint_type_time_minutes: HTMLInputElement;
  constraint_type_time_seconds: HTMLInputElement;
  radio_constraint_type_actions: HTMLInputElement;
  constraint_type_actions_inputgroup: HTMLDivElement;
  constraint_type_actions_count: HTMLInputElement;
  radio_colorpicker_type_rgb: HTMLInputElement;
  radio_colorpicker_type_hsv: HTMLInputElement;
  radio_scratch_yes: HTMLInputElement;
  radio_scratch_no: HTMLInputElement;

  menu_button: HTMLButtonElement;
  fan_button: HTMLButtonElement;
  line_button: HTMLButtonElement;
  brush_button: HTMLButtonElement;

  is_modal_open: boolean;

  color_picker: HTMLDivElement;
  color_preview: HTMLDivElement;
  slider_r: HTMLInputElement;
  slider_b: HTMLInputElement;
  slider_g: HTMLInputElement;

  /* session state */
  session_state: SessionState;
  constraint_type: "none" | "time" | "actions";
  constraint_time_minutes?: number;
  constraint_time_seconds?: number;
  constraint_actions?: number;
  color_picker_type: "rgb" | "hsv";
  scratch_area: boolean;

  /* handlers */
  onPointerDown: PaeyentEventHandler;
  onPointerMove: PaeyentEventHandler;
  onPointerUp: PaeyentEventHandler;
  onKeyDown: (event: KeyboardEvent, model: Model) => void;
  onWindowResize: PaeyentEventHandler;
  onSliderRed: PaeyentEventHandler;
  onSliderGreen: PaeyentEventHandler;
  onSliderBlue: PaeyentEventHandler;
  onMenuButton: PaeyentEventHandler;
  onBrushButton: PaeyentEventHandler;
  onFanButton: PaeyentEventHandler;
  onLineButton: PaeyentEventHandler;
  onModalContainer: PaeyentEventHandler;
  onModalCloseButton: PaeyentEventHandler;
  onRadioConstraintTypeNone: PaeyentEventHandler;
  onRadioConstraintTypeTime: PaeyentEventHandler;
  onConstraintTimeMinutes: PaeyentEventHandler;
  onConstraintTimeSeconds: PaeyentEventHandler;
  onRadioConstraintTypeActions: PaeyentEventHandler;
  onConstraintActionsCount: PaeyentEventHandler;
  onRadioColorpickerTypeRgb: PaeyentEventHandler;
  onRadioColorpickerTypeHsv: PaeyentEventHandler;
  onRadioScratchYes: PaeyentEventHandler;
  onRadioScratchNo: PaeyentEventHandler;
  onModalStartSessionButton: PaeyentEventHandler;
  onModalEndSessionButton: PaeyentEventHandler;
  onModalSaveButton: PaeyentEventHandler;
  onModalShareButton: PaeyentEventHandler;
  onModalAboutSection: PaeyentEventHandler;
}

export type SessionState = "in-session" | "end-session";
export interface SessionSettings {
  constraint_type: "none" | "time" | "actions";
  constraint_time_minutes?: number;
  constraint_time_seconds?: number;
  constraint_actions?: number;
  color_picker_type: "rgb" | "hsv";
  scratch_area: boolean;
}

// TODO: use session configuration, build menu-container etc.
export async function model_init(settings: SessionSettings): Promise<Model> {
  const session_state: SessionState = "in-session";
  const rand_r = Math.random();
  const rand_g = Math.random();
  const rand_b = Math.random();

  const drawing_model = {
    curr_tool: 0,
    is_drawing: false,
    pts: new Float32Array(32),
    num_pts: 0,
    color: new Float32Array([rand_r, rand_g, rand_b, 1]), //must init alpha to 1
    eventBuffer: new PaeyentEventBuffer(127),
    eventDataBuffer: new PaeyentEventDataBuffer(127),
    pointerEventVoid: new PointerEvent("none"),
  };
  const menu_model = menu_build(settings, session_state, drawing_model.color);
  const graphics_model = await graphics_build();

  const handlers = {
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onKeyDown,
    onWindowResize,
    onSliderRed,
    onSliderGreen,
    onSliderBlue,
    onMenuButton,
    onBrushButton,
    onFanButton,
    onLineButton,
    onModalContainer,
    onModalCloseButton,
    onRadioConstraintTypeNone,
    onRadioConstraintTypeTime,
    onConstraintTimeMinutes,
    onConstraintTimeSeconds,
    onRadioConstraintTypeActions,
    onConstraintActionsCount,
    onRadioColorpickerTypeRgb,
    onRadioColorpickerTypeHsv,
    onRadioScratchYes,
    onRadioScratchNo,
    onModalStartSessionButton,
    onModalEndSessionButton,
    onModalSaveButton,
    onModalShareButton,
    onModalAboutSection,
  };

  return {
    ...graphics_model,
    ...drawing_model,
    ...menu_model,
    session_state: "in-session",
    ...settings,
    ...handlers,
  };
}
