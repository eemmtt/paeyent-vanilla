import type { Model } from "../types/Model";
import { ToolUpdaters, ToolStride, ToolLookup } from "../types/Tool";

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
  | "radio-image-dimensions-auto"
  | "radio-image-dimensions-custom"
  | "input-constraint-time-minutes"
  | "input-constraint-time-seconds"
  | "input-constraint-actions-count"
  | "input-image-dimensions-width"
  | "input-image-dimensions-height"
  | "input-slider-red"
  | "input-slider-green"
  | "input-slider-blue"
  | "home-view"
  | "button-zoom"
  | "button-pan";

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
  "radio-image-dimensions-auto": 18,
  "radio-image-dimensions-custom": 19,
  "input-constraint-time-minutes": 20,
  "input-constraint-time-seconds": 21,
  "input-constraint-actions-count": 22,
  "input-image-dimensions-width": 23,
  "input-image-dimensions-height": 24,
  "input-slider-red": 25,
  "input-slider-green": 26,
  "input-slider-blue": 27,
  "home-view": 28,
  "button-zoom": 29,
  "button-pan": 30,
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
  updateRadioImageDimensionsAuto,
  updateRadioImageDimensionsCustom,
  updateInputTimeMinutes,
  updateInputTimeSeconds,
  updateInputActionsCount,
  updateInputImageDimensionsWidth,
  updateInputImageDimensionsHeight,
  updateSliderRed,
  updateSliderGreen,
  updateSliderBlue,
  updateHomeView,
  updateButtonZoom,
  updateButtonPan,
];

function updateButtonStartSession(model: Model) {
  // TODO: Actually start new session with these options
  model.session_state = "in-session";

  /*
  if (model.scratch_area) {
    model.scratch_container.replaceChildren(
      model.scratch_canvas!,
      model.color_preview
    );
    model.color_picker_container.replaceChildren(
      model.slider_r,
      model.slider_g,
      model.slider_b
    );
    model.menu_container.replaceChildren(
      model.scratch_container,
      model.color_picker_container,
      model.button_container
    );
  } else {
    model.scratch_container.replaceChildren();
    model.color_picker_container.replaceChildren(
      model.color_preview,
      model.slider_r,
      model.slider_g,
      model.slider_b
    );
    model.menu_container.replaceChildren(
      model.color_picker_container,
      model.button_container
    );
  }
  */

  model.button_container.replaceChildren(
    model.menu_button,
    model.brush_button,
    model.fan_button,
    model.line_button,
    model.home_button,
    model.pan_button,
    model.zoom_button
  );

  modal_close(model);
  model.canvas.addEventListener("pointerdown", model.onPointerDown);

  //update modal body to inSession contents
  modalBodyToInSession(model);
  model.updateImageDimensions(model);
  model.historyBuffer.clear();
  updateHomeView(model);
  model.drawUniformBuffer.pushClearAll();
  model.drawUniformBuffer.pushScratchClear();
}

function updateButtonEndSession(model: Model) {
  model.session_state = "end-session";

  //TODO: update to model.menu_container.replaceChildren()
  //      once color-picker and scratch-area are implemented
  model.button_container.replaceChildren(model.menu_button);

  modal_close(model);

  ToolUpdaters[model.curr_tool * ToolStride + 3](model, -1); //Cancel curr tool
  model.canvas.removeEventListener("pointerdown", model.onPointerDown);
  updateHomeView(model);
  model.drawUniformBuffer.pushClearFg();

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

async function updateButtonSave(model: Model) {
  const { device, bg_texture, textureWidth, textureHeight } = model;

  // bytes per row must be aligned to 256 bytes for WebGPU
  const bytesPerPixel = 4;
  const unalignedBytesPerRow = textureWidth * bytesPerPixel;
  const align = 256;
  const bytesPerRow = Math.ceil(unalignedBytesPerRow / align) * align;
  const bufferSize = bytesPerRow * textureHeight;

  // create a buffer to copy the texture into
  const buffer = device.createBuffer({
    size: bufferSize,
    usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
  });

  try {
    // copy texture to buffer
    const encoder = device.createCommandEncoder();
    encoder.copyTextureToBuffer(
      { texture: bg_texture },
      { buffer, bytesPerRow },
      { width: textureWidth, height: textureHeight }
    );
    device.queue.submit([encoder.finish()]);

    // wait for the GPU to finish and map the buffer
    await buffer.mapAsync(GPUMapMode.READ);
    const mappedData = new Uint8Array(buffer.getMappedRange());

    // create image data, handling row padding and BGRA -> RGBA conversion
    const imageData = new Uint8Array(textureWidth * textureHeight * 4);
    for (let y = 0; y < textureHeight; y++) {
      for (let x = 0; x < textureWidth; x++) {
        const srcIdx = y * bytesPerRow + x * 4;
        const dstIdx = (y * textureWidth + x) * 4;
        // BGRA -> RGBA
        imageData[dstIdx + 0] = mappedData[srcIdx + 2]; // R <- B
        imageData[dstIdx + 1] = mappedData[srcIdx + 1]; // G <- G
        imageData[dstIdx + 2] = mappedData[srcIdx + 0]; // B <- R
        imageData[dstIdx + 3] = mappedData[srcIdx + 3]; // A <- A
      }
    }
    buffer.unmap();

    // use an offscreen canvas to create the PNG
    const offscreen = new OffscreenCanvas(textureWidth, textureHeight);
    const ctx = offscreen.getContext("2d");
    if (!ctx) {
      console.error("Failed to get 2d context for offscreen canvas");
      return;
    }
    const imgData = new ImageData(
      new Uint8ClampedArray(imageData.buffer),
      textureWidth,
      textureHeight
    );
    ctx.putImageData(imgData, 0, 0);

    // convert to blob and download
    const blob = await offscreen.convertToBlob({ type: "image/png" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const date = new Date();
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");
    a.download = `paeyent-${yyyy}-${mm}-${dd}.png`;
    a.click();
    URL.revokeObjectURL(url);
  } finally {
    buffer.destroy();
  }
}

function updateButtonShare(_model: Model) {
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
  // if (model.curr_tool === ToolLookup["brush"]) {
  //   //3 is brush tool idx
  //   return;
  // }

  ToolUpdaters[model.curr_tool * ToolStride + 3](model, -1); //Cancel curr tool
  // model.curr_tool = 3; //2 is brush tool idx
  // console.log("Brush tool selected");
  console.warn("Brush tool not implemented");
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
    //TODO: remove history debugging after testing
    console.log(
      "Current history length:",
      model.historyBuffer.top,
      "/",
      model.historyBuffer.capacity
    );
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

function updateRadioImageDimensionsAuto(model: Model) {
  model.radio_image_dimensions_auto.checked = true;
  model.radio_image_dimensions_custom.checked = false;
  model.image_dimensions_type = "auto";
  model.image_dimensions_inputgroup.style.display = "none";
}

function updateRadioImageDimensionsCustom(model: Model) {
  model.radio_image_dimensions_auto.checked = false;
  model.radio_image_dimensions_custom.checked = true;
  model.image_dimensions_type = "custom";
  model.image_dimensions_inputgroup.style.display = "flex";
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

function updateInputImageDimensionsWidth(model: Model) {
  model.image_width = model.image_dimensions_width.valueAsNumber;
}

function updateInputImageDimensionsHeight(model: Model) {
  model.image_height = model.image_dimensions_height.valueAsNumber;
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
  if (model.is_navigating) {
    ToolUpdaters[model.curr_tool * ToolStride + 3](model, -1); //cancel nav tool
  }

  const [newZoom, centeredX, centeredY] = homeView(
    0.96,
    model.textureWidth,
    model.textureHeight,
    model.deviceWidth,
    model.deviceHeight
  );

  model.zoom = newZoom;
  model.texturePanX = centeredX;
  model.texturePanY = centeredY;
  model.composite_uniform.set_texture_pan(centeredX, centeredY);
  model.composite_uniform.set_zoom(newZoom);
  model.drawUniformBuffer.pushClearFg();
}

function updateButtonZoom(model: Model) {
  if (model.curr_tool === ToolLookup["zoom"]) {
    return;
  }

  ToolUpdaters[model.curr_tool * ToolStride + 3](model, -1); //Cancel curr tool
  model.last_tool = model.curr_tool;
  model.curr_tool = ToolLookup["zoom"];
  ToolUpdaters[ToolLookup["zoom"] * ToolStride + 0](model, -1); //Call zoom_pointerdown

  console.log("Zoom tool selected");
}

function updateButtonPan(model: Model) {
  if (model.curr_tool === ToolLookup["pan"]) {
    return;
  }

  ToolUpdaters[model.curr_tool * ToolStride + 3](model, -1); //Cancel curr tool
  model.last_tool = model.curr_tool;
  model.curr_tool = ToolLookup["pan"];
  ToolUpdaters[ToolLookup["pan"] * ToolStride + 0](model, -1); //Call pan_pointerdown
  console.log("Pan tool selected");
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

export function homeView(
  targetZoom: number,
  textureDeviceWidth: number,
  textureDeviceHeight: number,
  viewportDeviceWidth: number,
  viewportDeviceHeight: number
): [number, number, number] {
  const scaleX = viewportDeviceWidth / textureDeviceWidth;
  const scaleY = viewportDeviceHeight / textureDeviceHeight;

  const newZoom = targetZoom * Math.min(scaleX, scaleY);

  const centeredX = textureDeviceWidth / 2;
  const centeredY = textureDeviceHeight / 2;
  return [newZoom, centeredX, centeredY];
}
