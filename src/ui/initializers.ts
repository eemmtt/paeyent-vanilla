import type { SessionSettings, SessionState } from "../types/Model";

export function menu_build(
  settings: SessionSettings,
  session_state: SessionState,
  init_color: Float32Array
) {
  const menu_container = document.getElementsByClassName("menu-container")[0];
  if (!menu_container) {
    throw Error("build_menu: Failed to query menu-container");
  }

  const color_picker_container = document.getElementsByClassName(
    "color-picker-container"
  )[0];
  if (!color_picker_container) {
    throw Error("color_picker_build: Failed to query color-picker element");
  }

  const button_container =
    document.getElementsByClassName("button-container")[0];
  if (!button_container) {
    throw Error("build_menu: Failed to query button-container");
  }
  button_container.innerHTML = "";

  /* color picker */
  const [color_picker, color_preview, slider_r, slider_g, slider_b] =
    color_picker_build(settings, init_color);
  color_picker_container.appendChild(color_picker);

  /* menu button */
  const menu_button = document.createElement("button");
  menu_button.innerHTML = "<u>M</u>enu";
  menu_button.dataset.menu = "true";
  button_container.appendChild(menu_button);

  /* tool buttons */
  const line_button = document.createElement("button");
  line_button.innerHTML = "<u>L</u>ine";
  line_button.dataset.polyline = "true";

  const fan_button = document.createElement("button");
  fan_button.innerHTML = "<u>F</u>an";
  fan_button.dataset.polyfan = "true";

  const brush_button = document.createElement("button");
  brush_button.innerHTML = "<u>B</u>rush";
  brush_button.dataset.brush = "true";

  button_container.appendChild(brush_button);
  button_container.appendChild(fan_button);
  button_container.appendChild(line_button);

  /* navigation buttons */
  const home_button = document.createElement("button");
  home_button.innerHTML = "<u>H</u>ome";
  home_button.dataset.home = "true";

  const pan_button = document.createElement("button");
  pan_button.innerHTML = "<u>P</u>an";
  pan_button.dataset.pan = "true";

  const zoom_button = document.createElement("button");
  zoom_button.innerHTML = "<u>Z</u>oom";
  zoom_button.dataset.zoom = "true";

  button_container.appendChild(home_button);
  button_container.appendChild(pan_button);
  button_container.appendChild(zoom_button);

  /* modal container */
  // is effectively the modal background
  // contains: content
  const modal_container = document.createElement("div");
  modal_container.className = "modal-container";
  modal_container.style.display = "none";

  /* modal content */
  // contains: header + body
  let modal_content: HTMLDivElement = document.createElement("div");
  modal_content.className = "modal-content";
  modal_content.dataset.modalType = session_state;

  /* modal headers */
  // contains: title + close button
  const modal_header = document.createElement("div");
  modal_header.className = "modal-header";

  const modal_title = document.createElement("h2");
  modal_title.textContent = "Menu";

  const modal_close_button = document.createElement("button");
  modal_close_button.className = "modal-close";
  modal_close_button.textContent = "close";
  modal_close_button.dataset.close = "true";

  modal_header.appendChild(modal_title);
  modal_header.appendChild(modal_close_button);

  /* modal bodies */
  // contents depend on session state
  // create in-session and end-session bodies and store in Model

  /* in-session body */
  const modal_body = document.createElement("div");
  modal_body.className = "modal-body";

  const modal_end_session_button = document.createElement("button");
  modal_end_session_button.className = "end-session-button";
  modal_end_session_button.textContent = "End Current Session";
  modal_end_session_button.dataset.endsession = "true";

  const {
    modal_settings_section,
    modal_start_session_button,
    modal_settings_form,
    radio_constraint_type_none,
    radio_constraint_type_time,
    radio_constraint_type_actions,
    radio_colorpicker_type_rgb,
    radio_colorpicker_type_hsv,
    radio_scratch_yes,
    radio_scratch_no,
    radio_image_dimensions_auto,
    radio_image_dimensions_custom,
    image_dimensions_inputgroup,
    image_dimensions_width,
    image_dimensions_height,
    constraint_type_time_inputgroup,
    constraint_type_time_minutes,
    constraint_type_time_seconds,
    constraint_type_actions_inputgroup,
    constraint_type_actions_count,
  } = settings_build(settings);

  const modal_about_section = about_build();

  const modal_save_button = document.createElement("button");
  modal_save_button.className = "save-file-button";
  modal_save_button.textContent = "Save to File";
  modal_save_button.dataset.save = "true";

  const modal_share_button = document.createElement("button");
  modal_share_button.className = "share-button";
  modal_share_button.textContent = "Share";
  modal_share_button.dataset.share = "true";

  // modal init to in-session
  modal_body.appendChild(modal_end_session_button);
  modal_body.appendChild(modal_about_section);

  modal_content.appendChild(modal_header);
  modal_content.appendChild(modal_body);
  modal_container.appendChild(modal_content);
  document.body.appendChild(modal_container);

  return {
    menu_container,
    color_picker_container,
    button_container,
    modal_container,
    modal_content,
    modal_body,
    modal_about_section,
    modal_close_button,
    modal_save_button,
    modal_share_button,
    modal_end_session_button,
    modal_start_session_button,
    modal_settings_section,
    modal_settings_form,
    radio_constraint_type_none,
    radio_constraint_type_time,
    radio_constraint_type_actions,
    radio_colorpicker_type_rgb,
    radio_colorpicker_type_hsv,
    radio_scratch_yes,
    radio_scratch_no,
    radio_image_dimensions_auto,
    radio_image_dimensions_custom,
    image_dimensions_inputgroup,
    image_dimensions_width,
    image_dimensions_height,
    constraint_type_time_inputgroup,
    constraint_type_time_minutes,
    constraint_type_time_seconds,
    constraint_type_actions_inputgroup,
    constraint_type_actions_count,
    menu_button,
    fan_button,
    line_button,
    brush_button,
    home_button,
    pan_button,
    zoom_button,
    is_modal_open: false,
    UIEventQueue: [],
    color_picker,
    color_preview,
    slider_r,
    slider_g,
    slider_b,
  };
}

function settings_build(session_settings: SessionSettings) {
  const section = document.createElement("div");
  section.className = "session-settings-section";

  const title = document.createElement("h3");
  title.textContent = "New Session Settings";
  section.appendChild(title);

  const form = document.createElement("form");
  form.className = "session-settings-form";

  /* image dimensions */
  const image_dimensions_group = document.createElement("div");
  image_dimensions_group.className = "form-group";

  const image_dimensions_group_label = document.createElement("label");
  image_dimensions_group_label.textContent = "Image Dimensions:";
  image_dimensions_group.appendChild(image_dimensions_group_label);

  const image_dimensions_radio_container = document.createElement("div");
  image_dimensions_radio_container.className = "radio-group";

  // auto image dimensions
  const image_dimensions_radio_auto_label = document.createElement("label");
  image_dimensions_radio_auto_label.className = "radio-label";

  const image_dimensions_auto_input = document.createElement("input");
  image_dimensions_auto_input.type = "radio";
  image_dimensions_auto_input.name = "image-dimensions";
  image_dimensions_auto_input.value = "auto";
  image_dimensions_auto_input.checked =
    session_settings.image_dimensions_type === "auto";
  image_dimensions_auto_input.dataset.auto = "true";

  const image_dimensions_auto_text = document.createTextNode("Auto");

  image_dimensions_radio_auto_label.appendChild(image_dimensions_auto_input);
  image_dimensions_radio_auto_label.appendChild(image_dimensions_auto_text);

  // custom image dimensions
  const image_dimensions_radio_custom_label = document.createElement("label");
  image_dimensions_radio_custom_label.className = "radio-label";

  const image_dimensions_custom_input = document.createElement("input");
  image_dimensions_custom_input.type = "radio";
  image_dimensions_custom_input.name = "image-dimensions";
  image_dimensions_custom_input.value = "custom";
  image_dimensions_custom_input.checked =
    session_settings.image_dimensions_type === "custom";
  image_dimensions_custom_input.dataset.custom = "true";

  const image_dimensions_custom_text = document.createTextNode("Custom");

  image_dimensions_radio_custom_label.appendChild(
    image_dimensions_custom_input
  );
  image_dimensions_radio_custom_label.appendChild(image_dimensions_custom_text);

  // assemble image dimensions group
  image_dimensions_radio_container.appendChild(
    image_dimensions_radio_auto_label
  );
  image_dimensions_radio_container.appendChild(
    image_dimensions_radio_custom_label
  );
  image_dimensions_group.appendChild(image_dimensions_radio_container);

  // Custom dimensions inputs
  const customDimensionsGroup = document.createElement("div");
  customDimensionsGroup.className = "form-group constraint-inputs";
  customDimensionsGroup.id = "custom-dimensions";
  customDimensionsGroup.style.display =
    session_settings.image_dimensions_type === "custom" ? "flex" : "none";

  const widthLabel = document.createElement("label");
  widthLabel.textContent = "Width:";
  const widthInput = document.createElement("input");
  widthInput.type = "number";
  widthInput.id = "image-width";
  widthInput.min = "1";
  widthInput.value = String(session_settings.image_width ?? 800);
  widthInput.dataset.width = "true";

  const heightLabel = document.createElement("label");
  heightLabel.textContent = "Height:";
  const heightInput = document.createElement("input");
  heightInput.type = "number";
  heightInput.id = "image-height";
  heightInput.min = "1";
  heightInput.value = String(session_settings.image_height ?? 600);
  heightInput.dataset.height = "true";

  customDimensionsGroup.appendChild(widthLabel);
  customDimensionsGroup.appendChild(widthInput);
  customDimensionsGroup.appendChild(heightLabel);
  customDimensionsGroup.appendChild(heightInput);

  form.appendChild(image_dimensions_group);
  form.appendChild(customDimensionsGroup);

  /* constraint type */
  const constraint_group = document.createElement("div");
  constraint_group.className = "form-group";

  const constraint_group_label = document.createElement("label");
  constraint_group_label.textContent = "Constraint Type:";
  constraint_group.appendChild(constraint_group_label);

  const constraint_radio_container = document.createElement("div");
  constraint_radio_container.className = "radio-group";

  // none constraint
  const constraint_radio_none_label = document.createElement("label");
  constraint_radio_none_label.className = "radio-label";

  const constraint_none_input = document.createElement("input");
  constraint_none_input.type = "radio";
  constraint_none_input.name = "constraint-type";
  constraint_none_input.value = "none";
  constraint_none_input.checked = session_settings.constraint_type === "none";
  constraint_none_input.dataset.none = "true";

  const constraint_none_text = document.createTextNode("None");

  constraint_radio_none_label.appendChild(constraint_none_input);
  constraint_radio_none_label.appendChild(constraint_none_text);

  // time constraint
  const constraint_radio_time_label = document.createElement("label");
  constraint_radio_time_label.className = "radio-label";

  const constraint_time_input = document.createElement("input");
  constraint_time_input.type = "radio";
  constraint_time_input.name = "constraint-type";
  constraint_time_input.value = "time";
  constraint_time_input.checked = session_settings.constraint_type === "time";
  constraint_time_input.dataset.time = "true";

  const constraint_time_text = document.createTextNode("Time");

  constraint_radio_time_label.appendChild(constraint_time_input);
  constraint_radio_time_label.appendChild(constraint_time_text);

  // actions constraint
  const constraint_radio_actions_label = document.createElement("label");
  constraint_radio_actions_label.className = "radio-label";

  const constraint_actions_input = document.createElement("input");
  constraint_actions_input.type = "radio";
  constraint_actions_input.name = "constraint-type";
  constraint_actions_input.value = "actions";
  constraint_actions_input.checked =
    session_settings.constraint_type === "actions";
  constraint_actions_input.dataset.actions = "true";

  const constraint_actions_text = document.createTextNode("Actions");

  constraint_radio_actions_label.appendChild(constraint_actions_input);
  constraint_radio_actions_label.appendChild(constraint_actions_text);

  // assemble constraint group
  constraint_radio_container.appendChild(constraint_radio_none_label);
  constraint_radio_container.appendChild(constraint_radio_time_label);
  constraint_radio_container.appendChild(constraint_radio_actions_label);
  constraint_group.appendChild(constraint_radio_container);

  // Time constraint inputs
  const timeInputsGroup = document.createElement("div");
  timeInputsGroup.className = "form-group constraint-inputs";
  timeInputsGroup.id = "time-inputs";
  timeInputsGroup.style.display =
    session_settings.constraint_type === "time" ? "flex" : "none";

  const minutesLabel = document.createElement("label");
  minutesLabel.textContent = "Minutes:";
  const minutesInput = document.createElement("input");
  minutesInput.type = "number";
  minutesInput.id = "constraint-minutes";
  minutesInput.min = "0";
  minutesInput.value = String(session_settings.constraint_time_minutes ?? 0);
  minutesInput.dataset.minutes = "true";

  const secondsLabel = document.createElement("label");
  secondsLabel.textContent = "Seconds:";
  const secondsInput = document.createElement("input");
  secondsInput.type = "number";
  secondsInput.id = "constraint-seconds";
  secondsInput.min = "0";
  secondsInput.max = "59";
  secondsInput.value = String(session_settings.constraint_time_seconds ?? 0);
  secondsInput.dataset.seconds = "true";

  timeInputsGroup.appendChild(minutesLabel);
  timeInputsGroup.appendChild(minutesInput);
  timeInputsGroup.appendChild(secondsLabel);
  timeInputsGroup.appendChild(secondsInput);

  // Actions constraint input
  const actionsInputsGroup = document.createElement("div");
  actionsInputsGroup.className = "form-group constraint-inputs";
  actionsInputsGroup.id = "actions-inputs";
  actionsInputsGroup.style.display =
    session_settings.constraint_type === "actions" ? "flex" : "none";

  const actionsLabel = document.createElement("label");
  actionsLabel.textContent = "Number of Actions:";
  const actionsInput = document.createElement("input");
  actionsInput.type = "number";
  actionsInput.id = "constraint-actions";
  actionsInput.min = "1";
  actionsInput.value = String(session_settings.constraint_actions ?? 10);
  actionsInput.dataset.actionscount = "true";

  actionsInputsGroup.appendChild(actionsLabel);
  actionsInputsGroup.appendChild(actionsInput);

  form.appendChild(constraint_group);
  form.appendChild(timeInputsGroup);
  form.appendChild(actionsInputsGroup);

  /* color picker type */
  const color_picker_group = document.createElement("div");
  color_picker_group.className = "form-group";

  const color_picker_group_label = document.createElement("label");
  color_picker_group_label.textContent = "Color Picker Type:";
  color_picker_group.appendChild(color_picker_group_label);

  const color_picker_radio_container = document.createElement("div");
  color_picker_radio_container.className = "radio-group";

  // rgb color picker
  const color_picker_radio_rgb_label = document.createElement("label");
  color_picker_radio_rgb_label.className = "radio-label";

  const color_picker_rgb_input = document.createElement("input");
  color_picker_rgb_input.type = "radio";
  color_picker_rgb_input.name = "color-picker-type";
  color_picker_rgb_input.value = "rgb";
  color_picker_rgb_input.checked = session_settings.color_picker_type === "rgb";
  color_picker_rgb_input.dataset.rgb = "true";

  const color_picker_rgb_text = document.createTextNode("RGB");

  color_picker_radio_rgb_label.appendChild(color_picker_rgb_input);
  color_picker_radio_rgb_label.appendChild(color_picker_rgb_text);

  // hsv color picker
  const color_picker_radio_hsv_label = document.createElement("label");
  color_picker_radio_hsv_label.className = "radio-label";

  const color_picker_hsv_input = document.createElement("input");
  color_picker_hsv_input.type = "radio";
  color_picker_hsv_input.name = "color-picker-type";
  color_picker_hsv_input.value = "hsv";
  color_picker_hsv_input.checked = session_settings.color_picker_type === "hsv";
  color_picker_hsv_input.dataset.hsv = "true";

  const color_picker_hsv_text = document.createTextNode("HSV");

  color_picker_radio_hsv_label.appendChild(color_picker_hsv_input);
  color_picker_radio_hsv_label.appendChild(color_picker_hsv_text);

  // assemble color picker group
  color_picker_radio_container.appendChild(color_picker_radio_rgb_label);
  color_picker_radio_container.appendChild(color_picker_radio_hsv_label);
  color_picker_group.appendChild(color_picker_radio_container);

  form.appendChild(color_picker_group);

  /* scratch area */
  const scratch_area_group = document.createElement("div");
  scratch_area_group.className = "form-group";

  const scratch_area_group_label = document.createElement("label");
  scratch_area_group_label.textContent = "Scratch Area:";
  scratch_area_group.appendChild(scratch_area_group_label);

  const scratch_area_radio_container = document.createElement("div");
  scratch_area_radio_container.className = "radio-group";

  // yes scratch area
  const scratch_area_radio_yes_label = document.createElement("label");
  scratch_area_radio_yes_label.className = "radio-label";

  const scratch_area_yes_input = document.createElement("input");
  scratch_area_yes_input.type = "radio";
  scratch_area_yes_input.name = "scratch-area";
  scratch_area_yes_input.value = "yes";
  scratch_area_yes_input.checked = session_settings.scratch_area === true;
  scratch_area_yes_input.dataset.yes = "true";

  const scratch_area_yes_text = document.createTextNode("Yes");

  scratch_area_radio_yes_label.appendChild(scratch_area_yes_input);
  scratch_area_radio_yes_label.appendChild(scratch_area_yes_text);

  // no scratch area
  const scratch_area_radio_no_label = document.createElement("label");
  scratch_area_radio_no_label.className = "radio-label";

  const scratch_area_no_input = document.createElement("input");
  scratch_area_no_input.type = "radio";
  scratch_area_no_input.name = "scratch-area";
  scratch_area_no_input.value = "no";
  scratch_area_no_input.checked = session_settings.scratch_area === false;
  scratch_area_no_input.dataset.no = "true";

  const scratch_area_no_text = document.createTextNode("No");

  scratch_area_radio_no_label.appendChild(scratch_area_no_input);
  scratch_area_radio_no_label.appendChild(scratch_area_no_text);

  // assemble scratch area group
  scratch_area_radio_container.appendChild(scratch_area_radio_yes_label);
  scratch_area_radio_container.appendChild(scratch_area_radio_no_label);
  scratch_area_group.appendChild(scratch_area_radio_container);

  form.appendChild(scratch_area_group);

  section.appendChild(form);

  // Start New Session Button
  const modal_start_session_button = document.createElement("button");
  modal_start_session_button.type = "button";
  modal_start_session_button.className = "start-session-button";
  modal_start_session_button.textContent = "Start New Session";
  modal_start_session_button.dataset.startsession = "true";

  section.appendChild(modal_start_session_button);

  return {
    modal_settings_section: section,
    modal_start_session_button,
    modal_settings_form: form,
    radio_constraint_type_none: constraint_none_input,
    radio_constraint_type_time: constraint_time_input,
    radio_constraint_type_actions: constraint_actions_input,
    radio_colorpicker_type_rgb: color_picker_rgb_input,
    radio_colorpicker_type_hsv: color_picker_hsv_input,
    radio_scratch_yes: scratch_area_yes_input,
    radio_scratch_no: scratch_area_no_input,
    radio_image_dimensions_auto: image_dimensions_auto_input,
    radio_image_dimensions_custom: image_dimensions_custom_input,
    image_dimensions_inputgroup: customDimensionsGroup,
    image_dimensions_width: widthInput,
    image_dimensions_height: heightInput,
    constraint_type_time_inputgroup: timeInputsGroup,
    constraint_type_time_minutes: minutesInput,
    constraint_type_time_seconds: secondsInput,
    constraint_type_actions_inputgroup: actionsInputsGroup,
    constraint_type_actions_count: actionsInput,
  };
}

function about_build(): HTMLDetailsElement {
  const details = document.createElement("details");
  details.className = "about-section";

  const summary = document.createElement("summary");
  summary.textContent = "About Paeyent";
  details.appendChild(summary);

  const content = document.createElement("div");
  content.className = "about-content";
  content.innerHTML = `
    <p><strong>Paeyent</strong> - A minimal digital painting application</p>
    <p>Version: 1.0.0</p> 
    <p>Built with WebGPU for high-performance graphics rendering.</p>
  `;
  details.appendChild(content);
  details.open = false;
  details.dataset.about = "true";
  return details;
}

function color_picker_build(
  settings: SessionSettings,
  init_color: Float32Array
): [
  HTMLDivElement,
  HTMLDivElement,
  HTMLInputElement,
  HTMLInputElement,
  HTMLInputElement,
] {
  const color_picker = document.createElement("div");
  if (settings.color_picker_type == "rgb") {
    color_picker.className = "rgb";
    color_picker.style.display = "grid";
    color_picker.style.width = "100%";
    color_picker.style.grid = "auto-flowrepeat(4, 1fr) / 1fr";

    const slider_r = document.createElement("input");
    slider_r.type = "range";
    slider_r.min = "0.0";
    slider_r.max = "1.0";
    slider_r.step = "any";
    slider_r.valueAsNumber = init_color[0];

    const slider_g = document.createElement("input");
    slider_g.type = "range";
    slider_g.min = "0.0";
    slider_g.max = "1.0";
    slider_g.step = "any";
    slider_g.valueAsNumber = init_color[1];

    const slider_b = document.createElement("input");
    slider_b.type = "range";
    slider_b.min = "0.0";
    slider_b.max = "1.0";
    slider_b.step = "any";
    slider_b.valueAsNumber = init_color[2];

    const color_preview = document.createElement("div");
    color_preview.style.width = "100%";
    color_preview.style.minHeight = "0.5rem";
    color_preview.style.maxHeight = "1rem";
    color_preview.style.background = `rgba(${init_color[0] * 255}, ${
      init_color[1] * 255
    }, ${init_color[2] * 255}, 1.0)`;

    color_picker.appendChild(color_preview);
    color_picker.appendChild(slider_r);
    color_picker.appendChild(slider_g);
    color_picker.appendChild(slider_b);

    return [color_picker, color_preview, slider_r, slider_g, slider_b];
  } else if (settings.color_picker_type == "hsv") {
    throw Error("color_picker_build: HSV picker not implemented");
  } else {
    throw Error(
      `color_picker_build: Unhandled color picker type ${settings.color_picker_type}`
    );
  }
}

/*
function build_slider(
  direction: "vertical" | "horizontal",
  min: number,
  max: number,
  init_value: number,
  track_color: Color,
  progress_color: Color,
  label?: string
): HTMLDivElement {
  const slider_container = document.createElement("div");
  slider_container.className = "slider-container";
  if (direction === "horizontal") {
    slider_container.style.width = "100%";
  }

  const slider_track = document.createElement("div");
  slider_track.className = "slider-track";

  const slider_progress = document.createElement("div");
  slider_progress.className = "slider-progress";

  // container <- track <- progress
  slider_track.appendChild(slider_progress);
  slider_container.appendChild(slider_track);

  return slider_container;
}
  */
