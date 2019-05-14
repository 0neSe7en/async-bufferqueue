import AsyncBufferQueue from '../src/AsyncBufferQueue'

const queue = new AsyncBufferQueue();

test('should push buffer', () => {
  const buf = Buffer.from('01020304050607080910', 'hex');
  const buf2 = Buffer.from('01020304050607080910', 'hex');
  queue.push(buf);
  expect(queue._buffers).toEqual([buf]);
  expect(queue._buffersLength).toBe(buf.length);
  queue.push(buf2);
  expect(queue._buffers).toEqual([buf, buf2]);
  expect(queue._buffersLength).toBe(buf.length + buf2.length);
});

test('should has enough buffer', () => {
  expect(queue.has(1));
});

test('should not has enough buffer', () => {
  expect(queue.has(100)).toBe(false);
});

test('should shift one byte', () => {
  const buf = queue.shift(1);
  expect(buf.toString('hex')).toBe('01');
  expect(queue.length).toBe(19);
  expect(queue._buffers.length).toBe(2);
  expect(queue._buffers[0].toString('hex')).toBe('020304050607080910');
});

test('should shift entire first buffer', () => {
  const buf = queue.shift(9);
  expect(queue._buffers.length).toBe(1);
  expect(queue.length).toBe(10);
  expect(buf.toString('hex')).toBe('020304050607080910');
});

test('should concat and shift', () => {
  queue.push(Buffer.from('0102030405', 'hex'));
  const buf = queue.shift(11);
  expect(queue._buffers[0].toString('hex')).toBe('02030405');
  expect(buf.toString('hex')).toBe('0102030405060708091001');
  expect(queue.length).toBe(4);
});

test('should shift all', () => {
  const buf = queue.shift(100);
  expect(queue.length).toBe(0);
  expect(buf.toString('hex')).toBe('02030405');
});

test('should drain', () => {
  queue.push(Buffer.from('0102030405', 'hex'));
  expect(queue.drain().toString('hex')).toBe('0102030405');
  expect(queue.length).toBe(0);
});

queue.empty();

test('should get a buffer', async () => {
  const buf = Buffer.from('01020304050607080910', 'hex');
  queue.push(buf);
  const res = await queue.shiftAsync(1);
  expect(res.toString('hex')).toBe('01');
  expect(queue.length).toBe(9);
  expect(queue._buffers[0].toString('hex')).toBe('020304050607080910');
});

test('should get a buffer async', (done) => {
  setTimeout(() => {
    queue.push(Buffer.from('0102030405', 'hex'));
  }, 0);
  const promise = queue.shiftAsync(10);
  expect(queue.tasks.length).toBe(1);

  promise.then((res) => {
    expect(res.toString('hex')).toBe('02030405060708091001');
    done()
  }).catch((err) => {
    expect(err).toBe('Should not happen')
  });
});

test('should reject when close', async () => {
  setTimeout(() => {
    queue.close();
  }, 0);
  try {
    await queue.shiftAsync(1000) ;
    expect(new Error('Should not happen'))
  } catch(e) {
    expect(e.message).toBe('buffer is closed');
  }
});
