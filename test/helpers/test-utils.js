// Test utility functions for Tinder Bot state machine tests

// Mock RandomProvider for testing
class MockRandomProvider {
    constructor() {
        this.reset();
        this.callLog = [];
    }

    reset() {
        // Predefined sequences for predictable testing
        this.sequences = {
            randomInRange: [150, 800, 2500, 400, 5000], // Cycling values
            randomFloat: [0.3, 0.7, 0.1, 0.9, 0.5],
            randomBoolean: [true, false, true, false, true],
            getHumanizedDelay: [150, 300, 450, 200, 350]
        };
        this.counters = {
            randomInRange: 0,
            randomFloat: 0,
            randomBoolean: 0,
            getHumanizedDelay: 0,
            random: 0
        };
        this.fixedValues = {};
    }

    // Allow setting fixed values for specific methods
    setFixedValue(method, value) {
        this.fixedValues[method] = value;
    }

    // Allow setting sequences for methods
    setSequence(method, values) {
        this.sequences[method] = [...values];
        this.counters[method] = 0;
    }

    // Log method calls for testing
    _logCall(method, args, result) {
        this.callLog.push({ method, args, result, timestamp: Date.now() });
        return result;
    }

    random() {
        this.counters.random++;
        const result = this.fixedValues.random !== undefined
            ? this.fixedValues.random
            : 0.5; // Fixed predictable value
        return this._logCall('random', [], result);
    }

    randomInRange(min, max) {
        if (Array.isArray(min)) {
            [min, max] = min;
        }

        let result;
        if (this.fixedValues.randomInRange !== undefined) {
            result = this.fixedValues.randomInRange;
        } else {
            const sequence = this.sequences.randomInRange;
            const index = this.counters.randomInRange % sequence.length;
            result = sequence[index];
            this.counters.randomInRange++;
        }

        // Ensure result is within range
        result = Math.max(min, Math.min(max, result));
        return this._logCall('randomInRange', [min, max], result);
    }

    randomFloat(min, max) {
        let result;
        if (this.fixedValues.randomFloat !== undefined) {
            result = this.fixedValues.randomFloat;
        } else {
            const sequence = this.sequences.randomFloat;
            const index = this.counters.randomFloat % sequence.length;
            const ratio = sequence[index];
            result = min + (max - min) * ratio;
            this.counters.randomFloat++;
        }
        return this._logCall('randomFloat', [min, max], result);
    }

    randomBoolean(probability = 0.5) {
        let result;
        if (this.fixedValues.randomBoolean !== undefined) {
            result = this.fixedValues.randomBoolean;
        } else {
            const sequence = this.sequences.randomBoolean;
            const index = this.counters.randomBoolean % sequence.length;
            result = sequence[index];
            this.counters.randomBoolean++;
        }
        return this._logCall('randomBoolean', [probability], result);
    }

    randomChoice(array) {
        if (!Array.isArray(array) || array.length === 0) {
            throw new Error('randomChoice requires a non-empty array');
        }
        // Always return first item for predictability
        const result = array[0];
        return this._logCall('randomChoice', [array], result);
    }

    randomWeightedChoice(choices) {
        // For testing, return the key with highest weight
        let maxWeight = 0;
        let result = Object.keys(choices)[0];

        for (const [choice, weight] of Object.entries(choices)) {
            if (weight > maxWeight) {
                maxWeight = weight;
                result = choice;
            }
        }

        return this._logCall('randomWeightedChoice', [choices], result);
    }

    getHumanizedDelay(baseMs, variationPercent = 20) {
        let result;
        if (this.fixedValues.getHumanizedDelay !== undefined) {
            result = this.fixedValues.getHumanizedDelay;
        } else {
            const sequence = this.sequences.getHumanizedDelay;
            const index = this.counters.getHumanizedDelay % sequence.length;
            result = sequence[index];
            this.counters.getHumanizedDelay++;
        }

        // Ensure minimum of 50ms
        result = Math.max(50, result);
        return this._logCall('getHumanizedDelay', [baseMs, variationPercent], result);
    }

    randomGaussian(mean = 0, stdDev = 1) {
        // Simple predictable implementation for testing
        const result = mean; // Always return mean for predictability
        return this._logCall('randomGaussian', [mean, stdDev], result);
    }

    getNaturalDelay(minMs, maxMs, peakMs = null) {
        // Return middle value for predictability
        const result = peakMs || Math.round((minMs + maxMs) / 2);
        return this._logCall('getNaturalDelay', [minMs, maxMs, peakMs], result);
    }

    // Test utilities
    getCallCount(method) {
        return this.callLog.filter(call => call.method === method).length;
    }

    getLastCall(method) {
        const calls = this.callLog.filter(call => call.method === method);
        return calls[calls.length - 1];
    }

    clearCallLog() {
        this.callLog = [];
    }
}

class MockStateMachine {
    constructor() {
        this.context = {};
        this.stopCalled = false;
        this.transitionHistory = [];
        this.currentState = null;
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

    // Mock transition tracking for testing
    transitionTo(newState, data) {
        this.transitionHistory.push({
            from: this.currentState,
            to: newState,
            data,
            timestamp: Date.now()
        });
        this.currentState = newState;
    }

    getTransitionHistory() {
        return this.transitionHistory;
    }

    clearHistory() {
        this.transitionHistory = [];
    }
}

class MockBrowserController {
    constructor() {
        this.reset();
    }

    reset() {
        this.waitForProfilePhotoResult = true;
        this.checkForRecentlyActiveResult = true;
        this.clickLikeButtonResult = true;
        this.clickNopeButtonResult = true;

        this.waitForProfilePhotoCalled = false;
        this.checkForRecentlyActiveCalled = false;
        this.clickLikeButtonCalled = false;
        this.clickNopeButtonCalled = false;
        this.viewPhotosCalled = false;

        this.page = new MockPage();
    }

    async waitForProfilePhoto() {
        this.waitForProfilePhotoCalled = true;
        if (typeof this.waitForProfilePhotoResult === 'function') {
            return await this.waitForProfilePhotoResult();
        }
        return this.waitForProfilePhotoResult;
    }

    async checkForRecentlyActive() {
        this.checkForRecentlyActiveCalled = true;
        if (typeof this.checkForRecentlyActiveResult === 'function') {
            return await this.checkForRecentlyActiveResult();
        }
        return this.checkForRecentlyActiveResult;
    }

    async clickLikeButton() {
        this.clickLikeButtonCalled = true;
        if (typeof this.clickLikeButtonResult === 'function') {
            return await this.clickLikeButtonResult();
        }
        return this.clickLikeButtonResult;
    }

    async clickNopeButton() {
        this.clickNopeButtonCalled = true;
        if (typeof this.clickNopeButtonResult === 'function') {
            return await this.clickNopeButtonResult();
        }
        return this.clickNopeButtonResult;
    }

    async viewPhotos(behavior) {
        this.viewPhotosCalled = true;
        this.viewPhotosCalledWith = behavior;
        return true;
    }
}

class MockPage {
    constructor() {
        this.keyboardPresses = [];
        this.mousePositions = [];
    }

    get keyboard() {
        return {
            press: (key) => {
                this.keyboardPresses.push(key);
                return Promise.resolve();
            }
        };
    }

    get mouse() {
        return {
            move: (x, y) => {
                this.mousePositions.push({ x, y });
                return Promise.resolve();
            }
        };
    }

    viewportSize() {
        return { width: 1200, height: 800 };
    }
}

class MockBehaviorProfile {
    constructor(options = {}, randomProvider = null) {
        this.randomProvider = randomProvider || new MockRandomProvider();
        this.thinkingDelay = options.thinkingDelay || 2000;
        this.quickDecisionDelay = options.quickDecisionDelay || 600;
        this.nextProfileDelay = options.nextProfileDelay || 5000;
        this.finalPause = options.finalPause || 400;

        this.photoViewing = options.photoViewing || {
            count: 2,
            delays: [800, 1200]
        };

        this.mouseMovement = options.mouseMovement || {
            shouldMove: true,
            duration: 1500,
            steps: 15
        };

        this.callCounts = {
            getThinkingDelay: 0,
            getQuickDecisionDelay: 0,
            getNextProfileDelay: 0,
            getFinalPause: 0,
            getPhotoViewingBehavior: 0,
            getMouseMovementBehavior: 0
        };
    }

    getThinkingDelay() {
        this.callCounts.getThinkingDelay++;
        return this.thinkingDelay;
    }

    getQuickDecisionDelay() {
        this.callCounts.getQuickDecisionDelay++;
        return this.quickDecisionDelay;
    }

    getNextProfileDelay() {
        this.callCounts.getNextProfileDelay++;
        return this.nextProfileDelay;
    }

    getFinalPause() {
        this.callCounts.getFinalPause++;
        return this.finalPause;
    }

    getPhotoViewingBehavior() {
        this.callCounts.getPhotoViewingBehavior++;
        return this.photoViewing;
    }

    getMouseMovementBehavior() {
        this.callCounts.getMouseMovementBehavior++;
        return this.mouseMovement;
    }

    logBehavior() {
        // Mock implementation
    }
}

class MockHotkeyHandler {
    constructor(exitRequested = false) {
        this.exitRequested = exitRequested;
        this.cleanupCalled = false;
    }

    isExitRequested() {
        return this.exitRequested;
    }

    cleanup() {
        this.cleanupCalled = true;
    }

    requestExit() {
        this.exitRequested = true;
    }
}

// Test helper functions
const TestHelpers = {
    // Create a complete mock context with all dependencies
    createMockContext(options = {}) {
        const randomProvider = new MockRandomProvider();
        const context = {
            browser: new MockBrowserController(),
            behavior: new MockBehaviorProfile(options.behavior, randomProvider),
            hotkeys: new MockHotkeyHandler(options.exitRequested),
            randomProvider: randomProvider
        };

        if (options.noBehavior) {
            context.behavior = null;
        }

        if (options.noBrowser) {
            context.browser = null;
        }

        return context;
    },

    // Create a mock state machine with context
    createMockStateMachine(contextOptions = {}) {
        const sm = new MockStateMachine();
        const context = this.createMockContext(contextOptions);

        Object.keys(context).forEach(key => {
            sm.setContext(key, context[key]);
        });

        return sm;
    },

    // Wait for a specific amount of time (for timing tests)
    async waitMs(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    },

    // Assert that a delay was approximately correct (with tolerance)
    assertDelayApprox(actualMs, expectedMs, toleranceMs = 50) {
        const diff = Math.abs(actualMs - expectedMs);
        if (diff > toleranceMs) {
            throw new Error(`Expected delay ~${expectedMs}ms, got ${actualMs}ms (diff: ${diff}ms, tolerance: ${toleranceMs}ms)`);
        }
    },

    // Measure execution time of an async function
    async measureTime(asyncFn) {
        const start = Date.now();
        const result = await asyncFn();
        const duration = Date.now() - start;
        return { result, duration };
    },

    // Create console spy that can be easily restored
    createConsoleSpy(method = 'log') {
        const spy = jest.spyOn(console, method).mockImplementation(() => {});
        return {
            spy,
            restore: () => spy.mockRestore(),
            getCalls: () => spy.mock.calls,
            getCallsWithArgs: () => spy.mock.calls.map(call => call.join(' '))
        };
    },

    // Assert state transition result
    assertStateTransition(result, expectedNextState, expectedData = undefined) {
        expect(result).toBeDefined();
        expect(result.nextState).toBe(expectedNextState);

        if (expectedData !== undefined) {
            expect(result.data).toEqual(expectedData);
        }
    },

    // Assert error result
    assertErrorResult(result, expectedErrorMessage = null) {
        expect(result).toBeDefined();
        expect(result.nextState).toBe('ERROR');
        expect(result.data).toBeDefined();
        expect(result.data.error).toBeDefined();

        if (expectedErrorMessage) {
            const errorMessage = result.data.error.message || result.data.error;
            expect(errorMessage).toContain(expectedErrorMessage);
        }
    },

    // Create a promise that can be resolved/rejected externally
    createControllablePromise() {
        let resolve, reject;
        const promise = new Promise((res, rej) => {
            resolve = res;
            reject = rej;
        });
        return { promise, resolve, reject };
    }
};

module.exports = {
    MockRandomProvider,
    MockStateMachine,
    MockBrowserController,
    MockBehaviorProfile,
    MockHotkeyHandler,
    MockPage,
    TestHelpers
};