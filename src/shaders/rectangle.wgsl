struct PolyData {
    pos_a: vec2<f32>, //left, top
    pos_b: vec2<f32>, //right, bottom
    pos_c: vec2<f32>,
    pos_d: vec2<f32>,
    rgba: vec4<f32>,     
    line_width: f32,     
    canvas_width: f32,     
    canvas_height: f32,     
    radius: f32,     
    softness: f32,     
    noise_jitter: f32,   
}

@group(0) @binding(0) var<uniform> poly: PolyData;

struct VertexOutput {
    @builtin(position) position: vec4<f32>,
    @location(0) device_pos: vec2<f32>,
}

@vertex
fn vs_main(@builtin(vertex_index) vertex_index: u32) -> VertexOutput{
    var output: VertexOutput;
    let top = poly.pos_a.y - poly.line_width;
    let bottom = poly.pos_b.y + poly.line_width;
    let left = poly.pos_a.x - poly.line_width;
    let right = poly.pos_b.x + poly.line_width;
    let half_width = (right - left) * 0.5;
    let half_height = (bottom - top) * 0.5;
    let center = vec2<f32>(half_width, half_height);

    let ndc_left = (left / poly.canvas_width) * 2 - 1;
    let ndc_right = (right / poly.canvas_width)* 2 - 1;
    let ndc_top = 1 - (top / poly.canvas_height) * 2;
    let ndc_bottom = 1 - (bottom / poly.canvas_height) * 2;

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
    let on_edge =   abs(poly.pos_a.x - input.device_pos.x) < poly.line_width ||
                    abs(poly.pos_a.y - input.device_pos.y) < poly.line_width ||
                    abs(poly.pos_b.x - input.device_pos.x) < poly.line_width ||
                    abs(poly.pos_b.y - input.device_pos.y) < poly.line_width;

    if (!on_edge){
        discard;
    }
    return poly.rgba;

    //return select(vec4<f32>(0,0,0,0), poly.rgba, on_edge);
}