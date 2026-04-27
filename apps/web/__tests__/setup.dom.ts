import '@testing-library/jest-dom';

// jsdom doesn't include ResizeObserver; Radix UI requires it.
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};
