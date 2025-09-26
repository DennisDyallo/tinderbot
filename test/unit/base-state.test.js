const BaseState = require('../../src/states/base-state');

// Mock StateMachine for testing
class MockStateMachine {
    constructor() {
        this.context = {};
        this.stopCalled = false;
    }

    getContext() {
        return this.context;
    }

    setContext(key, value) {
        this.context[key] = value;
    }

    stop() {
        this.stopCalled = true;
    }
}

// Mock HotkeyHandler for testing
class MockHotkeyHandler {
    constructor(exitRequested = false) {
        this.exitRequested = exitRequested;
    }

    isExitRequested() {
        return this.exitRequested;
    }
}

// Mock BrowserController for testing
class MockBrowserController {
    constructor() {
        this.initialized = false;
    }
}

// Concrete implementation of BaseState for testing
class TestState extends BaseState {
    constructor(name = 'TEST') {
        super(name);
        this.executeCalled = false;
    }

    async execute() {
        this.executeCalled = true;
        return { result: 'executed' };
    }
}

describe('BaseState', () => {
    let testState;
    let mockStateMachine;

    beforeEach(() => {
        testState = new TestState();
        mockStateMachine = new MockStateMachine();
        testState.setStateMachine(mockStateMachine);
    });

    describe('constructor', () => {
        it('should initialize with provided name', () => {
            const state = new TestState('CUSTOM_NAME');
            expect(state.name).toBe('CUSTOM_NAME');
        });

        it('should initialize stateMachine as null', () => {
            const state = new TestState();
            expect(state.stateMachine).toBeNull();
        });
    });

    describe('setStateMachine', () => {
        it('should set the state machine reference', () => {
            const newState = new TestState();
            newState.setStateMachine(mockStateMachine);
            expect(newState.stateMachine).toBe(mockStateMachine);
        });
    });

    describe('context management', () => {
        it('should get context from state machine', () => {
            mockStateMachine.context = { test: 'value' };
            expect(testState.getContext()).toEqual({ test: 'value' });
        });

        it('should return empty object when no state machine', () => {
            const noSmState = new TestState();
            expect(noSmState.getContext()).toEqual({});
        });

        it('should set context values through state machine', () => {
            testState.setContext('key', 'value');
            expect(mockStateMachine.context.key).toBe('value');
        });

        it('should handle setContext when no state machine', () => {
            const noSmState = new TestState();
            expect(() => noSmState.setContext('key', 'value')).not.toThrow();
        });
    });

    describe('lifecycle methods', () => {
        it('should have default onEnter implementation', async () => {
            const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

            await testState.onEnter({ data: 'test' });

            expect(consoleSpy).toHaveBeenCalledWith('🟢 Entering TEST state');
            consoleSpy.mockRestore();
        });

        it('should have default onExit implementation', async () => {
            const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

            await testState.onExit({ data: 'test' });

            expect(consoleSpy).toHaveBeenCalledWith('🔴 Exiting TEST state');
            consoleSpy.mockRestore();
        });

        it('should require execute method implementation in concrete classes', async () => {
            const baseState = new BaseState('BASE');
            await expect(baseState.execute()).rejects.toThrow('execute() method not implemented for BASE state');
        });

        it('should execute correctly in concrete implementation', async () => {
            const result = await testState.execute();
            expect(testState.executeCalled).toBe(true);
            expect(result).toEqual({ result: 'executed' });
        });
    });

    describe('helper methods', () => {
        describe('getBrowser', () => {
            it('should return browser from context', () => {
                const mockBrowser = new MockBrowserController();
                mockStateMachine.context.browser = mockBrowser;

                expect(testState.getBrowser()).toBe(mockBrowser);
            });

            it('should return undefined when no browser in context', () => {
                expect(testState.getBrowser()).toBeUndefined();
            });
        });

        describe('getHotkeys', () => {
            it('should return hotkeys from context', () => {
                const mockHotkeys = new MockHotkeyHandler();
                mockStateMachine.context.hotkeys = mockHotkeys;

                expect(testState.getHotkeys()).toBe(mockHotkeys);
            });

            it('should return undefined when no hotkeys in context', () => {
                expect(testState.getHotkeys()).toBeUndefined();
            });
        });

        describe('getBehavior', () => {
            it('should return behavior from context', () => {
                const mockBehavior = { type: 'normal' };
                mockStateMachine.context.behavior = mockBehavior;

                expect(testState.getBehavior()).toBe(mockBehavior);
            });

            it('should return undefined when no behavior in context', () => {
                expect(testState.getBehavior()).toBeUndefined();
            });
        });

        describe('isExitRequested', () => {
            it('should return true when hotkeys request exit', () => {
                mockStateMachine.context.hotkeys = new MockHotkeyHandler(true);
                expect(testState.isExitRequested()).toBe(true);
            });

            it('should return false when hotkeys do not request exit', () => {
                mockStateMachine.context.hotkeys = new MockHotkeyHandler(false);
                expect(testState.isExitRequested()).toBe(false);
            });

            it('should return false when no hotkeys in context', () => {
                expect(testState.isExitRequested()).toBe(false);
            });
        });
    });

    describe('delay method', () => {
        it('should delay for specified time', async () => {
            const startTime = Date.now();
            await testState.delay(100);
            const endTime = Date.now();

            expect(endTime - startTime).toBeGreaterThanOrEqual(90); // Allow some tolerance
        });

        it('should handle zero delay', async () => {
            const startTime = Date.now();
            await testState.delay(0);
            const endTime = Date.now();

            expect(endTime - startTime).toBeLessThan(50); // Should be very quick
        });
    });

    describe('getHumanizedDelay', () => {
        it('should return delay within expected range', () => {
            const baseMs = 1000;
            const variationPercent = 20;

            // Test multiple times to check randomness
            for (let i = 0; i < 10; i++) {
                const delay = testState.getHumanizedDelay(baseMs, variationPercent);
                expect(delay).toBeGreaterThanOrEqual(800); // 1000 - 20%
                expect(delay).toBeLessThanOrEqual(1200);   // 1000 + 20%
            }
        });

        it('should use default variation percent when not provided', () => {
            const baseMs = 1000;

            for (let i = 0; i < 10; i++) {
                const delay = testState.getHumanizedDelay(baseMs);
                expect(delay).toBeGreaterThanOrEqual(800); // 1000 - 20% (default)
                expect(delay).toBeLessThanOrEqual(1200);   // 1000 + 20% (default)
            }
        });

        it('should enforce minimum delay of 50ms', () => {
            // Test with very small base that could result in negative or very small values
            const delay = testState.getHumanizedDelay(10, 90);
            expect(delay).toBeGreaterThanOrEqual(50);
        });

        it('should handle zero base delay', () => {
            const delay = testState.getHumanizedDelay(0, 50);
            expect(delay).toBeGreaterThanOrEqual(50);
        });
    });
});

// Helper function to create Jest test environment if not available
if (typeof describe === 'undefined') {
    console.log('Jest test environment not detected. This file requires Jest to run.');
    console.log('Install Jest with: npm install --save-dev jest');
    console.log('Run tests with: npm test');
}