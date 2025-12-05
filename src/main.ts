import "./style.css";
import { ToolHandlers, ToolStride } from "./types/Tool";
import { type Model, model_init, type SessionSettings } from "./types/Model";
import { UIEventHandlers, UIEventLookup } from "./ui/events";
import { PointerEventLookup, type PointerType } from "./types/PaeyentEvent";

function mainloop(model: Model) {
  // loop over each PaeyentEvent and call their handler
  for (let i = 0; i < model.eventBuffer.top; i++) {
    if (model.eventBuffer.id[i] === 0 /* PointerEvent */) {
      ToolHandlers[model.curr_tool * ToolStride + model.eventBuffer.type[i]](
        model,
        model.eventBuffer.dataIdx[i]
      );
    } else if (model.eventBuffer.id[i] === 1 /* UIEvent */) {
      UIEventHandlers[model.eventBuffer.type[i]](model);
    } else {
      console.warn(
        `mainloop: Unhandled model.eventQueue.id ${model.eventBuffer.id[i]}`
      );
    }
  }
  model.eventBuffer.clear();
  model.eventDataBuffer.clear();

  // render each item in the renderPassBuffer
  model.render(model);
  model.renderPassBuffer.clear();
  model.renderPassDataBuffer.clear();

  requestAnimationFrame(() => mainloop(model));
}

/* window & input handlers */
function onpointerdown(event: Event, model: Model) {
  model.eventBuffer.push(
    0, // PointerEvent
    0, // PointerEventLookup["pointerdown"] === 0
    model.eventDataBuffer.push(
      (event as PointerEvent).x,
      (event as PointerEvent).y,
      (event as PointerEvent).pressure,
      (event as PointerEvent).pointerType as PointerType
    )
  );
}

function onpointermove(event: Event, model: Model) {
  // overwrite repeated pointermoves
  if (
    model.eventBuffer.top > 0 && // array is not empty
    model.eventBuffer.id[model.eventBuffer.top - 1] === 1 && // last item is a PointerEvent
    model.eventBuffer.type[model.eventBuffer.top - 1] === 2 // last item is a "pointermove" event
  ) {
    model.eventBuffer.replaceLast(
      0, // PointerEvent
      2, // PointerEventLookup["pointermove"] === 2
      model.eventDataBuffer.replaceLast(
        (event as PointerEvent).x,
        (event as PointerEvent).y,
        (event as PointerEvent).pressure,
        (event as PointerEvent).pointerType as PointerType
      )
    );
  }

  model.eventBuffer.push(
    0, // PointerEvent
    2, // PointerEventLookup["pointermove"] === 2
    model.eventDataBuffer.push(
      (event as PointerEvent).x,
      (event as PointerEvent).y,
      (event as PointerEvent).pressure,
      (event as PointerEvent).pointerType as PointerType
    )
  );
}

function onpointerup(event: Event, model: Model) {
  model.eventBuffer.push(
    0, // PointerEvent
    1, // PointerEventLookup["pointerup"] === 1
    model.eventDataBuffer.push(
      (event as PointerEvent).x,
      (event as PointerEvent).y,
      (event as PointerEvent).pressure,
      (event as PointerEvent).pointerType as PointerType
    )
  );
}

function onkeydown(event: KeyboardEvent, model: Model) {
  if (!event.repeat) {
    //console.log("key pressed: ", event.key);

    if (event.key == "m") {
      model.eventBuffer.push(
        1, // UIEvent
        UIEventLookup["button-menu"],
        -1 // No data
      );
    } else if (event.key == "f") {
      model.eventBuffer.push(
        1, // UIEvent
        UIEventLookup["button-fan"],
        -1 // No data
      );
    } else if (event.key == "l") {
      model.eventBuffer.push(
        1, // UIEvent
        UIEventLookup["button-line"],
        -1 // No data
      );
    } else if (event.key == "b") {
      model.eventBuffer.push(
        1, // UIEvent
        UIEventLookup["button-brush"],
        -1 // No data
      );
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
  window.addEventListener("resize", () => {
    // debounce consecutive resize calls, nasty style
    if (
      model.eventBuffer.top > 0 && // array is not empty
      model.eventBuffer.id[model.eventBuffer.top - 1] === 1 && // last item is a UIEvent
      model.eventBuffer.type[model.eventBuffer.top - 1] !==
        UIEventLookup["window-resize"] // last item is not a window-resize event
    ) {
      model.eventBuffer.push(
        1, // UIEvent
        UIEventLookup["window-resize"],
        -1 // No data
      );
    }
  });

  window.addEventListener("keydown", (e) => onkeydown(e, model));

  /* canvas events */
  model.canvas.addEventListener("pointerdown", (e) => onpointerdown(e, model));
  model.canvas.addEventListener("pointermove", (e) => onpointermove(e, model));
  model.canvas.addEventListener("pointerup", (e) => onpointerup(e, model));

  model.slider_r.addEventListener("input", (e) => {
    if (e.target === model.slider_r) {
      model.eventBuffer.push(
        1, // UIEvent
        UIEventLookup["input-slider-red"],
        -1 // No data
      );
    }
  });
  model.slider_g.addEventListener("input", (e) => {
    if (e.target === model.slider_g) {
      model.eventBuffer.push(
        1, // UIEvent
        UIEventLookup["input-slider-green"],
        -1 // No data
      );
    }
  });
  model.slider_b.addEventListener("input", (e) => {
    if (e.target === model.slider_b) {
      model.eventBuffer.push(
        1, // UIEvent
        UIEventLookup["input-slider-blue"],
        -1 // No data
      );
    }
  });

  /* button-container events */
  model.menu_button.addEventListener("pointerdown", (e) => {
    if (e.target === model.menu_button) {
      model.eventBuffer.push(
        1, // UIEvent
        UIEventLookup["button-menu"],
        -1 // No data
      );
    }
  });
  model.brush_button.addEventListener("pointerdown", (e) => {
    if (e.target === model.brush_button) {
      model.eventBuffer.push(
        1, // UIEvent
        UIEventLookup["button-brush"],
        -1 // No data
      );
    }
  });
  model.fan_button.addEventListener("pointerdown", (e) => {
    if (e.target === model.fan_button) {
      model.eventBuffer.push(
        1, // UIEvent
        UIEventLookup["button-fan"],
        -1 // No data
      );
    }
  });
  model.line_button.addEventListener("pointerdown", (e) => {
    if (e.target === model.line_button) {
      model.eventBuffer.push(
        1, // UIEvent
        UIEventLookup["button-line"],
        -1 // No data
      );
    }
  });

  /* modal events */
  model.modal_container.addEventListener("pointerdown", (e) => {
    if (e.target === model.modal_container) {
      model.eventBuffer.push(
        1, // UIEvent
        UIEventLookup["button-modal-container"],
        -1 // No data
      );
    }
  });
  model.modal_close_button.addEventListener("pointerdown", (e) => {
    if (e.target === model.modal_close_button) {
      model.eventBuffer.push(
        1, // UIEvent
        UIEventLookup["button-modal-close"],
        -1 // No data
      );
    }
  });

  model.radio_constraint_type_none.addEventListener("change", (e) => {
    if (e.target === model.radio_constraint_type_none) {
      model.eventBuffer.push(
        1, // UIEvent
        UIEventLookup["radio-constraint-type-none"],
        -1 // No data
      );
    }
  });
  model.radio_constraint_type_time.addEventListener("change", (e) => {
    if (e.target === model.radio_constraint_type_time) {
      model.eventBuffer.push(
        1, // UIEvent
        UIEventLookup["radio-constraint-type-time"],
        -1 // No data
      );
    }
  });
  model.constraint_type_time_minutes.addEventListener("change", (e) => {
    if (e.target === model.constraint_type_time_minutes) {
      model.eventBuffer.push(
        1, // UIEvent
        UIEventLookup["input-constraint-time-minutes"],
        -1 // No data
      );
    }
  });
  model.constraint_type_time_seconds.addEventListener("change", (e) => {
    if (e.target === model.constraint_type_time_seconds) {
      model.eventBuffer.push(
        1, // UIEvent
        UIEventLookup["input-constraint-time-seconds"],
        -1 // No data
      );
    }
  });

  model.radio_constraint_type_actions.addEventListener("change", (e) => {
    if (e.target === model.radio_constraint_type_actions) {
      model.eventBuffer.push(
        1, // UIEvent
        UIEventLookup["radio-constraint-type-actions"],
        -1 // No data
      );
    }
  });
  model.constraint_type_actions_count.addEventListener("change", (e) => {
    if (e.target === model.constraint_type_actions_count) {
      model.eventBuffer.push(
        1, // UIEvent
        UIEventLookup["input-constraint-actions-count"],
        -1 // No data
      );
    }
  });

  model.radio_colorpicker_type_rgb.addEventListener("change", (e) => {
    if (e.target === model.radio_colorpicker_type_rgb) {
      model.eventBuffer.push(
        1, // UIEvent
        UIEventLookup["radio-colorpicker-type-rgb"],
        -1 // No data
      );
    }
  });
  model.radio_colorpicker_type_hsv.addEventListener("change", (e) => {
    if (e.target === model.radio_colorpicker_type_hsv) {
      model.eventBuffer.push(
        1, // UIEvent
        UIEventLookup["radio-colorpicker-type-hsv"],
        -1 // No data
      );
    }
  });

  model.radio_scratch_yes.addEventListener("change", (e) => {
    if (e.target === model.radio_scratch_yes) {
      model.eventBuffer.push(
        1, // UIEvent
        UIEventLookup["radio-scratch-yes"],
        -1 // No data
      );
    }
  });
  model.radio_scratch_no.addEventListener("change", (e) => {
    if (e.target === model.radio_scratch_no) {
      model.eventBuffer.push(
        1, // UIEvent
        UIEventLookup["radio-scratch-no"],
        -1 // No data
      );
    }
  });

  model.modal_start_session_button.addEventListener("pointerdown", (e) => {
    if (e.target === model.modal_start_session_button) {
      model.eventBuffer.push(
        1, // UIEvent
        UIEventLookup["button-start-session"],
        -1 // No data
      );
    }
  });
  model.modal_end_session_button.addEventListener("pointerdown", (e) => {
    if (e.target === model.modal_end_session_button) {
      model.eventBuffer.push(
        1, // UIEvent
        UIEventLookup["button-end-session"],
        -1 // No data
      );
    }
  });
  model.modal_save_button.addEventListener("pointerdown", (e) => {
    if (e.target === model.modal_save_button) {
      model.eventBuffer.push(
        1, // UIEvent
        UIEventLookup["button-save"],
        -1 // No data
      );
    }
  });
  model.modal_share_button.addEventListener("pointerdown", (e) => {
    if (e.target === model.modal_share_button) {
      model.eventBuffer.push(
        1, // UIEvent
        UIEventLookup["button-share"],
        -1 // No data
      );
    }
  });
  model.modal_about_section.addEventListener("pointerdown", (e) => {
    if (e.target === model.modal_about_section) {
      model.eventBuffer.push(
        1, // UIEvent
        UIEventLookup["button-about"],
        -1 // No data
      );
    }
  });

  /* start update + render loop */
  mainloop(model);
}

main();
