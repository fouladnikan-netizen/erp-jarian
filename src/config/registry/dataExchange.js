/**
 * Import / Export capabilities — implemented in Shirazeh module.
 * Kanoon does not expose Excel actions directly.
 */
export const DATA_EXCHANGE_CONFIG = {
  excel: {
    export: {
      enabled: true,
      modules: ['kanoon', 'nabz', 'ofogh'],
      label: 'خروجی اکسل',
    },
    import: {
      enabled: true,
      modules: ['kanoon'],
      label: 'ورود داده از اکسل',
    },
  },
};
