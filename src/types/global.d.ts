/**
 * Global type declarations for Bridge
 */

declare global {
  namespace NodeJS {
    interface Global {
      updateActivity: (() => void) | undefined;
    }
  }
}

export {};
