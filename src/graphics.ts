import compositeShaderCode from "./shaders/composite.wgsl?raw";
import lineShaderCode from "./shaders/polyline.wgsl?raw";
import fanShaderCode from "./shaders/polyfan.wgsl?raw";

import { type Model } from "./main";
import { ToolLookup } from "./tool";

export type Point = {
  x: number;
  y: number;
};

export class PolyUniform {
  /*
    pos_a:       [f32;2],    //8
    pos_b:       [f32;2],    //8
    pos_c:       [f32;2],    //8
    pos_d:       [f32;2],    //8
    pos_e:       [f32;2],    //8
    pos_f:       [f32;2],    //8
    pos_g:       [f32;2],    //8
    pos_h:       [f32;2],    //8
    pos_i:       [f32;2],    //8
    pos_j:       [f32;2],    //8
    pos_k:       [f32;2],    //8
    pos_l:       [f32;2],    //8
    pos_m:       [f32;2],    //8
    pos_n:       [f32;2],    //8
    pos_o:       [f32;2],    //8
    pos_p:       [f32;2],    //8
    rgba:        [f32;4],   //16
    line_width:     f32,     //4
    canvas_width:   f32,     //4
    canvas_height:  f32,     //4
    */
  readonly aligned_size: number;
  readonly bytes_size = 156; // (16*2 + 4 + 3) * sizeof(f32) = 39 * 4 = 156, padded to 160

  // Position offsets (each position is 2 floats)
  readonly offset_pos_a = 0;
  readonly offset_pos_b = 2;
  readonly offset_pos_c = 4;
  readonly offset_pos_d = 6;
  readonly offset_pos_e = 8;
  readonly offset_pos_f = 10;
  readonly offset_pos_g = 12;
  readonly offset_pos_h = 14;
  readonly offset_pos_i = 16;
  readonly offset_pos_j = 18;
  readonly offset_pos_k = 20;
  readonly offset_pos_l = 22;
  readonly offset_pos_m = 24;
  readonly offset_pos_n = 26;
  readonly offset_pos_o = 28;
  readonly offset_pos_p = 30;

  // RGBA offset (4 floats)
  readonly offset_rgba = 32;

  // Other uniforms
  readonly offset_line_width = 36;
  readonly offset_canvas_width = 37;
  readonly offset_canvas_height = 38;
  readonly offset_padding = 39;

  data: Float32Array;

  constructor(device: GPUDevice, canvas: HTMLCanvasElement) {
    this.data = new Float32Array(40); // 39 floats + 1 padding for alignment
    this.data.fill(0);
    this.data.set([1, 1, 1, 1], this.offset_rgba); // default white
    this.data.set([2], this.offset_line_width);
    this.data.set([canvas.width], this.offset_canvas_width);
    this.data.set([canvas.height], this.offset_canvas_height);

    const alignment = device.limits.minUniformBufferOffsetAlignment;
    this.aligned_size = Math.ceil((40 * 4) / alignment) * alignment;
  }

  // Position setters and getters
  set_pos_a(pt: Point) {
    this.data.set([pt.x, pt.y], this.offset_pos_a);
  }
  get_pos_a(): Point {
    return {
      x: this.data[this.offset_pos_a],
      y: this.data[this.offset_pos_a + 1],
    };
  }

  set_pos_b(pt: Point) {
    this.data.set([pt.x, pt.y], this.offset_pos_b);
  }
  get_pos_b(): Point {
    return {
      x: this.data[this.offset_pos_b],
      y: this.data[this.offset_pos_b + 1],
    };
  }

  set_pos_c(pt: Point) {
    this.data.set([pt.x, pt.y], this.offset_pos_c);
  }
  get_pos_c(): Point {
    return {
      x: this.data[this.offset_pos_c],
      y: this.data[this.offset_pos_c + 1],
    };
  }

  set_pos_d(pt: Point) {
    this.data.set([pt.x, pt.y], this.offset_pos_d);
  }
  get_pos_d(): Point {
    return {
      x: this.data[this.offset_pos_d],
      y: this.data[this.offset_pos_d + 1],
    };
  }

  set_pos_e(pt: Point) {
    this.data.set([pt.x, pt.y], this.offset_pos_e);
  }
  get_pos_e(): Point {
    return {
      x: this.data[this.offset_pos_e],
      y: this.data[this.offset_pos_e + 1],
    };
  }

  set_pos_f(pt: Point) {
    this.data.set([pt.x, pt.y], this.offset_pos_f);
  }
  get_pos_f(): Point {
    return {
      x: this.data[this.offset_pos_f],
      y: this.data[this.offset_pos_f + 1],
    };
  }

  set_pos_g(pt: Point) {
    this.data.set([pt.x, pt.y], this.offset_pos_g);
  }
  get_pos_g(): Point {
    return {
      x: this.data[this.offset_pos_g],
      y: this.data[this.offset_pos_g + 1],
    };
  }

  set_pos_h(pt: Point) {
    this.data.set([pt.x, pt.y], this.offset_pos_h);
  }
  get_pos_h(): Point {
    return {
      x: this.data[this.offset_pos_h],
      y: this.data[this.offset_pos_h + 1],
    };
  }

  set_pos_i(pt: Point) {
    this.data.set([pt.x, pt.y], this.offset_pos_i);
  }
  get_pos_i(): Point {
    return {
      x: this.data[this.offset_pos_i],
      y: this.data[this.offset_pos_i + 1],
    };
  }

  set_pos_j(pt: Point) {
    this.data.set([pt.x, pt.y], this.offset_pos_j);
  }
  get_pos_j(): Point {
    return {
      x: this.data[this.offset_pos_j],
      y: this.data[this.offset_pos_j + 1],
    };
  }

  set_pos_k(pt: Point) {
    this.data.set([pt.x, pt.y], this.offset_pos_k);
  }
  get_pos_k(): Point {
    return {
      x: this.data[this.offset_pos_k],
      y: this.data[this.offset_pos_k + 1],
    };
  }

  set_pos_l(pt: Point) {
    this.data.set([pt.x, pt.y], this.offset_pos_l);
  }
  get_pos_l(): Point {
    return {
      x: this.data[this.offset_pos_l],
      y: this.data[this.offset_pos_l + 1],
    };
  }

  set_pos_m(pt: Point) {
    this.data.set([pt.x, pt.y], this.offset_pos_m);
  }
  get_pos_m(): Point {
    return {
      x: this.data[this.offset_pos_m],
      y: this.data[this.offset_pos_m + 1],
    };
  }

  set_pos_n(pt: Point) {
    this.data.set([pt.x, pt.y], this.offset_pos_n);
  }
  get_pos_n(): Point {
    return {
      x: this.data[this.offset_pos_n],
      y: this.data[this.offset_pos_n + 1],
    };
  }

  set_pos_o(pt: Point) {
    this.data.set([pt.x, pt.y], this.offset_pos_o);
  }
  get_pos_o(): Point {
    return {
      x: this.data[this.offset_pos_o],
      y: this.data[this.offset_pos_o + 1],
    };
  }

  set_pos_p(pt: Point) {
    this.data.set([pt.x, pt.y], this.offset_pos_p);
  }
  get_pos_p(): Point {
    return {
      x: this.data[this.offset_pos_p],
      y: this.data[this.offset_pos_p + 1],
    };
  }

  set_rgba(r: number, g: number, b: number, a: number) {
    this.data.set([r, g, b, a], this.offset_rgba);
  }
  get_rgba(): [number, number, number, number] {
    return [
      this.data[this.offset_rgba],
      this.data[this.offset_rgba + 1],
      this.data[this.offset_rgba + 2],
      this.data[this.offset_rgba + 3],
    ];
  }

  set_line_width(width: number) {
    this.data[this.offset_line_width] = width;
  }
  get_line_width(): number {
    return this.data[this.offset_line_width];
  }

  set_canvas_width(width: number) {
    this.data[this.offset_canvas_width] = width;
  }
  get_canvas_width(): number {
    return this.data[this.offset_canvas_width];
  }

  set_canvas_height(height: number) {
    this.data[this.offset_canvas_height] = height;
  }
  get_canvas_height(): number {
    return this.data[this.offset_canvas_height];
  }

  set_pos(index: number, pt: Point) {
    if (index < 0 || index > 15) {
      throw new Error(`Position index must be 0-15, got ${index}`);
    }
    const offset = index * 2;
    this.data.set([pt.x, pt.y], offset);
  }

  get_pos(index: number): Point {
    if (index < 0 || index > 15) {
      throw new Error(`Position index must be 0-15, got ${index}`);
    }
    const offset = index * 2;
    return { x: this.data[offset], y: this.data[offset + 1] };
  }

  update_dims(width: number, height: number) {
    const old_width = this.data[this.offset_canvas_width];
    const old_height = this.data[this.offset_canvas_height];

    for (let i = 0; i < 16; i++) {
      const offset = i * 2;
      const new_x = (this.data[offset] / old_width) * width;
      const new_y = (this.data[offset + 1] / old_height) * height;
      this.data.set([new_x, new_y], offset);
    }

    this.set_canvas_width(width);
    this.set_canvas_height(height);
  }
}

type FillStyle = "transparent" | "white";

export async function wgpu_init(dpr: number, canvas: HTMLCanvasElement) {
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

  let result: Model = {
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

    pointerEventQueue: [],
    curr_tool: ToolLookup["polyline"],
    is_drawing: false,
    pos_a: { x: 0, y: 0 },
    pos_b: { x: 0, y: 0 },
    pos_c: { x: 0, y: 0 },
    num_pts: 0,
    renderQueue: [],
  };
  console.log("Intialized WebGPU Context");
  return result;
}

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
      model.poly_uniform.set_pos_a(pass.start_pos);
      model.poly_uniform.set_pos_b(pass.end_pos);
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

    if (pass.type == "polyline-clear-fg-and-draw-fg") {
      model.poly_uniform.set_pos_a(pass.start_pos);
      model.poly_uniform.set_pos_b(pass.end_pos);
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

    if (pass.type == "polyfan-clear-fg-and-draw-bg") {
      model.poly_uniform.set_pos_a(pass.start_pos);
      model.poly_uniform.set_pos_b(pass.mid_pos);
      model.poly_uniform.set_pos_c(pass.end_pos);
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
      model.poly_uniform.set_pos_a(pass.start_pos);
      model.poly_uniform.set_pos_b(pass.mid_pos);
      model.poly_uniform.set_pos_c(pass.end_pos);
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
    }
  }

  {
    // always finish with composite pass
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
