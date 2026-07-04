const config = {
  semi: true,
  singleQuote: true,
  trailingComma: 'all',
  printWidth: 100,
  tabWidth: 2,
  useTabs: false,
  arrowParens: 'always',
  endOfLine: 'lf',
  bracketSpacing: true,
  quoteProps: 'as-needed',
  overrides: [
    {
      files: ['*.json', '*.jsonc'],
      options: {
        singleQuote: false,
      },
    },
  ],
};

export default config;
