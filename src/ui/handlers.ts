import { type Model, type SessionSettings } from "../types/Model";
import { UIUpdaterLookup } from "./updaters";

export type EventHandler = (event: Event) => void;

export function voidEventHandler(_event: Event): void {}

/* pointer input handlers */
// implemented on main() with Model in closure...

/* UI event handlers */

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

export function onHomeButton(event: Event, model: Model) {
  if (event.target === model.home_button) {
    model.eventBuffer.push(
      1, // UIEvent
      UIUpdaterLookup["home-view"],
      -1 // No data
    );
  }
}

export function onPanButton(event: Event, model: Model) {
  if (event.target === model.pan_button) {
    model.eventBuffer.push(
      1, // UIEvent
      UIUpdaterLookup["button-pan"],
      -1 // No data
    );
  }
}

export function onZoomButton(event: Event, model: Model) {
  if (event.target === model.zoom_button) {
    model.eventBuffer.push(
      1, // UIEvent
      UIUpdaterLookup["button-zoom"],
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

export function onRadioImageDimensionsAuto(event: Event, model: Model) {
  if (event.target === model.radio_image_dimensions_auto) {
    model.eventBuffer.push(
      1, // UIEvent
      UIUpdaterLookup["radio-image-dimensions-auto"],
      -1 // No data
    );
  }
}

export function onRadioImageDimensionsCustom(event: Event, model: Model) {
  if (event.target === model.radio_image_dimensions_custom) {
    model.eventBuffer.push(
      1, // UIEvent
      UIUpdaterLookup["radio-image-dimensions-custom"],
      -1 // No data
    );
  }
}

export function onImageDimensionsWidth(event: Event, model: Model) {
  if (event.target === model.image_dimensions_width) {
    model.eventBuffer.push(
      1, // UIEvent
      UIUpdaterLookup["input-image-dimensions-width"],
      -1 // No data
    );
  }
}

export function onImageDimensionsHeight(event: Event, model: Model) {
  if (event.target === model.image_dimensions_height) {
    model.eventBuffer.push(
      1, // UIEvent
      UIUpdaterLookup["input-image-dimensions-height"],
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
