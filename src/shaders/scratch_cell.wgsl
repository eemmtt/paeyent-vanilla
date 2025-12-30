// Reuses existing PolyData struct layout from DrawUniformBuffer
// x0, y0 = cell column, row (as floats)
// x1, y1 = unused
// red, green, blue, alpha = fill color
// texture_device_width, texture_device_height = canvas dimensions

struct PolyData {
    x0: f32,  // cell column (0-11)
    y0: f32,  // cell row (0-1)
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
}

// Hardcoded grid dimensions
const GRID_COLS: f32 = 12.0;
const GRID_ROWS: f32 = 2.0;

@vertex
fn vs_main(@builtin(vertex_index) vertex_index: u32) -> VertexOutput {
    var output: VertexOutput;

    let cell_width = poly.texture_device_width / GRID_COLS;
    let cell_height = poly.texture_device_height / GRID_ROWS;

    let col = poly.x0;
    let row = poly.y0;

    let left = col * cell_width;
    let right = (col + 1.0) * cell_width;
    let top = row * cell_height;
    let bottom = (row + 1.0) * cell_height;

    // Convert to NDC
    let ndc_left = (left / poly.texture_device_width) * 2.0 - 1.0;
    let ndc_right = (right / poly.texture_device_width) * 2.0 - 1.0;
    let ndc_top = 1.0 - (top / poly.texture_device_height) * 2.0;
    let ndc_bottom = 1.0 - (bottom / poly.texture_device_height) * 2.0;

    // Triangle-list quad (6 vertices)
    let positions = array(
        vec2<f32>(ndc_left, ndc_top),
        vec2<f32>(ndc_left, ndc_bottom),
        vec2<f32>(ndc_right, ndc_top),
        vec2<f32>(ndc_right, ndc_top),
        vec2<f32>(ndc_left, ndc_bottom),
        vec2<f32>(ndc_right, ndc_bottom)
    );


    output.position = vec4<f32>(positions[vertex_index], 0.0, 1.0);
    return output;
}

@fragment
fn fs_main(input: VertexOutput) -> @location(0) vec4<f32> {
    return vec4<f32>(poly.red, poly.green, poly.blue, poly.alpha);
}
