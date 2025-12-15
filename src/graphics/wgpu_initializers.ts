import compositeShaderCode from "../shaders/composite.wgsl?raw";
import lineShaderCode from "../shaders/polyline.wgsl?raw";
import fanShaderCode from "../shaders/polyfan.wgsl?raw";
import circleShaderCode from "../shaders/circle.wgsl?raw";
import rectangleShaderCode from "../shaders/rectangle.wgsl?raw";

import { CompositeUniform } from "../types/CompositeUniform";
import { PolyUniform } from "../types/PolyUniform";
import { RenderPassBuffer } from "../types/RenderPassBuffer";
import { RenderPassDataBuffer } from "../types/RenderPassDataBuffer";
import type { GraphicsModel, Color } from "./Graphics";
import { wgpu_render } from "./wgpu_render";
import type { Model } from "../types/Model";

export type FillStyle = "transparent" | "white";

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
    composite_sampler,
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

  const [
    poly_buffer,
    poly_bindgroup,
    line_pipeline,
    fan_pipeline,
    circle_pipeline,
    rectangle_pipeline,
  ] = create_poly_resources(device, format, poly_uniform, maxRenderPasses);

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
    circle_pipeline,
    rectangle_pipeline,
    composite_pipeline,
    composite_bindgroup,
    composite_sampler,

    renderPassBuffer,
    renderPassDataBuffer,
    render: wgpu_render,
  };
}

export function create_texture(
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
  poly_uniform: PolyUniform,
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
    size: poly_uniform.aligned_size * max_queued_renderpasses,
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
          size: poly_uniform.aligned_size,
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
