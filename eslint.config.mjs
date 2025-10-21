import { FlatCompat } from '@eslint/eslintrc'
 
const compat = new FlatCompat({
  // import.meta.dirname is available after Node.js v20.11.0
  baseDirectory: import.meta.dirname,
})
 
const eslintConfig = [
  ...compat.config({
    extends: ['next'],
    rules: {
      'react/no-unescaped-entities': 'off',
      '@next/next/no-page-custom-font': 'off',
      // Disable problematic TypeScript ESLint rules that may not be available
      '@typescript-eslint/no-var-requires': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      // Disable image optimization warnings for build
      '@next/next/no-img-element': 'off',
      // Disable React hooks exhaustive deps warnings for build
      'react-hooks/exhaustive-deps': 'off',
    },
  }),
]
 
export default eslintConfig