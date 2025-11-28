import compositeShaderCode from "./shaders/composite.wgsl?raw";
import lineShaderCode from "./shaders/polyline.wgsl?raw";
import fanShaderCode from "./shaders/polyfan.wgsl?raw";

import { type Model } from "./types/Model";
import type { Point } from "./types/Point";
import { PolyUniform } from "./types/PolyUniform";
import type { GraphicsModel } from "./types/Graphics";

type FillStyle = "transparent" | "white";

export async function wgpu_init(
  dpr: number,
  canvas: HTMLCanvasElement
): Promise<GraphicsModel> {
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

  const context = canvas.getContext("webgpu");
  if (!context) {
    throw Error("Failed to get WebGPU context from canvas");
  }
  const format = navigator.gpu.getPreferredCanvasFormat();
  context.configure({
    device,
    format,
  });

  let [bg_texture, bg_texture_view] = create_texture(
    format,
    device,
    canvas,
    "white"
  );
  let [fg_texture, fg_texture_view] = create_texture(
    format,
    device,
    canvas,
    "transparent"
  );
  let [an_texture, an_texture_view] = create_texture(
    format,
    device,
    canvas,
    "transparent"
  );

  let [composite_pipeline, composite_bindgroup] = create_composite_resources(
    device,
    format,
    bg_texture_view,
    fg_texture_view,
    an_texture_view
  );

  let poly_uniform = new PolyUniform(device, canvas);
  let [poly_buffer, poly_bindgroup, line_pipeline, fan_pipeline] =
    create_poly_resources(device, format, poly_uniform);

  console.log("Intialized WebGPU Context");
  return {
    canvas,
    format,
    device,
    surface: context,
    is_surface_configured: false,
    dpr,
    bg_texture,
    fg_texture,
    an_texture,
    bg_texture_view,
    fg_texture_view,
    an_texture_view,

    poly_uniform,
    poly_buffer,
    poly_bindgroup,
    line_pipeline,
    fan_pipeline,
    composite_pipeline,
    composite_bindgroup,
    renderQueue: [],
  };
}

//TODO: instead of passing objects around and if/else'ing
//      in render(), implement as function table
export type RenderPass =
  | {
      type: "polyline-clear-fg-and-draw-bg";
      start_pos: Point;
      end_pos: Point;
    }
  | {
      type: "polyline-clear-fg-and-draw-fg";
      start_pos: Point;
      end_pos: Point;
    }
  | {
      type: "polyfan-clear-fg-and-draw-bg";
      start_pos: Point;
      mid_pos: Point;
      end_pos: Point;
    }
  | {
      type: "polyfan-clear-fg-and-draw-fg";
      start_pos: Point;
      mid_pos: Point;
      end_pos: Point;
    }
  | {
      type: "clear-fg";
    }
  | {
      type: "clear-all";
    };

//TODO: add color
export function render(model: Model) {
  let view = model.surface.getCurrentTexture().createView();
  const encoder = model.device.createCommandEncoder({
    label: "Render Encoder",
  });

  for (let i = 0; i < model.renderQueue.length; i++) {
    const pass = model.renderQueue[i];

    if (pass.type == "polyline-clear-fg-and-draw-bg") {
      model.poly_uniform.set_pos(0, pass.start_pos);
      model.poly_uniform.set_pos(1, pass.end_pos);
      model.device.queue.writeBuffer(
        model.poly_buffer,
        i * model.poly_uniform.aligned_size,
        model.poly_uniform.data.buffer
      );

      {
        const renderpass = encoder.beginRenderPass({
          label: "FG Clear",
          colorAttachments: [
            {
              view: model.fg_texture_view,
              clearValue: [0, 0, 0, 0],
              loadOp: "clear" as GPULoadOp,
              storeOp: "store" as GPUStoreOp,
            },
          ],
        });
        renderpass.end();
      }

      {
        const renderpass = encoder.beginRenderPass({
          label: "BG Render Pass",
          colorAttachments: [
            {
              view: model.bg_texture_view,
              //clearValue: [1, 0, 0, 1],
              loadOp: "load" as GPULoadOp,
              storeOp: "store" as GPUStoreOp,
            },
          ],
        });

        renderpass.setPipeline(model.line_pipeline);
        renderpass.setBindGroup(0, model.poly_bindgroup, [
          i * model.poly_uniform.aligned_size,
        ]);
        renderpass.draw(6, 1);
        renderpass.end();
      }

      continue;
    }
    // end polyline-clear-fg-and-draw-bg

    if (pass.type == "polyline-clear-fg-and-draw-fg") {
      model.poly_uniform.set_pos(0, pass.start_pos);
      model.poly_uniform.set_pos(1, pass.end_pos);
      model.device.queue.writeBuffer(
        model.poly_buffer,
        i * model.poly_uniform.aligned_size,
        model.poly_uniform.data.buffer
      );

      const renderpass = encoder.beginRenderPass({
        label: "FG Clear and Draw Pass",
        colorAttachments: [
          {
            view: model.fg_texture_view,
            clearValue: [0, 0, 0, 0],
            loadOp: "clear" as GPULoadOp,
            storeOp: "store" as GPUStoreOp,
          },
        ],
      });

      renderpass.setPipeline(model.line_pipeline);
      renderpass.setBindGroup(0, model.poly_bindgroup, [
        i * model.poly_uniform.aligned_size,
      ]);
      renderpass.draw(6, 1);
      renderpass.end();
      continue;
    }
    // end polyline-clear-fg-and-draw-fg

    if (pass.type == "polyfan-clear-fg-and-draw-bg") {
      model.poly_uniform.set_pos(0, pass.start_pos);
      model.poly_uniform.set_pos(1, pass.mid_pos);
      model.poly_uniform.set_pos(2, pass.end_pos);
      model.device.queue.writeBuffer(
        model.poly_buffer,
        i * model.poly_uniform.aligned_size,
        model.poly_uniform.data.buffer
      );

      {
        const renderpass = encoder.beginRenderPass({
          label: "FG Clear",
          colorAttachments: [
            {
              view: model.fg_texture_view,
              clearValue: [0, 0, 0, 0],
              loadOp: "clear" as GPULoadOp,
              storeOp: "store" as GPUStoreOp,
            },
          ],
        });
        renderpass.end();
      }

      {
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
          i * model.poly_uniform.aligned_size,
        ]);
        renderpass.draw(3, 1);
        renderpass.end();
      }

      continue;
    }

    if (pass.type == "polyfan-clear-fg-and-draw-fg") {
      model.poly_uniform.set_pos(0, pass.start_pos);
      model.poly_uniform.set_pos(1, pass.mid_pos);
      model.poly_uniform.set_pos(2, pass.end_pos);
      model.device.queue.writeBuffer(
        model.poly_buffer,
        i * model.poly_uniform.aligned_size,
        model.poly_uniform.data.buffer
      );

      const renderpass = encoder.beginRenderPass({
        label: "FG Clear and Draw Pass",
        colorAttachments: [
          {
            view: model.fg_texture_view,
            clearValue: [0, 0, 0, 0],
            loadOp: "clear" as GPULoadOp,
            storeOp: "store" as GPUStoreOp,
          },
        ],
      });

      renderpass.setPipeline(model.fan_pipeline);
      renderpass.setBindGroup(0, model.poly_bindgroup, [
        i * model.poly_uniform.aligned_size,
      ]);
      renderpass.draw(3, 1);
      renderpass.end();
      continue;
    }

    if (pass.type == "clear-fg") {
      const renderpass = encoder.beginRenderPass({
        label: "FG Clear",
        colorAttachments: [
          {
            view: model.fg_texture_view,
            clearValue: [0, 0, 0, 0],
            loadOp: "clear" as GPULoadOp,
            storeOp: "store" as GPUStoreOp,
          },
        ],
      });
      renderpass.end();

      continue;
    }

    if (pass.type == "clear-all") {
      {
        const renderpass = encoder.beginRenderPass({
          label: "FG Clear",
          colorAttachments: [
            {
              view: model.fg_texture_view,
              clearValue: [0, 0, 0, 0],
              loadOp: "clear" as GPULoadOp,
              storeOp: "store" as GPUStoreOp,
            },
          ],
        });
        renderpass.end();
      }

      {
        const renderpass = encoder.beginRenderPass({
          label: "BG Clear",
          colorAttachments: [
            {
              view: model.bg_texture_view,
              clearValue: [1, 1, 1, 1],
              loadOp: "clear" as GPULoadOp,
              storeOp: "store" as GPUStoreOp,
            },
          ],
        });
        renderpass.end();
      }

      continue;
    }
  }

  // always finish with composite pass
  {
    const pass = encoder.beginRenderPass({
      label: "Composite Render Pass",
      colorAttachments: [
        {
          view,
          clearValue: [0, 0, 0, 0],
          loadOp: "clear" as GPULoadOp,
          storeOp: "store" as GPUStoreOp,
        },
      ],
    });
    pass.setPipeline(model.composite_pipeline);
    pass.setBindGroup(0, model.composite_bindgroup);
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
  an_texture_view: GPUTextureView
): [GPURenderPipeline, GPUBindGroup] {
  let composite_shader = device.createShaderModule({
    label: "texture compositor",
    code: compositeShaderCode,
  });

  let composite_bindgroup_layout = device.createBindGroupLayout({
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

  let composite_pipeline_layout = device.createPipelineLayout({
    bindGroupLayouts: [composite_bindgroup_layout],
  });

  let composite_pipeline = device.createRenderPipeline({
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

  let sampler = device.createSampler({
    addressModeU: "clamp-to-edge",
    addressModeV: "clamp-to-edge",
    addressModeW: "clamp-to-edge",
    magFilter: "linear",
    minFilter: "linear",
  });

  let composite_bindgroup = device.createBindGroup({
    layout: composite_bindgroup_layout,
    entries: [
      { binding: 0, resource: bg_texture_view },
      { binding: 1, resource: fg_texture_view },
      { binding: 2, resource: an_texture_view },
      { binding: 3, resource: sampler },
    ],
  });

  return [composite_pipeline, composite_bindgroup];
}

function create_poly_resources(
  device: GPUDevice,
  format: GPUTextureFormat,
  poly_uniform: PolyUniform
): [GPUBuffer, GPUBindGroup, GPURenderPipeline, GPURenderPipeline] {
  const max_queued_renderpasses = 16;

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
