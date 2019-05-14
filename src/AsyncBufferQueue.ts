export default class AsyncBufferQueue {
  _buffers: Array<Buffer>;
  _buffersLength: number;
  tasks: Array<[number, Function, Function]>;

  constructor() {
    this._buffers = [];
    this.tasks = [];
    this._buffersLength = 0;
  }

  /**
   * Removes the first `n` bytes out of the queue
   * and returns them. If `n` is greater than the current
   * buffer size, return as much as possible.
   *
   * @param {Number} bytes
   * @return {Buffer}
   */
  shift(bytes: number): Buffer {
    // If trying to shift more space than the internal buffer has, cap it
    // at the current size of the queue.
    bytes = bytes > this._buffersLength ? this._buffersLength : bytes;

    if(bytes <= 0) {
      return Buffer.allocUnsafe(0);
    }

    // 如果请求的字节数大于第一个Buffer的字节数，则把所有Buffer合并，取出bytes
    if (bytes > this._buffers[0].length) {
      const data = Buffer.concat(this._buffers, this._buffersLength);
      const front = data.slice(0, bytes);
      this.empty();
      this.push(data.slice(bytes));
      return front;
    }

    let res = null;

    // 如果请求的字节数等于第一个Buffer字节数，则直接把第一个Buffer取出来。减少内存操作。
    if (bytes === this._buffers[0].length) {
      res = this._buffers.shift();
    } else if (bytes < this._buffers[0].length) {
      res = this._buffers[0].slice(0, bytes);
      this._buffers[0] = this._buffers[0].slice(bytes);
    }

    this._buffersLength -= bytes;
    return res;
  }

  /**
   * Merges the buffer into the buffer queue.
   *
   * @param {Buffer} buffer
   */
  push(buffer: Buffer): void {
    this._buffers.push(buffer);
    this._buffersLength += buffer.length;
    this._check();
  }

  /**
   * 清空Buffer
   */
  empty(): void {
    this._buffers.length = 0;
    this._buffersLength = 0;
  }

  /**
   * 返回当前所有Buffer
   * @return {Buffer}
   */
  drain(): Buffer {
    const data = Buffer.concat(this._buffers, this._buffersLength);
    this._buffers.length = this._buffersLength = 0;
    return data;
  }

  /**
   * reject所有请求Buffer的异步任务
   */
  close(): void {
    for (let i = 0; i < this.tasks.length; i++) {
      this.tasks[i][2](new Error('buffer is closed'));
    }
  }

  has(count: number): boolean {
    return count <= this._buffersLength;
  }


  /**
   * 异步请求Buffer。调用Close后，会reject。
   * @param {number} bytes
   * @return {Promise<Buffer>}
   */
  shiftAsync(bytes: number): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      this._addTask(bytes, resolve, reject);
    });
  }

  /**
   * Returns the size of all the queued buffers.
   */
  get length(): number {
    return this._buffersLength;
  }

  _addTask(bytes: number, resolve: Function, reject: Function): void {
    this.tasks.push([bytes, resolve, reject]);
    this._check();
  }

  _check(): void {
    while (this.tasks.length) {
      const [bytes, resolve ] = this.tasks[0];
      if (this.has(bytes)) {
        this.tasks.shift();
        resolve(this.shift(bytes));
      } else {
        break;
      }
    }
  }
}
