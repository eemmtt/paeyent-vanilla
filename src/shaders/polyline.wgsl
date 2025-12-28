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
    @location(0) color: vec4<f32>,
}

//TODO: fix bug where line offsets are distored by non-square textures
@vertex
fn vs_main(@builtin(vertex_index) vertex_index: u32) -> VertexOutput {
    var output: VertexOutput;

    // texture device coordinates to NDC
    let current_ndc = vec2<f32>(
        (poly.x1 / poly.texture_device_width) * 2.0 - 1.0,
        1.0 - (poly.y1 / poly.texture_device_height) * 2.0
    );
    let last_ndc = vec2<f32>(
        (poly.x0 / poly.texture_device_width) * 2.0 - 1.0,
        1.0 - (poly.y0 / poly.texture_device_height) * 2.0
    );

    // calc direction and perpendicular
    let dir = normalize(current_ndc - last_ndc);
    let perp = vec2<f32>(-dir.y, dir.x);
    let quarter_width = poly.line_width / poly.texture_device_width;
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
    output.color = vec4<f32>(poly.red, poly.green, poly.blue, poly.alpha);

    return output;
}

@fragment
fn fs_main(input: VertexOutput) -> @location(0) vec4<f32> {
    return input.color;
}
