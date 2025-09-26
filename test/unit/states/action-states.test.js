// Combined tests for action states (Liking, Noping, Deciding)
const LikingState = require('../../../src/states/liking');
const NopingState = require('../../../src/states/noping');
const DecidingState = require('../../../src/states/deciding');

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
        this.clickLikeButtonResult = true;
        this.clickNopeButtonResult = true;
        this.clickLikeButtonCalled = false;
        this.clickNopeButtonCalled = false;
    }

    async clickLikeButton() {
        this.clickLikeButtonCalled = true;
        return this.clickLikeButtonResult;
    }

    async clickNopeButton() {
        this.clickNopeButtonCalled = true;
        return this.clickNopeButtonResult;
    }
}

class MockBehaviorProfile {
    constructor() {
        this.finalPause = 500;
        this.quickDecisionDelay = 600;
        this.getFinalPauseCalled = false;
        this.getQuickDecisionDelayCalled = false;
    }

    getFinalPause() {
        this.getFinalPauseCalled = true;
        return this.finalPause;
    }

    getQuickDecisionDelay() {
        this.getQuickDecisionDelayCalled = true;
        return this.quickDecisionDelay;
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

describe('DecidingState', () => {
    let state;
    let mockStateMachine;
    let mockBehavior;
    let mockHotkeys;

    beforeEach(() => {
        state = new DecidingState();
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
            expect(state.name).toBe('DECIDING');
        });
    });

    describe('execute', () => {
        it('should return SHUTDOWN when exit is requested', async () => {
            mockHotkeys.exitRequested = true;

            const result = await state.execute();

            expect(result).toEqual({ nextState: 'SHUTDOWN' });
        });

        it('should use behavior profile final pause when available', async () => {
            mockBehavior.finalPause = 400;
            const delaySpy = jest.spyOn(state, 'delay').mockResolvedValue();
            const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

            const result = await state.execute();

            expect(mockBehavior.getFinalPauseCalled).toBe(true);
            expect(delaySpy).toHaveBeenCalledWith(400);
            expect(result).toEqual({ nextState: 'LIKING' });

            delaySpy.mockRestore();
            consoleSpy.mockRestore();
        });

        it('should use fallback pause when no behavior profile available', async () => {
            mockStateMachine.context.behavior = null;
            const getHumanizedDelaySpy = jest.spyOn(state, 'getHumanizedDelay').mockReturnValue(350);
            const delaySpy = jest.spyOn(state, 'delay').mockResolvedValue();
            const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

            const result = await state.execute();

            expect(getHumanizedDelaySpy).toHaveBeenCalledWith(333, 40);
            expect(delaySpy).toHaveBeenCalledWith(350);
            expect(result).toEqual({ nextState: 'LIKING' });

            getHumanizedDelaySpy.mockRestore();
            delaySpy.mockRestore();
            consoleSpy.mockRestore();
        });
    });
});

describe('LikingState', () => {
    let state;
    let mockStateMachine;
    let mockBrowser;
    let mockHotkeys;

    beforeEach(() => {
        state = new LikingState();
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
            expect(state.name).toBe('LIKING');
        });
    });

    describe('execute', () => {
        it('should return SHUTDOWN when exit is requested', async () => {
            mockHotkeys.exitRequested = true;

            const result = await state.execute();

            expect(result).toEqual({ nextState: 'SHUTDOWN' });
            expect(mockBrowser.clickLikeButtonCalled).toBe(false);
        });

        it('should return error when browser is not available', async () => {
            mockStateMachine.context.browser = null;

            const result = await state.execute();

            expect(result).toEqual({ error: 'Browser not available in context' });
        });

        it('should transition to IDLE when like succeeds', async () => {
            mockBrowser.clickLikeButtonResult = true;
            const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

            const result = await state.execute();

            expect(mockBrowser.clickLikeButtonCalled).toBe(true);
            expect(consoleSpy).toHaveBeenCalledWith('✅ LIKE sent successfully');
            expect(result).toEqual({ nextState: 'IDLE' });

            consoleSpy.mockRestore();
        });

        it('should fallback to nope when like fails', async () => {
            mockBrowser.clickLikeButtonResult = false;
            mockBrowser.clickNopeButtonResult = true;
            const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

            const result = await state.execute();

            expect(mockBrowser.clickLikeButtonCalled).toBe(true);
            expect(mockBrowser.clickNopeButtonCalled).toBe(true);
            expect(consoleSpy).toHaveBeenCalledWith('❌ Failed to send LIKE - sending NOPE as fallback');
            expect(consoleSpy).toHaveBeenCalledWith('👎 NOPE sent as fallback');
            expect(result).toEqual({ nextState: 'IDLE' });

            consoleSpy.mockRestore();
        });

        it('should transition to ERROR when both like and nope fail', async () => {
            mockBrowser.clickLikeButtonResult = false;
            mockBrowser.clickNopeButtonResult = false;
            const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

            const result = await state.execute();

            expect(mockBrowser.clickLikeButtonCalled).toBe(true);
            expect(mockBrowser.clickNopeButtonCalled).toBe(true);
            expect(result).toEqual({
                nextState: 'ERROR',
                data: { error: 'Both like and nope actions failed' }
            });

            consoleSpy.mockRestore();
        });

        it('should handle browser errors gracefully', async () => {
            const testError = new Error('Browser like error');
            mockBrowser.clickLikeButton = jest.fn().mockRejectedValue(testError);
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

            const result = await state.execute();

            expect(result).toEqual({
                nextState: 'ERROR',
                data: { error: testError }
            });

            consoleSpy.mockRestore();
        });
    });
});

describe('NopingState', () => {
    let state;
    let mockStateMachine;
    let mockBrowser;
    let mockBehavior;
    let mockHotkeys;

    beforeEach(() => {
        state = new NopingState();
        mockStateMachine = new MockStateMachine();
        mockBrowser = new MockBrowserController();
        mockBehavior = new MockBehaviorProfile();
        mockHotkeys = new MockHotkeyHandler();

        state.setStateMachine(mockStateMachine);
        mockStateMachine.context = {
            browser: mockBrowser,
            behavior: mockBehavior,
            hotkeys: mockHotkeys
        };
    });

    describe('constructor', () => {
        it('should initialize with correct name', () => {
            expect(state.name).toBe('NOPING');
        });
    });

    describe('onEnter', () => {
        it('should log quick nope message when quickDecision flag is set', async () => {
            const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

            await state.onEnter({ quickDecision: true });

            expect(consoleSpy).toHaveBeenCalledWith('👎 Sending quick NOPE (not recently active)...');

            consoleSpy.mockRestore();
        });

        it('should log regular nope message when quickDecision flag is not set', async () => {
            const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

            await state.onEnter({ quickDecision: false });

            expect(consoleSpy).toHaveBeenCalledWith('👎 Sending NOPE...');

            consoleSpy.mockRestore();
        });

        it('should store transition data in context', async () => {
            const testData = { quickDecision: true, test: 'value' };

            await state.onEnter(testData);

            expect(mockStateMachine.context.transitionData).toEqual(testData);
        });
    });

    describe('execute', () => {
        it('should return SHUTDOWN when exit is requested', async () => {
            mockHotkeys.exitRequested = true;

            const result = await state.execute();

            expect(result).toEqual({ nextState: 'SHUTDOWN' });
        });

        it('should return error when browser is not available', async () => {
            mockStateMachine.context.browser = null;

            const result = await state.execute();

            expect(result).toEqual({ error: 'Browser not available in context' });
        });

        it('should apply quick decision delay when quickDecision flag is set', async () => {
            mockStateMachine.context.transitionData = { quickDecision: true };
            mockBehavior.quickDecisionDelay = 500;
            const delaySpy = jest.spyOn(state, 'delay').mockResolvedValue();
            const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

            const result = await state.execute();

            expect(mockBehavior.getQuickDecisionDelayCalled).toBe(true);
            expect(delaySpy).toHaveBeenCalledWith(500);
            expect(consoleSpy).toHaveBeenCalledWith('   ⚡ Quick decision delay: 500ms');
            expect(result).toEqual({ nextState: 'IDLE' });

            delaySpy.mockRestore();
            consoleSpy.mockRestore();
        });

        it('should use fallback delay when no behavior profile available', async () => {
            mockStateMachine.context.transitionData = { quickDecision: true };
            mockStateMachine.context.behavior = null;
            const getHumanizedDelaySpy = jest.spyOn(state, 'getHumanizedDelay').mockReturnValue(450);
            const delaySpy = jest.spyOn(state, 'delay').mockResolvedValue();
            const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

            const result = await state.execute();

            expect(getHumanizedDelaySpy).toHaveBeenCalledWith(550, 45);
            expect(delaySpy).toHaveBeenCalledWith(450);
            expect(result).toEqual({ nextState: 'IDLE' });

            getHumanizedDelaySpy.mockRestore();
            delaySpy.mockRestore();
            consoleSpy.mockRestore();
        });

        it('should skip delay when not a quick decision', async () => {
            mockStateMachine.context.transitionData = { quickDecision: false };
            const delaySpy = jest.spyOn(state, 'delay').mockResolvedValue();

            const result = await state.execute();

            expect(mockBehavior.getQuickDecisionDelayCalled).toBe(false);
            expect(delaySpy).not.toHaveBeenCalled();
            expect(result).toEqual({ nextState: 'IDLE' });

            delaySpy.mockRestore();
        });

        it('should transition to IDLE when nope succeeds', async () => {
            mockBrowser.clickNopeButtonResult = true;
            const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

            const result = await state.execute();

            expect(mockBrowser.clickNopeButtonCalled).toBe(true);
            expect(consoleSpy).toHaveBeenCalledWith('✅ NOPE sent successfully');
            expect(result).toEqual({ nextState: 'IDLE' });

            consoleSpy.mockRestore();
        });

        it('should transition to ERROR when nope fails', async () => {
            mockBrowser.clickNopeButtonResult = false;
            const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

            const result = await state.execute();

            expect(result).toEqual({
                nextState: 'ERROR',
                data: { error: 'Nope action failed' }
            });

            consoleSpy.mockRestore();
        });

        it('should handle browser errors gracefully', async () => {
            const testError = new Error('Browser nope error');
            mockBrowser.clickNopeButton = jest.fn().mockRejectedValue(testError);

            const result = await state.execute();

            expect(result).toEqual({
                nextState: 'ERROR',
                data: { error: testError }
            });
        });
    });
});

// Helper function to create Jest test environment if not available
if (typeof describe === 'undefined') {
    console.log('Jest test environment not detected. This file requires Jest to run.');
    console.log('Install Jest with: npm install --save-dev jest');
    console.log('Run tests with: npm test');
}