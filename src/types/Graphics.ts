import type { Model } from "./Model";

export type GraphicsCtxInitializer = (
  dpr: number,
  canvas: HTMLCanvasElement
) => Promise<Model>;

export async function webgl2_init(
  dpr: number,
  canvas: HTMLCanvasElement
): Promise<Model> {
  throw Error("webgl2_init: not implemented");
}

export async function canvas2d_init(
  dpr: number,
  canvas: HTMLCanvasElement
): Promise<Model> {
  throw Error("canvas2d_init: not implemented");
}
