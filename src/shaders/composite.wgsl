struct CompositeUniforms {
    texture_offset: vec2<f32>,
    zoom: f32,
    texture_width: f32,
    texture_height: f32,
    viewport_width: f32,
    viewport_height: f32,
    grid_min_zoom: f32,
    background_color: vec3<f32>,
    grid_color: vec3<f32>,
    grid_alpha: f32,
    grid_line_width: f32,
}

@group(0) @binding(0) var background_tex: texture_2d<f32>;
@group(0) @binding(1) var foreground_tex: texture_2d<f32>;
@group(0) @binding(2) var annotation_tex: texture_2d<f32>;
@group(0) @binding(3) var tex_sampler: sampler;
@group(1) @binding(0) var<uniform> u: CompositeUniforms;

struct VertexOutput {
    @builtin(position) ndc_pos: vec4<f32>,
    @location(0) viewport_pos: vec2<f32>,
}

@vertex
fn vs_main(@builtin(vertex_index) vertex_index: u32) -> VertexOutput {

    let x = f32((vertex_index & 1u) << 2u) - 1.0;
    let y = f32((vertex_index & 2u) << 1u) - 1.0;

    var output: VertexOutput;
    output.ndc_pos = vec4<f32>(x, -y, 0.0, 1.0);
    output.viewport_pos = vec2<f32>(
        (x + 1.0) * 0.5 * u.viewport_width,
        (y + 1.0) * 0.5 * u.viewport_height
    );

    return output;
}

@fragment
fn fs_main(input: VertexOutput) -> @location(0) vec4<f32> {

    // viewport coord -> texture coordinates
    let texture_pos = (input.viewport_pos - u.texture_offset) / u.zoom;
    let texture_size = vec2<f32>(u.texture_width, u.texture_height);

    let in_texture = texture_pos.x >= 0.0 && texture_pos.x < texture_size.x &&
                    texture_pos.y >= 0.0 && texture_pos.y < texture_size.y;

    // sample textures, clamp to texture uv space
    let texture_uv_coordinates = clamp(texture_pos / texture_size, vec2<f32>(0.0), vec2<f32>(1.0));
    let bg = textureSample(background_tex, tex_sampler, texture_uv_coordinates);
    let fg = textureSample(foreground_tex, tex_sampler, texture_uv_coordinates);
    let an = textureSample(annotation_tex, tex_sampler, texture_uv_coordinates);

    // composite fg over bg
    var aggregate_texture_color = fg.rgb * fg.a + bg.rgb * (1.0 - fg.a);

    // pixel grid overlay for high zoom levels
    let grid_pos = texture_pos + 0.5;
    let dist_to_edge = min(fract(grid_pos), 1.0 - fract(grid_pos));
    let on_grid = f32(dist_to_edge.x < u.grid_line_width || dist_to_edge.y < u.grid_line_width);
    let grid_visible = f32(u.zoom >= u.grid_min_zoom);

    aggregate_texture_color = mix(aggregate_texture_color, u.grid_color, u.grid_alpha * on_grid * grid_visible);

    // return texture mixed with background
    return vec4<f32>(
        mix(u.background_color, aggregate_texture_color, f32(in_texture)),
        1.0
    );
}
