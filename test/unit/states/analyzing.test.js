const AnalyzingState = require('../../../src/states/analyzing');

// Mock dependencies
class MockStateMachine {
    constructor() {
        this.context = {};
    }

    getContext() {
        return this.context;
    }

    setContext(key, value) {
        this.context[key] = value;
    }
}

class MockBrowserController {
    constructor() {
        this.checkForRecentlyActiveResult = true;
        this.checkForRecentlyActiveCalled = false;
    }

    async checkForRecentlyActive() {
        this.checkForRecentlyActiveCalled = true;
        return this.checkForRecentlyActiveResult;
    }
}

class MockHotkeyHandler {
    constructor(exitRequested = false) {
        this.exitRequested = exitRequested;
    }

    isExitRequested() {
        return this.exitRequested;
    }
}

describe('AnalyzingState', () => {
    let state;
    let mockStateMachine;
    let mockBrowser;
    let mockHotkeys;

    beforeEach(() => {
        state = new AnalyzingState();
        mockStateMachine = new MockStateMachine();
        mockBrowser = new MockBrowserController();
        mockHotkeys = new MockHotkeyHandler();

        state.setStateMachine(mockStateMachine);
        mockStateMachine.context = {
            browser: mockBrowser,
            hotkeys: mockHotkeys
        };
    });

    describe('constructor', () => {
        it('should initialize with correct name', () => {
            expect(state.name).toBe('ANALYZING');
        });
    });

    describe('onEnter', () => {
        it('should log entry message', async () => {
            const consoleSpy = jest.spyOn(console, 'info').mockImplementation();

            await state.onEnter();

            expect(consoleSpy).toHaveBeenCalled();
            expect(consoleSpy.mock.calls[0][1]).toBe('STATE: Entering ANALYZING state');
            expect(consoleSpy.mock.calls[1][1]).toBe('🔍 Analyzing profile for Recently Active status...');

            consoleSpy.mockRestore();
        });

        it('should pass through data to parent', async () => {
            const consoleSpy = jest.spyOn(console, 'info').mockImplementation();
            const testData = { test: 'value' };

            await state.onEnter(testData);

            expect(consoleSpy).toHaveBeenCalled();
            consoleSpy.mockRestore();
        });
    });

    describe('execute', () => {
        it('should return SHUTDOWN when exit is requested', async () => {
            mockHotkeys.exitRequested = true;

            const result = await state.execute();

            expect(result).toEqual({ nextState: 'SHUTDOWN' });
            expect(mockBrowser.checkForRecentlyActiveCalled).toBe(false);
        });

        it('should return error when browser is not available', async () => {
            mockStateMachine.context.browser = null;

            const result = await state.execute();

            expect(result).toEqual({ error: 'Browser not available in context' });
        });

        it('should transition to THINKING when profile is recently active', async () => {
            mockBrowser.checkForRecentlyActiveResult = true;
            const consoleSpy = jest.spyOn(console, 'info').mockImplementation();

            const result = await state.execute();

            expect(mockBrowser.checkForRecentlyActiveCalled).toBe(true);
            expect(consoleSpy).toHaveBeenCalled();
            // Find the message we care about (skip dialog check message)
            const messages = consoleSpy.mock.calls.map(call => call[1]);
            expect(messages).toContain('Profile is Recently Active - proceeding to think');
            expect(result).toEqual({
                nextState: 'THINKING',
                data: { isRecentlyActive: true }
            });

            consoleSpy.mockRestore();
        });

        it('should transition to NOPING when profile is not recently active', async () => {
            mockBrowser.checkForRecentlyActiveResult = false;
            const consoleSpy = jest.spyOn(console, 'info').mockImplementation();

            const result = await state.execute();

            expect(mockBrowser.checkForRecentlyActiveCalled).toBe(true);
            expect(consoleSpy).toHaveBeenCalled();
            // Find the message we care about (skip dialog check message)
            const messages = consoleSpy.mock.calls.map(call => call[1]);
            expect(messages).toContain('Profile not Recently Active - will send quick nope');
            expect(result).toEqual({
                nextState: 'NOPING',
                data: { isRecentlyActive: false, quickDecision: true }
            });

            consoleSpy.mockRestore();
        });

        it('should handle browser errors gracefully', async () => {
            const testError = new Error('Browser analysis error');
            mockBrowser.checkForRecentlyActive = jest.fn().mockRejectedValue(testError);
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

            const result = await state.execute();

            expect(consoleSpy).toHaveBeenCalled();
            expect(consoleSpy.mock.calls[0][1]).toBe('💥 Error analyzing profile:');
            expect(consoleSpy.mock.calls[0][2]).toBe('Browser analysis error');
            expect(result).toEqual({
                nextState: 'ERROR',
                data: { error: testError }
            });

            consoleSpy.mockRestore();
        });
    });

    describe('onExit', () => {
        it('should call parent onExit', async () => {
            const consoleSpy = jest.spyOn(console, 'info').mockImplementation();

            await state.onExit();

            expect(consoleSpy).toHaveBeenCalled();
            expect(consoleSpy.mock.calls[0][1]).toBe('STATE: Exiting ANALYZING state');

            consoleSpy.mockRestore();
        });

        it('should handle data parameter', async () => {
            const consoleSpy = jest.spyOn(console, 'info').mockImplementation();
            const testData = { test: 'value' };

            await state.onExit(testData);

            expect(consoleSpy).toHaveBeenCalled();
            consoleSpy.mockRestore();
        });
    });

    describe('integration scenarios', () => {
        it('should handle complete recently active flow', async () => {
            const consoleSpy = jest.spyOn(console, 'info').mockImplementation();
            mockBrowser.checkForRecentlyActiveResult = true;

            await state.onEnter();
            const result = await state.execute();
            await state.onExit();

            expect(result).toEqual({
                nextState: 'THINKING',
                data: { isRecentlyActive: true }
            });
            expect(mockBrowser.checkForRecentlyActiveCalled).toBe(true);

            consoleSpy.mockRestore();
        });

        it('should handle complete not recently active flow', async () => {
            const consoleSpy = jest.spyOn(console, 'info').mockImplementation();
            mockBrowser.checkForRecentlyActiveResult = false;

            await state.onEnter();
            const result = await state.execute();
            await state.onExit();

            expect(result).toEqual({
                nextState: 'NOPING',
                data: { isRecentlyActive: false, quickDecision: true }
            });
            expect(mockBrowser.checkForRecentlyActiveCalled).toBe(true);

            consoleSpy.mockRestore();
        });

        it('should handle error recovery scenario', async () => {
            const testError = new Error('Test error');
            mockBrowser.checkForRecentlyActive = jest.fn().mockRejectedValue(testError);

            const result = await state.execute();

            expect(result.nextState).toBe('ERROR');
            expect(result.data.error).toBe(testError);
        });

        it('should handle shutdown scenario', async () => {
            mockHotkeys.exitRequested = true;

            const result = await state.execute();

            expect(result).toEqual({ nextState: 'SHUTDOWN' });
            expect(mockBrowser.checkForRecentlyActiveCalled).toBe(false);
        });
    });

    describe('decision logic', () => {
        it('should make correct decision based on recently active status', async () => {
            // Test true case
            mockBrowser.checkForRecentlyActiveResult = true;
            let result = await state.execute();
            expect(result.nextState).toBe('THINKING');
            expect(result.data.isRecentlyActive).toBe(true);

            // Reset and test false case
            mockBrowser.checkForRecentlyActiveCalled = false;
            mockBrowser.checkForRecentlyActiveResult = false;
            result = await state.execute();
            expect(result.nextState).toBe('NOPING');
            expect(result.data.isRecentlyActive).toBe(false);
            expect(result.data.quickDecision).toBe(true);
        });

        it('should always set quickDecision flag for NOPING transitions', async () => {
            mockBrowser.checkForRecentlyActiveResult = false;

            const result = await state.execute();

            expect(result.data.quickDecision).toBe(true);
        });

        it('should not set quickDecision flag for THINKING transitions', async () => {
            mockBrowser.checkForRecentlyActiveResult = true;

            const result = await state.execute();

            expect(result.data.quickDecision).toBeUndefined();
        });
    });

    describe('error handling', () => {
        it('should handle various browser error types', async () => {
            const errors = [
                new Error('Network timeout'),
                new Error('Element not found'),
                new Error('Page navigation failed')
            ];

            for (const error of errors) {
                mockBrowser.checkForRecentlyActive = jest.fn().mockRejectedValue(error);

                const result = await state.execute();

                expect(result.nextState).toBe('ERROR');
                expect(result.data.error).toBe(error);
            }
        });

        it('should not throw unhandled errors', async () => {
            mockBrowser.checkForRecentlyActive = jest.fn().mockRejectedValue(new Error('Test error'));

            await expect(state.execute()).resolves.not.toThrow();
        });
    });
});

// Helper function to create Jest test environment if not available
if (typeof describe === 'undefined') {
    logger.info('Jest test environment not detected. This file requires Jest to run.');
    logger.info('Install Jest with: npm install --save-dev jest');
    logger.info('Run tests with: npm test');
}