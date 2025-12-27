import { UIUpdaterLookup, type UIEventType } from "../ui/updaters";

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
export const PointerTypeLookup = {
  mouse: 0,
  pen: 1,
  touch: 2,
};

export class PaeyentEventBuffer {
  /* 
  0, eventType: u8; // 0: PointerEventType | 1: UIEventType
  1, eventLookupId: u8;
  2, pointerType: u8; // 0: mouse | 1: pen | 2: touch
  3, 1 byte padding
  4, x: f32;
  8, y: f32;
  12, pressure: f32;
  ---
  = total 16 bytes
  */

  data: ArrayBuffer;
  view: DataView;
  top: number;
  capacity: number;

  readonly stride = 16; //bytes
  readonly offsetEventType = 0;
  readonly offsetEventLookupId = 1;
  readonly offsetPointerType = 2;
  readonly offsetX = 4;
  readonly offsetY = 8;
  readonly offsetPressure = 12;

  constructor(capacity: number = 256) {
    if (capacity > 32767 || capacity < 1) {
      console.warn("DrawUniformBuffer capacity is int16 > 0");
      capacity = 256;
    }
    this.data = new ArrayBuffer(capacity * this.stride);
    this.view = new DataView(this.data);
    this.top = 0;
    this.capacity = capacity;
  }

  setf32(byteOffset: number, value: number) {
    // little-endian set
    this.view.setFloat32(byteOffset, value, true);
  }

  getf32(byteOffset: number) {
    // little-endian get
    return this.view.getFloat32(byteOffset, true);
  }

  pushUIEvent(id: UIEventType): number {
    if (this.top === this.capacity - 1) {
      console.warn("PaeyentEventBuffer.pushUIEvent(): full, dropping event");
      return -1;
    }

    this.view.setUint8(this.top * this.stride + this.offsetEventType, 1);
    this.view.setUint8(
      this.top * this.stride + this.offsetEventLookupId,
      UIUpdaterLookup[id]
    );
    return this.top++;
  }

  pushPointerDownEvent(
    pointerType: PointerType,
    x: number,
    y: number,
    pressure: number
  ): number {
    if (this.top === this.capacity - 1) {
      console.warn(
        "PaeyentEventBuffer.pushPointerDownEvent(): full, dropping event"
      );
      return -1;
    }

    this.view.setUint8(this.top * this.stride + this.offsetEventType, 0);
    this.view.setUint8(
      this.top * this.stride + this.offsetEventLookupId,
      PointerEventLookup["pointerdown"]
    );
    this.view.setUint8(
      this.top * this.stride + this.offsetPointerType,
      PointerTypeLookup[pointerType]
    );
    this.setf32(this.top * this.stride + this.offsetX, x);
    this.setf32(this.top * this.stride + this.offsetY, y);
    this.setf32(this.top * this.stride + this.offsetPressure, pressure);

    return this.top++;
  }

  pushPointerMoveEvent(
    pointerType: PointerType,
    x: number,
    y: number,
    pressure: number
  ): number {
    if (this.top === this.capacity - 1) {
      console.warn(
        "PaeyentEventBuffer.pushPointerMoveEvent(): full, dropping event"
      );
      return -1;
    }

    this.view.setUint8(this.top * this.stride + this.offsetEventType, 0);
    this.view.setUint8(
      this.top * this.stride + this.offsetEventLookupId,
      PointerEventLookup["pointermove"]
    );
    this.view.setUint8(
      this.top * this.stride + this.offsetPointerType,
      PointerTypeLookup[pointerType]
    );
    this.setf32(this.top * this.stride + this.offsetX, x);
    this.setf32(this.top * this.stride + this.offsetY, y);
    this.setf32(this.top * this.stride + this.offsetPressure, pressure);

    return this.top++;
  }

  replaceLastPointerMoveEvent(
    pointerType: PointerType,
    x: number,
    y: number,
    pressure: number
  ): number {
    /*
    // these are redundant with checks in handler debounce, but that may change:
    if (this.top === 0) {
      console.warn(
        "PaeyentEventBuffer.replaceLastPointerMoveEvent(): called on empty buffer"
      );
      return -1;
    }

    this.view.setUint8(this.top * this.stride + this.offsetEventType, 0);
    this.view.setUint8(
      this.top * this.stride + this.offsetEventLookupId,
      PointerEventLookup["pointermove"]
    );
    */

    this.view.setUint8(
      (this.top - 1) * this.stride + this.offsetPointerType,
      PointerTypeLookup[pointerType]
    );
    this.setf32((this.top - 1) * this.stride + this.offsetX, x);
    this.setf32((this.top - 1) * this.stride + this.offsetY, y);
    this.setf32((this.top - 1) * this.stride + this.offsetPressure, pressure);

    return this.top - 1;
  }

  pushPointerUpEvent(
    pointerType: PointerType,
    x: number,
    y: number,
    pressure: number
  ): number {
    if (this.top === this.capacity - 1) {
      console.warn(
        "PaeyentEventBuffer.pushPointerUpEvent(): full, dropping event"
      );
      return -1;
    }

    this.view.setUint8(this.top * this.stride + this.offsetEventType, 0);
    this.view.setUint8(
      this.top * this.stride + this.offsetEventLookupId,
      PointerEventLookup["pointerup"]
    );
    this.view.setUint8(
      this.top * this.stride + this.offsetPointerType,
      PointerTypeLookup[pointerType]
    );
    this.setf32(this.top * this.stride + this.offsetX, x);
    this.setf32(this.top * this.stride + this.offsetY, y);
    this.setf32(this.top * this.stride + this.offsetPressure, pressure);

    return this.top++;
  }

  getX(idx: number): number {
    return this.getf32(idx * this.stride + this.offsetX);
  }

  getY(idx: number): number {
    return this.getf32(idx * this.stride + this.offsetY);
  }

  getLookupId(idx: number): number {
    return this.view.getUint8(idx * this.stride + this.offsetEventLookupId);
  }

  getEventType(idx: number): number {
    return this.view.getUint8(idx * this.stride + this.offsetEventType);
  }

  indexIsPointerEvent(idx: number): boolean {
    return this.view.getUint8(idx * this.stride + this.offsetEventType) === 0;
  }

  indexIsUIEvent(idx: number): boolean {
    return this.view.getUint8(idx * this.stride + this.offsetEventType) === 1;
  }

  isValidIndex(idx: number): boolean {
    return idx >= 0 && idx < this.top;
  }

  lastEventIsPointerMove(): boolean {
    // buffer is empty
    if (this.top === 0) {
      return false;
    }

    // last event is not a pointerEvent
    if (
      this.view.getUint8(
        (this.top - 1) * this.stride + this.offsetEventType
      ) !== 0
    ) {
      return false;
    }

    // last event is not a pointer move event
    if (
      this.view.getUint8(
        (this.top - 1) * this.stride + this.offsetEventLookupId
      ) !== PointerEventLookup["pointermove"]
    ) {
      return false;
    }

    return true;
  }

  clear(): void {
    this.top = 0;
  }
}
