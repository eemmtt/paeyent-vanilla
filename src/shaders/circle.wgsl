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
    @location(0) css_pos: vec2<f32>,
}

@vertex
fn vs_main(@builtin(vertex_index) vertex_index: u32 ) -> VertexOutput{
    var output: VertexOutput;
    let pos_a = vec2<f32>(poly.x0, poly.y0);
    let ndc_x = (poly.x0 / poly.texture_device_width) * 2 - 1;
    let ndc_y = 1 - (poly.y0 / poly.texture_device_height) * 2;
    let ndc = vec2<f32>(ndc_x, ndc_y);
    let half_dim_css = (poly.radius + poly.line_width * 0.5);
    let half_dim_x = (half_dim_css / poly.texture_device_width) * 2;
    let half_dim_y = (half_dim_css / poly.texture_device_height) * 2;


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
        pos_a + vec2<f32>(-half_dim_css, -half_dim_css),   // 1
        pos_a + vec2<f32>(-half_dim_css, half_dim_css),    // 2
        pos_a + vec2<f32>(half_dim_css, -half_dim_css),    // 3
        pos_a + vec2<f32>(half_dim_css, -half_dim_css),    // 3
        pos_a + vec2<f32>(-half_dim_css, half_dim_css),    // 2
        pos_a + vec2<f32>(half_dim_css, half_dim_css)      // 4
    );

    output.position = vec4<f32>(ndc + offsets[vertex_index], 0, 1.0);
    output.css_pos = css_offsets[vertex_index];
    return output;
}

@fragment
fn fs_main(input: VertexOutput) -> @location(0) vec4<f32> {
    // pos_a is in css coords, input.position is in framebuffer
    // pixel coords
    let pos_a = vec2<f32>(poly.x0, poly.y0);
    let dist_css = distance(pos_a, input.css_pos);
    let on_ring = dist_css > poly.radius - (poly.line_width * 0.5) && dist_css < poly.radius + (poly.line_width * 0.5);

    if (!on_ring){
        discard;
    }
    return vec4<f32>(poly.red, poly.green, poly.blue, poly.alpha);
    //return select(vec4<f32>(0,0,0,0), poly.rgba, on_ring);
}