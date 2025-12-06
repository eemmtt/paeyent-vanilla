import type { Model } from "./types/Model";
import type { PointerType } from "./types/PaeyentEvent";
import { UIUpdaterLookup } from "./ui/events";

export type PaeyentEventHandler = (event: Event, model: Model) => void;

/* pointer input handlers */
export function onPointerDown(event: Event, model: Model) {
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
export function onPointerMove(event: Event, model: Model) {
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
export function onPointerUp(event: Event, model: Model) {
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
export function onKeyDown(event: KeyboardEvent, model: Model) {
  if (!event.repeat) {
    //console.log("key pressed: ", event.key);
    if (event.key == "m") {
      model.eventBuffer.push(
        1, // UIEvent
        UIUpdaterLookup["button-menu"],
        -1 // No data
      );
    } else if (event.key == "f") {
      model.eventBuffer.push(
        1, // UIEvent
        UIUpdaterLookup["button-fan"],
        -1 // No data
      );
    } else if (event.key == "l") {
      model.eventBuffer.push(
        1, // UIEvent
        UIUpdaterLookup["button-line"],
        -1 // No data
      );
    } else if (event.key == "b") {
      model.eventBuffer.push(
        1, // UIEvent
        UIUpdaterLookup["button-brush"],
        -1 // No data
      );
    }
  }
}

/* UI event handlers */
export function onWindowResize(event: Event, model: Model) {
  // debounce consecutive resize calls, nasty style
  if (
    model.eventBuffer.top > 0 && // array is not empty
    model.eventBuffer.id[model.eventBuffer.top - 1] === 1 && // last item is a UIEvent
    model.eventBuffer.type[model.eventBuffer.top - 1] !==
      UIUpdaterLookup["window-resize"] // last item is not a window-resize event
  ) {
    model.eventBuffer.push(
      1, // UIEvent
      UIUpdaterLookup["window-resize"],
      -1 // No data
    );
  }
}

export function onSliderRed(event: Event, model: Model) {
  if (event.target === model.slider_r) {
    model.eventBuffer.push(
      1, // UIEvent
      UIUpdaterLookup["input-slider-red"],
      -1 // No data
    );
  }
}

export function onSliderGreen(event: Event, model: Model) {
  if (event.target === model.slider_g) {
    model.eventBuffer.push(
      1, // UIEvent
      UIUpdaterLookup["input-slider-green"],
      -1 // No data
    );
  }
}

export function onSliderBlue(event: Event, model: Model) {
  if (event.target === model.slider_b) {
    model.eventBuffer.push(
      1, // UIEvent
      UIUpdaterLookup["input-slider-blue"],
      -1 // No data
    );
  }
}

export function onMenuButton(event: Event, model: Model) {
  if (event.target === model.menu_button) {
    model.eventBuffer.push(
      1, // UIEvent
      UIUpdaterLookup["button-menu"],
      -1 // No data
    );
  }
}

export function onBrushButton(event: Event, model: Model) {
  if (event.target === model.brush_button) {
    model.eventBuffer.push(
      1, // UIEvent
      UIUpdaterLookup["button-brush"],
      -1 // No data
    );
  }
}

export function onFanButton(event: Event, model: Model) {
  if (event.target === model.fan_button) {
    model.eventBuffer.push(
      1, // UIEvent
      UIUpdaterLookup["button-fan"],
      -1 // No data
    );
  }
}

export function onLineButton(event: Event, model: Model) {
  if (event.target === model.line_button) {
    model.eventBuffer.push(
      1, // UIEvent
      UIUpdaterLookup["button-line"],
      -1 // No data
    );
  }
}

export function onModalContainer(event: Event, model: Model) {
  if (event.target === model.modal_container) {
    model.eventBuffer.push(
      1, // UIEvent
      UIUpdaterLookup["button-modal-container"],
      -1 // No data
    );
  }
}

export function onModalCloseButton(event: Event, model: Model) {
  if (event.target === model.modal_close_button) {
    model.eventBuffer.push(
      1, // UIEvent
      UIUpdaterLookup["button-modal-close"],
      -1 // No data
    );
  }
}

export function onRadioConstraintTypeNone(event: Event, model: Model) {
  if (event.target === model.radio_constraint_type_none) {
    model.eventBuffer.push(
      1, // UIEvent
      UIUpdaterLookup["radio-constraint-type-none"],
      -1 // No data
    );
  }
}

export function onRadioConstraintTypeTime(event: Event, model: Model) {
  if (event.target === model.radio_constraint_type_time) {
    model.eventBuffer.push(
      1, // UIEvent
      UIUpdaterLookup["radio-constraint-type-time"],
      -1 // No data
    );
  }
}

export function onConstraintTimeMinutes(event: Event, model: Model) {
  if (event.target === model.constraint_type_time_minutes) {
    model.eventBuffer.push(
      1, // UIEvent
      UIUpdaterLookup["input-constraint-time-minutes"],
      -1 // No data
    );
  }
}

export function onConstraintTimeSeconds(event: Event, model: Model) {
  if (event.target === model.constraint_type_time_seconds) {
    model.eventBuffer.push(
      1, // UIEvent
      UIUpdaterLookup["input-constraint-time-seconds"],
      -1 // No data
    );
  }
}

export function onRadioConstraintTypeActions(event: Event, model: Model) {
  if (event.target === model.radio_constraint_type_actions) {
    model.eventBuffer.push(
      1, // UIEvent
      UIUpdaterLookup["radio-constraint-type-actions"],
      -1 // No data
    );
  }
}

export function onConstraintActionsCount(event: Event, model: Model) {
  if (event.target === model.constraint_type_actions_count) {
    model.eventBuffer.push(
      1, // UIEvent
      UIUpdaterLookup["input-constraint-actions-count"],
      -1 // No data
    );
  }
}

export function onRadioColorpickerTypeRgb(event: Event, model: Model) {
  if (event.target === model.radio_colorpicker_type_rgb) {
    model.eventBuffer.push(
      1, // UIEvent
      UIUpdaterLookup["radio-colorpicker-type-rgb"],
      -1 // No data
    );
  }
}

export function onRadioColorpickerTypeHsv(event: Event, model: Model) {
  if (event.target === model.radio_colorpicker_type_hsv) {
    model.eventBuffer.push(
      1, // UIEvent
      UIUpdaterLookup["radio-colorpicker-type-hsv"],
      -1 // No data
    );
  }
}

export function onRadioScratchYes(event: Event, model: Model) {
  if (event.target === model.radio_scratch_yes) {
    model.eventBuffer.push(
      1, // UIEvent
      UIUpdaterLookup["radio-scratch-yes"],
      -1 // No data
    );
  }
}

export function onRadioScratchNo(event: Event, model: Model) {
  if (event.target === model.radio_scratch_no) {
    model.eventBuffer.push(
      1, // UIEvent
      UIUpdaterLookup["radio-scratch-no"],
      -1 // No data
    );
  }
}

export function onModalStartSessionButton(event: Event, model: Model) {
  if (event.target === model.modal_start_session_button) {
    model.eventBuffer.push(
      1, // UIEvent
      UIUpdaterLookup["button-start-session"],
      -1 // No data
    );
  }
}

export function onModalEndSessionButton(event: Event, model: Model) {
  if (event.target === model.modal_end_session_button) {
    model.eventBuffer.push(
      1, // UIEvent
      UIUpdaterLookup["button-end-session"],
      -1 // No data
    );
  }
}

export function onModalSaveButton(event: Event, model: Model) {
  if (event.target === model.modal_save_button) {
    model.eventBuffer.push(
      1, // UIEvent
      UIUpdaterLookup["button-save"],
      -1 // No data
    );
  }
}

export function onModalShareButton(event: Event, model: Model) {
  if (event.target === model.modal_share_button) {
    model.eventBuffer.push(
      1, // UIEvent
      UIUpdaterLookup["button-share"],
      -1 // No data
    );
  }
}

export function onModalAboutSection(event: Event, model: Model) {
  if (event.target === model.modal_about_section) {
    model.eventBuffer.push(
      1, // UIEvent
      UIUpdaterLookup["button-about"],
      -1 // No data
    );
  }
}
