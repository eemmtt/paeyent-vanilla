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

@vertex
fn vs_main(@builtin(vertex_index) vertex_index: u32) -> VertexOutput{
    var output: VertexOutput;
    let top = poly.y0 - poly.line_width;
    let bottom = poly.y1 + poly.line_width;
    let left = poly.x0 - poly.line_width;
    let right = poly.x1 + poly.line_width;
    let half_width = (right - left) * 0.5;
    let half_height = (bottom - top) * 0.5;
    let center = vec2<f32>(half_width, half_height);

    let ndc_left = (left / poly.texture_device_width) * 2 - 1;
    let ndc_right = (right / poly.texture_device_width)* 2 - 1;
    let ndc_top = 1 - (top / poly.texture_device_height) * 2;
    let ndc_bottom = 1 - (bottom / poly.texture_device_height) * 2;

    // 1 - 3  3
    // | /  / |
    // 2  2 - 4
    let positions = array(
        vec2<f32>(ndc_left, ndc_top),       // 1
        vec2<f32>(ndc_left, ndc_bottom),    // 2
        vec2<f32>(ndc_right, ndc_top),      // 3
        vec2<f32>(ndc_right, ndc_top),      // 3
        vec2<f32>(ndc_left, ndc_bottom),    // 2
        vec2<f32>(ndc_right, ndc_bottom)    // 4
    );

    let device_offsets = array(
        vec2<f32>(left, top),     // 1
        vec2<f32>(left, bottom),    // 2
        vec2<f32>(right, top),      // 3
        vec2<f32>(right, top),      // 3
        vec2<f32>(left, bottom),    // 2
        vec2<f32>(right, bottom)      // 4
    );

    output.position = vec4<f32>(positions[vertex_index], 0, 1.0);
    output.device_pos = device_offsets[vertex_index];
    return output;
}

@fragment
fn fs_main(input: VertexOutput) -> @location(0) vec4<f32> {
    let on_edge =   abs(poly.x0 - input.device_pos.x) < poly.line_width ||
                    abs(poly.y0 - input.device_pos.y) < poly.line_width ||
                    abs(poly.x1 - input.device_pos.x) < poly.line_width ||
                    abs(poly.y1 - input.device_pos.y) < poly.line_width;

    if (!on_edge){
        discard;
    }
    return vec4<f32>(poly.red * poly.alpha, poly.green * poly.alpha, poly.blue * poly.alpha, poly.alpha);
}