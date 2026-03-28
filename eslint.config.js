import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    files: ['packages/*/src/**/*.{ts,tsx}'],
    extends: [tseslint.configs.recommended],
    rules: {
      // TypeScript handles unused locals via noUnusedLocals in tsconfig
      '@typescript-eslint/no-unused-vars': 'off',
      // Allow explicit any in library/plugin code
      '@typescript-eslint/no-explicit-any': 'off',
      // Allow this aliasing in legacy/complex code
      '@typescript-eslint/no-this-alias': 'off',
      // Allow empty interfaces (used for extensibility)
      '@typescript-eslint/no-empty-object-type': 'off',
      // Allow require() imports in CJS contexts
      '@typescript-eslint/no-require-imports': 'off',
      // TypeScript compiler handles const vs let via strict mode
      'prefer-const': 'off',
      // Allow expression statements (used in effects, event chains)
      '@typescript-eslint/no-unused-expressions': 'off',
    },
  },
);
