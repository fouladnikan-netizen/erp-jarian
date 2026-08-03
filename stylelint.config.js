/**
 * Stylelint — RFC-001 Theme Token Architecture
 * Build-failing rules target hardcoded colors ONLY.
 * theme-tokens.css is the sole allowed color definition file.
 */
/** @type {import('stylelint').Config} */
export default {
  ignoreFiles: [
    '**/node_modules/**',
    '**/dist/**',
    '**/coverage/**',
    'src/styles/theme-tokens.css',
  ],
  rules: {
    /* RFC-001 — mandatory: no hex / rgb / rgba / hsl outside theme-tokens.css */
    'color-no-hex': true,
    /* transparent / currentColor are allowed layout primitives, not theme colors */
    'color-named': null,
    'function-disallowed-list': [
      'rgb',
      'rgba',
      'hsl',
      'hsla',
      'hwb',
      'lab',
      'lch',
      'oklab',
      'oklch',
    ],
  },
};
