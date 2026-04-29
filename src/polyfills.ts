import { Buffer } from "buffer";

declare global {
  interface Window {
    Buffer: unknown;
  }

  var Buffer: unknown;
}

globalThis.Buffer = Buffer;
window.Buffer = Buffer;
