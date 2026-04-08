import tseslint from 'typescript-eslint';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
import jsxA11yPlugin from 'eslint-plugin-jsx-a11y';
import securityPlugin from 'eslint-plugin-security';
import noUnsanitizedPlugin from 'eslint-plugin-no-unsanitized';

export default tseslint.config(
  // ── TypeScript source files ──────────────────────────────────────────────
  {
    files: ['packages/*/src/**/*.{ts,tsx}'],
    extends: [tseslint.configs.recommended],
    plugins: {
      'react-hooks': reactHooksPlugin,
      'jsx-a11y': jsxA11yPlugin,
      'security': securityPlugin,
      'no-unsanitized': noUnsanitizedPlugin,
    },
    rules: {
      // ── TypeScript relaxations (library/plugin code) ──
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-this-alias': 'off',
      '@typescript-eslint/no-empty-object-type': 'off',
      '@typescript-eslint/no-require-imports': 'off',
      'prefer-const': 'off',
      '@typescript-eslint/no-unused-expressions': 'off',

      // ── Security: prevents eval(), unsafe regex, object injection ──
      'security/detect-object-injection': 'error',
      'security/detect-unsafe-regex': 'error',
      'security/detect-eval-with-expression': 'error',
      'security/detect-non-literal-regexp': 'warn',
      'security/detect-non-literal-fs-filename': 'warn',

      // ── Security: prevents innerHTML / insertAdjacentHTML with user data ──
      'no-unsanitized/method': 'error',
      'no-unsanitized/property': 'error',

      // ── React hooks rules (applies to react-adapter package) ──
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',

      // ── Accessibility (applies to TSX files) ──
      'jsx-a11y/aria-roles': 'error',
      'jsx-a11y/alt-text': 'error',
    },
  },

  // ── Test files: relax security rules for intentional XSS/injection tests ──
  {
    files: ['**/__tests__/**/*.{ts,tsx}', '**/*.test.{ts,tsx}'],
    rules: {
      // Security tests deliberately use potentially dangerous strings as data
      'security/detect-object-injection': 'off',
      'no-unsanitized/method': 'off',
      'no-unsanitized/property': 'off',
    },
  },
);
