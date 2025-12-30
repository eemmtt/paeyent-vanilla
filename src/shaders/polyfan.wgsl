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

@vertex
fn vs_main(@builtin(vertex_index) vertex_index: u32) -> VertexOutput {
    var output: VertexOutput;

    // convert screen coordinates to NDC
    let start_ndc = vec2<f32>(
        (poly.x0 / poly.texture_device_width) * 2.0 - 1.0,
        1.0 - (poly.y0 / poly.texture_device_height) * 2.0
    );
    let middle_ndc = vec2<f32>(
        (poly.x1 / poly.texture_device_width) * 2.0 - 1.0,
        1.0 - (poly.y1 / poly.texture_device_height) * 2.0
    );
    let end_ndc = vec2<f32>(
        (poly.x2 / poly.texture_device_width) * 2.0 - 1.0,
        1.0 - (poly.y2 / poly.texture_device_height) * 2.0
    );

    // check winding order
    let edge1 = middle_ndc - start_ndc;
    let edge2 = end_ndc - start_ndc;
    let cross = edge1.x * edge2.y - edge1.y * edge2.x;

    var positions: array<vec2<f32>, 3>;
    if (cross >= 0.0) {
        // ccw
        positions = array<vec2<f32>, 3>(start_ndc, middle_ndc, end_ndc);
    } else {
        // cw
        positions = array<vec2<f32>, 3>(start_ndc, end_ndc, middle_ndc);
    }

    output.position = vec4<f32>(positions[vertex_index], 0.0, 1.0);
    output.color = vec4<f32>(poly.red * poly.alpha, poly.green * poly.alpha, poly.blue * poly.alpha, poly.alpha);

    return output;
}

@fragment
fn fs_main(input: VertexOutput) -> @location(0) vec4<f32> {
    return input.color;
}
