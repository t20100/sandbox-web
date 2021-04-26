/// <reference types="react-scripts" />

declare module 'numpy-parser' {
  import ndarray from 'ndarray';

  function fromArrayBuffer(buffer: ArrayBuffer): ndarray;
  export = fromArrayBuffer;
}
