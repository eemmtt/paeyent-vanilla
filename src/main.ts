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

  // handle window resize events
  let resizeDebounceTimeout: number | null = null;
  const RESIZE_DEBOUNCE_MS = 16;
  const handleResize = (entries: ResizeObserverEntry[]) => {
    for (const entry of entries) {
      if (entry.target !== model.canvas) {
        console.warn("ResizeObserver called on non model.canvas");
        continue;
      }

      const clientWidth = entry.contentBoxSize[0].inlineSize;
      const clientHeight = entry.contentBoxSize[0].blockSize;

      // for some reason devicePixelContentBoxSize is caculating a different
      // value than clientWidth * devicePixelRatio on mobile vs desktop
      // const rawDeviceWidth =
      //   entry.devicePixelContentBoxSize?.[0].inlineSize ||
      //   clientWidth * devicePixelRatio;
      // const rawDeviceHeight =
      //   entry.devicePixelContentBoxSize?.[0].blockSize ||
      //   clientHeight * devicePixelRatio;

      const rawDeviceWidth = clientWidth * devicePixelRatio;
      const rawDeviceHeight = clientHeight * devicePixelRatio;

      const clampedDeviceWidth = Math.max(
        1,
        Math.min(rawDeviceWidth, model.device.limits.maxTextureDimension2D)
      );
      const clampedDeviceHeight = Math.max(
        1,
        Math.min(rawDeviceHeight, model.device.limits.maxTextureDimension2D)
      );

      const clientResizeRatioX = clientWidth / model.clientWidth;
      const clientResizeRatioY = clientHeight / model.clientHeight;
      const textureOffsetX = model.texture_offset_x * clientResizeRatioX;
      const textureOffsetY = model.texture_offset_y * clientResizeRatioY;

      // update model.pts in progress
      for (let i = 0; i < model.num_pts; i++) {
        model.pts[i * 2] *= clientResizeRatioX;
        model.pts[i * 2 + 1] *= clientResizeRatioY;
      }

      // update model's recorded viewport client size and texture offset
      model.clientWidth = clientWidth;
      model.clientHeight = clientHeight;
      model.texture_offset_x = textureOffsetX;
      model.texture_offset_y = textureOffsetY;

      // update viewport canvas resolution to new dimensions (csspx * devicepx/csspx = devicepx)
      model.dpr = devicePixelRatio;
      model.canvas.width = clampedDeviceWidth;
      model.canvas.height = clampedDeviceHeight;
      model.deviceWidth = clampedDeviceWidth;
      model.deviceHeight = clampedDeviceHeight;
      model.viewportToTextureX =
        (devicePixelRatio * clientWidth) / model.bg_texture.width;
      model.viewportToTextureY =
        (devicePixelRatio * clientHeight) / model.bg_texture.height;

      // reconfigure surface
      const oldConfig = model.surface.getConfiguration();
      if (oldConfig !== null) {
        model.surface.configure(oldConfig);
      } else {
        throw Error("Retrieved null surface config during resize");
      }

      // update uniforms
      model.poly_uniform.updateDimensions(model);
      model.composite_uniform.updateDimensionsAndTransforms(model);

      // render updated viewport
      model.renderPassBuffer.push(
        0, // clear fg
        -1 // no data
      );
    }
  };

  const observer = new ResizeObserver((entries) => {
    if (resizeDebounceTimeout !== null) {
      clearTimeout(resizeDebounceTimeout);
    }

    resizeDebounceTimeout = setTimeout(() => {
      handleResize(entries);
      resizeDebounceTimeout = null;
    }, RESIZE_DEBOUNCE_MS);
  });

  // if we need device-pixel-content-box that responds to zoom on non-full width/height element
  // observer.observe(model.canvas, { box: "device-pixel-content-box" });
  observer.observe(model.canvas, { box: "content-box" });

  //window.addEventListener("resize", (e) => {onWindowResize(e, model)});

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
      } else if (event.key == "z") {
        model.eventBuffer.push(
          1, // UIEvent
          UIUpdaterLookup["zoom-in"],
          -1 // No data
        );
      } else if (event.key == "x") {
        model.eventBuffer.push(
          1, // UIEvent
          UIUpdaterLookup["zoom-out"],
          -1 // No data
        );
      } else if (event.key == "h") {
        model.eventBuffer.push(
          1, // UIEvent
          UIUpdaterLookup["home-view"],
          -1 // No data
        );
      } else if (event.key == "ArrowRight") {
        model.eventBuffer.push(
          1, // UIEvent
          UIUpdaterLookup["pan-x"],
          -1 // No data
        );
      } else if (event.key == "ArrowDown") {
        model.eventBuffer.push(
          1, // UIEvent
          UIUpdaterLookup["pan-y"],
          -1 // No data
        );
      } else {
        console.log(`onKeyDown: ${event.key}`);
      }
    }
  };

  model.onPointerDown = (event: Event) => {
    const rect = model.canvas.getBoundingClientRect();
    const viewportX = (event as PointerEvent).clientX - rect.left;
    const viewportY = (event as PointerEvent).clientY - rect.top;

    model.eventBuffer.push(
      0, // PointerEvent
      0, // PointerEventLookup["pointerdown"] === 0
      model.eventDataBuffer.push(
        viewportX,
        viewportY,
        (event as PointerEvent).pressure,
        (event as PointerEvent).pointerType as PointerType
      )
    );
  };

  model.onPointerMove = (event: Event) => {
    const rect = model.canvas.getBoundingClientRect();
    const viewportX = (event as PointerEvent).clientX - rect.left;
    const viewportY = (event as PointerEvent).clientY - rect.top;

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
          viewportX,
          viewportY,
          (event as PointerEvent).pressure,
          (event as PointerEvent).pointerType as PointerType
        )
      );
    }

    model.eventBuffer.push(
      0, // PointerEvent
      2, // PointerEventLookup["pointermove"] === 2
      model.eventDataBuffer.push(
        viewportX,
        viewportY,
        (event as PointerEvent).pressure,
        (event as PointerEvent).pointerType as PointerType
      )
    );
  };

  model.onPointerUp = (event: Event) => {
    const rect = model.canvas.getBoundingClientRect();
    const viewportX = (event as PointerEvent).clientX - rect.left;
    const viewportY = (event as PointerEvent).clientY - rect.top;

    model.eventBuffer.push(
      0, // PointerEvent
      1, // PointerEventLookup["pointerup"] === 1
      model.eventDataBuffer.push(
        viewportX,
        viewportY,
        (event as PointerEvent).pressure,
        (event as PointerEvent).pointerType as PointerType
      )
    );
  };

  window.addEventListener("keydown", model.onKeyDown);
  model.canvas.addEventListener("pointerdown", model.onPointerDown);

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
