import type { UIEventType } from "../ui/updaters";

export interface PaeyentEvent {
  id: 0 | 1; //PointerEventType | UIEventType
  type: PointerEventType | UIEventType;
  dataIdx: number;
}

export type PointerEventType =
  | "pointerdown"
  | "pointerup"
  | "pointermove"
  | "cancel";

export const PointerEventLookup = {
  pointerdown: 0,
  pointerup: 1,
  pointermove: 2,
  cancel: 3,
} as const;

export type PointerType = "mouse" | "pen" | "touch";

export type PointerEventData = {
  x: number;
  y: number;
  pressure: number;
  pointerType: PointerType;
};
