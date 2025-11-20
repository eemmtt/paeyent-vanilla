import { type Model } from "./main";

//TODO: add dots

export type ToolType = "polyline" | "polyfan" | "dots";
export const ToolStride = 4; //each tool implements: start, stop, hover, cancel
export const ToolLookup = {
  polyline: 0,
  polyfan: 1,
} as const;

export const ToolHandlers = [
  polyline_start,
  polyline_stop,
  polyline_hover,
  polyline_cancel,
  polyfan_start,
  polyfan_stop,
  polyfan_hover,
  polyfan_cancel,
] as const;

/* POLY LINE */
function polyline_start(model: Model, event: PointerEvent) {
  model.is_drawing = true;
  model.pos_a = { x: event.x * model.dpr, y: event.y * model.dpr };
  model.num_pts = 1;
  return;
}
function polyline_stop(model: Model, event: PointerEvent) {
  model.renderQueue.push({
    type: "polyline-clear-fg-and-draw-bg",
    start_pos: model.pos_a,
    end_pos: { x: event.x * model.dpr, y: event.y * model.dpr },
  });

  const radius = 15;
  const dist = Math.sqrt(
    (event.x * model.dpr - model.pos_a.x) ** 2 +
      (event.y * model.dpr - model.pos_a.y) ** 2
  );
  if (dist <= radius) {
    model.is_drawing = false;
  } else {
    polyline_start(model, event);
  }
  return;
}
function polyline_hover(model: Model, event: PointerEvent) {
  model.renderQueue.push({
    type: "polyline-clear-fg-and-draw-fg",
    start_pos: model.pos_a,
    end_pos: { x: event.x * model.dpr, y: event.y * model.dpr },
  });
}
function polyline_cancel(model: Model) {
  model.is_drawing = false;
  model.num_pts = 0;
  model.renderQueue.push({
    type: "clear-fg",
  });
}

/* POLY FAN */
function polyfan_start(model: Model, event: PointerEvent) {
  model.is_drawing = true;
  model.pos_a = { x: event.x * model.dpr, y: event.y * model.dpr };
  model.num_pts = 1;
  return;
}
function polyfan_stop(model: Model, event: PointerEvent) {
  if (model.num_pts == 1) {
    // draw line
    model.renderQueue.push({
      type: "polyline-clear-fg-and-draw-bg",
      start_pos: model.pos_a,
      end_pos: { x: event.x * model.dpr, y: event.y * model.dpr },
    });
    model.pos_b = { x: event.x * model.dpr, y: event.y * model.dpr };
    model.num_pts = 2;
  } else if (model.num_pts == 2) {
    //draw triangle
    model.renderQueue.push({
      type: "polyfan-clear-fg-and-draw-bg",
      start_pos: model.pos_a,
      mid_pos: model.pos_b,
      end_pos: { x: event.x * model.dpr, y: event.y * model.dpr },
    });
    model.pos_b = { x: event.x * model.dpr, y: event.y * model.dpr };
  }

  const radius = 15;
  const dist = Math.sqrt(
    (event.x * model.dpr - model.pos_a.x) ** 2 +
      (event.y * model.dpr - model.pos_a.y) ** 2
  );
  if (dist <= radius) {
    model.is_drawing = false;
    model.num_pts = 0;
  }
  return;
}
function polyfan_hover(model: Model, event: PointerEvent) {
  if (model.num_pts == 1) {
    model.renderQueue.push({
      type: "polyline-clear-fg-and-draw-fg",
      start_pos: model.pos_a,
      end_pos: { x: event.x * model.dpr, y: event.y * model.dpr },
    });
  } else if (model.num_pts == 2) {
    model.renderQueue.push({
      type: "polyfan-clear-fg-and-draw-fg",
      start_pos: model.pos_a,
      mid_pos: model.pos_b,
      end_pos: { x: event.x * model.dpr, y: event.y * model.dpr },
    });
  }
}
function polyfan_cancel(model: Model) {
  model.is_drawing = false;
  model.num_pts = 0;
  model.renderQueue.push({
    type: "clear-fg",
  });
}
