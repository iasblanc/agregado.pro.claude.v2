import '@testing-library/jest-dom'

// Suprimir logs de console nos testes (exceto erros reais)
global.console = {
  ...console,
  log:  jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  // Manter error visível para debugging
  error: console.error,
}

// Polyfill para crypto.randomUUID em ambiente de teste
if (!globalThis.crypto?.randomUUID) {
  Object.defineProperty(globalThis, 'crypto', {
    value: {
      randomUUID: () => {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
          const r = Math.random() * 16 | 0
          const v = c === 'x' ? r : (r & 0x3 | 0x8)
          return v.toString(16)
        })
      },
    },
  })
}
