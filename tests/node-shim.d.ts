// Just enough of Node's fs for the asset checks in pwa.test.ts, so no extra dependency is needed.
declare module 'node:fs' {
  interface Bytes {
    toString(encoding: string): string;
    subarray(start: number, end: number): Bytes;
    readUInt32BE(offset: number): number;
  }
  export function readFileSync(path: URL | string): Bytes;
  export function readFileSync(path: URL | string, encoding: 'utf8'): string;
  export function existsSync(path: URL): boolean;
}
