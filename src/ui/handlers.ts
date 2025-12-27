import {
  create_texture,
  updateCompositeBindgroup,
} from "../graphics/wgpu_initializers";
import { mainLoop } from "../main";
import { type Model } from "../types/Model";
import type { PointerType } from "../types/PaeyentEvent";
import { UIUpdaterLookup } from "./updaters";

export type EventHandler = (event: Event) => void;

export function voidEventHandler(_event: Event): void {}

export function handlers_init(model: Model, document: Document) {
  // handle window resize events
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

      // update model's recorded viewport client size
      model.clientWidth = clientWidth;
      model.clientHeight = clientHeight;

      // update viewport canvas resolution to new dimensions (csspx * devicepx/csspx = devicepx)
      model.dpr = devicePixelRatio;
      model.canvas.width = clampedDeviceWidth;
      model.canvas.height = clampedDeviceHeight;
      model.deviceWidth = clampedDeviceWidth;
      model.deviceHeight = clampedDeviceHeight;

      // reconfigure surface
      const oldConfig = model.surface.getConfiguration();
      if (oldConfig !== null) {
        model.surface.configure(oldConfig);
      } else {
        throw Error("Retrieved null surface config during resize");
      }

      // recreate annotation texture
      const [new_an_texture, new_an_texture_view] = create_texture(
        navigator.gpu.getPreferredCanvasFormat(),
        model.device,
        clampedDeviceWidth,
        clampedDeviceHeight,
        "transparent"
      );
      model.an_texture = new_an_texture;
      model.an_texture_view = new_an_texture_view;
      updateCompositeBindgroup(model, model.an_texture_view);

      // update uniforms
      model.composite_uniform.updateDimensions(model);

      // render updated viewport
      model.drawUniformBuffer.pushClearFg();
    }
  };

  model.observer = new ResizeObserver((entries) => {
    if (model.resizeDebounceTimeout !== null) {
      clearTimeout(model.resizeDebounceTimeout);
    }

    model.resizeDebounceTimeout = setTimeout(() => {
      handleResize(entries);
      model.resizeDebounceTimeout = null;
    }, model.RESIZE_DEBOUNCE_MS);
  });

  // if we need device-pixel-content-box that responds to zoom on non-full width/height element
  // observer.observe(model.canvas, { box: "device-pixel-content-box" });
  model.observer.observe(model.canvas, { box: "content-box" });

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
          UIUpdaterLookup["button-zoom"],
          -1 // No data
        );
      } else if (event.key == "p") {
        model.eventBuffer.push(
          1, // UIEvent
          UIUpdaterLookup["button-pan"],
          -1 // No data
        );
      } else if (event.key == "h") {
        model.eventBuffer.push(
          1, // UIEvent
          UIUpdaterLookup["home-view"],
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
  model.menu_button.addEventListener("pointerdown", (e) => {
    if (e.target === model.menu_button) {
      model.eventBuffer.push(
        1, // UIEvent
        UIUpdaterLookup["button-menu"],
        -1 // No data
      );
    }
  });
  model.brush_button.addEventListener("pointerdown", (e) => {
    if (e.target === model.brush_button) {
      model.eventBuffer.push(
        1, // UIEvent
        UIUpdaterLookup["button-brush"],
        -1 // No data
      );
    }
  });
  model.fan_button.addEventListener("pointerdown", (e) => {
    if (e.target === model.fan_button) {
      model.eventBuffer.push(
        1, // UIEvent
        UIUpdaterLookup["button-fan"],
        -1 // No data
      );
    }
  });
  model.line_button.addEventListener("pointerdown", (e) => {
    if (e.target === model.line_button) {
      model.eventBuffer.push(
        1, // UIEvent
        UIUpdaterLookup["button-line"],
        -1 // No data
      );
    }
  });
  model.home_button.addEventListener("pointerdown", (e) => {
    if (e.target === model.home_button) {
      model.eventBuffer.push(
        1, // UIEvent
        UIUpdaterLookup["home-view"],
        -1 // No data
      );
    }
  });
  model.pan_button.addEventListener("pointerdown", (e) => {
    if (e.target === model.pan_button) {
      model.eventBuffer.push(
        1, // UIEvent
        UIUpdaterLookup["button-pan"],
        -1 // No data
      );
    }
  });
  model.zoom_button.addEventListener("pointerdown", (e) => {
    if (e.target === model.zoom_button) {
      model.eventBuffer.push(
        1, // UIEvent
        UIUpdaterLookup["button-zoom"],
        -1 // No data
      );
    }
  });

  /* modal events */
  model.modal_container.addEventListener("pointerdown", (e) => {
    if (e.target === model.modal_container) {
      model.eventBuffer.push(
        1, // UIEvent
        UIUpdaterLookup["button-modal-container"],
        -1 // No data
      );
    }
  });
  model.modal_close_button.addEventListener("pointerdown", (e) => {
    if (e.target === model.modal_close_button) {
      model.eventBuffer.push(
        1, // UIEvent
        UIUpdaterLookup["button-modal-close"],
        -1 // No data
      );
    }
  });
  model.radio_constraint_type_none.addEventListener("change", (e) => {
    if (e.target === model.radio_constraint_type_none) {
      model.eventBuffer.push(
        1, // UIEvent
        UIUpdaterLookup["radio-constraint-type-none"],
        -1 // No data
      );
    }
  });
  model.radio_constraint_type_time.addEventListener("change", (e) => {
    if (e.target === model.radio_constraint_type_time) {
      model.eventBuffer.push(
        1, // UIEvent
        UIUpdaterLookup["radio-constraint-type-time"],
        -1 // No data
      );
    }
  });
  model.constraint_type_time_minutes.addEventListener("change", (e) => {
    if (e.target === model.constraint_type_time_minutes) {
      model.eventBuffer.push(
        1, // UIEvent
        UIUpdaterLookup["input-constraint-time-minutes"],
        -1 // No data
      );
    }
  });
  model.constraint_type_time_seconds.addEventListener("change", (e) => {
    if (e.target === model.constraint_type_time_seconds) {
      model.eventBuffer.push(
        1, // UIEvent
        UIUpdaterLookup["input-constraint-time-seconds"],
        -1 // No data
      );
    }
  });
  model.radio_constraint_type_actions.addEventListener("change", (e) => {
    if (e.target === model.radio_constraint_type_actions) {
      model.eventBuffer.push(
        1, // UIEvent
        UIUpdaterLookup["radio-constraint-type-actions"],
        -1 // No data
      );
    }
  });
  model.constraint_type_actions_count.addEventListener("change", (e) => {
    if (e.target === model.constraint_type_actions_count) {
      model.eventBuffer.push(
        1, // UIEvent
        UIUpdaterLookup["input-constraint-actions-count"],
        -1 // No data
      );
    }
  });
  model.radio_colorpicker_type_rgb.addEventListener("change", (e) => {
    if (e.target === model.radio_colorpicker_type_rgb) {
      model.eventBuffer.push(
        1, // UIEvent
        UIUpdaterLookup["radio-colorpicker-type-rgb"],
        -1 // No data
      );
    }
  });
  model.radio_colorpicker_type_hsv.addEventListener("change", (e) => {
    if (e.target === model.radio_colorpicker_type_hsv) {
      model.eventBuffer.push(
        1, // UIEvent
        UIUpdaterLookup["radio-colorpicker-type-hsv"],
        -1 // No data
      );
    }
  });
  model.radio_scratch_yes.addEventListener("change", (e) => {
    if (e.target === model.radio_scratch_yes) {
      model.eventBuffer.push(
        1, // UIEvent
        UIUpdaterLookup["radio-scratch-yes"],
        -1 // No data
      );
    }
  });
  model.radio_scratch_no.addEventListener("change", (e) => {
    if (e.target === model.radio_scratch_no) {
      model.eventBuffer.push(
        1, // UIEvent
        UIUpdaterLookup["radio-scratch-no"],
        -1 // No data
      );
    }
  });
  model.radio_image_dimensions_auto.addEventListener("change", (e) => {
    if (e.target === model.radio_image_dimensions_auto) {
      model.eventBuffer.push(
        1, // UIEvent
        UIUpdaterLookup["radio-image-dimensions-auto"],
        -1 // No data
      );
    }
  });
  model.radio_image_dimensions_custom.addEventListener("change", (e) => {
    if (e.target === model.radio_image_dimensions_custom) {
      model.eventBuffer.push(
        1, // UIEvent
        UIUpdaterLookup["radio-image-dimensions-custom"],
        -1 // No data
      );
    }
  });
  model.image_dimensions_width.addEventListener("change", (e) => {
    if (e.target === model.image_dimensions_width) {
      model.eventBuffer.push(
        1, // UIEvent
        UIUpdaterLookup["input-image-dimensions-width"],
        -1 // No data
      );
    }
  });
  model.image_dimensions_height.addEventListener("change", (e) => {
    if (e.target === model.image_dimensions_height) {
      model.eventBuffer.push(
        1, // UIEvent
        UIUpdaterLookup["input-image-dimensions-height"],
        -1 // No data
      );
    }
  });
  model.modal_start_session_button.addEventListener("pointerdown", (e) => {
    if (e.target === model.modal_start_session_button) {
      model.eventBuffer.push(
        1, // UIEvent
        UIUpdaterLookup["button-start-session"],
        -1 // No data
      );
    }
  });
  model.modal_end_session_button.addEventListener("pointerdown", (e) => {
    if (e.target === model.modal_end_session_button) {
      model.eventBuffer.push(
        1, // UIEvent
        UIUpdaterLookup["button-end-session"],
        -1 // No data
      );
    }
  });
  model.modal_save_button.addEventListener("pointerdown", (e) => {
    if (e.target === model.modal_save_button) {
      model.eventBuffer.push(
        1, // UIEvent
        UIUpdaterLookup["button-save"],
        -1 // No data
      );
    }
  });
  model.modal_share_button.addEventListener("pointerdown", (e) => {
    if (e.target === model.modal_share_button) {
      model.eventBuffer.push(
        1, // UIEvent
        UIUpdaterLookup["button-share"],
        -1 // No data
      );
    }
  });
  model.modal_about_section.addEventListener("pointerdown", (e) => {
    if (e.target === model.modal_about_section) {
      model.eventBuffer.push(
        1, // UIEvent
        UIUpdaterLookup["button-about"],
        -1 // No data
      );
    }
  });
}

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

