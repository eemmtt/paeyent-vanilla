struct PolyData {
    pos_a: vec2<f32>,
    pos_b: vec2<f32>,
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
    @location(0) css_pos: vec2<f32>,
}

@vertex
fn vs_main(@builtin(vertex_index) vertex_index: u32 ) -> VertexOutput{
    var output: VertexOutput;
    let ndc_x = (poly.pos_a.x / poly.canvas_width) * 2 - 1;
    let ndc_y = 1 - (poly.pos_a.y / poly.canvas_height) * 2;
    let ndc = vec2<f32>(ndc_x, ndc_y);
    let half_dim_css = (poly.radius + poly.line_width * 0.5);
    let half_dim_x = (half_dim_css / poly.canvas_width) * 2;
    let half_dim_y = (half_dim_css / poly.canvas_height) * 2;


    // 1 - 3  3
    // | /  / |
    // 2  2 - 4
    let offsets = array(
        vec2<f32>(-half_dim_x, half_dim_y),     // 1
        vec2<f32>(-half_dim_x, -half_dim_y),    // 2
        vec2<f32>(half_dim_x, half_dim_y),      // 3
        vec2<f32>(half_dim_x, half_dim_y),      // 3
        vec2<f32>(-half_dim_x, -half_dim_y),    // 2
        vec2<f32>(half_dim_x, -half_dim_y)      // 4
    );

    let css_offsets = array(
        poly.pos_a + vec2<f32>(-half_dim_css, -half_dim_css),   // 1
        poly.pos_a + vec2<f32>(-half_dim_css, half_dim_css),    // 2
        poly.pos_a + vec2<f32>(half_dim_css, -half_dim_css),    // 3
        poly.pos_a + vec2<f32>(half_dim_css, -half_dim_css),    // 3
        poly.pos_a + vec2<f32>(-half_dim_css, half_dim_css),    // 2
        poly.pos_a + vec2<f32>(half_dim_css, half_dim_css)      // 4
    );

    output.position = vec4<f32>(ndc + offsets[vertex_index], 0, 1.0);
    output.css_pos = css_offsets[vertex_index];
    return output;
}

@fragment
fn fs_main(input: VertexOutput) -> @location(0) vec4<f32> {
    // pos_a is in css coords, input.position is in framebuffer
    // pixel coords
    let dist_css = distance(poly.pos_a, input.css_pos);
    let on_ring = dist_css > poly.radius - (poly.line_width * 0.5) && dist_css < poly.radius + (poly.line_width * 0.5);

    if (!on_ring){
        discard;
    }
    return poly.rgba;
    //return select(vec4<f32>(0,0,0,0), poly.rgba, on_ring);
}