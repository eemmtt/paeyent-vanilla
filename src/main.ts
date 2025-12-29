import "./style.css";
import { ToolUpdaters, ToolStride } from "./types/Tool";
import { type Model, model_init, type SessionSettings } from "./types/Model";
import { UIUpdaters } from "./ui/updaters";
import { handlers_init } from "./ui/handlers";

export function mainLoop(model: Model) {
  // loop over each PaeyentEvent and call their updater
  for (let i = 0; i < model.eventBuffer.top; i++) {
    if (model.eventBuffer.indexIsPointerEvent(i)) {
      ToolUpdaters[
        model.curr_tool * ToolStride + model.eventBuffer.getLookupId(i)
      ](model, i);
    } else if (model.eventBuffer.indexIsUIEvent(i)) {
      UIUpdaters[model.eventBuffer.getLookupId(i)](model);
    } else {
      console.warn(
        `mainLoop: Unhandled event type ${model.eventBuffer.getEventType(i)}`
      );
    }
  }
  model.eventBuffer.clear();

  // render DrawUniform buffer
  if (model.drawUniformBuffer.top > 0) {
    model.render(model);
    model.drawUniformBuffer.clear();
  }

  requestAnimationFrame(model._mainLoop);
}

//TODO: add scratch area, color picker
//TODO: add constraints
//TODO: load options from local storage if exists
async function main() {
  /* init model */
  const settings: SessionSettings = {
    constraint_type: "none",
    color_picker_type: "rgb",
    scratch_area: false,
    image_dimensions_type: "custom",
    image_width: 2048,
    image_height: 2048,
  };

  const model = await model_init(settings);
  handlers_init(model, document);

  //debugging cross
  model.drawUniformBuffer.pushLineAppendBg(
    0,
    0,
    model.textureWidth,
    model.textureHeight,
    1,
    0,
    0
  );

  model.drawUniformBuffer.pushLineAppendBg(
    model.textureWidth,
    0,
    0,
    model.textureHeight,
    0,
    1,
    0
  );

  /* start update + render loop */
  model._mainLoop = () => {
    mainLoop(model);
  };
  model._mainLoop();
}

main();
