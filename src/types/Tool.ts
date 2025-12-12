import { type Model } from "./Model";

const PT_STRIDE = 2;
//TODO: implement brush
export type ToolType = "line" | "fan" | "nav" /*| "brush"*/;

export const ToolStride = 4; //each tool implements: pointerdown, pointerup, pointermove, cancel. 4 total.
export const ToolLookup = {
  line: 0,
  fan: 1,
  nav: 2,
  //brush: 3,
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
  nav_pointerdown,
  nav_pointerup,
  nav_pointermove,
  nav_cancel,
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

  // viewport coordinate needs to be scaled to the aspect ratio
  // of the texture.
  const viewportX = model.eventDataBuffer.x[dataIdx];
  const viewportY = model.eventDataBuffer.y[dataIdx];
  const centerClientX = model.clientWidth * 0.5;
  const centerClientY = model.clientHeight * 0.5;
  const textureX =
    ((viewportX - centerClientX) / model.zoom +
      (centerClientX - model.texture_offset_x)) *
    model.viewportToTextureX;
  const textureY =
    ((viewportY - centerClientY) / model.zoom +
      (centerClientY - model.texture_offset_y)) *
    model.viewportToTextureY;

  if (!model.is_drawing) {
    line_start(model, textureX, textureY);
  } else {
    line_stop(model, textureX, textureY);
  }
}
function line_pointerup(_model: Model, _dataIdx: number) {}
function line_pointermove(model: Model, dataIdx: number) {
  if (dataIdx === -1 || dataIdx >= model.eventDataBuffer.top) {
    console.warn(`line_pointermove: invalid dataIdx ${dataIdx}`);
    return;
  }

  if (model.is_drawing) {
    const viewportX = model.eventDataBuffer.x[dataIdx];
    const viewportY = model.eventDataBuffer.y[dataIdx];
    const centerClientX = model.clientWidth * 0.5;
    const centerClientY = model.clientHeight * 0.5;
    const textureX =
      ((viewportX - centerClientX) / model.zoom +
        (centerClientX - model.texture_offset_x)) *
      model.viewportToTextureX;
    const textureY =
      ((viewportY - centerClientY) / model.zoom +
        (centerClientY - model.texture_offset_y)) *
      model.viewportToTextureY;

    line_hover(model, textureX, textureY);
  }
}

function line_start(model: Model, x: number, y: number) {
  model.is_drawing = true;
  model.pts[0 * PT_STRIDE + 0] = x;
  model.pts[0 * PT_STRIDE + 1] = y;
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
  const startX = model.pts[0 * PT_STRIDE];
  const startY = model.pts[0 * PT_STRIDE + 1];

  // draw line to background
  model.renderPassBuffer.push(
    5, //RenderPassLookup["line-bg"] === 5
    model.renderPassDataBuffer.push(
      startX,
      startY,
      x,
      y,
      -1,
      -1,
      model.color[0],
      model.color[1],
      model.color[2]
    )
  );

  const radius_squared = 15 * 15;
  const dist_squared =
    (x - model.pts[0 + 0]) ** 2 + (y - model.pts[0 + 1]) ** 2;
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
      x,
      y,
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

  const viewportX = model.eventDataBuffer.x[dataIdx];
  const viewportY = model.eventDataBuffer.y[dataIdx];
  const centerClientX = model.clientWidth * 0.5;
  const centerClientY = model.clientHeight * 0.5;
  const textureX =
    ((viewportX - centerClientX) / model.zoom +
      (centerClientX - model.texture_offset_x)) *
    model.viewportToTextureX;
  const textureY =
    ((viewportY - centerClientY) / model.zoom +
      (centerClientY - model.texture_offset_y)) *
    model.viewportToTextureY;

  if (!model.is_drawing) {
    fan_start(model, textureX, textureY);
  } else {
    fan_stop(model, textureX, textureY);
  }
}

function fan_pointerup(_model: Model, _dataIdx: number) {}

function fan_pointermove(model: Model, dataIdx: number) {
  if (dataIdx === -1 || dataIdx >= model.eventDataBuffer.top) {
    console.warn(`fan_pointermove: invalid dataIdx ${dataIdx}`);
    return;
  }

  if (model.is_drawing) {
    const viewportX = model.eventDataBuffer.x[dataIdx];
    const viewportY = model.eventDataBuffer.y[dataIdx];
    const centerClientX = model.clientWidth * 0.5;
    const centerClientY = model.clientHeight * 0.5;
    const textureX =
      ((viewportX - centerClientX) / model.zoom +
        (centerClientX - model.texture_offset_x)) *
      model.viewportToTextureX;
    const textureY =
      ((viewportY - centerClientY) / model.zoom +
        (centerClientY - model.texture_offset_y)) *
      model.viewportToTextureY;

    fan_hover(model, textureX, textureY);
  }
}

function fan_start(model: Model, x: number, y: number) {
  model.is_drawing = true;
  model.pts[0 * PT_STRIDE + 0] = x;
  model.pts[0 * PT_STRIDE + 1] = y;

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
    // Convert viewport space to texture space and draw line to background
    model.renderPassBuffer.push(
      5, //RenderPassLookup["line-bg"] === 5
      model.renderPassDataBuffer.push(
        model.pts[0 * PT_STRIDE],
        model.pts[0 * PT_STRIDE + 1],
        x,
        y,
        -1,
        -1,
        model.color[0],
        model.color[1],
        model.color[2]
      )
    );

    // add midpoint
    model.pts[1 * PT_STRIDE + 0] = x;
    model.pts[1 * PT_STRIDE + 1] = y;
    model.num_pts = 2;
  } else if (model.num_pts == 2) {
    // Convert viewport space to texture space and draw triangle to background
    model.renderPassBuffer.push(
      7, //RenderPassLookup["fan-bg"] === 7
      model.renderPassDataBuffer.push(
        model.pts[0 * PT_STRIDE],
        model.pts[0 * PT_STRIDE + 1],
        model.pts[1 * PT_STRIDE],
        model.pts[1 * PT_STRIDE + 1],
        x,
        y,
        model.color[0],
        model.color[1],
        model.color[2]
      )
    );

    //update midpoint
    model.pts[1 * PT_STRIDE + 0] = x;
    model.pts[1 * PT_STRIDE + 1] = y;
  }

  const radius_squared = 15 * 15;
  const dist_squared =
    (x - model.pts[0 + 0]) ** 2 + (y - model.pts[0 + 1]) ** 2;
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
    // Convert viewport space to texture space and draw line to foreground
    model.renderPassBuffer.push(
      4, //RenderPassLookup["line-fg"] === 4
      model.renderPassDataBuffer.push(
        model.pts[0 * PT_STRIDE],
        model.pts[0 * PT_STRIDE + 1],
        x,
        y,
        -1,
        -1,
        model.color[0],
        model.color[1],
        model.color[2]
      )
    );
  } else if (model.num_pts == 2) {
    // Convert viewport space to texture space and draw triangle to foreground
    model.renderPassBuffer.push(
      6, //RenderPassLookup["fan-fg"] === 6
      model.renderPassDataBuffer.push(
        model.pts[0 * PT_STRIDE],
        model.pts[0 * PT_STRIDE + 1],
        model.pts[1 * PT_STRIDE],
        model.pts[1 * PT_STRIDE + 1],
        x,
        y,
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

/* Nav */
function nav_pointerdown(model: Model, dataIdx: number) {}
function nav_pointerup(model: Model, dataIdx: number) {}
function nav_pointermove(model: Model, dataIdx: number) {}
function nav_cancel(model: Model, dataIdx: number) {
  // model.is_drawing = false;
  // model.num_pts = 0;

  // model.canvas.removeEventListener("pointermove", model.onPointerMove);
  // model.canvas.removeEventListener("pointerup", model.onPointerUp);

  model.renderPassBuffer.push(
    0, // RenderPassLookup["clear-fg"] === 0
    -1 // no data
  );
}

//function nav_start(model: Model, event: PointerEvent) {}
//function nav_stop(model: Model, event: PointerEvent) {}
//function nav_hover(model: Model, event: PointerEvent) {}
//function nav_cancel(model: Model) {}

/* BRUSH */
//function brush_start(model: Model, event: PointerEvent) {}
//function brush_stop(model: Model, event: PointerEvent) {}
//function brush_hover(model: Model, event: PointerEvent) {}
//function brush_cancel(model: Model) {}
