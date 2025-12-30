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
  "scratch-clear": 14,
  "scratch-append": 15,
  "fan-append-fg": 16,
} as const;

export const RenderPassHandlers = [
  onClearFg,
  onClearBg,
  onClearAnno,
  onClearAll,
  onLineReplaceFg,
  onLineAppendBg,
  onFanReplaceFg,
  onFanAppendBg,
  onBrushReplaceFg,
  onBrushAppendBg,
  onRectangleAppendAnno,
  onRectangleReplaceAnno,
  onCircleAppendAnno,
  onCircleReplaceAnno,
  onClearScratch,
  onAppendScratch,
  onFanAppendFg,
] as const;

//TODO: batch repeated calls when recreating background from operation history
//      e.g., write a shader that instances n triangles for fan, n rectangles for line etc.
export function wgpu_render(model: Model) {
  let view = model.surface.getCurrentTexture().createView();
  const encoder = model.device.createCommandEncoder({
    label: "Render Encoder",
  });

  // call each RenderPassHandler
  for (let i = 0; i < model.drawUniformBuffer.top; i++) {
    RenderPassHandlers[model.drawUniformBuffer.getType(i)](model, encoder, i);
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

    (
      model.rpd_replaceComposite
        .colorAttachments as GPURenderPassColorAttachment[]
    )[0].view = view;

    const pass = encoder.beginRenderPass(model.rpd_replaceComposite);
    pass.setPipeline(model.composite_pipeline);
    pass.setBindGroup(0, model.composite_bindgroup);
    pass.setBindGroup(1, model.composite_uniform_bindgroup);
    pass.draw(4, 1);
    pass.end();
  }

  // Composite scratch texture to scratch canvas if enabled
  if (
    model.scratch_surface &&
    model.scratch_rpd_composite &&
    model.scratch_composite_pipeline &&
    model.scratch_composite_bindgroup
  ) {
    const scratchView = model.scratch_surface.getCurrentTexture().createView();
    (
      model.scratch_rpd_composite
        .colorAttachments as GPURenderPassColorAttachment[]
    )[0].view = scratchView;

    const pass = encoder.beginRenderPass(model.scratch_rpd_composite);
    pass.setPipeline(model.scratch_composite_pipeline);
    pass.setBindGroup(0, model.scratch_composite_bindgroup);
    pass.draw(4, 1);
    pass.end();
  }

  const commandBuffer = encoder.finish();
  model.device.queue.submit([commandBuffer]);
}

function onClearFg(model: Model, encoder: GPUCommandEncoder, _dataIdx: number) {
  encoder.beginRenderPass(model.rpd_replaceFg).end();
}

function onClearBg(model: Model, encoder: GPUCommandEncoder, _dataIdx: number) {
  encoder.beginRenderPass(model.rpd_replaceBg).end();
}

function onClearAnno(
  model: Model,
  encoder: GPUCommandEncoder,
  _dataIdx: number
) {
  encoder.beginRenderPass(model.rpd_replaceAnno).end();
}

function onClearAll(
  model: Model,
  encoder: GPUCommandEncoder,
  _dataIdx: number
) {
  encoder.beginRenderPass(model.rpd_replaceAnno).end();
  encoder.beginRenderPass(model.rpd_replaceFg).end();
  encoder.beginRenderPass(model.rpd_replaceBg).end();
}

function onLineReplaceFg(
  model: Model,
  encoder: GPUCommandEncoder,
  dataIdx: number
) {
  if (dataIdx === -1 || dataIdx >= model.drawUniformBuffer.top) {
    console.warn(`onLineReplaceFg: invalid dataIdx ${dataIdx}`);
    return;
  }

  model.drawUniformBuffer.setTextureDims(
    dataIdx,
    model.textureWidth,
    model.textureHeight
  );

  model.device.queue.writeBuffer(
    model.poly_buffer,
    dataIdx * model.drawUniformBuffer.alignedSize,
    model.drawUniformBuffer.data,
    dataIdx * model.drawUniformBuffer.stride +
      model.drawUniformBuffer.metaStride,
    model.drawUniformBuffer.uniformStride
  );

  const renderpass = encoder.beginRenderPass(model.rpd_replaceFg);
  renderpass.setPipeline(model.line_pipeline);
  renderpass.setBindGroup(0, model.poly_bindgroup, [
    dataIdx * model.drawUniformBuffer.alignedSize,
  ]);
  renderpass.draw(6, 1);
  renderpass.end();
}

function onLineAppendBg(
  model: Model,
  encoder: GPUCommandEncoder,
  dataIdx: number
) {
  if (dataIdx === -1 || dataIdx >= model.drawUniformBuffer.top) {
    console.warn(`onLineAppendBg: invalid dataIdx ${dataIdx}`);
    return;
  }

  model.drawUniformBuffer.setTextureDims(
    dataIdx,
    model.textureWidth,
    model.textureHeight
  );

  model.historyBuffer.pushFromBuffer(model.drawUniformBuffer, dataIdx);

  model.device.queue.writeBuffer(
    model.poly_buffer,
    dataIdx * model.drawUniformBuffer.alignedSize,
    model.drawUniformBuffer.data,
    dataIdx * model.drawUniformBuffer.stride +
      model.drawUniformBuffer.metaStride,
    model.drawUniformBuffer.uniformStride
  );

  encoder.beginRenderPass(model.rpd_replaceFg).end();

  const renderpass = encoder.beginRenderPass(model.rpd_appendBg);
  renderpass.setPipeline(model.line_pipeline);
  renderpass.setBindGroup(0, model.poly_bindgroup, [
    dataIdx * model.drawUniformBuffer.alignedSize,
  ]);
  renderpass.draw(6, 1);
  renderpass.end();
}

function onFanReplaceFg(
  model: Model,
  encoder: GPUCommandEncoder,
  dataIdx: number
) {
  if (dataIdx === -1 || dataIdx >= model.drawUniformBuffer.top) {
    console.warn(`onFanReplaceFg: invalid dataIdx ${dataIdx}`);
    return;
  }

  model.drawUniformBuffer.setTextureDims(
    dataIdx,
    model.textureWidth,
    model.textureHeight
  );

  model.device.queue.writeBuffer(
    model.poly_buffer,
    dataIdx * model.drawUniformBuffer.alignedSize,
    model.drawUniformBuffer.data,
    dataIdx * model.drawUniformBuffer.stride +
      model.drawUniformBuffer.metaStride,
    model.drawUniformBuffer.uniformStride
  );

  const renderpass = encoder.beginRenderPass(model.rpd_replaceFg);
  renderpass.setPipeline(model.fan_pipeline);
  renderpass.setBindGroup(0, model.poly_bindgroup, [
    dataIdx * model.drawUniformBuffer.alignedSize,
  ]);
  renderpass.draw(3, 1);
  renderpass.end();
}

function onFanAppendBg(
  model: Model,
  encoder: GPUCommandEncoder,
  dataIdx: number
) {
  if (dataIdx === -1 || dataIdx >= model.drawUniformBuffer.top) {
    console.warn(`onFanAppendBg: invalid dataIdx ${dataIdx}`);
    return;
  }

  model.drawUniformBuffer.setTextureDims(
    dataIdx,
    model.textureWidth,
    model.textureHeight
  );

  model.historyBuffer.pushFromBuffer(model.drawUniformBuffer, dataIdx);

  model.device.queue.writeBuffer(
    model.poly_buffer,
    dataIdx * model.drawUniformBuffer.alignedSize,
    model.drawUniformBuffer.data,
    dataIdx * model.drawUniformBuffer.stride +
      model.drawUniformBuffer.metaStride,
    model.drawUniformBuffer.uniformStride
  );

  encoder.beginRenderPass(model.rpd_replaceFg).end();

  const renderpass = encoder.beginRenderPass(model.rpd_appendBg);
  renderpass.setPipeline(model.fan_pipeline);
  renderpass.setBindGroup(0, model.poly_bindgroup, [
    dataIdx * model.drawUniformBuffer.alignedSize,
  ]);
  renderpass.draw(3, 1);
  renderpass.end();
}

function onFanAppendFg(
  model: Model,
  encoder: GPUCommandEncoder,
  dataIdx: number
) {
  if (dataIdx === -1 || dataIdx >= model.drawUniformBuffer.top) {
    console.warn(`onFanAppendFg: invalid dataIdx ${dataIdx}`);
    return;
  }

  model.drawUniformBuffer.setTextureDims(
    dataIdx,
    model.textureWidth,
    model.textureHeight
  );

  model.device.queue.writeBuffer(
    model.poly_buffer,
    dataIdx * model.drawUniformBuffer.alignedSize,
    model.drawUniformBuffer.data,
    dataIdx * model.drawUniformBuffer.stride +
      model.drawUniformBuffer.metaStride,
    model.drawUniformBuffer.uniformStride
  );

  const renderpass = encoder.beginRenderPass(model.rpd_appendFg);
  renderpass.setPipeline(model.fan_pipeline);
  renderpass.setBindGroup(0, model.poly_bindgroup, [
    dataIdx * model.drawUniformBuffer.alignedSize,
  ]);
  renderpass.draw(3, 1);
  renderpass.end();
}

function onBrushReplaceFg(
  _model: Model,
  _encoder: GPUCommandEncoder,
  _dataIdx: number
) {
  console.warn("onBrushFg not implemented");
  return;
}
function onBrushAppendBg(
  _model: Model,
  _encoder: GPUCommandEncoder,
  _dataIdx: number
) {
  console.warn("onBrushBg not implemented");
  return;
}

function onRectangleReplaceAnno(
  model: Model,
  encoder: GPUCommandEncoder,
  dataIdx: number
) {
  if (dataIdx === -1 || dataIdx >= model.drawUniformBuffer.top) {
    console.warn(`onRectangleReplaceAnno: invalid dataIdx ${dataIdx}`);
    return;
  }

  model.drawUniformBuffer.setTextureDims(
    dataIdx,
    model.deviceWidth,
    model.deviceHeight
  );

  model.device.queue.writeBuffer(
    model.poly_buffer,
    dataIdx * model.drawUniformBuffer.alignedSize,
    model.drawUniformBuffer.data,
    dataIdx * model.drawUniformBuffer.stride +
      model.drawUniformBuffer.metaStride,
    model.drawUniformBuffer.uniformStride
  );

  const renderpass = encoder.beginRenderPass(model.rpd_replaceAnno);
  renderpass.setPipeline(model.rectangle_pipeline);
  renderpass.setBindGroup(0, model.poly_bindgroup, [
    dataIdx * model.drawUniformBuffer.alignedSize,
  ]);
  renderpass.draw(6, 1);
  renderpass.end();
}

function onRectangleAppendAnno(
  model: Model,
  encoder: GPUCommandEncoder,
  dataIdx: number
) {
  if (dataIdx === -1 || dataIdx >= model.drawUniformBuffer.top) {
    console.warn(`onRectangleAppendAnno: invalid dataIdx ${dataIdx}`);
    return;
  }

  model.drawUniformBuffer.setTextureDims(
    dataIdx,
    model.deviceWidth,
    model.deviceHeight
  );

  model.device.queue.writeBuffer(
    model.poly_buffer,
    dataIdx * model.drawUniformBuffer.alignedSize,
    model.drawUniformBuffer.data,
    dataIdx * model.drawUniformBuffer.stride +
      model.drawUniformBuffer.metaStride,
    model.drawUniformBuffer.uniformStride
  );

  const renderpass = encoder.beginRenderPass(model.rpd_appendAnno);
  renderpass.setPipeline(model.rectangle_pipeline);
  renderpass.setBindGroup(0, model.poly_bindgroup, [
    dataIdx * model.drawUniformBuffer.alignedSize,
  ]);
  renderpass.draw(6, 1);
  renderpass.end();
}

function onCircleAppendAnno(
  model: Model,
  encoder: GPUCommandEncoder,
  dataIdx: number
) {
  if (dataIdx === -1 || dataIdx >= model.drawUniformBuffer.top) {
    console.warn(`onCircleAppendAnno: invalid dataIdx ${dataIdx}`);
    return;
  }

  model.drawUniformBuffer.setTextureDims(
    dataIdx,
    model.deviceWidth,
    model.deviceHeight
  );

  model.device.queue.writeBuffer(
    model.poly_buffer,
    dataIdx * model.drawUniformBuffer.alignedSize,
    model.drawUniformBuffer.data,
    dataIdx * model.drawUniformBuffer.stride +
      model.drawUniformBuffer.metaStride,
    model.drawUniformBuffer.uniformStride
  );

  const renderpass = encoder.beginRenderPass(model.rpd_appendAnno);
  renderpass.setPipeline(model.circle_pipeline);
  renderpass.setBindGroup(0, model.poly_bindgroup, [
    dataIdx * model.drawUniformBuffer.alignedSize,
  ]);
  renderpass.draw(6, 1);
  renderpass.end();
}

function onCircleReplaceAnno(
  model: Model,
  encoder: GPUCommandEncoder,
  dataIdx: number
) {
  if (dataIdx === -1 || dataIdx >= model.drawUniformBuffer.top) {
    console.warn(`onCircleReplaceAnno: invalid dataIdx ${dataIdx}`);
    return;
  }

  model.drawUniformBuffer.setTextureDims(
    dataIdx,
    model.deviceWidth,
    model.deviceHeight
  );

  model.device.queue.writeBuffer(
    model.poly_buffer,
    dataIdx * model.drawUniformBuffer.alignedSize,
    model.drawUniformBuffer.data,
    dataIdx * model.drawUniformBuffer.stride +
      model.drawUniformBuffer.metaStride,
    model.drawUniformBuffer.uniformStride
  );

  const renderpass = encoder.beginRenderPass(model.rpd_replaceAnno);
  renderpass.setPipeline(model.circle_pipeline);
  renderpass.setBindGroup(0, model.poly_bindgroup, [
    dataIdx * model.drawUniformBuffer.alignedSize,
  ]);
  renderpass.draw(6, 1);
  renderpass.end();
}

function onClearScratch(
  model: Model,
  encoder: GPUCommandEncoder,
  dataIdx: number
) {
  if (
    !model.scratch_rpd_clear ||
    !model.scratch_rpd_append ||
    !model.scratch_grid_pipeline ||
    !model.scratch_bindgroup
  ) {
    console.warn("onClearScratch: scratch area not initialized");
    return;
  }

  // Clear scratch texture to white
  encoder.beginRenderPass(model.scratch_rpd_clear).end();

  // Redraw grid lines
  // model.drawUniformBuffer.setTextureDims(
  //   dataIdx,
  //   model.scratch_width!,
  //   model.scratch_height!
  // );

  // model.device.queue.writeBuffer(
  //   model.poly_buffer,
  //   dataIdx * model.drawUniformBuffer.alignedSize,
  //   model.drawUniformBuffer.data,
  //   dataIdx * model.drawUniformBuffer.stride +
  //     model.drawUniformBuffer.metaStride,
  //   model.drawUniformBuffer.uniformStride
  // );

  // const pass = encoder.beginRenderPass(model.scratch_rpd_append);
  // pass.setPipeline(model.scratch_grid_pipeline);
  // pass.setBindGroup(0, model.scratch_bindgroup, [
  //   dataIdx * model.drawUniformBuffer.alignedSize,
  // ]);
  // pass.draw(6, 1);
  // pass.end();
}

function onAppendScratch(
  model: Model,
  encoder: GPUCommandEncoder,
  dataIdx: number
) {
  if (
    !model.scratch_rpd_append ||
    !model.scratch_pipeline ||
    !model.scratch_bindgroup
  ) {
    console.warn("onAppendScratch: scratch area not initialized");
    return;
  }

  if (dataIdx === -1 || dataIdx >= model.drawUniformBuffer.top) {
    console.warn(`onAppendScratch: invalid dataIdx ${dataIdx}`);
    return;
  }

  model.drawUniformBuffer.setTextureDims(
    dataIdx,
    model.scratch_width!,
    model.scratch_height!
  );

  model.device.queue.writeBuffer(
    model.poly_buffer,
    dataIdx * model.drawUniformBuffer.alignedSize,
    model.drawUniformBuffer.data,
    dataIdx * model.drawUniformBuffer.stride +
      model.drawUniformBuffer.metaStride,
    model.drawUniformBuffer.uniformStride
  );

  const pass = encoder.beginRenderPass(model.scratch_rpd_append);
  pass.setPipeline(model.scratch_pipeline);
  pass.setBindGroup(0, model.scratch_bindgroup, [
    dataIdx * model.drawUniformBuffer.alignedSize,
  ]);
  pass.draw(6, 1);
  pass.end();
}
