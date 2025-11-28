import "./style.css";
import { render } from "./graphics-webgpu";
import { type Point } from "./types/Point";
import { ToolHandlers, ToolLookup, ToolStride } from "./types/Tool";
import {
  type Model,
  model_init,
  type SessionOptions,
  session_end,
  session_start,
  type SessionState,
} from "./types/Model";
import {
  modal_open,
  modal_close,
  ui_to_inSession,
  ui_to_endSession,
} from "./ui/menu";

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

  /* process menu events */
  for (const event of model.UIEventQueue) {
    if (event.type == "end-session") {
      session_end(event, model);
    } else if (event.type == "start-session") {
      session_start(event, model);
    }
  }
  model.UIEventQueue = []; //TODO: make fixed size ring buffer

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

    if (event.key == "m") {
      if (!model.is_modal_open) {
        modal_open(model);
      } else {
        modal_close(model);
      }
      return;
    }

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
        console.log("polyfan tool selected");
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
        console.log("polyline tool selected");
        return;
      }
    }
  }
}

/* MENU EVENT HANDLERS */
function ontoolbutton(event: PointerEvent, model: Model) {
  const target = event.target as HTMLElement;
  if (!target.dataset.tool) return;

  // bail if tool already selected
  const tool_name = target.dataset.tool as keyof typeof ToolLookup;
  const new_tool = ToolLookup[tool_name];
  if (model.curr_tool === new_tool) {
    return;
  }

  // tool cleanup + switch
  ToolHandlers[model.curr_tool * ToolStride + 3](model, event);
  model.curr_tool = new_tool;
  console.log(tool_name, "tool selected");
}

function onmenubutton(event: PointerEvent, model: Model) {
  const target = event.target as HTMLElement;
  if (!target.dataset.menu) return;

  modal_open(model, "in-session");
}

function onconstrainttypechange(event: Event, model: Model) {
  const target = event.target as HTMLInputElement;
  if (target.type !== "radio") return;

  const form = target.closest("form");
  if (!form) return;

  const timeInputsGroup = form.querySelector(
    "#time-inputs"
  ) as HTMLElement | null;
  const actionsInputsGroup = form.querySelector(
    "#actions-inputs"
  ) as HTMLElement | null;

  if (timeInputsGroup) {
    timeInputsGroup.style.display = target.value === "time" ? "flex" : "none";
  }
  if (actionsInputsGroup) {
    actionsInputsGroup.style.display =
      target.value === "actions" ? "flex" : "none";
  }
}

function onstartsessionbutton(model: Model) {
  // update SessionOptions from session menu state
  const form = model.modal_settings_form;
  const constraintTypeRadio = form.querySelector(
    'input[name="constraint-type"]:checked'
  ) as HTMLInputElement;
  const colorPickerTypeRadio = form.querySelector(
    'input[name="color-picker-type"]:checked'
  ) as HTMLInputElement;
  const scratchAreaRadio = form.querySelector(
    'input[name="scratch-area"]:checked'
  ) as HTMLInputElement;
  const minutesInput = form.querySelector(
    "#constraint-minutes"
  ) as HTMLInputElement;
  const secondsInput = form.querySelector(
    "#constraint-seconds"
  ) as HTMLInputElement;
  const actionsInput = form.querySelector(
    "#constraint-actions"
  ) as HTMLInputElement;

  model.constraint_type = constraintTypeRadio.value as
    | "none"
    | "time"
    | "actions";
  model.constraint_time_minutes = parseInt(minutesInput?.value) || 0;
  model.constraint_time_seconds = parseInt(secondsInput?.value) || 0;
  model.constraint_actions = parseInt(actionsInput?.value) || 10;
  model.color_picker_type = colorPickerTypeRadio.value as "rgb" | "hsv";
  model.scratch_area = scratchAreaRadio.value === "yes";

  // TODO: Actually start new session with these options
  //alert("Todo: Implement transition to new session using SessionOptions");
  model.session_state = "in-session";
  ui_to_inSession(model); //TODO: onstartsession and ui_to_inSession can be combined...
  model.renderQueue.push({ type: "clear-all" });
}

function onendsessionbutton(event: Event, model: Model) {
  //alert("TODO: Transition to end session view");
  model.session_state = "end-session" as SessionState;
  ui_to_endSession(model);
}

function onsavefilebutton(event: Event, model: Model) {
  alert("TODO: Implement save to file");
}

function onsharebutton(event: Event, model: Model) {
  alert("TODO: Implement share");
}

//TODO: prevent page refresh
//TODO: add palette / buttons
//TODO: add constraints
//TODO: add end session screen
async function main() {
  /* init model */
  //TODO: load options from local storage if exists
  const options: SessionOptions = {
    constraint_type: "none",
    color_picker_type: "rgb",
    scratch_area: false,
  };
  const model = await model_init(options);

  /* register event listeners */
  window.addEventListener("resize", () => onresize(model));
  window.addEventListener("keydown", (e) => onkeydown(e, model));

  /* canvas events */
  model.canvas.addEventListener("pointerdown", (e) => onpointerdown(e, model));
  model.canvas.addEventListener("pointermove", (e) => onpointermove(e, model));
  model.canvas.addEventListener("pointerup", (e) => onpointerup(e, model));

  /* button-container events */
  model.menu_button.addEventListener("pointerdown", (e) =>
    onmenubutton(e, model)
  );
  model.brush_button.addEventListener("pointerdown", (e) =>
    ontoolbutton(e, model)
  );
  model.fan_button.addEventListener("pointerdown", (e) =>
    ontoolbutton(e, model)
  );
  model.line_button.addEventListener("pointerdown", (e) =>
    ontoolbutton(e, model)
  );

  /* modal events */
  model.modal_container.addEventListener("pointerdown", (e) => {
    if (e.target === model.modal_container) {
      modal_close(model);
    }
  });
  model.modal_close_button.addEventListener("pointerdown", () =>
    modal_close(model)
  );

  // Constraint type radio change handlers for both modal bodies
  const constraintRadioContainers = model.modal_container.querySelectorAll(
    '.radio-group input[name="constraint-type"]'
  );
  constraintRadioContainers.forEach((radio) => {
    radio.addEventListener("change", (e) => onconstrainttypechange(e, model));
  });

  model.modal_start_session_button.addEventListener("pointerdown", () =>
    onstartsessionbutton(model)
  );
  model.modal_end_session_button.addEventListener("pointerdown", (e) =>
    onendsessionbutton(e, model)
  );
  model.modal_save_button.addEventListener("pointerdown", (e) =>
    onsavefilebutton(e, model)
  );
  model.modal_share_button.addEventListener("pointerdown", (e) =>
    onsharebutton(e, model)
  );

  /* start update + render loop */
  mainloop(model);
}

main();
