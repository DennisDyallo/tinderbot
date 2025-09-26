// Test utility functions for Tinder Bot state machine tests

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
    constructor(options = {}) {
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
        const context = {
            browser: new MockBrowserController(),
            behavior: new MockBehaviorProfile(options.behavior),
            hotkeys: new MockHotkeyHandler(options.exitRequested)
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
    MockStateMachine,
    MockBrowserController,
    MockBehaviorProfile,
    MockHotkeyHandler,
    MockPage,
    TestHelpers
};