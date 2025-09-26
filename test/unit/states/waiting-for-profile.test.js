const WaitingForProfileState = require('../../../src/states/waiting-for-profile');
const { MockRandomProvider } = require('../../helpers/test-utils');

// Mock dependencies
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
}

class MockBrowserController {
    constructor() {
        this.waitForProfilePhotoResult = true;
        this.waitForProfilePhotoCalled = false;
    }

    async waitForProfilePhoto() {
        this.waitForProfilePhotoCalled = true;
        return this.waitForProfilePhotoResult;
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

describe('WaitingForProfileState', () => {
    let state;
    let mockStateMachine;
    let mockBrowser;
    let mockHotkeys;
    let mockRandomProvider;

    beforeEach(() => {
        mockRandomProvider = new MockRandomProvider();
        state = new WaitingForProfileState(mockRandomProvider);
        mockStateMachine = new MockStateMachine();
        mockBrowser = new MockBrowserController();
        mockHotkeys = new MockHotkeyHandler();

        state.setStateMachine(mockStateMachine);
        mockStateMachine.context = {
            browser: mockBrowser,
            hotkeys: mockHotkeys,
            randomProvider: mockRandomProvider
        };
    });

    describe('constructor', () => {
        it('should initialize with correct name', () => {
            expect(state.name).toBe('WAITING_FOR_PROFILE');
        });

        it('should set correct timing values', () => {
            expect(state.maxWaitTime).toBe(30000);
            expect(state.checkInterval).toBe(500);
        });
    });

    describe('onEnter', () => {
        it('should log entry message', async () => {
            const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

            await state.onEnter();

            expect(consoleSpy).toHaveBeenCalledWith('🟢 Entering WAITING_FOR_PROFILE state');
            expect(consoleSpy).toHaveBeenCalledWith('⏳ Waiting for first profile to load...');

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
        });

        it('should return error when browser is not available', async () => {
            mockStateMachine.context.browser = null;

            const result = await state.execute();

            expect(result).toEqual({ error: 'Browser not available in context' });
        });

        it('should transition to ANALYZING when profile is found', async () => {
            mockBrowser.waitForProfilePhotoResult = true;
            const delaySpy = jest.spyOn(state, 'delay').mockResolvedValue();

            const result = await state.execute();

            expect(mockBrowser.waitForProfilePhotoCalled).toBe(true);
            expect(delaySpy).toHaveBeenCalled();
            expect(result).toEqual({ nextState: 'ANALYZING' });

            delaySpy.mockRestore();
        });

        it('should transition to ERROR when profile is not found', async () => {
            mockBrowser.waitForProfilePhotoResult = false;

            const result = await state.execute();

            expect(mockBrowser.waitForProfilePhotoCalled).toBe(true);
            expect(result).toEqual({
                nextState: 'ERROR',
                data: { error: 'Profile loading timeout' }
            });
        });

        it('should handle browser errors gracefully', async () => {
            const testError = new Error('Browser error');
            mockBrowser.waitForProfilePhoto = jest.fn().mockRejectedValue(testError);

            const result = await state.execute();

            expect(result).toEqual({
                nextState: 'ERROR',
                data: { error: testError }
            });
        });

        it('should apply humanized reaction delay when profile loads', async () => {
            mockBrowser.waitForProfilePhotoResult = true;
            mockRandomProvider.setFixedValue('getHumanizedDelay', 150);
            const delaySpy = jest.spyOn(state, 'delay').mockResolvedValue();

            await state.execute();

            expect(mockRandomProvider.getCallCount('getHumanizedDelay')).toBe(1);
            expect(delaySpy).toHaveBeenCalledWith(150);

            delaySpy.mockRestore();
        });

        it('should log appropriate messages during execution', async () => {
            const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
            mockBrowser.waitForProfilePhotoResult = true;
            mockRandomProvider.setFixedValue('getHumanizedDelay', 150);
            jest.spyOn(state, 'delay').mockResolvedValue();

            await state.execute();

            expect(consoleSpy).toHaveBeenCalledWith('✅ Profile loaded - ready to analyze');
            expect(consoleSpy).toHaveBeenCalledWith('   😌 Human reaction delay: 150ms');

            consoleSpy.mockRestore();
        });
    });

    describe('onExit', () => {
        it('should call parent onExit', async () => {
            const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

            await state.onExit();

            expect(consoleSpy).toHaveBeenCalledWith('🔴 Exiting WAITING_FOR_PROFILE state');

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
        it('should handle complete success flow', async () => {
            const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
            jest.spyOn(state, 'delay').mockResolvedValue();

            await state.onEnter();
            const result = await state.execute();
            await state.onExit();

            expect(result).toEqual({ nextState: 'ANALYZING' });
            expect(mockBrowser.waitForProfilePhotoCalled).toBe(true);

            consoleSpy.mockRestore();
        });

        it('should handle error recovery scenario', async () => {
            mockBrowser.waitForProfilePhotoResult = false;

            await state.onEnter();
            const result = await state.execute();

            expect(result.nextState).toBe('ERROR');
            expect(result.data.error).toBe('Profile loading timeout');
        });

        it('should handle shutdown scenario', async () => {
            mockHotkeys.exitRequested = true;

            const result = await state.execute();

            expect(result).toEqual({ nextState: 'SHUTDOWN' });
            expect(mockBrowser.waitForProfilePhotoCalled).toBe(false);
        });
    });

    describe('timing and delays', () => {
        it('should use getHumanizedDelay for reaction timing', async () => {
            mockBrowser.waitForProfilePhotoResult = true;
            mockRandomProvider.setFixedValue('getHumanizedDelay', 123);
            jest.spyOn(state, 'delay').mockResolvedValue();

            await state.execute();

            const lastCall = mockRandomProvider.getLastCall('getHumanizedDelay');
            expect(lastCall.args).toEqual([125, 60]);
            expect(lastCall.result).toBe(123);
        });
    });
});

// Helper function to create Jest test environment if not available
if (typeof describe === 'undefined') {
    console.log('Jest test environment not detected. This file requires Jest to run.');
    console.log('Install Jest with: npm install --save-dev jest');
    console.log('Run tests with: npm test');
}