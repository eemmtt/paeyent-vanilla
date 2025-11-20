import "./style.css";
import {
  PolyUniform,
  render,
  wgpu_init,
  type Point,
  type RenderPass,
} from "./graphics";
import { ToolHandlers, ToolLookup, ToolStride } from "./tool";

export interface Model {
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

  pointerEventQueue: PointerEvent[];
  curr_tool: number; //
  is_drawing: boolean;
  pos_a: Point;
  pos_b: Point;
  pos_c: Point;
  num_pts: number;

  renderQueue: RenderPass[];
}

async function init_model(): Promise<Model> {
  const dpr = window.devicePixelRatio || 1;
  const canvas = document.querySelector("canvas");
  if (!canvas) {
    throw Error("Failed to query canvas");
  }
  resize_canvas(dpr, canvas);

  if ("gpu" in navigator) {
    try {
      return wgpu_init(dpr, canvas);
    } catch (e) {
      console.error(e);
      throw Error("init_model: Failed to initialize WebGPU context");
    }
  } else if ("WebGL2RenderingContext" in window) {
    throw Error(
      "init_model: WebGL2 is supported by the browser, but not implemented by Paeyent"
    );
  } else if ("CanvasRenderingContext2D" in window) {
    throw Error(
      "init_model: Canvas2D is supported by the browser, but not implemented by Paeyent"
    );
  } else {
    throw Error("init_model: No supported rendering context");
  }
}

function mainloop(model: Model) {
  for (const event of model.pointerEventQueue) {
    if (event.type == "pointerdown" && !model.is_drawing) {
      /* Tool Start */
      ToolHandlers[model.curr_tool * ToolStride](model, event);
    } else if (event.type == "pointerdown" && model.is_drawing) {
      /* Tool Stop */
      ToolHandlers[model.curr_tool * ToolStride + 1](model, event);
    } else if (event.type == "pointermove" && model.is_drawing) {
      /* Tool Hover */
      ToolHandlers[model.curr_tool * ToolStride + 2](model, event);
    }
  }
  model.pointerEventQueue = [];

  render(model);
  model.renderQueue = [];

  requestAnimationFrame(() => mainloop(model));
}

function onpointerdown(event: Event, model: Model) {
  model.pointerEventQueue.push(event as PointerEvent);
}

function onpointermove(event: Event, model: Model) {
  // overwrite repeated pointermoves
  if (
    model.pointerEventQueue.length != 0 &&
    model.pointerEventQueue[model.pointerEventQueue.length - 1].type ==
      "pointermove"
  ) {
    model.pointerEventQueue[model.pointerEventQueue.length - 1] =
      event as PointerEvent;
    return;
  }

  model.pointerEventQueue.push(event as PointerEvent);
}

function onpointerup(event: Event, model: Model) {
  model.pointerEventQueue.push(event as PointerEvent);
}

function resize_canvas(
  dpr: number,
  canvas: HTMLCanvasElement
): [number, number] {
  canvas.width = canvas.clientWidth * dpr;
  canvas.height = canvas.clientHeight * dpr;

  return [canvas.width, canvas.height];
}

function onresize(model: Model) {
  const dpr = window.devicePixelRatio || 1;
  model.dpr = dpr * 1; //TODO: "factor" out

  const [new_width, new_height] = resize_canvas(dpr * 1, model.canvas);
  model.poly_uniform.update_dims(new_width, new_height);
}

function onkeydown(event: KeyboardEvent, model: Model) {
  if (!event.repeat) {
    //console.log("key pressed: ", event.key);
    if (event.key == "f") {
      if (model.curr_tool == ToolLookup["polyfan"]) {
        return;
      } else {
        /* Tool Cleanup */
        ToolHandlers[model.curr_tool * ToolStride + 3](
          model,
          new PointerEvent("dummy")
        );
        model.curr_tool = ToolLookup["polyfan"];
        console.log("Fan tool selected");
        return;
      }
    }

    if (event.key == "l") {
      if (model.curr_tool == ToolLookup["polyline"]) {
        return;
      } else {
        /* Tool Cleanup */
        ToolHandlers[model.curr_tool * ToolStride + 3](
          model,
          new PointerEvent("dummy")
        );
        model.curr_tool = ToolLookup["polyline"];
        console.log("Line tool selected");
        return;
      }
    }
  }
}

//TODO: prevent page refresh
//TODO: add palette / buttons
//TODO: add constraints
//TODO: add end session screen
async function main() {
  let model: Model | null = null;
  try {
    model = await init_model();
  } catch (e) {
    console.error(e);
    throw Error("main: failed to initialize model");
  }

  window.addEventListener("resize", () => onresize(model));
  model.canvas.addEventListener("pointerdown", (e) => onpointerdown(e, model));
  model.canvas.addEventListener("pointermove", (e) => onpointermove(e, model));
  model.canvas.addEventListener("pointerup", (e) => onpointerup(e, model));
  window.addEventListener("keydown", (e) => onkeydown(e, model));

  mainloop(model);
}

main();
