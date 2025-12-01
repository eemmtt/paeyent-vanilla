import { type Model } from "./Model";
import { PT_STRIDE } from "./Point";

//TODO: implement brush
export type ToolType = "polyline" | "polyfan" /*| "brush"*/;

//each tool implements: start, stop, hover, cancel. 4 total.
export const ToolStride = 4;
export const ToolLookup = {
  polyline: 0,
  polyfan: 1,
  //brush: 2,
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
  //brush_start,
  //brush_stop,
  //brush_hover,
  //brush_cancel,
] as const;

/* POLY LINE */
function polyline_start(model: Model, event: PointerEvent) {
  model.is_drawing = true;
  model.pts.set([event.x * model.dpr, event.y * model.dpr], 0 * PT_STRIDE);
  model.num_pts = 1;
  return;
}
function polyline_stop(model: Model, event: PointerEvent) {
  model.renderQueue.push({
    type: "polyline-clear-fg-and-draw-bg",
    start_pos: [model.pts[0], model.pts[0 + 1]],
    end_pos: [event.x * model.dpr, event.y * model.dpr],
  });

  const radius_squared = 15 * 15;
  const dist_squared =
    (event.x * model.dpr - model.pts[0]) ** 2 +
    (event.y * model.dpr - model.pts[0 + 1]) ** 2;
  if (dist_squared <= radius_squared) {
    model.is_drawing = false;
  } else {
    polyline_start(model, event);
  }
  return;
}

function polyline_hover(model: Model, event: PointerEvent) {
  model.renderQueue.push({
    type: "polyline-clear-fg-and-draw-fg",
    start_x: model.pts[0],
    start_y: model.pts[0 + 1],
    end_x: event.x * model.dpr,
    end_y: event.y * model.dpr,
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
  model.pts.set([event.x * model.dpr, event.y * model.dpr], 0 * PT_STRIDE);
  model.num_pts = 1;
  return;
}
function polyfan_stop(model: Model, event: PointerEvent) {
  if (model.num_pts == 1) {
    // draw line
    model.renderQueue.push({
      type: "polyline-clear-fg-and-draw-bg",
      start_pos: [model.pts[0], model.pts[0 + 1]],
      end_pos: [event.x * model.dpr, event.y * model.dpr],
    });
    // add midpoint
    model.pts.set([event.x * model.dpr, event.y * model.dpr], 1 * PT_STRIDE);
    model.num_pts = 2;
  } else if (model.num_pts == 2) {
    //draw triangle
    model.renderQueue.push({
      type: "polyfan-clear-fg-and-draw-bg",
      start_pos: [model.pts[0], model.pts[0 + 1]],
      mid_pos: [model.pts[1 * PT_STRIDE], model.pts[1 * PT_STRIDE + 1]],
      end_pos: [event.x * model.dpr, event.y * model.dpr],
    });
    //update midpoint
    model.pts.set([event.x * model.dpr, event.y * model.dpr], 1 * PT_STRIDE);
  }

  const radius_squared = 15 * 15;
  const dist_squared =
    (event.x * model.dpr - model.pts[0]) ** 2 +
    (event.y * model.dpr - model.pts[0 + 1]) ** 2;
  if (dist_squared <= radius_squared) {
    model.is_drawing = false;
    model.num_pts = 0;
  }
  return;
}
function polyfan_hover(model: Model, event: PointerEvent) {
  if (model.num_pts == 1) {
    model.renderQueue.push({
      type: "polyline-clear-fg-and-draw-fg",
      start_x: model.pts[0],
      start_y: model.pts[0 + 1],
      end_x: event.x * model.dpr,
      end_y: event.y * model.dpr,
    });
  } else if (model.num_pts == 2) {
    model.renderQueue.push({
      type: "polyfan-clear-fg-and-draw-fg",
      start_pos: [model.pts[0], model.pts[0 + 1]],
      mid_pos: [model.pts[1 * PT_STRIDE], model.pts[1 * PT_STRIDE + 1]],
      end_pos: [event.x * model.dpr, event.y * model.dpr],
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

/* BRUSH */
//function brush_start(model: Model, event: PointerEvent) {}
//function brush_stop(model: Model, event: PointerEvent) {}
//function brush_hover(model: Model, event: PointerEvent) {}
//function brush_cancel(model: Model) {}
