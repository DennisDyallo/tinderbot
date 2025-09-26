const ThinkingState = require('../../../src/states/thinking');

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

class MockBehaviorProfile {
    constructor(thinkingDelay = 2000) {
        this.thinkingDelay = thinkingDelay;
        this.getThinkingDelayCalled = false;
    }

    getThinkingDelay() {
        this.getThinkingDelayCalled = true;
        return this.thinkingDelay;
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

describe('ThinkingState', () => {
    let state;
    let mockStateMachine;
    let mockBehavior;
    let mockHotkeys;

    beforeEach(() => {
        state = new ThinkingState();
        mockStateMachine = new MockStateMachine();
        mockBehavior = new MockBehaviorProfile();
        mockHotkeys = new MockHotkeyHandler();

        state.setStateMachine(mockStateMachine);
        mockStateMachine.context = {
            behavior: mockBehavior,
            hotkeys: mockHotkeys
        };
    });

    describe('constructor', () => {
        it('should initialize with correct name', () => {
            expect(state.name).toBe('THINKING');
        });
    });

    describe('onEnter', () => {
        it('should log entry message', async () => {
            const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

            await state.onEnter();

            expect(consoleSpy).toHaveBeenCalledWith('🟢 Entering THINKING state');
            expect(consoleSpy).toHaveBeenCalledWith('🤔 Thinking about this recently active profile...');

            consoleSpy.mockRestore();
        });

        it('should pass through data to parent', async () => {
            const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
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
            expect(mockBehavior.getThinkingDelayCalled).toBe(false);
        });

        it('should use behavior profile thinking delay when available', async () => {
            mockBehavior.thinkingDelay = 1500;
            const delaySpy = jest.spyOn(state, 'delay').mockResolvedValue();
            const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

            const result = await state.execute();

            expect(mockBehavior.getThinkingDelayCalled).toBe(true);
            expect(consoleSpy).toHaveBeenCalledWith('   💭 Thinking for 2s...');
            expect(delaySpy).toHaveBeenCalledWith(1500);
            expect(result).toEqual({ nextState: 'VIEWING_PHOTOS' });

            delaySpy.mockRestore();
            consoleSpy.mockRestore();
        });

        it('should use fallback delay when no behavior profile available', async () => {
            mockStateMachine.context.behavior = null;
            const delaySpy = jest.spyOn(state, 'delay').mockResolvedValue();
            const getHumanizedDelaySpy = jest.spyOn(state, 'getHumanizedDelay').mockReturnValue(1800);
            const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

            const result = await state.execute();

            expect(consoleSpy).toHaveBeenCalledWith('⚠️  No behavior profile available - using fallback thinking delay');
            expect(getHumanizedDelaySpy).toHaveBeenCalledWith(2000, 50);
            expect(delaySpy).toHaveBeenCalledWith(1800);
            expect(result).toEqual({ nextState: 'VIEWING_PHOTOS' });

            delaySpy.mockRestore();
            getHumanizedDelaySpy.mockRestore();
            consoleSpy.mockRestore();
        });

        it('should handle errors during thinking phase', async () => {
            const testError = new Error('Thinking error');
            jest.spyOn(state, 'delay').mockRejectedValue(testError);
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

            const result = await state.execute();

            expect(consoleSpy).toHaveBeenCalledWith('💥 Error during thinking phase:', 'Thinking error');
            expect(result).toEqual({
                nextState: 'ERROR',
                data: { error: testError }
            });

            consoleSpy.mockRestore();
        });

        it('should log completion message when thinking is done', async () => {
            jest.spyOn(state, 'delay').mockResolvedValue();
            const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

            await state.execute();

            expect(consoleSpy).toHaveBeenCalledWith('✅ Decision made - time to view photos');

            consoleSpy.mockRestore();
        });
    });

    describe('onExit', () => {
        it('should call parent onExit', async () => {
            const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

            await state.onExit();

            expect(consoleSpy).toHaveBeenCalledWith('🔴 Exiting THINKING state');

            consoleSpy.mockRestore();
        });

        it('should handle data parameter', async () => {
            const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
            const testData = { test: 'value' };

            await state.onExit(testData);

            expect(consoleSpy).toHaveBeenCalled();
            consoleSpy.mockRestore();
        });
    });

    describe('integration scenarios', () => {
        it('should handle complete thinking flow with behavior profile', async () => {
            jest.spyOn(state, 'delay').mockResolvedValue();
            const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

            await state.onEnter();
            const result = await state.execute();
            await state.onExit();

            expect(result).toEqual({ nextState: 'VIEWING_PHOTOS' });
            expect(mockBehavior.getThinkingDelayCalled).toBe(true);

            consoleSpy.mockRestore();
        });

        it('should handle fallback thinking flow without behavior profile', async () => {
            mockStateMachine.context.behavior = null;
            jest.spyOn(state, 'delay').mockResolvedValue();
            jest.spyOn(state, 'getHumanizedDelay').mockReturnValue(1500);
            const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

            const result = await state.execute();

            expect(result).toEqual({ nextState: 'VIEWING_PHOTOS' });
            expect(consoleSpy).toHaveBeenCalledWith('⚠️  No behavior profile available - using fallback thinking delay');

            consoleSpy.mockRestore();
        });

        it('should handle shutdown scenario', async () => {
            mockHotkeys.exitRequested = true;

            const result = await state.execute();

            expect(result).toEqual({ nextState: 'SHUTDOWN' });
            expect(mockBehavior.getThinkingDelayCalled).toBe(false);
        });

        it('should handle error recovery scenario', async () => {
            const testError = new Error('Test thinking error');
            jest.spyOn(state, 'delay').mockRejectedValue(testError);

            const result = await state.execute();

            expect(result.nextState).toBe('ERROR');
            expect(result.data.error).toBe(testError);
        });
    });

    describe('timing behavior', () => {
        it('should use different thinking delays from behavior profile', async () => {
            const delays = [1000, 2000, 3000, 5000];
            const delaySpy = jest.spyOn(state, 'delay').mockResolvedValue();

            for (const delay of delays) {
                mockBehavior.thinkingDelay = delay;
                mockBehavior.getThinkingDelayCalled = false;

                await state.execute();

                expect(delaySpy).toHaveBeenCalledWith(delay);
            }

            delaySpy.mockRestore();
        });

        it('should calculate correct display time for thinking', async () => {
            mockBehavior.thinkingDelay = 3456; // Odd number for rounding test
            jest.spyOn(state, 'delay').mockResolvedValue();
            const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

            await state.execute();

            expect(consoleSpy).toHaveBeenCalledWith('   💭 Thinking for 3s...');

            consoleSpy.mockRestore();
        });

        it('should handle edge cases in fallback delay generation', async () => {
            mockStateMachine.context.behavior = null;
            const getHumanizedDelaySpy = jest.spyOn(state, 'getHumanizedDelay')
                .mockReturnValueOnce(1000) // Minimum case
                .mockReturnValueOnce(3000); // Maximum case

            jest.spyOn(state, 'delay').mockResolvedValue();

            await state.execute();
            expect(getHumanizedDelaySpy).toHaveBeenCalledWith(2000, 50);

            await state.execute();
            expect(getHumanizedDelaySpy).toHaveBeenCalledWith(2000, 50);

            getHumanizedDelaySpy.mockRestore();
        });
    });

    describe('error handling', () => {
        it('should handle various error types during execution', async () => {
            const errors = [
                new Error('Network timeout'),
                new Error('Behavior profile error'),
                new Error('Delay error')
            ];

            for (const error of errors) {
                jest.spyOn(state, 'delay').mockRejectedValue(error);

                const result = await state.execute();

                expect(result.nextState).toBe('ERROR');
                expect(result.data.error).toBe(error);
            }
        });

        it('should not throw unhandled errors', async () => {
            jest.spyOn(state, 'delay').mockRejectedValue(new Error('Test error'));

            await expect(state.execute()).resolves.not.toThrow();
        });
    });
});

// Helper function to create Jest test environment if not available
if (typeof describe === 'undefined') {
    console.log('Jest test environment not detected. This file requires Jest to run.');
    console.log('Install Jest with: npm install --save-dev jest');
    console.log('Run tests with: npm test');
}