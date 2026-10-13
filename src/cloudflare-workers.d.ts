// Minimal typing for the Workers runtime module (only what this app uses).
declare module "cloudflare:workers" {
  export const env: Record<string, unknown>;
}
