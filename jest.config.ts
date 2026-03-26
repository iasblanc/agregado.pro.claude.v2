import type { Config } from 'jest'
import nextJest from 'next/jest.js'

const createJestConfig = nextJest({ dir: './' })

const config: Config = {
  displayName: 'agregado-pro',
  testEnvironment: 'node',

  // Executar setup antes dos testes
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],

  // Resolver path aliases (@/)
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },

  // Cobertura
  collectCoverageFrom: [
    'src/services/**/*.ts',
    'src/lib/**/*.ts',
    '!src/lib/supabase/**',         // clientes do Supabase — testados via integration
    '!src/**/*.d.ts',
    '!src/**/index.ts',
  ],

  coverageThresholds: {
    global: {
      branches:   80,
      functions:  80,
      lines:      80,
      statements: 80,
    },
  },

  // Padrão dos arquivos de teste
  testMatch: [
    '<rootDir>/__tests__/unit/**/*.test.ts',
    '<rootDir>/__tests__/integration/**/*.test.ts',
    '<rootDir>/src/**/__tests__/**/*.test.ts',
  ],

  // Excluir E2E dos testes Jest (rodam via Playwright)
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/.next/',
    '<rootDir>/__tests__/e2e/',
  ],

  // Transform
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', { tsconfig: { jsx: 'react' } }],
  },

  // Timeout
  testTimeout: 15_000,

  // Verbose para CI
  verbose: true,
}

export default createJestConfig(config)
