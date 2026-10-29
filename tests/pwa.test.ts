import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(new URL(`../public/${path}`, import.meta.url));

describe('installable app assets', () => {
  const manifest = JSON.parse(read('manifest.webmanifest').toString('utf8')) as {
    start_url: string;
    scope: string;
    display: string;
    icons: Array<{ src: string; sizes: string; type: string; purpose: string }>;
  };

  it('has a standalone manifest with relative paths for GitHub Pages', () => {
    expect(manifest.display).toBe('standalone');
    expect(manifest.start_url.startsWith('/')).toBe(false);
    expect(manifest.scope.startsWith('/')).toBe(false);
  });

  it('ships real PNG icons at 192 and 512, plus a maskable one', () => {
    const png = (src: string) => manifest.icons.find((i) => i.src === src);
    for (const [src, size] of [['icon-192.png', 192], ['icon-512.png', 512], ['icon-maskable-512.png', 512]] as const) {
      const icon = png(src);
      expect(icon, src).toBeDefined();
      expect(existsSync(new URL(`../public/${src}`, import.meta.url))).toBe(true);
      const bytes = read(src);
      expect(bytes.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a');
      expect(bytes.readUInt32BE(16)).toBe(size);
      expect(bytes.readUInt32BE(20)).toBe(size);
    }
    expect(png('icon-maskable-512.png')?.purpose).toBe('maskable');
  });

  it('has a service worker that falls back to the cache on a slow network', () => {
    const sw = read('sw.js').toString('utf8');
    expect(sw).toContain('NETWORK_TIMEOUT_MS');
    // With nothing cached (a first visit) the real request must be allowed to finish.
    expect(sw).toContain('const late = await network');
    expect(sw).toContain("request.mode === 'navigate'");
    expect(sw).toContain('event.waitUntil');
  });
});

describe('stylesheet safety', () => {
  it('lets the hidden attribute override component display rules', () => {
    const css = readFileSync('src/styles/main.css', 'utf8');
    expect(css).toMatch(/\[hidden\]\s*\{\s*display:\s*none\s*!important/);
  });
});

describe('focus visibility', () => {
  it('defines a visible focus ring for keyboard users', () => {
    const css = readFileSync('src/styles/main.css', 'utf8');
    expect(css).toMatch(/:focus-visible\s*\{[^}]*outline:\s*2px solid/);
  });
});
