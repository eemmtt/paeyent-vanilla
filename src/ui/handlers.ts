import {
  create_texture,
  updateCompositeBindgroup,
} from "../graphics/wgpu_initializers";
import { mainLoop } from "../main";
import { type Model } from "../types/Model";
import type { PointerType } from "../types/PaeyentEventBuffer";

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

      // update render pass descriptors with new annotation texture view
      (
        model.rpd_replaceAnno.colorAttachments as GPURenderPassColorAttachment[]
      )[0].view = new_an_texture_view;
      (
        model.rpd_appendAnno.colorAttachments as GPURenderPassColorAttachment[]
      )[0].view = new_an_texture_view;

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

  model.onKeyDown = (event: KeyboardEvent) => {
    if (!event.repeat && model.session_state === "in-session") {
      if (event.key == "m") {
        model.eventBuffer.pushUIEvent("button-menu");
      } else if (event.key == "f") {
        model.eventBuffer.pushUIEvent("button-fan");
      } else if (event.key == "l") {
        model.eventBuffer.pushUIEvent("button-line");
      } else if (event.key == "b") {
        model.eventBuffer.pushUIEvent("button-brush");
      } else if (event.key == "z") {
        model.eventBuffer.pushUIEvent("button-zoom");
      } else if (event.key == "p") {
        model.eventBuffer.pushUIEvent("button-pan");
      } else if (event.key == "h") {
        model.eventBuffer.pushUIEvent("home-view");
      } else {
        console.log(`onKeyDown: ${event.key}`);
      }
    } else if (!event.repeat && model.session_state === "end-session") {
      if (event.key == "m") {
        model.eventBuffer.pushUIEvent("button-menu");
      } else {
        console.log(`onKeyDown: ${event.key}`);
      }
    }
  };

  model.onPointerDown = (event: Event) => {
    const rect = model.canvas.getBoundingClientRect();
    const viewportX = (event as PointerEvent).clientX - rect.left;
    const viewportY = (event as PointerEvent).clientY - rect.top;

    model.eventBuffer.pushPointerDownEvent(
      (event as PointerEvent).pointerType as PointerType,
      viewportX,
      viewportY,
      (event as PointerEvent).pressure
    );
  };

  model.onPointerMove = (event: Event) => {
    const rect = model.canvas.getBoundingClientRect();
    const viewportX = (event as PointerEvent).clientX - rect.left;
    const viewportY = (event as PointerEvent).clientY - rect.top;

    // overwrite repeated pointermoves
    if (model.eventBuffer.lastEventIsPointerMove()) {
      model.eventBuffer.replaceLastPointerMoveEvent(
        (event as PointerEvent).pointerType as PointerType,
        viewportX,
        viewportY,
        (event as PointerEvent).pressure
      );
    }

    model.eventBuffer.pushPointerMoveEvent(
      (event as PointerEvent).pointerType as PointerType,
      viewportX,
      viewportY,
      (event as PointerEvent).pressure
    );
  };

  model.onPointerUp = (event: Event) => {
    const rect = model.canvas.getBoundingClientRect();
    const viewportX = (event as PointerEvent).clientX - rect.left;
    const viewportY = (event as PointerEvent).clientY - rect.top;

    model.eventBuffer.pushPointerUpEvent(
      (event as PointerEvent).pointerType as PointerType,
      viewportX,
      viewportY,
      (event as PointerEvent).pressure
    );
  };

  window.addEventListener("beforeunload", (e) => {
    e.preventDefault();
    e.returnValue = true;
  });

  window.addEventListener("keydown", model.onKeyDown);
  model.canvas.addEventListener("pointerdown", model.onPointerDown);

  /* color picker events */
  model.slider_r.addEventListener("input", (e) => onSliderRed(e, model));
  model.slider_g.addEventListener("input", (e) => onSliderGreen(e, model));
  model.slider_b.addEventListener("input", (e) => onSliderBlue(e, model));

  /* button-container events */
  model.menu_button.addEventListener("pointerdown", (e) => {
    if (e.target === model.menu_button) {
      model.eventBuffer.pushUIEvent("button-menu");
    }
  });
  model.brush_button.addEventListener("pointerdown", (e) => {
    if (e.target === model.brush_button) {
      model.eventBuffer.pushUIEvent("button-brush");
    }
  });
  model.fan_button.addEventListener("pointerdown", (e) => {
    if (e.target === model.fan_button) {
      model.eventBuffer.pushUIEvent("button-fan");
    }
  });
  model.line_button.addEventListener("pointerdown", (e) => {
    if (e.target === model.line_button) {
      model.eventBuffer.pushUIEvent("button-line");
    }
  });
  model.home_button.addEventListener("pointerdown", (e) => {
    if (e.target === model.home_button) {
      model.eventBuffer.pushUIEvent("home-view");
    }
  });
  model.pan_button.addEventListener("pointerdown", (e) => {
    if (e.target === model.pan_button) {
      model.eventBuffer.pushUIEvent("button-pan");
    }
  });
  model.zoom_button.addEventListener("pointerdown", (e) => {
    if (e.target === model.zoom_button) {
      model.eventBuffer.pushUIEvent("button-zoom");
    }
  });

  /* modal events */
  model.modal_container.addEventListener("pointerdown", (e) => {
    if (e.target === model.modal_container) {
      model.eventBuffer.pushUIEvent("button-modal-container");
    }
  });
  model.modal_close_button.addEventListener("pointerdown", (e) => {
    if (e.target === model.modal_close_button) {
      model.eventBuffer.pushUIEvent("button-modal-close");
    }
  });
  model.radio_constraint_type_none.addEventListener("change", (e) => {
    if (e.target === model.radio_constraint_type_none) {
      model.eventBuffer.pushUIEvent("radio-constraint-type-none");
    }
  });
  model.radio_constraint_type_time.addEventListener("change", (e) => {
    if (e.target === model.radio_constraint_type_time) {
      model.eventBuffer.pushUIEvent("radio-constraint-type-time");
    }
  });
  model.constraint_type_time_minutes.addEventListener("input", (e) => {
    if (e.target === model.constraint_type_time_minutes) {
      model.eventBuffer.pushUIEvent("input-constraint-time-minutes");
    }
  });
  model.constraint_type_time_seconds.addEventListener("input", (e) => {
    if (e.target === model.constraint_type_time_seconds) {
      model.eventBuffer.pushUIEvent("input-constraint-time-seconds");
    }
  });
  model.radio_constraint_type_actions.addEventListener("change", (e) => {
    if (e.target === model.radio_constraint_type_actions) {
      model.eventBuffer.pushUIEvent("radio-constraint-type-actions");
    }
  });
  model.constraint_type_actions_count.addEventListener("change", (e) => {
    if (e.target === model.constraint_type_actions_count) {
      model.eventBuffer.pushUIEvent("input-constraint-actions-count");
    }
  });
  model.radio_colorpicker_type_rgb.addEventListener("change", (e) => {
    if (e.target === model.radio_colorpicker_type_rgb) {
      model.eventBuffer.pushUIEvent("radio-colorpicker-type-rgb");
    }
  });
  model.radio_colorpicker_type_hsv.addEventListener("change", (e) => {
    if (e.target === model.radio_colorpicker_type_hsv) {
      model.eventBuffer.pushUIEvent("radio-colorpicker-type-hsv");
    }
  });
  model.radio_scratch_yes.addEventListener("change", (e) => {
    if (e.target === model.radio_scratch_yes) {
      model.eventBuffer.pushUIEvent("radio-scratch-yes");
    }
  });
  model.radio_scratch_no.addEventListener("change", (e) => {
    if (e.target === model.radio_scratch_no) {
      model.eventBuffer.pushUIEvent("radio-scratch-no");
    }
  });
  model.radio_image_dimensions_auto.addEventListener("change", (e) => {
    if (e.target === model.radio_image_dimensions_auto) {
      model.eventBuffer.pushUIEvent("radio-image-dimensions-auto");
    }
  });
  model.radio_image_dimensions_custom.addEventListener("change", (e) => {
    if (e.target === model.radio_image_dimensions_custom) {
      model.eventBuffer.pushUIEvent("radio-image-dimensions-custom");
    }
  });
  model.image_dimensions_width.addEventListener("input", (e) => {
    if (e.target === model.image_dimensions_width) {
      model.eventBuffer.pushUIEvent("input-image-dimensions-width");
    }
  });
  model.image_dimensions_height.addEventListener("input", (e) => {
    if (e.target === model.image_dimensions_height) {
      model.eventBuffer.pushUIEvent("input-image-dimensions-height");
    }
  });
  model.modal_start_session_button.addEventListener("pointerdown", (e) => {
    if (e.target === model.modal_start_session_button) {
      model.eventBuffer.pushUIEvent("button-start-session");
    }
  });
  model.modal_end_session_button.addEventListener("pointerdown", (e) => {
    if (e.target === model.modal_end_session_button) {
      model.eventBuffer.pushUIEvent("button-end-session");
    }
  });
  model.modal_save_button.addEventListener("pointerdown", (e) => {
    if (e.target === model.modal_save_button) {
      model.eventBuffer.pushUIEvent("button-save");
    }
  });
  model.modal_share_button.addEventListener("pointerdown", (e) => {
    if (e.target === model.modal_share_button) {
      model.eventBuffer.pushUIEvent("button-share");
    }
  });
  model.modal_about_section.addEventListener("pointerdown", (e) => {
    if (e.target === model.modal_about_section) {
      model.eventBuffer.pushUIEvent("button-about");
    }
  });
}

/* pointer input handlers */
// implemented on main() with Model in closure...

/* UI event handlers */

export function onSliderRed(event: Event, model: Model) {
  if (event.target === model.slider_r) {
    model.eventBuffer.pushUIEvent("input-slider-red");
  }
}

export function onSliderGreen(event: Event, model: Model) {
  if (event.target === model.slider_g) {
    model.eventBuffer.pushUIEvent("input-slider-green");
  }
}

export function onSliderBlue(event: Event, model: Model) {
  if (event.target === model.slider_b) {
    model.eventBuffer.pushUIEvent("input-slider-blue");
  }
}
