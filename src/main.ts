import "./style.css";
import { render } from "./graphics-webgpu";
import { type Point } from "./types/Point";
import { ToolHandlers, ToolLookup, ToolStride } from "./types/Tool";
import { type Model, init_model } from "./types/Model";

function mainloop(model: Model) {
  /* process pointer events */
  for (const event of model.pointerEventQueue) {
    if (event.type == "pointerdown" && !model.is_drawing) {
      ToolHandlers[model.curr_tool * ToolStride](model, event); // Tool Start
    } else if (event.type == "pointerdown" && model.is_drawing) {
      ToolHandlers[model.curr_tool * ToolStride + 1](model, event); // Tool Stop
    } else if (event.type == "pointermove" && model.is_drawing) {
      ToolHandlers[model.curr_tool * ToolStride + 2](model, event); // Tool Hover
    }
  }
  model.pointerEventQueue = []; //TODO: make fixed size ring buffer

  /* render renderQueue */
  render(model);
  model.renderQueue = []; //TODO: make fixed size ring buffer

  requestAnimationFrame(() => mainloop(model));
}

/* EVENT HANDLERS */
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

export function resize_canvas(dpr: number, canvas: HTMLCanvasElement): Point {
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
  /* init model */
  let model: Model | null = null;
  try {
    model = await init_model();
  } catch (e) {
    console.error(e);
    throw Error("main: failed to initialize model");
  }

  //TODO: function that builds session
  //

  /* register event listeners */
  window.addEventListener("resize", () => onresize(model));
  window.addEventListener("keydown", (e) => onkeydown(e, model));
  model.canvas.addEventListener("pointerdown", (e) => onpointerdown(e, model));
  model.canvas.addEventListener("pointermove", (e) => onpointermove(e, model));
  model.canvas.addEventListener("pointerup", (e) => onpointerup(e, model));

  /* start update + render loop */
  mainloop(model);
}

main();
