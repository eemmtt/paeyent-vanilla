// data structure for maintaining an average of ring of samples
// currently intended for positive floats, but could be modified
export class RollingAverageBuffer {
  data: Float32Array;

  capacity: number;
  size: number;
  top: number;
  sum: number;

  constructor(capacity: number = 100) {
    if (capacity > 1000) {
      console.warn("RollingAverageBuffer capacity max value is 1000");
      capacity = 1000;
    }
    this.data = new Float32Array(capacity);
    this.capacity = capacity;
    this.size = 0;
    this.top = 0;
    this.sum = 0;
  }

  //returns new avg with pushed sample
  push(sample: number): number {
    if (sample < 0) {
      console.warn(
        `RollingAverageBuffer.push() received a sample < 0: ${sample}`
      );
    }

    this.sum = this.sum - this.data[this.top];
    this.sum += sample;
    this.data[this.top] = sample;
    this.top = (this.top + 1) % this.capacity;
    this.size = this.size + 1 > this.capacity ? this.capacity : this.size + 1;
    return this.sum / this.size;
  }

  getAverage(): number {
    return this.sum / this.size;
  }

  clear() {
    this.sum = 0;
    this.top = 0;
    this.size = 0;
  }
}
