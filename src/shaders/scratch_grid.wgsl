struct PolyData {
    x0: f32,
    y0: f32,
    x1: f32,
    y1: f32,
    x2: f32,
    y2: f32,
    red: f32,
    green: f32,
    blue: f32,
    alpha: f32,
    line_width: f32,
    radius: f32,
    softness: f32,
    noise_jitter: f32,
    texture_device_width: f32,
    texture_device_height: f32,
}

@group(0) @binding(0) var<uniform> poly: PolyData;

struct VertexOutput {
    @builtin(position) position: vec4<f32>,
    @location(0) device_pos: vec2<f32>,
}

const GRID_COLS: f32 = 12.0;
const GRID_ROWS: f32 = 2.0;
const GRID_LINE_WIDTH: f32 = 1.0;

@vertex
fn vs_main(@builtin(vertex_index) vertex_index: u32) -> VertexOutput {
    var output: VertexOutput;

    // Full-screen quad
    let positions = array(
        vec2<f32>(-1.0, 1.0),
        vec2<f32>(-1.0, -1.0),
        vec2<f32>(1.0, 1.0),
        vec2<f32>(1.0, 1.0),
        vec2<f32>(-1.0, -1.0),
        vec2<f32>(1.0, -1.0)
    );

    let device_positions = array(
        vec2<f32>(0.0, 0.0),
        vec2<f32>(0.0, poly.texture_device_height),
        vec2<f32>(poly.texture_device_width, 0.0),
        vec2<f32>(poly.texture_device_width, 0.0),
        vec2<f32>(0.0, poly.texture_device_height),
        vec2<f32>(poly.texture_device_width, poly.texture_device_height)
    );

    output.position = vec4<f32>(positions[vertex_index], 0.0, 1.0);
    output.device_pos = device_positions[vertex_index];
    return output;
}

@fragment
fn fs_main(input: VertexOutput) -> @location(0) vec4<f32> {
    let cell_width = poly.texture_device_width / GRID_COLS;
    let cell_height = poly.texture_device_height / GRID_ROWS;

    let x_mod = input.device_pos.x % cell_width;
    let y_mod = input.device_pos.y % cell_height;

    let on_vertical_line = x_mod < GRID_LINE_WIDTH || x_mod > (cell_width - GRID_LINE_WIDTH);
    let on_horizontal_line = y_mod < GRID_LINE_WIDTH || y_mod > (cell_height - GRID_LINE_WIDTH);
    let on_grid_line = on_vertical_line || on_horizontal_line;

    if (!on_grid_line) {
        discard;
    }

    return vec4<f32>(0.0, 0.0, 0.0, 1.0);
}
