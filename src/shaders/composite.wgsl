@group(0) @binding(0) var background_tex: texture_2d<f32>;
@group(0) @binding(1) var foreground_tex: texture_2d<f32>;
@group(0) @binding(2) var annotation_tex: texture_2d<f32>;
@group(0) @binding(3) var tex_sampler: sampler;

struct VertexOutput {
    @builtin(position) position: vec4<f32>,
    @location(0) tex_coords: vec2<f32>,
}

@vertex
fn vs_main(@builtin(vertex_index) vertex_index: u32) -> VertexOutput {
    var output: VertexOutput;

    let x = f32((vertex_index & 1u) << 2u) - 1.0;
    let y = f32((vertex_index & 2u) << 1u) - 1.0;

    output.position = vec4<f32>(x, -y, 0.0, 1.0);
    output.tex_coords = vec2<f32>((x + 1.0) * 0.5, (y + 1.0) * 0.5);

    return output;
}

@fragment
fn fs_main(input: VertexOutput) -> @location(0) vec4<f32> {
    let bg = textureSample(background_tex, tex_sampler, input.tex_coords);
    let fg = textureSample(foreground_tex, tex_sampler, input.tex_coords);
    let an = textureSample(annotation_tex, tex_sampler, input.tex_coords);

    // alpha blend foreground over background
    var result = vec4<f32>(
        fg.rgb * fg.a + bg.rgb * (1.0 - fg.a),
        1.0
    );

    // diff blend annotation on top
    result = vec4<f32>(
        an.rgb * an.a + result.rgb * (1.0 - an.a),
        1.0
    );

    return result;
}
