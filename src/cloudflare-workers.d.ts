// Minimal typing for the Workers runtime module (only what this app uses).
declare module "cloudflare:workers" {
  export const env: Record<string, unknown>;
}

// Cloudflare "Data" modules: binary files bundled with the Worker, imported as ArrayBuffer.
declare module "*.bin" {
  const data: ArrayBuffer;
  export default data;
}
