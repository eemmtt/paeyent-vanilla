import compositeShaderCode from "../shaders/composite.wgsl?raw";
import lineShaderCode from "../shaders/polyline.wgsl?raw";
import fanShaderCode from "../shaders/polyfan.wgsl?raw";
import circleShaderCode from "../shaders/circle.wgsl?raw";
import rectangleShaderCode from "../shaders/rectangle.wgsl?raw";
import scratchShaderCode from "../shaders/scratch_cell.wgsl?raw";
import scratchGridShaderCode from "../shaders/scratch_grid.wgsl?raw";
import scratchCompositeShaderCode from "../shaders/scratch_composite.wgsl?raw";

import { CompositeUniform } from "../types/CompositeUniform";
import type { GraphicsModel, Color } from "./Graphics";
import { wgpu_render } from "./wgpu_render";
import { model_init, type Model, type SessionSettings } from "../types/Model";
import { DrawUniformBuffer } from "../types/DrawUniformBuffer";

export type FillStyle = "transparent" | "white" | "clearColor";

export async function wgpu_init(
  canvas: HTMLCanvasElement,
  settings: SessionSettings
): Promise<GraphicsModel> {
  if (!window) {
    throw Error("wgpu_init: Window not found");
  }

  if (!navigator.gpu) {
    throw Error("wgpu_init: WebGPU not supported");
  }

  const adapter = await navigator.gpu.requestAdapter();
  if (!adapter) {
    throw Error("wgpu_init: Couldn't request WebGPU adapter");
  }

  const device = await adapter.requestDevice();
  if (!device) {
    throw Error("wgpu_init: Failed to get WebGPU device");
  }

  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  const canvasDeviceWidth = Math.max(
    1,
    Math.min(rect.width * dpr, device.limits.maxTextureDimension2D)
  );
  const canvasDeviceHeight = Math.max(
    1,
    Math.min(rect.height * dpr, device.limits.maxTextureDimension2D)
  );

  canvas.width = canvasDeviceWidth;
  canvas.height = canvasDeviceHeight;

  const context = canvas.getContext("webgpu");
  if (!context) {
    throw Error("wgpu_init: Failed to get WebGPU context from canvas");
  }
  const format = navigator.gpu.getPreferredCanvasFormat();
  context.configure({
    device,
    format,
  });

  let textureWidth = canvasDeviceWidth;
  let textureHeight = canvasDeviceHeight;
  if (settings.image_dimensions_type === "custom") {
    if (
      settings.image_width !== undefined &&
      settings.image_height !== undefined
    ) {
      textureWidth = Math.max(
        1,
        Math.min(settings.image_width, device.limits.maxTextureDimension2D)
      );
      textureHeight = Math.max(
        1,
        Math.min(settings.image_height, device.limits.maxTextureDimension2D)
      );
    } else {
      throw Error("wgpu_init: Custom image dimensions are undefined");
    }
  }
  const [bg_texture, bg_texture_view] = create_texture(
    format,
    device,
    textureWidth,
    textureHeight,
    "clearColor"
  );
  const [fg_texture, fg_texture_view] = create_texture(
    format,
    device,
    textureWidth,
    textureHeight,
    "transparent"
  );
  const [an_texture, an_texture_view] = create_texture(
    format,
    device,
    canvasDeviceWidth,
    canvasDeviceHeight,
    "transparent"
  );

  const clear_color: Color = [0.6, 0.6, 0.6, 1];

  const composite_uniform = new CompositeUniform(
    device,
    textureWidth,
    textureHeight,
    canvasDeviceWidth,
    canvasDeviceHeight
  );

  const [
    composite_pipeline,
    composite_bindgroup,
    composite_uniform_buffer,
    composite_uniform_bindgroup,
    composite_sampler,
  ] = create_composite_resources(
    device,
    format,
    bg_texture_view,
    fg_texture_view,
    an_texture_view,
    composite_uniform
  );

  const drawUniformBuffer = new DrawUniformBuffer(device);
  const historyBuffer = new DrawUniformBuffer(device, 73529); //~5mb = 68bytes * 73529

  const maxUniformBufferSize = device.limits.maxUniformBufferBindingSize;
  const maxRenderPasses = Math.floor(
    maxUniformBufferSize / drawUniformBuffer.alignedSize
  );

  const [
    poly_buffer,
    poly_bindgroup,
    line_pipeline,
    fan_pipeline,
    circle_pipeline,
    rectangle_pipeline,
  ] = create_poly_resources(device, format, drawUniformBuffer, maxRenderPasses);

  const rpd_replaceFg: GPURenderPassDescriptor = {
    label: "Replace Foreground",
    colorAttachments: [
      {
        view: fg_texture_view,
        loadOp: "clear",
        storeOp: "store",
      },
    ],
  };

  const rpd_replaceBg: GPURenderPassDescriptor = {
    label: "Replace Background",
    colorAttachments: [
      {
        view: bg_texture_view,
        clearValue: clear_color,
        loadOp: "clear",
        storeOp: "store",
      },
    ],
  };

  const rpd_replaceAnno: GPURenderPassDescriptor = {
    label: "Replace Annotation",
    colorAttachments: [
      {
        view: an_texture_view,
        loadOp: "clear",
        storeOp: "store",
      },
    ],
  };

  const rpd_appendBg: GPURenderPassDescriptor = {
    label: "Append Background",
    colorAttachments: [
      {
        view: bg_texture_view,
        loadOp: "load",
        storeOp: "store",
      },
    ],
  };

  const rpd_appendAnno: GPURenderPassDescriptor = {
    label: "Append Annotation",
    colorAttachments: [
      {
        view: an_texture_view,
        loadOp: "load",
        storeOp: "store",
      },
    ],
  };

  const rpd_replaceComposite: GPURenderPassDescriptor = {
    label: "Replace Composite",
    colorAttachments: [
      {
        view: context.getCurrentTexture().createView(),
        loadOp: "clear",
        storeOp: "store",
      },
    ],
  };

  // Initialize scratch resources if scratch area is enabled
  let scratchResources: ScratchResources | undefined;
  let scratch_canvas: HTMLCanvasElement | undefined;
  if (settings.scratch_area) {
    const scratch_container =
      document.getElementsByClassName("scratch-container")[0];
    if (scratch_container) {
      scratch_canvas = document.createElement("canvas");
      scratch_canvas.style.width = "100%";
      scratch_canvas.style.height = "100%";
      scratch_canvas.style.display = "block";
      scratch_container.appendChild(scratch_canvas);

      scratchResources = create_scratch_resources(
        device,
        format,
        scratch_canvas,
        poly_buffer,
        drawUniformBuffer,
        clear_color
      );
    }
  }

  // ensure texture initialization completes before first render
  const encoder = device.createCommandEncoder();
  device.queue.submit([encoder.finish()]);
  await device.queue.onSubmittedWorkDone();

  console.log("Intialized WebGPU Context");
  return {
    canvas,
    format,
    device,
    surface: context,
    dpr,
    clientWidth: rect.width,
    clientHeight: rect.height,
    deviceWidth: canvasDeviceWidth,
    deviceHeight: canvasDeviceHeight,
    textureWidth,
    textureHeight,

    bg_texture,
    fg_texture,
    an_texture,
    bg_texture_view,
    fg_texture_view,
    an_texture_view,
    clear_color,
    maxRenderPasses,

    render: wgpu_render,
    updateImageDimensions: updateImageDimensions,
    drawUniformBuffer,
    historyBuffer,
    poly_buffer,
    poly_bindgroup,
    composite_uniform,
    composite_uniform_buffer,
    composite_uniform_bindgroup,

    line_pipeline,
    fan_pipeline,
    circle_pipeline,
    rectangle_pipeline,
    composite_pipeline,
    composite_bindgroup,
    composite_sampler,

    rpd_replaceFg,
    rpd_replaceBg,
    rpd_replaceAnno,
    rpd_appendBg,
    rpd_appendAnno,
    rpd_replaceComposite,

    // Scratch area resources (optional)
    scratch_canvas,
    scratch_surface: scratchResources?.context,
    scratch_texture: scratchResources?.texture,
    scratch_texture_view: scratchResources?.texture_view,
    scratch_pipeline: scratchResources?.pipeline,
    scratch_grid_pipeline: scratchResources?.grid_pipeline,
    scratch_composite_pipeline: scratchResources?.composite_pipeline,
    scratch_bindgroup: scratchResources?.bindgroup,
    scratch_composite_bindgroup: scratchResources?.composite_bindgroup,
    scratch_rpd_clear: scratchResources?.rpd_clear,
    scratch_rpd_append: scratchResources?.rpd_append,
    scratch_rpd_composite: scratchResources?.rpd_composite,
    scratch_width: scratchResources?.width,
    scratch_height: scratchResources?.height,
  };
}

export function create_texture(
  texture_format: GPUTextureFormat,
  device: GPUDevice,
  textureWidth: number,
  textureHeight: number,
  fill: FillStyle
): [GPUTexture, GPUTextureView] {
  let texture_desc: GPUTextureDescriptor = {
    size: {
      width: textureWidth,
      height: textureHeight,
      depthOrArrayLayers: 1,
    },
    format: texture_format,
    usage:
      GPUTextureUsage.RENDER_ATTACHMENT |
      GPUTextureUsage.TEXTURE_BINDING |
      GPUTextureUsage.COPY_DST,
  };
  let texture = device.createTexture(texture_desc);

  if (fill === "white") {
    const data = new Uint8Array(textureWidth * textureHeight * 4).fill(255);

    device.queue.writeTexture(
      { texture: texture },
      data,
      {
        offset: 0,
        bytesPerRow: 4 * textureWidth,
        rowsPerImage: textureHeight,
      },
      {
        width: textureWidth,
        height: textureHeight,
        depthOrArrayLayers: 1,
      }
    );
  } else if (fill === "transparent") {
    const data = new Uint8Array(textureWidth * textureHeight * 4).fill(0);

    device.queue.writeTexture(
      { texture: texture },
      data,
      {
        offset: 0,
        bytesPerRow: 4 * textureWidth,
        rowsPerImage: textureHeight,
      },
      {
        width: textureWidth,
        height: textureHeight,
        depthOrArrayLayers: 1,
      }
    );
  } else if (fill === "clearColor") {
    const data = new Uint8Array(textureWidth * textureHeight * 4);
    for (let i = 0; i < textureWidth * textureHeight; i++) {
      data[i * 4 + 0] = 153;
      data[i * 4 + 1] = 153;
      data[i * 4 + 2] = 153;
      data[i * 4 + 3] = 255;
    }

    device.queue.writeTexture(
      { texture: texture },
      data,
      {
        offset: 0,
        bytesPerRow: 4 * textureWidth,
        rowsPerImage: textureHeight,
      },
      {
        width: textureWidth,
        height: textureHeight,
        depthOrArrayLayers: 1,
      }
    );
  }

  let view = texture.createView();

  return [texture, view];
}

export function create_composite_resources(
  device: GPUDevice,
  format: GPUTextureFormat,
  bg_texture_view: GPUTextureView,
  fg_texture_view: GPUTextureView,
  an_texture_view: GPUTextureView,
  composite_uniform: CompositeUniform
): [GPURenderPipeline, GPUBindGroup, GPUBuffer, GPUBindGroup, GPUSampler] {
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
    sampler,
  ];
}

export function updateCompositeBindgroup(
  model: Model,
  an_texture_view: GPUTextureView
) {
  const composite_bindgroup_layout = model.device.createBindGroupLayout({
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

  const composite_bindgroup = model.device.createBindGroup({
    layout: composite_bindgroup_layout,
    entries: [
      { binding: 0, resource: model.bg_texture_view },
      { binding: 1, resource: model.fg_texture_view },
      { binding: 2, resource: an_texture_view },
      { binding: 3, resource: model.composite_sampler },
    ],
  });

  model.composite_bindgroup = composite_bindgroup;
}

export function create_poly_resources(
  device: GPUDevice,
  format: GPUTextureFormat,
  drawUniformBuffer: DrawUniformBuffer,
  max_queued_renderpasses: number
): [
  GPUBuffer,
  GPUBindGroup,
  GPURenderPipeline,
  GPURenderPipeline,
  GPURenderPipeline,
  GPURenderPipeline
] {
  const poly_buffer = device.createBuffer({
    size: drawUniformBuffer.alignedSize * max_queued_renderpasses,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

  const poly_bindgroup_layout = device.createBindGroupLayout({
    entries: [
      {
        binding: 0,
        visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
        buffer: {
          type: "uniform",
          hasDynamicOffset: true,
        },
      },
    ],
  });

  const poly_bindgroup = device.createBindGroup({
    layout: poly_bindgroup_layout,
    entries: [
      {
        binding: 0,
        resource: {
          buffer: poly_buffer,
          offset: 0,
          size: drawUniformBuffer.alignedSize,
        },
      },
    ],
  });

  const line_shader = device.createShaderModule({
    label: "polyline shader",
    code: lineShaderCode,
  });

  const fan_shader = device.createShaderModule({
    label: "polyfan shader",
    code: fanShaderCode,
  });

  const circle_shader = device.createShaderModule({
    label: "circle shader",
    code: circleShaderCode,
  });

  const rectangle_shader = device.createShaderModule({
    label: "rectangle shader",
    code: rectangleShaderCode,
  });

  const poly_pipeline_layout = device.createPipelineLayout({
    bindGroupLayouts: [poly_bindgroup_layout],
  });

  const line_pipeline = device.createRenderPipeline({
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

  const fan_pipeline = device.createRenderPipeline({
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

  const circle_pipeline = device.createRenderPipeline({
    layout: poly_pipeline_layout,
    vertex: {
      module: circle_shader,
      entryPoint: "vs_main",
    },
    primitive: {
      topology: "triangle-list",
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
      module: circle_shader,
      entryPoint: "fs_main",
      targets: [
        {
          format: format,
          writeMask: 0xf,
        },
      ],
    },
  });

  const rectangle_pipeline = device.createRenderPipeline({
    layout: poly_pipeline_layout,
    vertex: {
      module: rectangle_shader,
      entryPoint: "vs_main",
    },
    primitive: {
      topology: "triangle-list",
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
      module: rectangle_shader,
      entryPoint: "fs_main",
      targets: [
        {
          format: format,
          writeMask: 0xf,
        },
      ],
    },
  });

  return [
    poly_buffer,
    poly_bindgroup,
    line_pipeline,
    fan_pipeline,
    circle_pipeline,
    rectangle_pipeline,
  ];
}

export function updateImageDimensions(model: Model) {
  if (
    model.image_dimensions_type === "custom" &&
    (model.image_width === null || model.image_height === null)
  ) {
    console.warn("updateImageDimensions: Received null custom image dimension");
    return;
  }

  const imageWidth =
    model.image_dimensions_type === "custom"
      ? model.image_width!
      : model.clientWidth * model.dpr;
  const clampedWidth = Math.max(
    1,
    Math.min(imageWidth, model.device.limits.maxTextureDimension2D)
  );
  const imageHeight =
    model.image_dimensions_type === "custom"
      ? model.image_height!
      : model.clientHeight * model.dpr;
  const clampedHeight = Math.max(
    1,
    Math.min(imageHeight, model.device.limits.maxTextureDimension2D)
  );

  const [fg_texture, fg_texture_view] = create_texture(
    navigator.gpu.getPreferredCanvasFormat(),
    model.device,
    clampedWidth,
    clampedHeight,
    "transparent"
  );
  const [bg_texture, bg_texture_view] = create_texture(
    navigator.gpu.getPreferredCanvasFormat(),
    model.device,
    clampedWidth,
    clampedHeight,
    "clearColor"
  );

  const composite_bindgroup_layout = model.device.createBindGroupLayout({
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

  const composite_bindgroup = model.device.createBindGroup({
    layout: composite_bindgroup_layout,
    entries: [
      { binding: 0, resource: bg_texture_view },
      { binding: 1, resource: fg_texture_view },
      { binding: 2, resource: model.an_texture_view },
      { binding: 3, resource: model.composite_sampler },
    ],
  });

  model.textureWidth = clampedWidth;
  model.textureHeight = clampedHeight;
  model.fg_texture = fg_texture;
  model.fg_texture_view = fg_texture_view;
  model.bg_texture = bg_texture;
  model.bg_texture_view = bg_texture_view;
  model.composite_bindgroup = composite_bindgroup;
  model.composite_uniform.set_texture_width(clampedWidth);
  model.composite_uniform.set_texture_height(clampedHeight);

  // update render pass descriptors with new texture views
  (
    model.rpd_replaceFg.colorAttachments as GPURenderPassColorAttachment[]
  )[0].view = fg_texture_view;
  (
    model.rpd_replaceBg.colorAttachments as GPURenderPassColorAttachment[]
  )[0].view = bg_texture_view;
  (
    model.rpd_appendBg.colorAttachments as GPURenderPassColorAttachment[]
  )[0].view = bg_texture_view;
}

export interface ScratchResources {
  canvas: HTMLCanvasElement;
  context: GPUCanvasContext;
  texture: GPUTexture;
  texture_view: GPUTextureView;
  pipeline: GPURenderPipeline;
  grid_pipeline: GPURenderPipeline;
  composite_pipeline: GPURenderPipeline;
  bindgroup: GPUBindGroup;
  composite_bindgroup: GPUBindGroup;
  rpd_clear: GPURenderPassDescriptor;
  rpd_append: GPURenderPassDescriptor;
  rpd_composite: GPURenderPassDescriptor;
  width: number;
  height: number;
}

export function create_scratch_resources(
  device: GPUDevice,
  format: GPUTextureFormat,
  canvas: HTMLCanvasElement,
  poly_buffer: GPUBuffer,
  drawUniformBuffer: DrawUniformBuffer,
  clearColor: Color
): ScratchResources {
  const context = canvas.getContext("webgpu");
  if (!context) {
    throw Error("Failed to get WebGPU context for scratch canvas");
  }

  context.configure({ device, format });

  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  const width = Math.max(1, rect.width * dpr);
  const height = Math.max(1, rect.height * dpr);

  canvas.width = width;
  canvas.height = height;

  // Create texture for scratch area
  const [texture, texture_view] = create_texture(
    format,
    device,
    width,
    height,
    "clearColor"
  );

  // Create shader modules
  const scratch_shader = device.createShaderModule({
    label: "scratch cell shader",
    code: scratchShaderCode,
  });

  const grid_shader = device.createShaderModule({
    label: "scratch grid shader",
    code: scratchGridShaderCode,
  });

  // Create poly_bindgroup_layout (same pattern as main canvas)
  const poly_bindgroup_layout = device.createBindGroupLayout({
    entries: [
      {
        binding: 0,
        visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
        buffer: {
          type: "uniform",
          hasDynamicOffset: true,
        },
      },
    ],
  });

  const bindgroup = device.createBindGroup({
    layout: poly_bindgroup_layout,
    entries: [
      {
        binding: 0,
        resource: {
          buffer: poly_buffer,
          offset: 0,
          size: drawUniformBuffer.alignedSize,
        },
      },
    ],
  });

  // Create pipeline layout
  const pipeline_layout = device.createPipelineLayout({
    bindGroupLayouts: [poly_bindgroup_layout],
  });

  const pipeline = device.createRenderPipeline({
    layout: pipeline_layout,
    vertex: { module: scratch_shader, entryPoint: "vs_main" },
    fragment: {
      module: scratch_shader,
      entryPoint: "fs_main",
      targets: [{ format }],
    },
    primitive: { topology: "triangle-list" },
  });

  const grid_pipeline = device.createRenderPipeline({
    layout: pipeline_layout,
    vertex: { module: grid_shader, entryPoint: "vs_main" },
    fragment: {
      module: grid_shader,
      entryPoint: "fs_main",
      targets: [{ format }],
    },
    primitive: { topology: "triangle-list" },
  });

  // Create composite shader and pipeline for blitting scratch texture to swapchain
  const composite_shader = device.createShaderModule({
    label: "scratch composite shader",
    code: scratchCompositeShaderCode,
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
        sampler: { type: "filtering" },
      },
    ],
  });

  const composite_pipeline_layout = device.createPipelineLayout({
    bindGroupLayouts: [composite_bindgroup_layout],
  });

  const composite_pipeline = device.createRenderPipeline({
    layout: composite_pipeline_layout,
    vertex: { module: composite_shader, entryPoint: "vs_main" },
    fragment: {
      module: composite_shader,
      entryPoint: "fs_main",
      targets: [{ format }],
    },
    primitive: { topology: "triangle-strip" },
  });

  const sampler = device.createSampler({
    addressModeU: "clamp-to-edge",
    addressModeV: "clamp-to-edge",
    magFilter: "linear",
    minFilter: "linear",
  });

  const composite_bindgroup = device.createBindGroup({
    layout: composite_bindgroup_layout,
    entries: [
      { binding: 0, resource: texture_view },
      { binding: 1, resource: sampler },
    ],
  });

  // Render pass descriptors
  const rpd_clear: GPURenderPassDescriptor = {
    label: "Scratch Clear",
    colorAttachments: [
      {
        view: texture_view,
        clearValue: clearColor,
        loadOp: "clear",
        storeOp: "store",
      },
    ],
  };

  const rpd_append: GPURenderPassDescriptor = {
    label: "Scratch Append",
    colorAttachments: [
      {
        view: texture_view,
        loadOp: "load",
        storeOp: "store",
      },
    ],
  };

  // Render pass for compositing to swapchain (view will be set each frame)
  const rpd_composite: GPURenderPassDescriptor = {
    label: "Scratch Composite",
    colorAttachments: [
      {
        view: texture_view, // placeholder, will be replaced with swapchain view
        loadOp: "clear",
        storeOp: "store",
      },
    ],
  };

  return {
    canvas,
    context,
    texture,
    texture_view,
    pipeline,
    grid_pipeline,
    composite_pipeline,
    bindgroup,
    composite_bindgroup,
    rpd_clear,
    rpd_append,
    rpd_composite,
    width,
    height,
  };
}
