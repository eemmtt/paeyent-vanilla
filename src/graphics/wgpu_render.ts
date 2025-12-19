import { type Model } from "../types/Model";

//TODO: refactor as normal drawing api e.g.,
//      clear(target_layer: LayerType, clear_color: Color)
//      line(target_layer: LayerType, a_x: number, a_y: number, b_x: number, b_y: number, color?, line_thickness?)
//      triangle(target_layer: LayerType, a_x: number, a_y: number, b_x: number, b_y: number, c_x: number, c_y: number, color?)
export const RenderPassToolIdxOffset = 4; //clear f()'s 0-3, tools 4 ->

export const RenderPassLookup = {
  "clear-fg": 0,
  "clear-bg": 1,
  "clear-anno": 2,
  "clear-all": 3,
  "line-fg": 4,
  "line-bg": 5,
  "fan-fg": 6,
  "fan-bg": 7,
  "brush-fg": 8,
  "brush-bg": 9,
  "rectangle-append-anno": 10,
  "rectangle-replace-anno": 11,
  "circle-append-anno": 12,
  "circle-replace-anno": 13,
} as const;

export const RenderPassHandlers = [
  onClearFg,
  onClearBg,
  onClearAnno,
  onClearAll,
  onLineFg,
  onLineBg,
  onFanFg,
  onFanBg,
  onBrushFg,
  onBrushBg,
  onRectangleAppendAnno,
  onRectangleReplaceAnno,
  onCircleAppendAnno,
  onCircleReplaceAnno,
] as const;

//TODO: batch repeated calls when recreating background from operation history
//      e.g., write a shader that instances n triangles for fan, n rectangles for line etc.
export function wgpu_render(model: Model) {
  let view = model.surface.getCurrentTexture().createView();
  const encoder = model.device.createCommandEncoder({
    label: "Render Encoder",
  });

  // call each RenderPassHandler
  for (let i = 0; i < model.renderPassBuffer.top; i++) {
    RenderPassHandlers[model.renderPassBuffer.type[i]](
      model,
      encoder,
      model.renderPassBuffer.dataIdx[i]
    );
  }

  // always finish with composite pass
  {
    model.composite_uniform.set_zoom(model.zoom);
    model.composite_uniform.set_texture_pan(
      model.texturePanX,
      model.texturePanY
    );
    model.device.queue.writeBuffer(
      model.composite_uniform_buffer,
      0,
      model.composite_uniform.data.buffer
    );

    const pass = encoder.beginRenderPass({
      label: "Composite Render Pass",
      colorAttachments: [
        {
          view,
          //clearValue: [0, 0, 0, 0],
          loadOp: "clear" as GPULoadOp,
          storeOp: "store" as GPUStoreOp,
        },
      ],
    });
    pass.setPipeline(model.composite_pipeline);
    pass.setBindGroup(0, model.composite_bindgroup);
    pass.setBindGroup(1, model.composite_uniform_bindgroup);
    pass.draw(4, 1);
    pass.end();
  }

  const commandBuffer = encoder.finish();
  model.device.queue.submit([commandBuffer]);
}

function onClearFg(model: Model, encoder: GPUCommandEncoder, dataIdx: number) {
  if (dataIdx !== -1) {
    console.warn(
      `onClearFg: received dataIdx === ${dataIdx}, but -1 was expected`
    );
    return;
  }

  encoder
    .beginRenderPass({
      label: "Clear Foreground",
      colorAttachments: [
        {
          view: model.fg_texture_view,
          //clearValue: [0, 0, 0, 0], //defaults to 0,0,0,0?
          loadOp: "clear" as GPULoadOp,
          storeOp: "store" as GPUStoreOp,
        },
      ],
    })
    .end();
}

function onClearBg(model: Model, encoder: GPUCommandEncoder, dataIdx: number) {
  if (dataIdx !== -1) {
    console.warn(
      `onClearBg: received dataIdx === ${dataIdx}, but -1 was expected`
    );
    return;
  }

  encoder
    .beginRenderPass({
      label: "Clear Background",
      colorAttachments: [
        {
          view: model.bg_texture_view,
          clearValue: model.clear_color,
          loadOp: "clear" as GPULoadOp,
          storeOp: "store" as GPUStoreOp,
        },
      ],
    })
    .end();
}

function onClearAnno(
  model: Model,
  encoder: GPUCommandEncoder,
  dataIdx: number
) {
  if (dataIdx !== -1) {
    console.warn(
      `onClearAnno: received dataIdx === ${dataIdx}, but -1 was expected`
    );
    return;
  }

  encoder
    .beginRenderPass({
      label: "Clear Annotation",
      colorAttachments: [
        {
          view: model.an_texture_view,
          //clearValue: [0, 0, 0, 0], //defaults to 0,0,0,0?
          loadOp: "clear" as GPULoadOp,
          storeOp: "store" as GPUStoreOp,
        },
      ],
    })
    .end();
}

function onClearAll(model: Model, encoder: GPUCommandEncoder, dataIdx: number) {
  if (dataIdx !== -1) {
    console.warn(
      `onClearAll: received dataIdx === ${dataIdx}, but -1 was expected`
    );
    return;
  }

  encoder
    .beginRenderPass({
      label: "Clear Annotation",
      colorAttachments: [
        {
          view: model.an_texture_view,
          //clearValue: [0, 0, 0, 0], //defaults to 0,0,0,0?
          loadOp: "clear" as GPULoadOp,
          storeOp: "store" as GPUStoreOp,
        },
      ],
    })
    .end();

  encoder
    .beginRenderPass({
      label: "Clear Foreground",
      colorAttachments: [
        {
          view: model.fg_texture_view,
          //clearValue: [0, 0, 0, 0], //defaults to 0,0,0,0?
          loadOp: "clear" as GPULoadOp,
          storeOp: "store" as GPUStoreOp,
        },
      ],
    })
    .end();

  encoder
    .beginRenderPass({
      label: "Clear Background",
      colorAttachments: [
        {
          view: model.bg_texture_view,
          clearValue: model.clear_color, //defaults to 0,0,0,0?
          loadOp: "clear" as GPULoadOp,
          storeOp: "store" as GPUStoreOp,
        },
      ],
    })
    .end();
}

function onLineFg(model: Model, encoder: GPUCommandEncoder, dataIdx: number) {
  if (dataIdx === -1 || dataIdx >= model.renderPassDataBuffer.top) {
    console.warn(`onLineFg: invalid dataIdx ${dataIdx}`);
    return;
  }

  const x0 = model.renderPassDataBuffer.x0[dataIdx];
  const y0 = model.renderPassDataBuffer.y0[dataIdx];
  const x1 = model.renderPassDataBuffer.x1[dataIdx];
  const y1 = model.renderPassDataBuffer.y1[dataIdx];
  const r = model.renderPassDataBuffer.red[dataIdx];
  const g = model.renderPassDataBuffer.green[dataIdx];
  const b = model.renderPassDataBuffer.blue[dataIdx];

  model.poly_uniform.set_pos(0, x0, y0);
  model.poly_uniform.set_pos(1, x1, y1);
  model.poly_uniform.set_rgba(r, g, b, 1);
  model.poly_uniform.set_texture_width(model.textureWidth);
  model.poly_uniform.set_texture_height(model.textureHeight);
  model.device.queue.writeBuffer(
    model.poly_buffer,
    dataIdx * model.poly_uniform.aligned_size,
    model.poly_uniform.data.buffer
  );

  const renderpass = encoder.beginRenderPass({
    label: "Foreground Clear and Draw",
    colorAttachments: [
      {
        view: model.fg_texture_view,
        //clearValue: [0, 0, 0, 0],
        loadOp: "clear" as GPULoadOp,
        storeOp: "store" as GPUStoreOp,
      },
    ],
  });

  renderpass.setPipeline(model.line_pipeline);
  renderpass.setBindGroup(0, model.poly_bindgroup, [
    dataIdx * model.poly_uniform.aligned_size,
  ]);
  renderpass.draw(6, 1);
  renderpass.end();
}

function onLineBg(model: Model, encoder: GPUCommandEncoder, dataIdx: number) {
  if (dataIdx === -1 || dataIdx >= model.renderPassDataBuffer.top) {
    console.warn(`onLineBg: invalid dataIdx ${dataIdx}`);
    return;
  }

  const x0 = model.renderPassDataBuffer.x0[dataIdx];
  const y0 = model.renderPassDataBuffer.y0[dataIdx];
  const x1 = model.renderPassDataBuffer.x1[dataIdx];
  const y1 = model.renderPassDataBuffer.y1[dataIdx];
  const r = model.renderPassDataBuffer.red[dataIdx];
  const g = model.renderPassDataBuffer.green[dataIdx];
  const b = model.renderPassDataBuffer.blue[dataIdx];

  model.poly_uniform.set_pos(0, x0, y0);
  model.poly_uniform.set_pos(1, x1, y1);
  model.poly_uniform.set_rgba(r, g, b, 1);
  model.poly_uniform.set_texture_width(model.textureWidth);
  model.poly_uniform.set_texture_height(model.textureHeight);
  model.device.queue.writeBuffer(
    model.poly_buffer,
    dataIdx * model.poly_uniform.aligned_size,
    model.poly_uniform.data.buffer
  );

  encoder
    .beginRenderPass({
      label: "Clear Foreground",
      colorAttachments: [
        {
          view: model.fg_texture_view,
          //clearValue: [0, 0, 0, 0],
          loadOp: "clear" as GPULoadOp,
          storeOp: "store" as GPUStoreOp,
        },
      ],
    })
    .end();

  const renderpass = encoder.beginRenderPass({
    label: "Draw Background",
    colorAttachments: [
      {
        view: model.bg_texture_view,
        loadOp: "load" as GPULoadOp,
        storeOp: "store" as GPUStoreOp,
      },
    ],
  });

  renderpass.setPipeline(model.line_pipeline);
  renderpass.setBindGroup(0, model.poly_bindgroup, [
    dataIdx * model.poly_uniform.aligned_size,
  ]);
  renderpass.draw(6, 1);
  renderpass.end();
}

function onFanFg(model: Model, encoder: GPUCommandEncoder, dataIdx: number) {
  if (dataIdx === -1 || dataIdx >= model.renderPassDataBuffer.top) {
    console.warn(`onFanFg: invalid dataIdx ${dataIdx}`);
    return;
  }

  model.poly_uniform.set_pos(
    0,
    model.renderPassDataBuffer.x0[dataIdx],
    model.renderPassDataBuffer.y0[dataIdx]
  );
  model.poly_uniform.set_pos(
    1,
    model.renderPassDataBuffer.x1[dataIdx],
    model.renderPassDataBuffer.y1[dataIdx]
  );
  model.poly_uniform.set_pos(
    2,
    model.renderPassDataBuffer.x2[dataIdx],
    model.renderPassDataBuffer.y2[dataIdx]
  );
  model.poly_uniform.set_rgba(
    model.renderPassDataBuffer.red[dataIdx],
    model.renderPassDataBuffer.green[dataIdx],
    model.renderPassDataBuffer.blue[dataIdx],
    1
  );
  model.poly_uniform.set_texture_width(model.textureWidth);
  model.poly_uniform.set_texture_height(model.textureHeight);
  model.device.queue.writeBuffer(
    model.poly_buffer,
    dataIdx * model.poly_uniform.aligned_size,
    model.poly_uniform.data.buffer
  );

  const renderpass = encoder.beginRenderPass({
    label: "Foreground Clear and Draw",
    colorAttachments: [
      {
        view: model.fg_texture_view,
        //clearValue: [0, 0, 0, 0],
        loadOp: "clear" as GPULoadOp,
        storeOp: "store" as GPUStoreOp,
      },
    ],
  });

  renderpass.setPipeline(model.fan_pipeline);
  renderpass.setBindGroup(0, model.poly_bindgroup, [
    dataIdx * model.poly_uniform.aligned_size,
  ]);
  renderpass.draw(3, 1);
  renderpass.end();
}

function onFanBg(model: Model, encoder: GPUCommandEncoder, dataIdx: number) {
  if (dataIdx === -1 || dataIdx >= model.renderPassDataBuffer.top) {
    console.warn(`onFanBg: invalid dataIdx ${dataIdx}`);
    return;
  }

  model.poly_uniform.set_pos(
    0,
    model.renderPassDataBuffer.x0[dataIdx],
    model.renderPassDataBuffer.y0[dataIdx]
  );
  model.poly_uniform.set_pos(
    1,
    model.renderPassDataBuffer.x1[dataIdx],
    model.renderPassDataBuffer.y1[dataIdx]
  );
  model.poly_uniform.set_pos(
    2,
    model.renderPassDataBuffer.x2[dataIdx],
    model.renderPassDataBuffer.y2[dataIdx]
  );
  model.poly_uniform.set_rgba(
    model.renderPassDataBuffer.red[dataIdx],
    model.renderPassDataBuffer.green[dataIdx],
    model.renderPassDataBuffer.blue[dataIdx],
    1
  );
  model.poly_uniform.set_texture_width(model.textureWidth);
  model.poly_uniform.set_texture_height(model.textureHeight);
  model.device.queue.writeBuffer(
    model.poly_buffer,
    dataIdx * model.poly_uniform.aligned_size,
    model.poly_uniform.data.buffer
  );

  encoder
    .beginRenderPass({
      label: "Foreground Clear",
      colorAttachments: [
        {
          view: model.fg_texture_view,
          //clearValue: [0, 0, 0, 0],
          loadOp: "clear" as GPULoadOp,
          storeOp: "store" as GPUStoreOp,
        },
      ],
    })
    .end();

  const renderpass = encoder.beginRenderPass({
    label: "BG Render Pass",
    colorAttachments: [
      {
        view: model.bg_texture_view,
        loadOp: "load" as GPULoadOp,
        storeOp: "store" as GPUStoreOp,
      },
    ],
  });

  renderpass.setPipeline(model.fan_pipeline);
  renderpass.setBindGroup(0, model.poly_bindgroup, [
    dataIdx * model.poly_uniform.aligned_size,
  ]);
  renderpass.draw(3, 1);
  renderpass.end();
}

function onBrushFg(model: Model, encoder: GPUCommandEncoder, dataIdx: number) {
  console.warn("onBrushFg not implemented");
  return;
}
function onBrushBg(model: Model, encoder: GPUCommandEncoder, dataIdx: number) {
  console.warn("onBrushBg not implemented");
  return;
}

function onRectangleReplaceAnno(
  model: Model,
  encoder: GPUCommandEncoder,
  dataIdx: number
) {
  const x0 = model.renderPassDataBuffer.x0[dataIdx];
  const y0 = model.renderPassDataBuffer.y0[dataIdx];
  const x1 = model.renderPassDataBuffer.x1[dataIdx];
  const y1 = model.renderPassDataBuffer.y1[dataIdx];
  const r = model.renderPassDataBuffer.red[dataIdx];
  const g = model.renderPassDataBuffer.green[dataIdx];
  const b = model.renderPassDataBuffer.blue[dataIdx];

  model.poly_uniform.set_pos(0, x0, y0);
  model.poly_uniform.set_pos(1, x1, y1);
  model.poly_uniform.set_rgba(r, g, b, 1);
  model.poly_uniform.set_line_width(1);
  model.poly_uniform.set_texture_width(model.deviceWidth); //anno layer uses viewport scaled texture
  model.poly_uniform.set_texture_height(model.deviceHeight);

  model.device.queue.writeBuffer(
    model.poly_buffer,
    dataIdx * model.poly_uniform.aligned_size,
    model.poly_uniform.data.buffer
  );

  const renderpass = encoder.beginRenderPass({
    label: "Rectangle Replace Anno",
    colorAttachments: [
      {
        view: model.an_texture_view,
        clearValue: [0, 0, 0, 0],
        loadOp: "clear" as GPULoadOp,
        storeOp: "store" as GPUStoreOp,
      },
    ],
  });

  renderpass.setPipeline(model.rectangle_pipeline);
  renderpass.setBindGroup(0, model.poly_bindgroup, [
    dataIdx * model.poly_uniform.aligned_size,
  ]);
  renderpass.draw(6, 1);
  renderpass.end();
}

function onRectangleAppendAnno(
  model: Model,
  encoder: GPUCommandEncoder,
  dataIdx: number
) {
  const x0 = model.renderPassDataBuffer.x0[dataIdx];
  const y0 = model.renderPassDataBuffer.y0[dataIdx];
  const x1 = model.renderPassDataBuffer.x1[dataIdx];
  const y1 = model.renderPassDataBuffer.y1[dataIdx];
  const r = model.renderPassDataBuffer.red[dataIdx];
  const g = model.renderPassDataBuffer.green[dataIdx];
  const b = model.renderPassDataBuffer.blue[dataIdx];

  model.poly_uniform.set_pos(0, x0, y0);
  model.poly_uniform.set_pos(1, x1, y1);
  model.poly_uniform.set_rgba(r, g, b, 1);
  model.poly_uniform.set_line_width(1);
  model.poly_uniform.set_texture_width(model.deviceWidth);
  model.poly_uniform.set_texture_height(model.deviceHeight);

  model.device.queue.writeBuffer(
    model.poly_buffer,
    dataIdx * model.poly_uniform.aligned_size,
    model.poly_uniform.data.buffer
  );

  const renderpass = encoder.beginRenderPass({
    label: "Rectangle Append Anno",
    colorAttachments: [
      {
        view: model.an_texture_view,
        loadOp: "load" as GPULoadOp,
        storeOp: "store" as GPUStoreOp,
      },
    ],
  });

  renderpass.setPipeline(model.rectangle_pipeline);
  renderpass.setBindGroup(0, model.poly_bindgroup, [
    dataIdx * model.poly_uniform.aligned_size,
  ]);
  renderpass.draw(6, 1);
  renderpass.end();
}

function onCircleAppendAnno(
  model: Model,
  encoder: GPUCommandEncoder,
  dataIdx: number
) {
  const x0 = model.renderPassDataBuffer.x0[dataIdx];
  const y0 = model.renderPassDataBuffer.y0[dataIdx];
  const r = model.renderPassDataBuffer.red[dataIdx];
  const g = model.renderPassDataBuffer.green[dataIdx];
  const b = model.renderPassDataBuffer.blue[dataIdx];
  const radius = model.renderPassDataBuffer.x1[dataIdx]; //TODO: restructure RenderPassDataBuffer to de-hackify this

  model.poly_uniform.set_pos(0, x0, y0);
  model.poly_uniform.set_rgba(r, g, b, 1);
  model.poly_uniform.set_line_width(1);
  model.poly_uniform.set_radius(radius);
  model.poly_uniform.set_texture_width(model.deviceWidth);
  model.poly_uniform.set_texture_height(model.deviceHeight);

  model.device.queue.writeBuffer(
    model.poly_buffer,
    dataIdx * model.poly_uniform.aligned_size,
    model.poly_uniform.data.buffer
  );

  const renderpass = encoder.beginRenderPass({
    label: "Circle Append Anno",
    colorAttachments: [
      {
        view: model.an_texture_view,
        //clearValue: [0, 0, 0, 0],
        loadOp: "load" as GPULoadOp,
        storeOp: "store" as GPUStoreOp,
      },
    ],
  });

  renderpass.setPipeline(model.circle_pipeline);
  renderpass.setBindGroup(0, model.poly_bindgroup, [
    dataIdx * model.poly_uniform.aligned_size,
  ]);
  renderpass.draw(6, 1);
  renderpass.end();
}

function onCircleReplaceAnno(
  model: Model,
  encoder: GPUCommandEncoder,
  dataIdx: number
) {
  const x0 = model.renderPassDataBuffer.x0[dataIdx];
  const y0 = model.renderPassDataBuffer.y0[dataIdx];
  const r = model.renderPassDataBuffer.red[dataIdx];
  const g = model.renderPassDataBuffer.green[dataIdx];
  const b = model.renderPassDataBuffer.blue[dataIdx];
  const radius = model.renderPassDataBuffer.x1[dataIdx]; //TODO: restructure RenderPassDataBuffer to de-hackify this

  model.poly_uniform.set_pos(0, x0, y0);
  model.poly_uniform.set_rgba(r, g, b, 1);
  model.poly_uniform.set_line_width(1);
  model.poly_uniform.set_radius(radius);
  model.poly_uniform.set_texture_width(model.deviceWidth);
  model.poly_uniform.set_texture_height(model.deviceHeight);

  model.device.queue.writeBuffer(
    model.poly_buffer,
    dataIdx * model.poly_uniform.aligned_size,
    model.poly_uniform.data.buffer
  );

  const renderpass = encoder.beginRenderPass({
    label: "Circle Replace Anno",
    colorAttachments: [
      {
        view: model.an_texture_view,
        clearValue: [0, 0, 0, 0],
        loadOp: "clear" as GPULoadOp,
        storeOp: "store" as GPUStoreOp,
      },
    ],
  });

  renderpass.setPipeline(model.circle_pipeline);
  renderpass.setBindGroup(0, model.poly_bindgroup, [
    dataIdx * model.poly_uniform.aligned_size,
  ]);
  renderpass.draw(6, 1);
  renderpass.end();
}
