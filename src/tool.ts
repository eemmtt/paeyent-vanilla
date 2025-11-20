import { type Model } from "./main";

//TODO: add dots

export type ToolType = "line" | "fan" | "dots";

export function tool_start(model: Model, event: PointerEvent) {
  model.is_drawing = true;
  if (model.curr_tool == "line") {
    model.pos_a = { x: event.x * model.dpr, y: event.y * model.dpr };
    model.num_pts = 1;
    return;
  }
  if (model.curr_tool == "fan") {
    model.pos_a = { x: event.x * model.dpr, y: event.y * model.dpr };
    model.num_pts = 1;
    return;
  }
}

export function tool_stop(model: Model, event: PointerEvent) {
  if (model.curr_tool == "line") {
    model.renderQueue.push({
      type: "polyline-clear-fg-and-draw-bg",
      start_pos: model.pos_a,
      end_pos: { x: event.x * model.dpr, y: event.y * model.dpr },
    });

    const radius = 15;
    const dist = Math.sqrt(
      (event.x * model.dpr - model.pos_a.x) ** 2 +
        (event.y * model.dpr - model.pos_a.y) ** 2
    );
    if (dist <= radius) {
      model.is_drawing = false;
    } else {
      tool_start(model, event);
    }
    return;
  }
  if (model.curr_tool == "fan") {
    if (model.num_pts == 1) {
      // draw line
      model.renderQueue.push({
        type: "polyline-clear-fg-and-draw-bg",
        start_pos: model.pos_a,
        end_pos: { x: event.x * model.dpr, y: event.y * model.dpr },
      });
      model.pos_b = { x: event.x * model.dpr, y: event.y * model.dpr };
      model.num_pts = 2;
    } else if (model.num_pts == 2) {
      //draw triangle
      model.renderQueue.push({
        type: "polyfan-clear-fg-and-draw-bg",
        start_pos: model.pos_a,
        mid_pos: model.pos_b,
        end_pos: { x: event.x * model.dpr, y: event.y * model.dpr },
      });
      model.pos_b = { x: event.x * model.dpr, y: event.y * model.dpr };
    }

    const radius = 15;
    const dist = Math.sqrt(
      (event.x * model.dpr - model.pos_a.x) ** 2 +
        (event.y * model.dpr - model.pos_a.y) ** 2
    );
    if (dist <= radius) {
      model.is_drawing = false;
      model.num_pts = 0;
    }
    return;
  }
}

export function tool_hover(model: Model, event: PointerEvent) {
  if (model.curr_tool == "line") {
    model.renderQueue.push({
      type: "polyline-clear-fg-and-draw-fg",
      start_pos: model.pos_a,
      end_pos: { x: event.x * model.dpr, y: event.y * model.dpr },
    });
  }

  if (model.curr_tool == "fan") {
    if (model.num_pts == 1) {
      model.renderQueue.push({
        type: "polyline-clear-fg-and-draw-fg",
        start_pos: model.pos_a,
        end_pos: { x: event.x * model.dpr, y: event.y * model.dpr },
      });
    } else if (model.num_pts == 2) {
      model.renderQueue.push({
        type: "polyfan-clear-fg-and-draw-fg",
        start_pos: model.pos_a,
        mid_pos: model.pos_b,
        end_pos: { x: event.x * model.dpr, y: event.y * model.dpr },
      });
    }
  }
}

export function tool_cancel(model: Model) {
  model.is_drawing = false;
  model.num_pts = 0;
  model.renderQueue.push({
    type: "clear-fg",
  });
}
