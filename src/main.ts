import "./style.css";
import { ToolUpdaters, ToolStride } from "./types/Tool";
import { type Model, model_init, type SessionSettings } from "./types/Model";
import { UIUpdaters } from "./ui/updaters";
import { handlers_init } from "./ui/handlers";

export function mainLoop(model: Model) {
  model.timeoutId = setTimeout(() => {
    // time frame
    const frameAvg = model.frameTimes.push(
      performance.now() - model.frameStart
    );
    model.frameStart = performance.now();
    //console.log("Frame time:", model.frameTimes.getAverage());

    // time update
    model.updateStart = performance.now();

    // loop over each PaeyentEvent and call their handler
    for (let i = 0; i < model.eventBuffer.top; i++) {
      if (model.eventBuffer.id[i] === 0 /* PointerEvent */) {
        ToolUpdaters[model.curr_tool * ToolStride + model.eventBuffer.type[i]](
          model,
          model.eventBuffer.dataIdx[i]
        );
      } else if (model.eventBuffer.id[i] === 1 /* UIEvent */) {
        UIUpdaters[model.eventBuffer.type[i]](model);
      } else {
        console.warn(
          `mainLoop: Unhandled model.eventQueue.id ${model.eventBuffer.id[i]}`
        );
      }
    }
    model.eventBuffer.clear();
    model.eventDataBuffer.clear();

    // calc update time
    const updateAvg = model.updateTimes.push(
      performance.now() - model.updateStart
    );

    // render DrawUniform buffer
    if (model.drawUniformBuffer.top > 0) {
      model.render(model);
      model.drawUniformBuffer.clear();
    }

    // box update time + render time to 10ms
    // will probably get rid of this...
    model.timeOut =
      frameAvg - updateAvg - 10 > 0 ? frameAvg - updateAvg - 10 : 0;
    model.rafId = requestAnimationFrame(() => mainLoop(model));
  }, model.timeOut);
}

//TODO: prevent page refresh
//TODO: add scratch area, color picker
//TODO: add constraints
async function main() {
  /* init model */
  //TODO: load options from local storage if exists
  const settings: SessionSettings = {
    constraint_type: "none",
    color_picker_type: "rgb",
    scratch_area: false,
    image_dimensions_type: "custom",
    image_width: 800,
    image_height: 300,
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
  mainLoop(model);
}

main();
