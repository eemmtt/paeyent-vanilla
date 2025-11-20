struct PolyData {
    pos_a: vec2<f32>,
    pos_b: vec2<f32>,
    pos_c: vec2<f32>,
    pos_d: vec2<f32>,
    pos_e: vec2<f32>,
    pos_f: vec2<f32>,
    pos_g: vec2<f32>,
    pos_h: vec2<f32>,
    pos_i: vec2<f32>,
    pos_j: vec2<f32>,
    pos_k: vec2<f32>,
    pos_l: vec2<f32>,
    pos_m: vec2<f32>,
    pos_n: vec2<f32>,
    pos_o: vec2<f32>,
    pos_p: vec2<f32>,
    rgba:  vec4<f32>,
    line_width:     f32,     
    canvas_width:   f32,     
    canvas_height:  f32,     
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
        (poly.pos_a.x / poly.canvas_width) * 2.0 - 1.0,
        1.0 - (poly.pos_a.y / poly.canvas_height) * 2.0
    );
    let middle_ndc = vec2<f32>(
        (poly.pos_b.x / poly.canvas_width) * 2.0 - 1.0,
        1.0 - (poly.pos_b.y / poly.canvas_height) * 2.0
    );
    let end_ndc = vec2<f32>(
        (poly.pos_c.x / poly.canvas_width) * 2.0 - 1.0,
        1.0 - (poly.pos_c.y / poly.canvas_height) * 2.0
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
    output.color = vec4<f32>(0.0, 0.0, 0.0, 1.0);

    return output;
}

@fragment
fn fs_main(input: VertexOutput) -> @location(0) vec4<f32> {
    return input.color;
}
