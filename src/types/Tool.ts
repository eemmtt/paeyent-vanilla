import { RenderPassLookup } from "../graphics/wgpu_render";
import { homeView } from "../ui/updaters";
import { type Model } from "./Model";

const PT_STRIDE = 2;
//TODO: implement brush
export type ToolType = "line" | "fan" | "pan" | "zoom" /*| "brush"*/;

export const ToolStride = 4; //each tool implements: pointerdown, pointerup, pointermove, cancel. 4 total.
export const ToolLookup = {
  line: 0,
  fan: 1,
  pan: 2,
  zoom: 3,
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

  // brush_pointerdown,
  // brush_pointerup,
  // brush_pointermove,
  // brush_cancel,

  pan_pointerdown,
  pan_pointerup,
  pan_pointermove,
  pan_cancel,

  zoom_pointerdown,
  zoom_pointerup,
  zoom_pointermove,
  zoom_cancel,
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

  const radius_squared = model.marker_radius * model.marker_radius;
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

  const radius_squared = model.marker_radius * model.marker_radius;
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

/* Pan */
function pan_pointerdown(model: Model, dataIdx: number) {
  if (!model.is_navigating) {
    pan_start(model);
  } else {
    if (dataIdx === -1 || dataIdx >= model.eventDataBuffer.top) {
      console.warn(`pan_pointerdown: invalid dataIdx ${dataIdx}`);
      return;
    }

    const viewportX = model.eventDataBuffer.x[dataIdx];
    const viewportY = model.eventDataBuffer.y[dataIdx];
    pan_stop(model, viewportX, viewportY);
  }
}

function pan_pointerup(_model: Model, _dataIdx: number) {}
function pan_pointermove(model: Model, dataIdx: number) {
  if (model.is_navigating) {
    if (dataIdx === -1 || dataIdx >= model.eventDataBuffer.top) {
      console.warn(`pan_pointermove: invalid dataIdx ${dataIdx}`);
      return;
    }
    pan_hover(
      model,
      model.eventDataBuffer.x[dataIdx],
      model.eventDataBuffer.y[dataIdx]
    );
  }
}
function pan_cancel(model: Model, _dataIdx: number) {
  // revert to previous values
  model.is_navigating = false;
  model.zoom = model.zoom_last;
  model.texture_offset_x = model.texture_offset_last_x;
  model.texture_offset_y = model.texture_offset_last_y;
  model.curr_tool = model.last_tool;

  model.canvas.removeEventListener("pointermove", model.onPointerMove);
  model.canvas.removeEventListener("pointerup", model.onPointerUp);

  model.renderPassBuffer.push(
    RenderPassLookup["clear-anno"],
    -1 // no data
  );
}

function pan_start(model: Model) {
  // save current values
  model.zoom_last = model.zoom;
  model.texture_offset_last_x = model.texture_offset_x;
  model.texture_offset_last_y = model.texture_offset_y;

  // center view and zoom out
  model.is_navigating = true;
  const [newZoom, newOffsetX, newOffsetY] = homeView(0.5, model);
  model.zoom = newZoom;
  model.texture_offset_x = newOffsetX;
  model.texture_offset_y = newOffsetY;
  model.nav_pt[0] = newOffsetX + (model.bg_texture.width / 2) * newZoom;
  model.nav_pt[1] = newOffsetY + (model.bg_texture.height / 2) * newZoom;

  model.canvas.addEventListener("pointermove", model.onPointerMove);
  model.canvas.addEventListener(
    "pointerup",
    model.onPointerUp,
    model.handleOnce
  );

  const halfZoomedViewportWidth = (model.clientWidth * model.zoom) / 2;
  const halfZoomedViewportHeight = (model.clientHeight * model.zoom) / 2;

  model.renderPassBuffer.push(
    RenderPassLookup["rectangle-anno"],
    model.renderPassDataBuffer.push(
      model.clientWidth * 0.5 - halfZoomedViewportWidth, //left
      model.clientHeight * 0.5 - halfZoomedViewportHeight, //top
      model.clientWidth * 0.5 + halfZoomedViewportWidth, //right
      model.clientHeight * 0.5 + halfZoomedViewportHeight, //bottom
      -1,
      -1,
      0.6,
      0.1,
      0.2
    )
  );
}

function pan_stop(model: Model, viewportX: number, viewportY: number) {
  //check if pdown was in marker
  const radius_squared = model.marker_radius ** 2;
  const dist_squared =
    (viewportX - model.nav_pt[0]) ** 2 + (viewportY - model.nav_pt[1]) ** 2;
  if (dist_squared <= radius_squared) {
    // calculate new offset
    model.texture_offset_x =
      (model.clientWidth * 0.5 - model.texture_offset_x - model.nav_pt[0]) *
      (model.zoom_last / model.zoom);
    model.texture_offset_y =
      (model.clientHeight * 0.5 - model.texture_offset_y - model.nav_pt[1]) *
      (model.zoom_last / model.zoom);

    // revert zoom/tool selection
    model.is_navigating = false;
    model.zoom = model.zoom_last;
    model.curr_tool = model.last_tool;

    model.canvas.removeEventListener("pointermove", model.onPointerMove);
    model.canvas.removeEventListener("pointerup", model.onPointerUp);

    model.renderPassBuffer.push(RenderPassLookup["clear-anno"], -1);
  } else {
    // update nav point
    model.nav_pt[0] = viewportX;
    model.nav_pt[1] = viewportY;

    // draw rectangle the size of texture over viewport centered on viewport cursor pos
    const halfZoomedViewportWidth = (model.clientWidth * model.zoom) / 2;
    const halfZoomedViewportHeight = (model.clientHeight * model.zoom) / 2;

    model.renderPassBuffer.push(
      RenderPassLookup["rectangle-anno"],
      model.renderPassDataBuffer.push(
        model.nav_pt[0] - halfZoomedViewportWidth, //left
        model.nav_pt[1] - halfZoomedViewportHeight, //top
        model.nav_pt[0] + halfZoomedViewportWidth, //right
        model.nav_pt[1] + halfZoomedViewportHeight, //bottom
        -1,
        -1,
        0,
        0,
        0
      )
    );
  }
  return;
}
function pan_hover(model: Model, viewportX: number, viewportY: number) {
  //draw rectangle the size of texture over viewport centered on viewport cursor pos
  const halfZoomedViewportWidth = (model.clientWidth * model.zoom) / 2;
  const halfZoomedViewportHeight = (model.clientHeight * model.zoom) / 2;

  model.renderPassBuffer.push(
    RenderPassLookup["rectangle-anno"],
    model.renderPassDataBuffer.push(
      viewportX - halfZoomedViewportWidth, //left
      viewportY - halfZoomedViewportHeight, //top
      viewportX + halfZoomedViewportWidth, //right
      viewportY + halfZoomedViewportHeight, //bottom
      -1,
      -1,
      0.1,
      0.4,
      0.8
    )
  );
}

/* Zoom */
function zoom_pointerdown(model: Model, dataIdx: number) {}
function zoom_pointerup(model: Model, dataIdx: number) {}
function zoom_pointermove(model: Model, dataIdx: number) {}
function zoom_cancel(model: Model, dataIdx: number) {
  model.renderPassBuffer.push(
    0, // RenderPassLookup["clear-fg"] === 0
    -1 // no data
  );
}

//function zoom_start(model: Model, event: PointerEvent) {}
//function zoom_stop(model: Model, event: PointerEvent) {}
//function zoom_hover(model: Model, event: PointerEvent) {}
//function zoom_cancel(model: Model) {}

/* BRUSH */
//function brush_start(model: Model, event: PointerEvent) {}
//function brush_stop(model: Model, event: PointerEvent) {}
//function brush_hover(model: Model, event: PointerEvent) {}
//function brush_cancel(model: Model) {}
