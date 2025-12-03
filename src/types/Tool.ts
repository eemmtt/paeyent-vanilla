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
  polyline_pointerdown,
  polyline_pointerup,
  polyline_pointermove,
  polyline_cancel,
  polyfan_pointerdown,
  polyfan_pointerup,
  polyfan_pointermove,
  polyfan_cancel,
  // brush_pointerdown,`
  // brush_pointerup,
  // brush_pointermove,
  // brush_cancel,
] as const;

/* POLY LINE */
function polyline_pointerdown(model: Model, dataIdx: number) {
  if (dataIdx === -1 || dataIdx >= model.pointerDataQueue.top) {
    console.warn(`polyline_pointerdown: invalid dataIdx ${dataIdx}`);
    return;
  }

  if (!model.is_drawing) {
    polyline_start(
      model,
      model.pointerDataQueue.x[dataIdx],
      model.pointerDataQueue.y[dataIdx]
    );
  } else {
    polyline_stop(
      model,
      model.pointerDataQueue.x[dataIdx],
      model.pointerDataQueue.y[dataIdx]
    );
  }
}
function polyline_pointerup(model: Model, dataIdx: number) {}
function polyline_pointermove(model: Model, dataIdx: number) {
  if (dataIdx === -1 || dataIdx >= model.pointerDataQueue.top) {
    console.warn(`polyline_pointermove: invalid dataIdx ${dataIdx}`);
    return;
  }

  if (model.is_drawing) {
    polyline_hover(
      model,
      model.pointerDataQueue.x[dataIdx],
      model.pointerDataQueue.y[dataIdx]
    );
  }
}

function polyline_start(model: Model, x: number, y: number) {
  model.is_drawing = true;
  model.pts.set([x * model.dpr, y * model.dpr], 0 * PT_STRIDE);
  model.num_pts = 1;
  return;
}
function polyline_stop(model: Model, x: number, y: number) {
  model.renderQueue.push({
    type: "polyline-clear-fg-and-draw-bg",
    start_pos: [model.pts[0], model.pts[0 + 1]],
    end_pos: [x * model.dpr, y * model.dpr],
  });

  const radius_squared = 15 * 15;
  const dist_squared =
    (x * model.dpr - model.pts[0]) ** 2 +
    (y * model.dpr - model.pts[0 + 1]) ** 2;
  if (dist_squared <= radius_squared) {
    model.is_drawing = false;
  } else {
    polyline_start(model, x, y);
  }
  return;
}

function polyline_hover(model: Model, x: number, y: number) {
  model.renderQueue.push({
    type: "polyline-clear-fg-and-draw-fg",
    start_x: model.pts[0],
    start_y: model.pts[0 + 1],
    end_x: x * model.dpr,
    end_y: y * model.dpr,
  });
}

function polyline_cancel(model: Model, dataIdx: number) {
  model.is_drawing = false;
  model.num_pts = 0;
  model.renderQueue.push({
    type: "clear-fg",
  });
}

/* POLY FAN */

function polyfan_pointerdown(model: Model, dataIdx: number) {
  if (dataIdx === -1 || dataIdx >= model.pointerDataQueue.top) {
    console.warn(`polyfan_pointerdown: invalid dataIdx ${dataIdx}`);
    return;
  }

  if (!model.is_drawing) {
    polyfan_start(
      model,
      model.pointerDataQueue.x[dataIdx],
      model.pointerDataQueue.y[dataIdx]
    );
  } else {
    polyfan_stop(
      model,
      model.pointerDataQueue.x[dataIdx],
      model.pointerDataQueue.y[dataIdx]
    );
  }
}
function polyfan_pointerup(model: Model, dataIdx: number) {}
function polyfan_pointermove(model: Model, dataIdx: number) {
  if (dataIdx === -1 || dataIdx >= model.pointerDataQueue.top) {
    console.warn(`polyfan_pointermove: invalid dataIdx ${dataIdx}`);
    return;
  }

  if (model.is_drawing) {
    polyfan_hover(
      model,
      model.pointerDataQueue.x[dataIdx],
      model.pointerDataQueue.y[dataIdx]
    );
  }
}

function polyfan_start(model: Model, x: number, y: number) {
  model.is_drawing = true;
  model.pts.set([x * model.dpr, y * model.dpr], 0 * PT_STRIDE);
  model.num_pts = 1;
  return;
}
function polyfan_stop(model: Model, x: number, y: number) {
  if (model.num_pts == 1) {
    // draw line
    model.renderQueue.push({
      type: "polyline-clear-fg-and-draw-bg",
      start_pos: [model.pts[0], model.pts[0 + 1]],
      end_pos: [x * model.dpr, y * model.dpr],
    });
    // add midpoint
    model.pts.set([x * model.dpr, y * model.dpr], 1 * PT_STRIDE);
    model.num_pts = 2;
  } else if (model.num_pts == 2) {
    //draw triangle
    model.renderQueue.push({
      type: "polyfan-clear-fg-and-draw-bg",
      start_pos: [model.pts[0], model.pts[0 + 1]],
      mid_pos: [model.pts[1 * PT_STRIDE], model.pts[1 * PT_STRIDE + 1]],
      end_pos: [x * model.dpr, y * model.dpr],
    });
    //update midpoint
    model.pts.set([x * model.dpr, y * model.dpr], 1 * PT_STRIDE);
  }

  const radius_squared = 15 * 15;
  const dist_squared =
    (x * model.dpr - model.pts[0]) ** 2 +
    (y * model.dpr - model.pts[0 + 1]) ** 2;
  if (dist_squared <= radius_squared) {
    model.is_drawing = false;
    model.num_pts = 0;
  }
  return;
}
function polyfan_hover(model: Model, x: number, y: number) {
  if (model.num_pts == 1) {
    model.renderQueue.push({
      type: "polyline-clear-fg-and-draw-fg",
      start_x: model.pts[0],
      start_y: model.pts[0 + 1],
      end_x: x * model.dpr,
      end_y: y * model.dpr,
    });
  } else if (model.num_pts == 2) {
    model.renderQueue.push({
      type: "polyfan-clear-fg-and-draw-fg",
      start_pos: [model.pts[0], model.pts[0 + 1]],
      mid_pos: [model.pts[1 * PT_STRIDE], model.pts[1 * PT_STRIDE + 1]],
      end_pos: [x * model.dpr, y * model.dpr],
    });
  }
}
function polyfan_cancel(model: Model, dataIdx: number) {
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
