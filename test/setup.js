// Jest test setup file
// This file runs before each test file

// Mock console methods to reduce noise during tests
const originalConsole = { ...console };

beforeEach(() => {
    // Mock console methods but allow them to be spied on
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
    // Restore all mocks after each test
    jest.restoreAllMocks();
});

// Global test utilities
global.testUtils = {
    // Helper to wait for promises to resolve
    async flushPromises() {
        return new Promise(resolve => setImmediate(resolve));
    },

    // Helper to create mock timers
    useMockTimers() {
        jest.useFakeTimers();
        return {
            advanceTime: (ms) => jest.advanceTimersByTime(ms),
            runAllTimers: () => jest.runAllTimers(),
            restore: () => jest.useRealTimers()
        };
    },

    // Helper to suppress specific console outputs during tests
    suppressConsole() {
        const spy = jest.spyOn(console, 'log').mockImplementation(() => {});
        return () => spy.mockRestore();
    }
};