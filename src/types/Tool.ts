import { type Model } from "./Model";

const PT_STRIDE = 2;
//TODO: implement brush
export type ToolType = "line" | "fan" /*| "brush"*/;

export const ToolStride = 4; //each tool implements: pointerdown, pointerup, pointermove, cancel. 4 total.
export const ToolLookup = {
  line: 0,
  fan: 1,
  //brush: 2,
} as const;

export const ToolUpdaters = [
  line_pointerdown,
  line_pointerup,
  line_pointermove,
  line_cancel,
  fan_pointerdown,
  fan_pointerup,
  fan_pointermove,
  fan_cancel,
  // brush_pointerdown,
  // brush_pointerup,
  // brush_pointermove,
  // brush_cancel,
] as const;

/* POLY LINE */
function line_pointerdown(model: Model, dataIdx: number) {
  if (dataIdx === -1 || dataIdx >= model.eventDataBuffer.top) {
    console.warn(`line_pointerdown: invalid dataIdx ${dataIdx}`);
    return;
  }

  if (!model.is_drawing) {
    line_start(
      model,
      model.eventDataBuffer.x[dataIdx],
      model.eventDataBuffer.y[dataIdx]
    );
  } else {
    line_stop(
      model,
      model.eventDataBuffer.x[dataIdx],
      model.eventDataBuffer.y[dataIdx]
    );
  }
}
function line_pointerup(_model: Model, _dataIdx: number) {}
function line_pointermove(model: Model, dataIdx: number) {
  if (dataIdx === -1 || dataIdx >= model.eventDataBuffer.top) {
    console.warn(`line_pointermove: invalid dataIdx ${dataIdx}`);
    return;
  }

  if (model.is_drawing) {
    line_hover(
      model,
      model.eventDataBuffer.x[dataIdx],
      model.eventDataBuffer.y[dataIdx]
    );
  }
}

function line_start(model: Model, x: number, y: number) {
  model.is_drawing = true;
  model.pts.set([x * model.dpr, y * model.dpr], 0 * PT_STRIDE);
  model.num_pts = 1;

  model.canvas.addEventListener("pointermove", model.onPointerMove);
  model.canvas.addEventListener(
    "pointerup",
    model.onPointerUp,
    model.handleOnce
  );

  return;
}
function line_stop(model: Model, x: number, y: number) {
  // draw line to background
  model.renderPassBuffer.push(
    5, //RenderPassLookup["line-bg"] === 5
    model.renderPassDataBuffer.push(
      model.pts[0 * PT_STRIDE],
      model.pts[0 * PT_STRIDE + 1],
      x * model.dpr,
      y * model.dpr,
      -1,
      -1,
      model.color[0],
      model.color[1],
      model.color[2]
    )
  );

  const radius_squared = 15 * 15;
  const dist_squared =
    (x * model.dpr - model.pts[0]) ** 2 +
    (y * model.dpr - model.pts[0 + 1]) ** 2;
  if (dist_squared <= radius_squared) {
    model.is_drawing = false;

    model.canvas.removeEventListener("pointermove", model.onPointerMove);
    model.canvas.removeEventListener("pointerup", model.onPointerUp);
  } else {
    line_start(model, x, y);
  }
  return;
}

function line_hover(model: Model, x: number, y: number) {
  // draw line to foreground
  model.renderPassBuffer.push(
    4, //RenderPassLookup["line-fg"] === 4
    model.renderPassDataBuffer.push(
      model.pts[0 * PT_STRIDE],
      model.pts[0 * PT_STRIDE + 1],
      x * model.dpr,
      y * model.dpr,
      -1,
      -1,
      model.color[0],
      model.color[1],
      model.color[2]
    )
  );
}

function line_cancel(model: Model, _dataIdx: number) {
  model.is_drawing = false;
  model.num_pts = 0;
  model.renderPassBuffer.push(
    0, // RenderPassLookup["clear-fg"] === 0
    -1 // no data
  );

  model.canvas.removeEventListener("pointermove", model.onPointerMove);
  model.canvas.removeEventListener("pointerup", model.onPointerUp);
}

/* POLY FAN */

function fan_pointerdown(model: Model, dataIdx: number) {
  if (dataIdx === -1 || dataIdx >= model.eventDataBuffer.top) {
    console.warn(`fan_pointerdown: invalid dataIdx ${dataIdx}`);
    return;
  }

  if (!model.is_drawing) {
    fan_start(
      model,
      model.eventDataBuffer.x[dataIdx],
      model.eventDataBuffer.y[dataIdx]
    );
  } else {
    fan_stop(
      model,
      model.eventDataBuffer.x[dataIdx],
      model.eventDataBuffer.y[dataIdx]
    );
  }
}

function fan_pointerup(_model: Model, _dataIdx: number) {}

function fan_pointermove(model: Model, dataIdx: number) {
  if (dataIdx === -1 || dataIdx >= model.eventDataBuffer.top) {
    console.warn(`fan_pointermove: invalid dataIdx ${dataIdx}`);
    return;
  }

  if (model.is_drawing) {
    fan_hover(
      model,
      model.eventDataBuffer.x[dataIdx],
      model.eventDataBuffer.y[dataIdx]
    );
  }
}

function fan_start(model: Model, x: number, y: number) {
  model.is_drawing = true;
  model.pts.set([x * model.dpr, y * model.dpr], 0 * PT_STRIDE);
  model.num_pts = 1;

  model.canvas.addEventListener("pointermove", model.onPointerMove);
  model.canvas.addEventListener(
    "pointerup",
    model.onPointerUp,
    model.handleOnce
  );
  return;
}
function fan_stop(model: Model, x: number, y: number) {
  if (model.num_pts == 1) {
    // draw line to background
    model.renderPassBuffer.push(
      5, //RenderPassLookup["line-bg"] === 5
      model.renderPassDataBuffer.push(
        model.pts[0 * PT_STRIDE],
        model.pts[0 * PT_STRIDE + 1],
        x * model.dpr,
        y * model.dpr,
        -1,
        -1,
        model.color[0],
        model.color[1],
        model.color[2]
      )
    );

    // add midpoint
    model.pts.set([x * model.dpr, y * model.dpr], 1 * PT_STRIDE);
    model.num_pts = 2;
  } else if (model.num_pts == 2) {
    // draw triangle to background
    model.renderPassBuffer.push(
      7, //RenderPassLookup["fan-bg"] === 7
      model.renderPassDataBuffer.push(
        model.pts[0 * PT_STRIDE],
        model.pts[0 * PT_STRIDE + 1],
        model.pts[1 * PT_STRIDE],
        model.pts[1 * PT_STRIDE + 1],
        x * model.dpr,
        y * model.dpr,
        model.color[0],
        model.color[1],
        model.color[2]
      )
    );

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

    model.canvas.removeEventListener("pointermove", model.onPointerMove);
    model.canvas.removeEventListener("pointerup", model.onPointerUp);
  }
  return;
}
function fan_hover(model: Model, x: number, y: number) {
  if (model.num_pts == 1) {
    // draw line to foreground
    model.renderPassBuffer.push(
      4, //RenderPassLookup["line-fg"] === 4
      model.renderPassDataBuffer.push(
        model.pts[0 * PT_STRIDE],
        model.pts[0 * PT_STRIDE + 1],
        x * model.dpr,
        y * model.dpr,
        -1,
        -1,
        model.color[0],
        model.color[1],
        model.color[2]
      )
    );
  } else if (model.num_pts == 2) {
    // draw triangle to foreground
    model.renderPassBuffer.push(
      6, //RenderPassLookup["fan-fg"] === 6
      model.renderPassDataBuffer.push(
        model.pts[0 * PT_STRIDE],
        model.pts[0 * PT_STRIDE + 1],
        model.pts[1 * PT_STRIDE],
        model.pts[1 * PT_STRIDE + 1],
        x * model.dpr,
        y * model.dpr,
        model.color[0],
        model.color[1],
        model.color[2]
      )
    );
  }
}
function fan_cancel(model: Model, _dataIdx: number) {
  model.is_drawing = false;
  model.num_pts = 0;

  model.canvas.removeEventListener("pointermove", model.onPointerMove);
  model.canvas.removeEventListener("pointerup", model.onPointerUp);

  model.renderPassBuffer.push(
    0, // RenderPassLookup["clear-fg"] === 0
    -1 // no data
  );
}

/* BRUSH */
//function brush_start(model: Model, event: PointerEvent) {}
//function brush_stop(model: Model, event: PointerEvent) {}
//function brush_hover(model: Model, event: PointerEvent) {}
//function brush_cancel(model: Model) {}
