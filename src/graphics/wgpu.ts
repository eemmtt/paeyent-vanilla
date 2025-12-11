import compositeShaderCode from "../shaders/composite.wgsl?raw";
import lineShaderCode from "../shaders/polyline.wgsl?raw";
import fanShaderCode from "../shaders/polyfan.wgsl?raw";

import { type Model } from "../types/Model";
import { PolyUniform } from "../types/PolyUniform";
import type { Color, GraphicsModel } from "./Graphics";
import { RenderPassBuffer } from "../types/RenderPassBuffer";
import { RenderPassDataBuffer } from "../types/RenderPassDataBuffer";
import { CompositeUniform } from "../types/CompositeUniform";

type FillStyle = "transparent" | "white";

export async function wgpu_init(
  canvas: HTMLCanvasElement
): Promise<GraphicsModel> {
  if (!window) {
    throw Error("wgpu_init: Window not found");
  }

  if (!navigator.gpu) {
    throw Error("WebGPU not supported");
  }

  const adapter = await navigator.gpu.requestAdapter();
  if (!adapter) {
    throw Error("Couldn't request WebGPU adapter");
  }

  const device = await adapter.requestDevice();
  if (!device) {
    throw Error("Failed to get WebGPU device");
  }

  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();

  canvas.width = Math.max(
    1,
    Math.min(rect.width * dpr, device.limits.maxTextureDimension2D)
  );
  canvas.height = Math.max(
    1,
    Math.min(rect.height * dpr, device.limits.maxTextureDimension2D)
  );

  const context = canvas.getContext("webgpu");
  if (!context) {
    throw Error("Failed to get WebGPU context from canvas");
  }
  const format = navigator.gpu.getPreferredCanvasFormat();
  context.configure({
    device,
    format,
  });

  const [bg_texture, bg_texture_view] = create_texture(
    format,
    device,
    canvas,
    "white"
  );
  const [fg_texture, fg_texture_view] = create_texture(
    format,
    device,
    canvas,
    "transparent"
  );
  const [an_texture, an_texture_view] = create_texture(
    format,
    device,
    canvas,
    "transparent"
  );

  const clear_color: Color = [1, 1, 1, 1];

  const composite_uniform = new CompositeUniform(device, canvas);

  const [
    composite_pipeline,
    composite_bindgroup,
    composite_uniform_buffer,
    composite_uniform_bindgroup,
  ] = create_composite_resources(
    device,
    format,
    bg_texture_view,
    fg_texture_view,
    an_texture_view,
    composite_uniform
  );

  const poly_uniform = new PolyUniform(
    device,
    canvas.clientWidth,
    canvas.clientHeight
  );

  // Calculate max render passes based on device limits
  const maxUniformBufferSize = device.limits.maxUniformBufferBindingSize;
  const maxRenderPasses = Math.floor(
    maxUniformBufferSize / poly_uniform.aligned_size
  );

  const [poly_buffer, poly_bindgroup, line_pipeline, fan_pipeline] =
    create_poly_resources(device, format, poly_uniform, maxRenderPasses);

  const renderPassBuffer = new RenderPassBuffer(maxRenderPasses);
  const renderPassDataBuffer = new RenderPassDataBuffer(maxRenderPasses);

  console.log("Intialized WebGPU Context");
  return {
    canvas,
    format,
    device,
    surface: context,
    is_surface_configured: false,
    dpr,
    clientWidth: rect.width,
    clientHeight: rect.height,
    deviceWidth: canvas.width,
    deviceHeight: canvas.height,
    viewportToTextureX: 1.0,
    viewportToTextureY: 1.0,

    bg_texture,
    fg_texture,
    an_texture,
    bg_texture_view,
    fg_texture_view,
    an_texture_view,
    clear_color,
    maxRenderPasses,

    poly_uniform,
    poly_buffer,
    poly_bindgroup,
    composite_uniform,
    composite_uniform_buffer,
    composite_uniform_bindgroup,

    line_pipeline,
    fan_pipeline,
    composite_pipeline,
    composite_bindgroup,

    renderPassBuffer,
    renderPassDataBuffer,
    render: wgpu_render,
  };
}

//TODO: refactor as normal drawing api e.g.,
//      clear(target_layer: LayerType, clear_color: Color)
//      line(target_layer: LayerType, a_x: number, a_y: number, b_x: number, b_y: number, color?, line_thickness?)
//      triangle(target_layer: LayerType, a_x: number, a_y: number, b_x: number, b_y: number, c_x: number, c_y: number, color?)
export const RenderPassToolIdxOffset = 4; //clear f()'s 0-3, tools 4 ->

//TODO: rethink api design... [tool]-fg will always clear before draw?
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
] as const;

//TODO: batch repeated calls when recreating background from operation history
//      e.g., write a shader that instances n triangles for fan, n rectangles for line etc.
function wgpu_render(model: Model) {
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

function create_texture(
  texture_format: GPUTextureFormat,
  device: GPUDevice,
  canvas: HTMLCanvasElement,
  fill: FillStyle
): [GPUTexture, GPUTextureView] {
  let texture_desc: GPUTextureDescriptor = {
    size: {
      width: canvas.width,
      height: canvas.height,
      depthOrArrayLayers: 1,
    },
    format: texture_format,
    usage:
      GPUTextureUsage.RENDER_ATTACHMENT |
      GPUTextureUsage.TEXTURE_BINDING |
      GPUTextureUsage.COPY_DST,
  };
  let texture = device.createTexture(texture_desc);

  if (fill == "white") {
    const data = new Uint8Array(canvas.width * canvas.height * 4).fill(255);

    device.queue.writeTexture(
      { texture: texture },
      data,
      {
        offset: 0,
        bytesPerRow: 4 * canvas.width,
        rowsPerImage: canvas.height,
      },
      {
        width: canvas.width,
        height: canvas.height,
        depthOrArrayLayers: 1,
      }
    );
  } else if (fill == "transparent") {
    const data = new Uint8Array(canvas.width * canvas.height * 4).fill(0);

    device.queue.writeTexture(
      { texture: texture },
      data,
      {
        offset: 0,
        bytesPerRow: 4 * canvas.width,
        rowsPerImage: canvas.height,
      },
      {
        width: canvas.width,
        height: canvas.height,
        depthOrArrayLayers: 1,
      }
    );
  }

  let view = texture.createView();

  return [texture, view];
}

function create_composite_resources(
  device: GPUDevice,
  format: GPUTextureFormat,
  bg_texture_view: GPUTextureView,
  fg_texture_view: GPUTextureView,
  an_texture_view: GPUTextureView,
  composite_uniform: CompositeUniform
): [GPURenderPipeline, GPUBindGroup, GPUBuffer, GPUBindGroup] {
  const composite_shader = device.createShaderModule({
    label: "texture compositor",
    code: compositeShaderCode,
  });

  const composite_bindgroup_layout = device.createBindGroupLayout({
    entries: [
      {
        binding: 0,
        visibility: GPUShaderStage.FRAGMENT,
        texture: {
          sampleType: "float",
          viewDimension: "2d",
          multisampled: false,
        },
      },
      {
        binding: 1,
        visibility: GPUShaderStage.FRAGMENT,
        texture: {
          sampleType: "float",
          viewDimension: "2d",
          multisampled: false,
        },
      },
      {
        binding: 2,
        visibility: GPUShaderStage.FRAGMENT,
        texture: {
          sampleType: "float",
          viewDimension: "2d",
          multisampled: false,
        },
      },
      {
        binding: 3,
        visibility: GPUShaderStage.FRAGMENT,
        sampler: {
          type: "filtering",
        },
      },
    ],
  });

  const composite_uniform_bindgroup_layout = device.createBindGroupLayout({
    entries: [
      {
        binding: 0,
        visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
        buffer: {
          type: "uniform",
          hasDynamicOffset: false,
        },
      },
    ],
  });

  const composite_pipeline_layout = device.createPipelineLayout({
    bindGroupLayouts: [
      composite_bindgroup_layout,
      composite_uniform_bindgroup_layout,
    ],
  });

  const composite_pipeline = device.createRenderPipeline({
    layout: composite_pipeline_layout,
    vertex: {
      module: composite_shader,
      entryPoint: "vs_main",
      buffers: [],
    },
    fragment: {
      module: composite_shader,
      entryPoint: "fs_main",
      targets: [
        {
          format: format,
          //blend:
          //writemask
        },
      ],
    },
    primitive: {
      topology: "triangle-list",
    },
  });

  const sampler = device.createSampler({
    addressModeU: "clamp-to-edge",
    addressModeV: "clamp-to-edge",
    addressModeW: "clamp-to-edge",
    magFilter: "linear",
    minFilter: "linear",
  });

  const composite_bindgroup = device.createBindGroup({
    layout: composite_bindgroup_layout,
    entries: [
      { binding: 0, resource: bg_texture_view },
      { binding: 1, resource: fg_texture_view },
      { binding: 2, resource: an_texture_view },
      { binding: 3, resource: sampler },
    ],
  });

  const composite_uniform_buffer = device.createBuffer({
    size: composite_uniform.aligned_size,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

  const composite_uniform_bindgroup = device.createBindGroup({
    layout: composite_uniform_bindgroup_layout,
    entries: [
      {
        binding: 0,
        resource: {
          buffer: composite_uniform_buffer,
          offset: 0,
          size: composite_uniform.aligned_size,
        },
      },
    ],
  });

  return [
    composite_pipeline,
    composite_bindgroup,
    composite_uniform_buffer,
    composite_uniform_bindgroup,
  ];
}

function create_poly_resources(
  device: GPUDevice,
  format: GPUTextureFormat,
  poly_uniform: PolyUniform,
  max_queued_renderpasses: number
): [GPUBuffer, GPUBindGroup, GPURenderPipeline, GPURenderPipeline] {
  let poly_buffer = device.createBuffer({
    size: poly_uniform.aligned_size * max_queued_renderpasses,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

  let poly_bindgroup_layout = device.createBindGroupLayout({
    entries: [
      {
        binding: 0,
        visibility: GPUShaderStage.VERTEX,
        buffer: {
          type: "uniform",
          hasDynamicOffset: true,
        },
      },
    ],
  });

  let poly_bindgroup = device.createBindGroup({
    layout: poly_bindgroup_layout,
    entries: [
      {
        binding: 0,
        resource: {
          buffer: poly_buffer,
          offset: 0,
          size: poly_uniform.aligned_size,
        },
      },
    ],
  });

  let line_shader = device.createShaderModule({
    label: "polyline shader",
    code: lineShaderCode,
  });

  let fan_shader = device.createShaderModule({
    label: "polyfan shader",
    code: fanShaderCode,
  });

  let poly_pipeline_layout = device.createPipelineLayout({
    bindGroupLayouts: [poly_bindgroup_layout],
  });

  let line_pipeline = device.createRenderPipeline({
    layout: poly_pipeline_layout,
    vertex: {
      module: line_shader,
      entryPoint: "vs_main",
    },
    primitive: {
      topology: "triangle-strip",
      frontFace: "ccw",
      cullMode: "back",
      unclippedDepth: false,
    },
    multisample: {
      count: 1,
      mask: 0xffffffff,
      alphaToCoverageEnabled: false,
    },
    fragment: {
      module: line_shader,
      entryPoint: "fs_main",
      targets: [
        {
          format: format,
          writeMask: 0xf,
        },
      ],
    },
  });

  let fan_pipeline = device.createRenderPipeline({
    layout: poly_pipeline_layout,
    vertex: {
      module: fan_shader,
      entryPoint: "vs_main",
    },
    primitive: {
      topology: "triangle-strip",
      frontFace: "ccw",
      cullMode: "back",
      unclippedDepth: false,
    },
    multisample: {
      count: 1,
      mask: 0xffffffff,
      alphaToCoverageEnabled: false,
    },
    fragment: {
      module: fan_shader,
      entryPoint: "fs_main",
      targets: [
        {
          format: format,
          writeMask: 0xf,
        },
      ],
    },
  });

  return [poly_buffer, poly_bindgroup, line_pipeline, fan_pipeline];
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
