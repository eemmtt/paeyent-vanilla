import type { Model } from "../types/Model";
import { ToolUpdaters, ToolStride } from "../types/Tool";

export type UIEventType =
  | "button-start-session"
  | "button-end-session"
  | "button-modal-close"
  | "button-modal-container"
  | "button-about"
  | "button-save"
  | "button-share"
  | "button-line"
  | "button-brush"
  | "button-fan"
  | "button-menu"
  | "radio-constraint-type-none"
  | "radio-constraint-type-time"
  | "radio-constraint-type-actions"
  | "radio-colorpicker-type-rgb"
  | "radio-colorpicker-type-hsv"
  | "radio-scratch-yes"
  | "radio-scratch-no"
  | "input-constraint-time-minutes"
  | "input-constraint-time-seconds"
  | "input-constraint-actions-count"
  | "input-slider-red"
  | "input-slider-green"
  | "input-slider-blue"
  | "window-resize"
  | "home-view"
  | "zoom-in"
  | "zoom-out"
  | "pan-x"
  | "pan-y"
  | "button-nav";

export const UIUpdaterLookup = {
  "button-start-session": 0,
  "button-end-session": 1,
  "button-modal-close": 2,
  "button-modal-container": 3,
  "button-about": 4,
  "button-save": 5,
  "button-share": 6,
  "button-line": 7,
  "button-brush": 8,
  "button-fan": 9,
  "button-menu": 10,
  "radio-constraint-type-none": 11,
  "radio-constraint-type-time": 12,
  "radio-constraint-type-actions": 13,
  "radio-colorpicker-type-rgb": 14,
  "radio-colorpicker-type-hsv": 15,
  "radio-scratch-yes": 16,
  "radio-scratch-no": 17,
  "input-constraint-time-minutes": 18,
  "input-constraint-time-seconds": 19,
  "input-constraint-actions-count": 20,
  "input-slider-red": 21,
  "input-slider-green": 22,
  "input-slider-blue": 23,
  "home-view": 24,
  "zoom-in": 25,
  "zoom-out": 26,
  "pan-x": 27,
  "pan-y": 28,
  "button-nav": 29,
} as const;

export const UIUpdaters = [
  updateButtonStartSession,
  updateButtonEndSession,
  updateButtonModalClose,
  updateButtonModalContainer,
  updateButtonAbout,
  updateButtonSave,
  updateButtonShare,
  updateButtonLine,
  updateButtonBrush,
  updateButtonFan,
  updateButtonMenu,
  updateRadioConstraintTypeNone,
  updateRadioConstraintTypeTime,
  updateRadioConstraintTypeActions,
  updateRadioColorpickerTypeRgb,
  updateRadioColorpickerTypeHsv,
  updateRadioScratchYes,
  updateRadioScratchNo,
  updateInputTimeMinutes,
  updateInputTimeSeconds,
  updateInputActionsCount,
  updateSliderRed,
  updateSliderGreen,
  updateSliderBlue,
  updateHomeView,
  updateZoomIn,
  updateZoomOut,
  updatePanX,
  updatePanY,
  updateButtonNav,
];

function updateButtonStartSession(model: Model) {
  // TODO: Actually start new session with these options
  model.session_state = "in-session";

  //TODO: update to model.menu_container.replaceChildren()
  //      once color-picker and scratch-area are implemented
  model.button_container.replaceChildren(
    model.menu_button,
    model.brush_button,
    model.fan_button,
    model.line_button
  );

  //close modal
  modal_close(model);

  //update modal body to inSession contents
  modalBodyToInSession(model);
  model.renderPassBuffer.push(
    3, // RenderPassLookup["clear-all"] === 3
    -1 // no data
  );
}

function updateButtonEndSession(model: Model) {
  model.session_state = "end-session";

  //TODO: update to model.menu_container.replaceChildren()
  //      once color-picker and scratch-area are implemented
  model.button_container.replaceChildren(model.menu_button);

  //close modal
  modal_close(model);

  //TODO: deactivate tool, prevent tool selection events

  //update modal body to endSession contents
  modalBodyToEndSession(model);
}

function updateButtonModalClose(model: Model) {
  modal_close(model);
}

function updateButtonModalContainer(model: Model) {
  modal_close(model);
}

function updateButtonAbout(model: Model) {
  if (model.modal_about_section.open === true) {
    model.modal_about_section.open = false;
  } else if (model.modal_about_section.open === false) {
    model.modal_about_section.open = true;
  } else {
    throw Error(
      `onButtonAbout: model.modal_about_section.open is ${model.modal_about_section.open}`
    );
  }
}

function updateButtonSave(model: Model) {
  alert("TODO: Implement save to file");
}

function updateButtonShare(model: Model) {
  alert("TODO: Implement share");
}

function updateButtonLine(model: Model) {
  if (model.curr_tool === 0) {
    //0 is line tool idx
    return;
  }

  ToolUpdaters[model.curr_tool * ToolStride + 3](model, -1); //Cancel curr tool
  model.curr_tool = 0; //0 is line tool idx
  console.log("Line tool selected");
}

function updateButtonBrush(model: Model) {
  if (model.curr_tool === 3) {
    //3 is brush tool idx
    return;
  }

  ToolUpdaters[model.curr_tool * ToolStride + 3](model, -1); //Cancel curr tool
  model.curr_tool = 3; //2 is brush tool idx
  console.log("Brush tool selected");
}

function updateButtonFan(model: Model) {
  if (model.curr_tool === 1) {
    //1 is fan tool idx
    return;
  }

  ToolUpdaters[model.curr_tool * ToolStride + 3](model, -1); //Cancel curr tool
  model.curr_tool = 1; //1 is fan tool idx
  console.log("Fan tool selected");
}

function updateButtonMenu(model: Model) {
  if (model.is_modal_open) {
    modal_close(model);
  } else {
    modal_open(model);
  }
}

function updateRadioConstraintTypeNone(model: Model) {
  model.radio_constraint_type_none.checked = true;
  model.radio_constraint_type_time.checked = false;
  model.radio_constraint_type_actions.checked = false;
  model.constraint_type = "none";
  model.constraint_type_actions_inputgroup.style.display = "none";
  model.constraint_type_time_inputgroup.style.display = "none";
}
function updateRadioConstraintTypeTime(model: Model) {
  model.radio_constraint_type_none.checked = false;
  model.radio_constraint_type_time.checked = true;
  model.radio_constraint_type_actions.checked = false;
  model.constraint_type = "time";
  model.constraint_type_actions_inputgroup.style.display = "none";
  model.constraint_type_time_inputgroup.style.display = "flex";
}
function updateRadioConstraintTypeActions(model: Model) {
  model.radio_constraint_type_none.checked = false;
  model.radio_constraint_type_time.checked = false;
  model.radio_constraint_type_actions.checked = true;
  model.constraint_type = "actions";
  model.constraint_type_actions_inputgroup.style.display = "flex";
  model.constraint_type_time_inputgroup.style.display = "none";
}
function updateRadioColorpickerTypeRgb(model: Model) {
  model.radio_colorpicker_type_rgb.checked = true;
  model.radio_colorpicker_type_hsv.checked = false;
  model.color_picker_type = "rgb";
}
function updateRadioColorpickerTypeHsv(model: Model) {
  model.radio_colorpicker_type_rgb.checked = false;
  model.radio_colorpicker_type_hsv.checked = true;
  model.color_picker_type = "hsv";
}
function updateRadioScratchYes(model: Model) {
  model.radio_scratch_yes.checked = true;
  model.radio_scratch_no.checked = false;
  model.scratch_area = true;
}
function updateRadioScratchNo(model: Model) {
  model.radio_scratch_yes.checked = false;
  model.radio_scratch_no.checked = true;
  model.scratch_area = false;
}

function updateInputTimeMinutes(model: Model) {
  model.constraint_time_minutes =
    model.constraint_type_time_minutes.valueAsNumber;
}
function updateInputTimeSeconds(model: Model) {
  model.constraint_time_seconds =
    model.constraint_type_time_seconds.valueAsNumber;
}
function updateInputActionsCount(model: Model) {
  model.constraint_actions = model.constraint_type_actions_count.valueAsNumber;
}

function updateSliderRed(model: Model) {
  model.color[0] = model.slider_r.valueAsNumber;
  model.color_preview.style.background = `rgba(${model.color[0] * 255}, ${
    model.color[1] * 255
  }, ${model.color[2] * 255}, 1.0)`;
}
function updateSliderGreen(model: Model) {
  model.color[1] = model.slider_g.valueAsNumber;
  model.color_preview.style.background = `rgba(${model.color[0] * 255}, ${
    model.color[1] * 255
  }, ${model.color[2] * 255}, 1.0)`;
}
function updateSliderBlue(model: Model) {
  model.color[2] = model.slider_b.valueAsNumber;
  model.color_preview.style.background = `rgba(${model.color[0] * 255}, ${
    model.color[1] * 255
  }, ${model.color[2] * 255}, 1.0)`;
}

function updateHomeView(model: Model) {
  model.zoom = 1.0;
  model.texture_offset_x = 0;
  model.texture_offset_y = 0;
  model.composite_uniform.set_texture_offset(0, 0);
  model.composite_uniform.set_zoom(1.0);

  model.renderPassBuffer.push(
    0, // clear fg
    -1 // no data
  );
}

function updateZoomIn(model: Model) {
  model.zoom -= 0.1;
  model.composite_uniform.addZoom(-0.1);

  model.renderPassBuffer.push(
    0, // clear fg
    -1 // no data
  );
}
function updateZoomOut(model: Model) {
  model.zoom += 0.1;
  model.composite_uniform.addZoom(0.1);
  model.renderPassBuffer.push(
    0, // clear fg
    -1 // no data
  );
}

function updatePanX(model: Model) {
  model.texture_offset_x += 20;
  model.composite_uniform.addOffsetX(20 * model.dpr);
  model.renderPassBuffer.push(
    0, // clear fg
    -1 // no data
  );
}

function updatePanY(model: Model) {
  model.texture_offset_y += 20;
  model.composite_uniform.addOffsetY(20 * model.dpr);
  model.renderPassBuffer.push(
    0, // clear fg
    -1 // no data
  );
}

function updateButtonNav(model: Model) {
  if (model.curr_tool === 2) {
    //2 is nav tool idx
    return;
  }

  ToolUpdaters[model.curr_tool * ToolStride + 3](model, -1); //Cancel curr tool
  model.curr_tool = 2; //2 is nav tool idx
  console.log("Nav tool selected");
}

/* helpers */

function modal_close(model: Model) {
  if (!model.is_modal_open) return;

  model.modal_container.style.display = "none";
  model.is_modal_open = false;
}

function modal_open(model: Model) {
  if (model.is_modal_open) return;

  if (model.session_state === "in-session") {
    modalBodyToInSession(model);
  } else if (model.session_state === "end-session") {
    modalBodyToEndSession(model);
  }

  // Show backdrop
  model.modal_container.style.display = "flex";
  model.is_modal_open = true;
}

function modalBodyToInSession(model: Model) {
  model.modal_body.replaceChildren(
    model.modal_end_session_button,
    model.modal_about_section
  );
}

function modalBodyToEndSession(model: Model) {
  model.modal_body.replaceChildren(
    model.modal_settings_section,
    model.modal_save_button,
    model.modal_share_button,
    model.modal_about_section
  );
}
