import "./style.css";
import { ToolUpdaters, ToolStride } from "./types/Tool";
import { type Model, model_init, type SessionSettings } from "./types/Model";
import { UIUpdaters } from "./ui/events";

function mainloop(model: Model) {
  // loop over each PaeyentEvent and call their handler
  for (let i = 0; i < model.eventBuffer.top; i++) {
    if (model.eventBuffer.id[i] === 0 /* PointerEvent */) {
      ToolUpdaters[model.curr_tool * ToolStride + model.eventBuffer.type[i]](
        model,
        model.eventBuffer.dataIdx[i]
      );
    } else if (model.eventBuffer.id[i] === 1 /* UIEvent */) {
      UIUpdaters[model.eventBuffer.type[i]](model);
    } else {
      console.warn(
        `mainloop: Unhandled model.eventQueue.id ${model.eventBuffer.id[i]}`
      );
    }
  }
  model.eventBuffer.clear();
  model.eventDataBuffer.clear();

  // render each item in the renderPassBuffer
  if (model.renderPassBuffer.top > 0) {
    model.render(model);
    model.renderPassBuffer.clear();
    model.renderPassDataBuffer.clear();
  }

  requestAnimationFrame(() => mainloop(model));
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
  window.addEventListener("resize", (e) => model.onWindowResize(e, model));
  window.addEventListener("keydown", (e) => model.onKeyDown(e, model));
  model.canvas.addEventListener("pointerdown", (e) =>
    model.onPointerDown(e, model)
  );
  model.canvas.addEventListener("pointermove", (e) =>
    model.onPointerMove(e, model)
  );
  model.canvas.addEventListener("pointerup", (e) =>
    model.onPointerUp(e, model)
  );

  /* color picker events */
  model.slider_r.addEventListener("input", (e) => model.onSliderRed(e, model));
  model.slider_g.addEventListener("input", (e) =>
    model.onSliderGreen(e, model)
  );
  model.slider_b.addEventListener("input", (e) => model.onSliderBlue(e, model));

  /* button-container events */
  model.menu_button.addEventListener("pointerdown", (e) =>
    model.onMenuButton(e, model)
  );
  model.brush_button.addEventListener("pointerdown", (e) =>
    model.onBrushButton(e, model)
  );
  model.fan_button.addEventListener("pointerdown", (e) =>
    model.onFanButton(e, model)
  );
  model.line_button.addEventListener("pointerdown", (e) =>
    model.onLineButton(e, model)
  );

  /* modal events */
  model.modal_container.addEventListener("pointerdown", (e) =>
    model.onModalContainer(e, model)
  );
  model.modal_close_button.addEventListener("pointerdown", (e) =>
    model.onModalCloseButton(e, model)
  );
  model.radio_constraint_type_none.addEventListener("change", (e) =>
    model.onRadioConstraintTypeNone(e, model)
  );
  model.radio_constraint_type_time.addEventListener("change", (e) =>
    model.onRadioConstraintTypeTime(e, model)
  );
  model.constraint_type_time_minutes.addEventListener("change", (e) =>
    model.onConstraintTimeMinutes(e, model)
  );
  model.constraint_type_time_seconds.addEventListener("change", (e) =>
    model.onConstraintTimeSeconds(e, model)
  );
  model.radio_constraint_type_actions.addEventListener("change", (e) =>
    model.onRadioConstraintTypeActions(e, model)
  );
  model.constraint_type_actions_count.addEventListener("change", (e) =>
    model.onConstraintActionsCount(e, model)
  );
  model.radio_colorpicker_type_rgb.addEventListener("change", (e) =>
    model.onRadioColorpickerTypeRgb(e, model)
  );
  model.radio_colorpicker_type_hsv.addEventListener("change", (e) =>
    model.onRadioColorpickerTypeHsv(e, model)
  );
  model.radio_scratch_yes.addEventListener("change", (e) =>
    model.onRadioScratchYes(e, model)
  );
  model.radio_scratch_no.addEventListener("change", (e) =>
    model.onRadioScratchNo(e, model)
  );
  model.modal_start_session_button.addEventListener("pointerdown", (e) =>
    model.onModalStartSessionButton(e, model)
  );
  model.modal_end_session_button.addEventListener("pointerdown", (e) =>
    model.onModalEndSessionButton(e, model)
  );
  model.modal_save_button.addEventListener("pointerdown", (e) =>
    model.onModalSaveButton(e, model)
  );
  model.modal_share_button.addEventListener("pointerdown", (e) =>
    model.onModalShareButton(e, model)
  );
  model.modal_about_section.addEventListener("pointerdown", (e) =>
    model.onModalAboutSection(e, model)
  );

  /* start update + render loop */
  mainloop(model);
}

main();
