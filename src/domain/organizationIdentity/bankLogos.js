/**
 * Local Bank Master logos. Vite resolves these at build time — no runtime fetch.
 */
const modules = import.meta.glob('../../assets/banks/*.svg', {
  eager: true,
  query: '?url',
  import: 'default',
});

const BY_CODE = new Map();
for (const [path, url] of Object.entries(modules)) {
  const match = path.match(/(\d{3})\.svg$/);
  if (match) BY_CODE.set(match[1], url);
}

export function bankLogoUrl(code) {
  return BY_CODE.get(String(code || '').trim()) || '';
}
