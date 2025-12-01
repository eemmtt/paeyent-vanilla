struct PolyData {
    pos_a: vec2<f32>,
    pos_b: vec2<f32>,
    pos_c: vec2<f32>,
    pos_d: vec2<f32>,
    rgba: vec4<f32>,     
    line_width: f32,     
    canvas_width: f32,     
    canvas_height: f32,     
    brush_radius: f32,     
    brush_softness: f32,     
    brush_noise_jitter: f32,   
}

@group(0) @binding(0) var<uniform> poly: PolyData;

struct VertexOutput {
    @builtin(position) position: vec4<f32>,
    @location(0) color: vec4<f32>,
}

@vertex
fn vs_main(@builtin(vertex_index) vertex_index: u32) -> VertexOutput {
    var output: VertexOutput;

    // convert screen coordinates to NDC
    let current_ndc = vec2<f32>(
        (poly.pos_b.x / poly.canvas_width) * 2.0 - 1.0,
        1.0 - (poly.pos_b.y / poly.canvas_height) * 2.0
    );
    let last_ndc = vec2<f32>(
        (poly.pos_a.x / poly.canvas_width) * 2.0 - 1.0,
        1.0 - (poly.pos_a.y / poly.canvas_height) * 2.0
    );

    // calc direction and perpendicular
    let dir = normalize(current_ndc - last_ndc);
    let perp = vec2<f32>(-dir.y, dir.x);
    let quarter_width = poly.line_width / poly.canvas_width;
    let half_width = quarter_width * 2;

    // generate quad vertices
    var positions = array<vec2<f32>, 6>(
        last_ndc - perp * half_width,    // 0: bottom-left
        last_ndc + perp * half_width,    // 1: top-left
        current_ndc + perp * quarter_width, // 2: top-right
        last_ndc - perp * half_width,    // 3: bottom-left
        current_ndc + perp * quarter_width, // 4: top-right
        current_ndc - perp * quarter_width  // 5: bottom-right
    );

    output.position = vec4<f32>(positions[vertex_index], 0.0, 1.0);
    output.color = poly.rgba;

    return output;
}

@fragment
fn fs_main(input: VertexOutput) -> @location(0) vec4<f32> {
    return input.color;
}
