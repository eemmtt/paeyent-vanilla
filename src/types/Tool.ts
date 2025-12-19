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

  const viewportDeviceX = model.eventDataBuffer.x[dataIdx] * model.dpr;
  const viewportDeviceY = model.eventDataBuffer.y[dataIdx] * model.dpr;
  const centerDeviceX = model.deviceWidth * 0.5;
  const centerDeviceY = model.deviceHeight * 0.5;
  const textureX =
    (viewportDeviceX - centerDeviceX) / model.zoom + model.texturePanX;
  const textureY =
    (viewportDeviceY - centerDeviceY) / model.zoom + model.texturePanY;

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
    const viewportDeviceX = model.eventDataBuffer.x[dataIdx] * model.dpr;
    const viewportDeviceY = model.eventDataBuffer.y[dataIdx] * model.dpr;
    const centerDeviceX = model.deviceWidth * 0.5;
    const centerDeviceY = model.deviceHeight * 0.5;
    const textureX =
      (viewportDeviceX - centerDeviceX) / model.zoom + model.texturePanX;
    const textureY =
      (viewportDeviceY - centerDeviceY) / model.zoom + model.texturePanY;

    line_hover(model, textureX, textureY);
  }
}

function line_start(model: Model, x: number, y: number) {
  model.is_drawing = true;
  model.pts[0 * PT_STRIDE + 0] = x;
  model.pts[0 * PT_STRIDE + 1] = y;
  model.num_pts = 1;

  model.canvas.addEventListener("pointermove", model.onPointerMove);
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
}

/* POLY FAN */

function fan_pointerdown(model: Model, dataIdx: number) {
  if (dataIdx === -1 || dataIdx >= model.eventDataBuffer.top) {
    console.warn(`fan_pointerdown: invalid dataIdx ${dataIdx}`);
    return;
  }

  const viewportDeviceX = model.eventDataBuffer.x[dataIdx] * model.dpr;
  const viewportDeviceY = model.eventDataBuffer.y[dataIdx] * model.dpr;
  const centerDeviceX = model.deviceWidth * 0.5;
  const centerDeviceY = model.deviceHeight * 0.5;
  const textureX =
    (viewportDeviceX - centerDeviceX) / model.zoom + model.texturePanX;
  const textureY =
    (viewportDeviceY - centerDeviceY) / model.zoom + model.texturePanY;

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
    const viewportDeviceX = model.eventDataBuffer.x[dataIdx] * model.dpr;
    const viewportDeviceY = model.eventDataBuffer.y[dataIdx] * model.dpr;
    const centerDeviceX = model.deviceWidth * 0.5;
    const centerDeviceY = model.deviceHeight * 0.5;
    const textureX =
      (viewportDeviceX - centerDeviceX) / model.zoom + model.texturePanX;
    const textureY =
      (viewportDeviceY - centerDeviceY) / model.zoom + model.texturePanY;

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

    const viewportDeviceX = model.eventDataBuffer.x[dataIdx] * model.dpr;
    const viewportDeviceY = model.eventDataBuffer.y[dataIdx] * model.dpr;
    pan_stop(model, viewportDeviceX, viewportDeviceY);
  }
}

function pan_pointerup(_model: Model, _dataIdx: number) {}
function pan_pointermove(model: Model, dataIdx: number) {
  if (model.is_navigating) {
    if (dataIdx === -1 || dataIdx >= model.eventDataBuffer.top) {
      console.warn(`pan_pointermove: invalid dataIdx ${dataIdx}`);
      return;
    }
    const viewportDeviceX = model.eventDataBuffer.x[dataIdx] * model.dpr;
    const viewportDeviceY = model.eventDataBuffer.y[dataIdx] * model.dpr;
    pan_hover(model, viewportDeviceX, viewportDeviceY);
  }
}
function pan_cancel(model: Model, _dataIdx: number) {
  // revert to previous values
  model.is_navigating = false;
  model.is_navPreviewSet = false;
  model.num_nav_pts = 0;
  model.zoom = model.zoom_last;
  model.texturePanX = model.texturePanX_last;
  model.texturePanY = model.texturePanY_last;
  model.curr_tool = model.last_tool;

  model.canvas.removeEventListener("pointermove", model.onPointerMove);

  model.renderPassBuffer.push(
    RenderPassLookup["clear-anno"],
    -1 // no data
  );
}

function pan_start(model: Model) {
  // save current values
  model.zoom_last = model.zoom;
  model.texturePanX_last = model.texturePanX;
  model.texturePanY_last = model.texturePanY;

  // center view and zoom out
  model.is_navigating = true;
  model.is_navPreviewSet = false;
  const [newZoom, panX, panY] = homeView(
    0.5,
    model.textureWidth,
    model.textureHeight,
    model.deviceWidth,
    model.deviceHeight
  );
  model.zoom = newZoom;
  model.texturePanX = panX;
  model.texturePanY = panY;

  const viewportCenterX = model.deviceWidth / 2;
  const viewportCenterY = model.deviceHeight / 2;

  // record previous viewport center in current viewport space
  // derived from: Pt = ((Pv - Cv) / zoom) + pan
  model.nav_pts[0] =
    viewportCenterX + model.zoom * (model.texturePanX_last - model.texturePanX);
  model.nav_pts[1] =
    viewportCenterY + model.zoom * (model.texturePanY_last - model.texturePanY);
  model.num_nav_pts = 1;

  // zoom is (texture units / viewport unit)
  // viewport0 * 0.5 * zoom0 = viewport1 * 0.5 * zoom1
  const halfZoomedViewportWidth =
    (model.deviceWidth * model.zoom) / (model.zoom_last * 2);
  const halfZoomedViewportHeight =
    (model.deviceHeight * model.zoom) / (model.zoom_last * 2);

  // init rect
  model.renderPassBuffer.push(
    RenderPassLookup["rectangle-replace-anno"],
    model.renderPassDataBuffer.push(
      model.nav_pts[0] - halfZoomedViewportWidth, //left
      model.nav_pts[1] - halfZoomedViewportHeight, //top
      model.nav_pts[0] + halfZoomedViewportWidth, //right
      model.nav_pts[1] + halfZoomedViewportHeight, //bottom
      -1,
      -1,
      1,
      0,
      0
    )
  );

  // marker
  model.renderPassBuffer.push(
    RenderPassLookup["circle-append-anno"],
    model.renderPassDataBuffer.push(
      model.nav_pts[0], //x0
      model.nav_pts[1], //y0
      model.marker_radius, //radius hack
      -1,
      -1,
      -1,
      1,
      0,
      0
    )
  );

  // reg events
  model.canvas.addEventListener("pointermove", model.onPointerMove);
}

function pan_stop(model: Model, viewportX: number, viewportY: number) {
  //check if pdown was in marker
  const radius_squared = model.marker_radius ** 2;
  const currPtX = model.nav_pts[2 * (model.num_nav_pts - 1) + 0];
  const currPtY = model.nav_pts[2 * (model.num_nav_pts - 1) + 1];
  const dist_squared = (viewportX - currPtX) ** 2 + (viewportY - currPtY) ** 2;
  if (dist_squared <= radius_squared) {
    const viewportCenterX = model.deviceWidth / 2;
    const viewportCenterY = model.deviceHeight / 2;

    const newPanX =
      (currPtX - viewportCenterX) / model.zoom + model.texturePanX;
    const newPanY =
      (currPtY - viewportCenterY) / model.zoom + model.texturePanY;

    model.texturePanX = newPanX;
    model.texturePanY = newPanY;

    // revert zoom/tool selection
    model.is_navigating = false;
    model.is_navPreviewSet = false;
    model.zoom = model.zoom_last;
    model.curr_tool = model.last_tool;
    model.num_nav_pts = 0;

    model.renderPassBuffer.push(RenderPassLookup["clear-anno"], -1);
    model.canvas.removeEventListener("pointermove", model.onPointerMove);
  } else {
    // update nav point, set preview
    model.nav_pts[2] = viewportX;
    model.nav_pts[3] = viewportY;
    model.num_nav_pts = 2;
    model.is_navPreviewSet = true;

    // zoom is (texture units / viewport unit)
    // viewport0 * 0.5 * zoom0 = viewport1 * 0.5 * zoom1
    const halfZoomedViewportWidth =
      (model.deviceWidth * model.zoom) / (model.zoom_last * 2);
    const halfZoomedViewportHeight =
      (model.deviceHeight * model.zoom) / (model.zoom_last * 2);

    // init rect
    model.renderPassBuffer.push(
      RenderPassLookup["rectangle-replace-anno"],
      model.renderPassDataBuffer.push(
        model.nav_pts[0] - halfZoomedViewportWidth, //left
        model.nav_pts[1] - halfZoomedViewportHeight, //top
        model.nav_pts[0] + halfZoomedViewportWidth, //right
        model.nav_pts[1] + halfZoomedViewportHeight, //bottom
        -1,
        -1,
        1,
        0,
        0
      )
    );

    // preview rect
    model.renderPassBuffer.push(
      RenderPassLookup["rectangle-append-anno"],
      model.renderPassDataBuffer.push(
        model.nav_pts[2] - halfZoomedViewportWidth, //left
        model.nav_pts[3] - halfZoomedViewportHeight, //top
        model.nav_pts[2] + halfZoomedViewportWidth, //right
        model.nav_pts[3] + halfZoomedViewportHeight, //bottom
        -1,
        -1,
        0,
        0,
        0
      )
    );

    // preview marker
    model.renderPassBuffer.push(
      RenderPassLookup["circle-append-anno"],
      model.renderPassDataBuffer.push(
        model.nav_pts[2],
        model.nav_pts[3],
        model.marker_radius,
        -1,
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

  // zoom is (texture units / viewport unit)
  // viewport0 * 0.5 * zoom0 = viewport1 * 0.5 * zoom1
  const halfZoomedViewportWidth =
    (model.deviceWidth * model.zoom) / (model.zoom_last * 2);
  const halfZoomedViewportHeight =
    (model.deviceHeight * model.zoom) / (model.zoom_last * 2);

  // init rect
  model.renderPassBuffer.push(
    RenderPassLookup["rectangle-replace-anno"],
    model.renderPassDataBuffer.push(
      model.nav_pts[0] - halfZoomedViewportWidth, //left
      model.nav_pts[1] - halfZoomedViewportHeight, //top
      model.nav_pts[0] + halfZoomedViewportWidth, //right
      model.nav_pts[1] + halfZoomedViewportHeight, //bottom
      -1,
      -1,
      1,
      0,
      0
    )
  );

  if (model.is_navPreviewSet) {
    //draw preview rect
    model.renderPassBuffer.push(
      RenderPassLookup["rectangle-append-anno"],
      model.renderPassDataBuffer.push(
        model.nav_pts[2] - halfZoomedViewportWidth, //left
        model.nav_pts[3] - halfZoomedViewportHeight, //top
        model.nav_pts[2] + halfZoomedViewportWidth, //right
        model.nav_pts[3] + halfZoomedViewportHeight, //bottom
        -1,
        -1,
        0,
        0,
        0
      )
    );

    // draw preview circle marker
    model.renderPassBuffer.push(
      RenderPassLookup["circle-append-anno"],
      model.renderPassDataBuffer.push(
        model.nav_pts[2],
        model.nav_pts[3],
        model.marker_radius,
        -1,
        -1,
        -1,
        0,
        0,
        0
      )
    );

    // draw new preview rect centered on pointer
    model.renderPassBuffer.push(
      RenderPassLookup["rectangle-append-anno"],
      model.renderPassDataBuffer.push(
        viewportX - halfZoomedViewportWidth, //left
        viewportY - halfZoomedViewportHeight, //top
        viewportX + halfZoomedViewportWidth, //right
        viewportY + halfZoomedViewportHeight, //bottom
        -1,
        -1,
        0,
        0,
        1
      )
    );
  } else {
    // draw preview circle marker
    model.renderPassBuffer.push(
      RenderPassLookup["circle-append-anno"],
      model.renderPassDataBuffer.push(
        model.nav_pts[0],
        model.nav_pts[1],
        model.marker_radius,
        -1,
        -1,
        -1,
        1,
        0,
        0
      )
    );

    // draw preview rect centered on pointer
    model.renderPassBuffer.push(
      RenderPassLookup["rectangle-append-anno"],
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
}

/* Zoom */
function zoom_pointerdown(model: Model, dataIdx: number) {
  if (!model.is_navigating) {
    zoom_start(model);
  } else {
    if (dataIdx === -1 || dataIdx >= model.eventDataBuffer.top) {
      console.warn(`zoom_pointerdown: invalid dataIdx ${dataIdx}`);
      return;
    }

    const viewportDeviceX = model.eventDataBuffer.x[dataIdx] * model.dpr;
    const viewportDeviceY = model.eventDataBuffer.y[dataIdx] * model.dpr;

    zoom_stop(model, viewportDeviceX, viewportDeviceY);
  }
}
function zoom_pointerup(_model: Model, _dataIdx: number) {}
function zoom_pointermove(model: Model, dataIdx: number) {
  if (dataIdx === -1 || dataIdx >= model.eventDataBuffer.top) {
    console.warn(`zoom_pointermove: invalid dataIdx ${dataIdx}`);
    return;
  }
  if (model.is_navigating) {
    const viewportDeviceX = model.eventDataBuffer.x[dataIdx] * model.dpr;
    const viewportDeviceY = model.eventDataBuffer.y[dataIdx] * model.dpr;

    zoom_hover(model, viewportDeviceX, viewportDeviceY);
  }
}
function zoom_cancel(model: Model, _dataIdx: number) {
  // revert to previous values
  model.is_navigating = false;
  model.is_navPreviewSet = false;
  model.num_nav_pts = 0;

  //TODO: gaurd against random cancels taking place before zoom_start?
  // i don't think this is currently an issue since zoom_start is called on switch
  // but could be an issue in the future...
  model.zoom = model.zoom_last;
  model.texturePanX = model.texturePanX_last;
  model.texturePanY = model.texturePanY_last;
  model.curr_tool = model.last_tool;

  model.renderPassBuffer.push(
    RenderPassLookup["clear-anno"],
    -1 // no data
  );

  model.canvas.removeEventListener("pointermove", model.onPointerMove);
}

function zoom_start(model: Model) {
  // save current values
  model.zoom_last = model.zoom;
  model.texturePanX_last = model.texturePanX;
  model.texturePanY_last = model.texturePanY;

  // center view and zoom out
  model.is_navigating = true;
  model.is_navPreviewSet = false;
  const [newZoom, newOffsetX, newOffsetY] = homeView(
    0.5,
    model.textureWidth,
    model.textureHeight,
    model.deviceWidth,
    model.deviceHeight
  );
  model.zoom = newZoom;
  model.texturePanX = newOffsetX;
  model.texturePanY = newOffsetY;

  const viewportCenterX = model.deviceWidth / 2;
  const viewportCenterY = model.deviceHeight / 2;

  // record previous viewport center in current viewport space
  // derived from: Pt = ((Pv - Cv) / zoom) + pan
  model.nav_pts[0] =
    viewportCenterX + model.zoom * (model.texturePanX_last - model.texturePanX);
  model.nav_pts[1] =
    viewportCenterY + model.zoom * (model.texturePanY_last - model.texturePanY);
  model.num_nav_pts = 1;

  // zoom is (texture units / viewport unit)
  // viewport0 * 0.5 * zoom0 = viewport1 * 0.5 * zoom1
  const halfZoomedViewportWidth =
    (model.deviceWidth * model.zoom) / (model.zoom_last * 2);
  const halfZoomedViewportHeight =
    (model.deviceHeight * model.zoom) / (model.zoom_last * 2);
  const radius = Math.min(halfZoomedViewportWidth, halfZoomedViewportHeight);

  // preview rectangle
  model.renderPassBuffer.push(
    RenderPassLookup["rectangle-replace-anno"],
    model.renderPassDataBuffer.push(
      model.nav_pts[0] - halfZoomedViewportWidth, //left
      model.nav_pts[1] - halfZoomedViewportHeight, //top
      model.nav_pts[0] + halfZoomedViewportWidth, //right
      model.nav_pts[1] + halfZoomedViewportHeight, //bottom
      -1,
      -1,
      0.5,
      0.5,
      0.8
    )
  );

  // preview circle
  model.renderPassBuffer.push(
    RenderPassLookup["circle-append-anno"],
    model.renderPassDataBuffer.push(
      model.nav_pts[0],
      model.nav_pts[1],
      radius,
      -1,
      -1,
      -1,
      0.5,
      0.5,
      0.8
    )
  );

  // marker circle
  model.renderPassBuffer.push(
    RenderPassLookup["circle-append-anno"],
    model.renderPassDataBuffer.push(
      model.nav_pts[0],
      model.nav_pts[1],
      model.marker_radius,
      -1,
      -1,
      -1,
      0,
      0,
      0
    )
  );

  model.canvas.addEventListener("pointermove", model.onPointerMove);
}

//TODO: handle immediate stop by clicking in marker
function zoom_stop(model: Model, viewportX: number, viewportY: number) {
  // calculate starting radius
  const halfZoomedViewportWidth =
    (model.deviceWidth * model.zoom) / (model.zoom_last * 2);
  const halfZoomedViewportHeight =
    (model.deviceHeight * model.zoom) / (model.zoom_last * 2);
  const startRadius = Math.min(
    halfZoomedViewportWidth,
    halfZoomedViewportHeight
  );

  //check if pdown was in marker
  const radius_squared = model.marker_radius ** 2;
  const dist_squared =
    (viewportX - model.nav_pts[0]) ** 2 + (viewportY - model.nav_pts[1]) ** 2;

  if (dist_squared <= radius_squared) {
    // calculate new zoom from difference in radii
    const currPtX = model.nav_pts[2 * (model.num_nav_pts - 1) + 0];
    const currPtY = model.nav_pts[2 * (model.num_nav_pts - 1) + 1];
    const endRadius = Math.sqrt(
      (currPtX - model.nav_pts[0]) ** 2 + (currPtY - model.nav_pts[1]) ** 2
    );
    const newZoom = model.zoom_last * (startRadius / endRadius);

    // revert tool selection and offset
    model.is_navigating = false;
    model.is_navPreviewSet = false;
    model.num_nav_pts = 0;
    model.curr_tool = model.last_tool;
    model.zoom = newZoom;
    model.texturePanX = model.texturePanX_last;
    model.texturePanY = model.texturePanY_last;

    model.canvas.removeEventListener("pointermove", model.onPointerMove);

    model.renderPassBuffer.push(RenderPassLookup["clear-anno"], -1);
  } else {
    // update nav point, set preview
    model.nav_pts[2] = viewportX;
    model.nav_pts[3] = viewportY;
    model.num_nav_pts = 2;
    model.is_navPreviewSet = true;

    // draw rectangle proportional to the size of viewport centered on last viewport center
    const newRadius = Math.sqrt(
      (model.nav_pts[2] - model.nav_pts[0]) ** 2 +
        (model.nav_pts[3] - model.nav_pts[1]) ** 2
    );

    const scaledHalfViewportX =
      halfZoomedViewportWidth * (newRadius / startRadius);
    const scaledHalfViewportY =
      halfZoomedViewportHeight * (newRadius / startRadius);

    // preview rectangle
    model.renderPassBuffer.push(
      RenderPassLookup["rectangle-replace-anno"],
      model.renderPassDataBuffer.push(
        model.nav_pts[0] - scaledHalfViewportX, //left
        model.nav_pts[1] - scaledHalfViewportY, //top
        model.nav_pts[0] + scaledHalfViewportX, //right
        model.nav_pts[1] + scaledHalfViewportY, //bottom
        -1,
        -1,
        0,
        0,
        0
      )
    );

    // preview circle
    model.renderPassBuffer.push(
      RenderPassLookup["circle-append-anno"],
      model.renderPassDataBuffer.push(
        model.nav_pts[0],
        model.nav_pts[1],
        newRadius,
        -1,
        -1,
        -1,
        0,
        0,
        0
      )
    );

    // marker circle
    model.renderPassBuffer.push(
      RenderPassLookup["circle-append-anno"],
      model.renderPassDataBuffer.push(
        model.nav_pts[0],
        model.nav_pts[1],
        model.marker_radius,
        -1,
        -1,
        -1,
        0,
        0,
        0
      )
    );
  }
}

function zoom_hover(model: Model, viewportX: number, viewportY: number) {
  const halfZoomedViewportWidth =
    (model.deviceWidth * model.zoom) / (model.zoom_last * 2);
  const halfZoomedViewportHeight =
    (model.deviceHeight * model.zoom) / (model.zoom_last * 2);

  const startRadius = Math.min(
    halfZoomedViewportWidth,
    halfZoomedViewportHeight
  );

  if (model.is_navPreviewSet && model.num_nav_pts === 2) {
    const newRadius = Math.sqrt(
      (model.nav_pts[2] - model.nav_pts[0]) ** 2 +
        (model.nav_pts[3] - model.nav_pts[1]) ** 2
    );
    const scaledHalfViewportX =
      halfZoomedViewportWidth * (newRadius / startRadius);
    const scaledHalfViewportY =
      halfZoomedViewportHeight * (newRadius / startRadius);

    model.renderPassBuffer.push(
      RenderPassLookup["rectangle-replace-anno"],
      model.renderPassDataBuffer.push(
        model.nav_pts[0] - scaledHalfViewportX, //left
        model.nav_pts[1] - scaledHalfViewportY, //top
        model.nav_pts[0] + scaledHalfViewportX, //right
        model.nav_pts[1] + scaledHalfViewportY, //bottom
        -1,
        -1,
        0,
        0,
        0
      )
    );

    model.renderPassBuffer.push(
      RenderPassLookup["circle-append-anno"],
      model.renderPassDataBuffer.push(
        model.nav_pts[0],
        model.nav_pts[1],
        newRadius,
        -1,
        -1,
        -1,
        0,
        0,
        0
      )
    );

    model.renderPassBuffer.push(
      RenderPassLookup["circle-append-anno"],
      model.renderPassDataBuffer.push(
        model.nav_pts[0],
        model.nav_pts[1],
        model.marker_radius,
        -1,
        -1,
        -1,
        0,
        0,
        0
      )
    );
  } else {
    const currRadius = Math.sqrt(
      (viewportX - model.nav_pts[0]) ** 2 + (viewportY - model.nav_pts[1]) ** 2
    );

    const scaledHalfViewportX =
      halfZoomedViewportWidth * (currRadius / startRadius);
    const scaledHalfViewportY =
      halfZoomedViewportHeight * (currRadius / startRadius);

    model.renderPassBuffer.push(
      RenderPassLookup["rectangle-replace-anno"],
      model.renderPassDataBuffer.push(
        model.nav_pts[0] - scaledHalfViewportX, //left
        model.nav_pts[1] - scaledHalfViewportY, //top
        model.nav_pts[0] + scaledHalfViewportX, //right
        model.nav_pts[1] + scaledHalfViewportY, //bottom
        -1,
        -1,
        0.5,
        0.5,
        0.8
      )
    );

    model.renderPassBuffer.push(
      RenderPassLookup["circle-append-anno"],
      model.renderPassDataBuffer.push(
        model.nav_pts[0],
        model.nav_pts[1],
        currRadius,
        -1,
        -1,
        -1,
        0.5,
        0.5,
        0.8
      )
    );

    model.renderPassBuffer.push(
      RenderPassLookup["circle-append-anno"],
      model.renderPassDataBuffer.push(
        model.nav_pts[0],
        model.nav_pts[1],
        model.marker_radius,
        -1,
        -1,
        -1,
        0,
        0,
        0
      )
    );
  }
}

/* BRUSH */
//function brush_start(model: Model, event: PointerEvent) {}
//function brush_stop(model: Model, event: PointerEvent) {}
//function brush_hover(model: Model, event: PointerEvent) {}
//function brush_cancel(model: Model) {}
