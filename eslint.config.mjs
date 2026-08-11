import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      'node_modules/**',
      'allure-results/**',
      'allure-report/**',
      'cypress/videos/**',
      'cypress/screenshots/**',
    ],
  },

  js.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,

  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      /* The brief's hard requirements, enforced rather than assumed. */
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/ban-ts-comment': 'error',
      '@typescript-eslint/explicit-function-return-type': [
        'error',
        { allowExpressions: false, allowTypedFunctionExpressions: true },
      ],
      '@typescript-eslint/explicit-member-accessibility': [
        'error',
        { accessibility: 'explicit', overrides: { constructors: 'no-public' } },
      ],

      /*
       * Rule OPTION, not a disable: numbers have an unambiguous string form, and
       * viewport dimensions are legitimately interpolated into browser launch flags.
       * Everything else (objects, null, booleans, any) stays banned.
       */
      '@typescript-eslint/restrict-template-expressions': ['error', { allowNumber: true }],
    },
  },

  /*
   * Plain JS tooling (scripts/, test-plan/) is not part of the TypeScript program,
   * so type-aware rules cannot and should not run against it.
   */
  {
    files: ['**/*.mjs'],
    extends: [tseslint.configs.disableTypeChecked],
    languageOptions: {
      /*
       * Declared explicitly rather than pulling in the `globals` package for six names.
       * These scripts are Node ESM entry points run via npm scripts.
       */
      globals: {
        console: 'readonly',
        process: 'readonly',
        Buffer: 'readonly',
        URL: 'readonly',
        TextEncoder: 'readonly',
        TextDecoder: 'readonly',
      },
    },
    rules: {
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-member-accessibility': 'off',
    },
  },

  /* Must stay last so formatting-related rules are switched off for Prettier. */
  prettier,
);
