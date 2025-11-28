import type { SessionOptions, SessionState, Model } from "../types/Model";

export function menu_build(
  options: SessionOptions,
  session_state: SessionState
) {
  const menu_container = document.getElementsByClassName("menu-container")[0];
  if (!menu_container) {
    throw Error("build_menu: Failed to query menu-container");
  }

  const button_container =
    document.getElementsByClassName("button-container")[0];
  if (!button_container) {
    throw Error("build_menu: Failed to query button-container");
  }
  button_container.innerHTML = "";

  /* menu button */
  const menu_button = document.createElement("button");
  menu_button.innerHTML = "<u>M</u>enu";
  menu_button.dataset.menu = "true";
  button_container.appendChild(menu_button);

  /* tool buttons */
  const line_button = tool_button_build("polyline", "<u>L</u>ine", "l");
  const fan_button = tool_button_build("polyfan", "<u>F</u>an", "f");
  const brush_button = tool_button_build("brush", "<u>B</u>rush", "b");

  button_container.appendChild(brush_button);
  button_container.appendChild(fan_button);
  button_container.appendChild(line_button);

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

  const [
    modal_settings_section,
    modal_start_session_button,
    modal_settings_form,
  ] = settings_build(options);

  const modal_about_section = about_build();

  const modal_save_button = document.createElement("button");
  modal_save_button.className = "save-file-button";
  modal_save_button.textContent = "Save to File";

  const modal_share_button = document.createElement("button");
  modal_share_button.className = "share-button";
  modal_share_button.textContent = "Share";

  // modal init to in-session
  modal_body.appendChild(modal_end_session_button);
  modal_body.appendChild(modal_about_section);

  modal_content.appendChild(modal_header);
  modal_content.appendChild(modal_body);
  modal_container.appendChild(modal_content);
  document.body.appendChild(modal_container);

  return {
    menu_container,
    button_container,
    modal_container,
    modal_content,
    modal_body,
    modal_about_section,
    modal_settings_section,
    modal_settings_form,
    modal_close_button,
    modal_save_button,
    modal_share_button,
    modal_end_session_button,
    modal_start_session_button,
    menu_button,
    fan_button,
    line_button,
    brush_button,
    is_modal_open: false,
    UIEventQueue: [],
  };
}

function settings_build(
  session_settings: SessionOptions
): [HTMLElement, HTMLButtonElement, HTMLFormElement] {
  const section = document.createElement("div");
  section.className = "session-settings-section";

  const title = document.createElement("h3");
  title.textContent = "New Session Settings";
  section.appendChild(title);

  const form = document.createElement("form");
  form.className = "session-settings-form";

  /* constraint type */
  const constraint_group = document.createElement("div");
  constraint_group.className = "form-group";

  const constraint_group_label = document.createElement("label");
  constraint_group_label.textContent = "Constraint Type:";
  constraint_group.appendChild(constraint_group_label);

  const constraint_radio_container = document.createElement("div");
  constraint_radio_container.className = "radio-group";

  const constraint_radio_none_label = radio_button_build(
    "none",
    "None",
    "constraint-type",
    session_settings.constraint_type === "none"
  );

  const constraint_radio_time_label = radio_button_build(
    "time",
    "Time",
    "constraint-type",
    session_settings.constraint_type === "time"
  );

  const constraint_radio_actions_label = radio_button_build(
    "actions",
    "Actions",
    "constraint-type",
    session_settings.constraint_type === "actions"
  );

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

  const secondsLabel = document.createElement("label");
  secondsLabel.textContent = "Seconds:";
  const secondsInput = document.createElement("input");
  secondsInput.type = "number";
  secondsInput.id = "constraint-seconds";
  secondsInput.min = "0";
  secondsInput.max = "59";
  secondsInput.value = String(session_settings.constraint_time_seconds ?? 0);

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

  const color_picker_radio_rgb_label = radio_button_build(
    "rgb",
    "RGB",
    "color-picker-type",
    session_settings.color_picker_type === "rgb"
  );

  const color_picker_radio_hsv_label = radio_button_build(
    "hsv",
    "HSV",
    "color-picker-type",
    session_settings.color_picker_type === "hsv"
  );

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

  const scratch_area_radio_yes_label = radio_button_build(
    "yes",
    "Yes",
    "scratch-area",
    session_settings.scratch_area === true
  );

  const scratch_area_radio_no_label = radio_button_build(
    "no",
    "No",
    "scratch-area",
    session_settings.scratch_area === false
  );

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

  section.appendChild(modal_start_session_button);

  return [section, modal_start_session_button, form];
}

function about_build(): HTMLElement {
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

  return details;
}

export function modal_open(
  model: Model,
  modalType: "in-session" | "end-session" = "in-session"
) {
  if (model.is_modal_open) return;

  // Hide all modal contents
  const allModals = model.modal_container.querySelectorAll(".modal-content");
  allModals.forEach((modal) => {
    (modal as HTMLElement).style.display = "none";
  });

  // Show the requested modal
  const targetModal = model.modal_container.querySelector(
    `[data-modal-type="${modalType}"]`
  ) as HTMLElement;

  if (targetModal) {
    targetModal.style.display = "block";
  }

  // Show backdrop
  model.modal_container.style.display = "flex";
  model.is_modal_open = true;
}

export function modal_close(model: Model) {
  if (!model.is_modal_open) return;

  model.modal_container.style.display = "none";
  model.is_modal_open = false;
}

export function ui_to_inSession(model: Model) {
  //TODO: implement UIEvents for all these...

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
  model.modal_body.replaceChildren(
    model.modal_end_session_button,
    model.modal_about_section
  );
}

export function ui_to_endSession(model: Model) {
  //TODO: update to model.menu_container.replaceChildren()
  //      once color-picker and scratch-area are implemented
  model.button_container.replaceChildren(model.menu_button);

  //close modal
  modal_close(model);

  //update modal body to endSession contents
  model.modal_body.replaceChildren(
    model.modal_settings_section,
    model.modal_save_button,
    model.modal_share_button,
    model.modal_about_section
  );
}

export function tool_button_build(name: string, label: string, hotkey: string) {
  const button = document.createElement("button");
  button.innerHTML = label;
  button.dataset.tool = name;
  return button;
}

export function radio_button_build(
  value: string,
  label: string,
  group_name: string,
  is_checked: boolean
): HTMLLabelElement {
  const radioWrapper = document.createElement("label");
  radioWrapper.className = "radio-label";

  const radio = document.createElement("input");
  radio.type = "radio";
  radio.name = group_name;
  radio.value = value;
  radio.checked = is_checked;

  const labelText = document.createTextNode(label);

  radioWrapper.appendChild(radio);
  radioWrapper.appendChild(labelText);
  return radioWrapper;
}
