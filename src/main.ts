import "./style.css";
import { ToolUpdaters, ToolStride } from "./types/Tool";
import { type Model, model_init, type SessionSettings } from "./types/Model";
import { UIUpdaterLookup, UIUpdaters } from "./ui/events";
import {
  onBrushButton,
  onConstraintActionsCount,
  onConstraintTimeMinutes,
  onConstraintTimeSeconds,
  onFanButton,
  onLineButton,
  onMenuButton,
  onModalAboutSection,
  onModalCloseButton,
  onModalContainer,
  onModalEndSessionButton,
  onModalSaveButton,
  onModalShareButton,
  onModalStartSessionButton,
  onRadioColorpickerTypeHsv,
  onRadioColorpickerTypeRgb,
  onRadioConstraintTypeActions,
  onRadioConstraintTypeNone,
  onRadioConstraintTypeTime,
  onRadioScratchNo,
  onRadioScratchYes,
  onSliderBlue,
  onSliderGreen,
  onSliderRed,
  onWindowResize,
} from "./EventHandlers";
import type { PointerType } from "./types/PaeyentEvent";

function mainLoop(model: Model) {
  model.timeoutId = setTimeout(() => {
    // time frame
    const frameAvg = model.frameTimes.push(
      performance.now() - model.frameStart
    );
    model.frameStart = performance.now();
    //console.log("Frame time:", model.frameTimes.getAverage());

    // time update
    model.updateStart = performance.now();

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
          `mainLoop: Unhandled model.eventQueue.id ${model.eventBuffer.id[i]}`
        );
      }
    }
    model.eventBuffer.clear();
    model.eventDataBuffer.clear();

    // calc update time
    const updateAvg = model.updateTimes.push(
      performance.now() - model.updateStart
    );
    //console.log("Update time:", model.updateTimes.getAverage());

    // render each item in the renderPassBuffer
    if (model.renderPassBuffer.top > 0) {
      model.render(model);
      model.renderPassBuffer.clear();
      model.renderPassDataBuffer.clear();
    }

    // box update time + render time to 10ms
    // will probably get rid of this...
    model.timeOut =
      frameAvg - updateAvg - 10 > 0 ? frameAvg - updateAvg - 10 : 0;
    model.rafId = requestAnimationFrame(() => mainLoop(model));
  }, model.timeOut);
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

  window.addEventListener("resize", (e) => onWindowResize(e, model));

  // adding a timeout to mainLoop complicated matters
  // and added the requirement of cleaning up the loop state
  // when navigating to and from the window
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      // cancel pending loops
      if (model.timeoutId !== null) {
        clearTimeout(model.timeoutId);
        model.timeoutId = null;
      }
      if (model.rafId !== null) {
        cancelAnimationFrame(model.rafId);
        model.rafId = null;
      }
    } else if (document.visibilityState === "visible") {
      // reset frame timing
      model.frameStart = performance.now();
      model.updateStart = performance.now();
      model.timeOut = 0;

      mainLoop(model);
    }
  });

  model.onKeyDown = (event: KeyboardEvent) => {
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
  };

  model.onPointerDown = (event: Event) => {
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
  };
  model.onPointerMove = (event: Event) => {
    // overwrite repeated pointermoves
    if (
      model.eventBuffer.top > 0 && // array is not empty
      model.eventBuffer.id[model.eventBuffer.top - 1] === 0 && // last item is a PointerEvent
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
  };

  model.onPointerUp = (event: Event) => {
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
  };

  window.addEventListener("keydown", model.onKeyDown);
  model.canvas.addEventListener("pointerdown", model.onPointerDown);
  //model.canvas.addEventListener("pointermove", model.onPointerMove);
  //model.canvas.addEventListener("pointerup", model.onPointerUp);

  /* color picker events */
  model.slider_r.addEventListener("input", (e) => onSliderRed(e, model));
  model.slider_g.addEventListener("input", (e) => onSliderGreen(e, model));
  model.slider_b.addEventListener("input", (e) => onSliderBlue(e, model));

  /* button-container events */
  model.menu_button.addEventListener("pointerdown", (e) =>
    onMenuButton(e, model)
  );
  model.brush_button.addEventListener("pointerdown", (e) =>
    onBrushButton(e, model)
  );
  model.fan_button.addEventListener("pointerdown", (e) =>
    onFanButton(e, model)
  );
  model.line_button.addEventListener("pointerdown", (e) =>
    onLineButton(e, model)
  );

  /* modal events */
  model.modal_container.addEventListener("pointerdown", (e) =>
    onModalContainer(e, model)
  );
  model.modal_close_button.addEventListener("pointerdown", (e) =>
    onModalCloseButton(e, model)
  );
  model.radio_constraint_type_none.addEventListener("change", (e) =>
    onRadioConstraintTypeNone(e, model)
  );
  model.radio_constraint_type_time.addEventListener("change", (e) =>
    onRadioConstraintTypeTime(e, model)
  );
  model.constraint_type_time_minutes.addEventListener("change", (e) =>
    onConstraintTimeMinutes(e, model)
  );
  model.constraint_type_time_seconds.addEventListener("change", (e) =>
    onConstraintTimeSeconds(e, model)
  );
  model.radio_constraint_type_actions.addEventListener("change", (e) =>
    onRadioConstraintTypeActions(e, model)
  );
  model.constraint_type_actions_count.addEventListener("change", (e) =>
    onConstraintActionsCount(e, model)
  );
  model.radio_colorpicker_type_rgb.addEventListener("change", (e) =>
    onRadioColorpickerTypeRgb(e, model)
  );
  model.radio_colorpicker_type_hsv.addEventListener("change", (e) =>
    onRadioColorpickerTypeHsv(e, model)
  );
  model.radio_scratch_yes.addEventListener("change", (e) =>
    onRadioScratchYes(e, model)
  );
  model.radio_scratch_no.addEventListener("change", (e) =>
    onRadioScratchNo(e, model)
  );
  model.modal_start_session_button.addEventListener("pointerdown", (e) =>
    onModalStartSessionButton(e, model)
  );
  model.modal_end_session_button.addEventListener("pointerdown", (e) =>
    onModalEndSessionButton(e, model)
  );
  model.modal_save_button.addEventListener("pointerdown", (e) =>
    onModalSaveButton(e, model)
  );
  model.modal_share_button.addEventListener("pointerdown", (e) =>
    onModalShareButton(e, model)
  );
  model.modal_about_section.addEventListener("pointerdown", (e) =>
    onModalAboutSection(e, model)
  );

  /* start update + render loop */
  mainLoop(model);
}

main();
