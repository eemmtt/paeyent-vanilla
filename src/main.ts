import "./style.css";
import { type Point } from "./types/Point";
import { ToolHandlers, ToolLookup, ToolStride } from "./types/Tool";
import { type Model, model_init, type SessionSettings } from "./types/Model";
import { UIEventHandlers, UIEventLookup } from "./ui/events";

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

  /* process ui events */
  for (const eventType of model.UIEventQueue) {
    UIEventHandlers[UIEventLookup[eventType]](model);
  }
  model.UIEventQueue = []; //TODO: make fixed size ring buffer

  /* render renderQueue */
  model.render(model);
  model.renderQueue = []; //TODO: make fixed size ring buffer

  requestAnimationFrame(() => mainloop(model));
}

/* window & input handlers */
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
      model.UIEventQueue.push("button-menu");
    } else if (event.key == "f") {
      model.UIEventQueue.push("button-fan");
    } else if (event.key == "l") {
      model.UIEventQueue.push("button-line");
    } else if (event.key == "b") {
      model.UIEventQueue.push("button-brush");
    }
  }
}

//TODO: prevent page refresh
//TODO: add scratch area, color picker
//TODO: add constraints
async function main() {
  /* init model */
  //TODO: load options from local storage if exists
  const options: SessionSettings = {
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

  model.slider_r.addEventListener("input", (e) => {
    if (e.target === model.slider_r) {
      model.UIEventQueue.push("input-slider-red");
    }
  });
  model.slider_g.addEventListener("input", (e) => {
    if (e.target === model.slider_g) {
      model.UIEventQueue.push("input-slider-green");
    }
  });
  model.slider_b.addEventListener("input", (e) => {
    if (e.target === model.slider_b) {
      model.UIEventQueue.push("input-slider-blue");
    }
  });

  /* button-container events */
  model.menu_button.addEventListener("pointerdown", (e) => {
    if (e.target === model.menu_button) {
      model.UIEventQueue.push("button-menu");
    }
  });
  model.brush_button.addEventListener("pointerdown", (e) => {
    if (e.target === model.brush_button) {
      model.UIEventQueue.push("button-brush");
    }
  });
  model.fan_button.addEventListener("pointerdown", (e) => {
    if (e.target === model.fan_button) {
      model.UIEventQueue.push("button-fan");
    }
  });
  model.line_button.addEventListener("pointerdown", (e) => {
    if (e.target === model.line_button) {
      model.UIEventQueue.push("button-line");
    }
  });

  /* modal events */
  model.modal_container.addEventListener("pointerdown", (e) => {
    if (e.target === model.modal_container) {
      model.UIEventQueue.push("button-modal-container");
    }
  });
  model.modal_close_button.addEventListener("pointerdown", (e) => {
    if (e.target === model.modal_close_button) {
      model.UIEventQueue.push("button-modal-close");
    }
  });

  model.radio_constraint_type_none.addEventListener("change", (e) => {
    if (e.target === model.radio_constraint_type_none) {
      model.UIEventQueue.push("radio-constraint-type-none");
    }
  });
  model.radio_constraint_type_time.addEventListener("change", (e) => {
    if (e.target === model.radio_constraint_type_time) {
      model.UIEventQueue.push("radio-constraint-type-time");
    }
  });
  model.constraint_type_time_minutes.addEventListener("change", (e) => {
    if (e.target === model.constraint_type_time_minutes) {
      model.UIEventQueue.push("input-constraint-time-minutes");
    }
  });
  model.constraint_type_time_seconds.addEventListener("change", (e) => {
    if (e.target === model.constraint_type_time_seconds) {
      model.UIEventQueue.push("input-constraint-time-seconds");
    }
  });

  model.radio_constraint_type_actions.addEventListener("change", (e) => {
    if (e.target === model.radio_constraint_type_actions) {
      model.UIEventQueue.push("radio-constraint-type-actions");
    }
  });
  model.constraint_type_actions_count.addEventListener("change", (e) => {
    if (e.target === model.constraint_type_actions_count) {
      model.UIEventQueue.push("input-constraint-actions-count");
    }
  });

  model.radio_colorpicker_type_rgb.addEventListener("change", (e) => {
    if (e.target === model.radio_colorpicker_type_rgb) {
      model.UIEventQueue.push("radio-colorpicker-type-rgb");
    }
  });
  model.radio_colorpicker_type_hsv.addEventListener("change", (e) => {
    if (e.target === model.radio_colorpicker_type_hsv) {
      model.UIEventQueue.push("radio-colorpicker-type-hsv");
    }
  });

  model.radio_scratch_yes.addEventListener("change", (e) => {
    if (e.target === model.radio_scratch_yes) {
      model.UIEventQueue.push("radio-scratch-yes");
    }
  });
  model.radio_scratch_no.addEventListener("change", (e) => {
    if (e.target === model.radio_scratch_no) {
      model.UIEventQueue.push("radio-scratch-no");
    }
  });

  model.modal_start_session_button.addEventListener("pointerdown", (e) => {
    if (e.target === model.modal_start_session_button) {
      model.UIEventQueue.push("button-start-session");
    }
  });
  model.modal_end_session_button.addEventListener("pointerdown", (e) => {
    if (e.target === model.modal_end_session_button) {
      model.UIEventQueue.push("button-end-session");
    }
  });
  model.modal_save_button.addEventListener("pointerdown", (e) => {
    if (e.target === model.modal_save_button) {
      model.UIEventQueue.push("button-save");
    }
  });
  model.modal_share_button.addEventListener("pointerdown", (e) => {
    if (e.target === model.modal_share_button) {
      model.UIEventQueue.push("button-share");
    }
  });
  model.modal_about_section.addEventListener("pointerdown", (e) => {
    if (e.target === model.modal_about_section) {
      model.UIEventQueue.push("button-about");
    }
  });

  /* start update + render loop */
  mainloop(model);
}

main();
