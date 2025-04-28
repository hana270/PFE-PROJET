// src/app/core/errors/insufficient-stock.error.ts

export class InsufficientStockError extends Error {
    constructor(message: string, public availableStock?: number) {
      super(message);
      this.name = 'InsufficientStockError';
      Object.setPrototypeOf(this, InsufficientStockError.prototype);
    }
  }
  