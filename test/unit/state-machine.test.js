const StateMachine = require('../../src/state-machine');
const BaseState = require('../../src/states/base-state');

// Mock state for testing
class MockState extends BaseState {
    constructor(name, behavior = {}) {
        super(name);
        this.behavior = behavior;
        this.enterCalled = false;
        this.exitCalled = false;
        this.executeCalled = false;
    }

    async onEnter(data) {
        this.enterCalled = true;
        this.enterData = data;
        if (this.behavior.onEnter) await this.behavior.onEnter(data);
    }

    async onExit(data) {
        this.exitCalled = true;
        this.exitData = data;
        if (this.behavior.onExit) await this.behavior.onExit(data);
    }

    async execute() {
        this.executeCalled = true;
        if (this.behavior.execute) return await this.behavior.execute();
        return this.behavior.result || null;
    }
}

describe('StateMachine', () => {
    let stateMachine;
    let mockStateA;
    let mockStateB;

    beforeEach(() => {
        stateMachine = new StateMachine();
        mockStateA = new MockState('A');
        mockStateB = new MockState('B');
    });

    describe('constructor', () => {
        it('should initialize with default values', () => {
            expect(stateMachine.currentState).toBeNull();
            expect(stateMachine.isRunning).toBe(false);
            expect(stateMachine.shouldStop).toBe(false);
            expect(typeof stateMachine.context).toBe('object');
        });

        it('should accept initial state', () => {
            const smWithInitial = new StateMachine();
            smWithInitial.registerState('INITIAL', mockStateA);
            smWithInitial.setInitialState('INITIAL');
            expect(smWithInitial.currentState).toBe('INITIAL');
        });
    });

    describe('state registration', () => {
        it('should register states correctly', () => {
            stateMachine.registerState('A', mockStateA);
            expect(stateMachine.states.has('A')).toBe(true);
            expect(mockStateA.stateMachine).toBe(stateMachine);
        });

        it('should set initial state correctly', () => {
            stateMachine.registerState('A', mockStateA);
            stateMachine.setInitialState('A');
            expect(stateMachine.currentState).toBe('A');
        });

        it('should throw error when setting initial state that is not registered', () => {
            expect(() => {
                stateMachine.setInitialState('NONEXISTENT');
            }).toThrow("State 'NONEXISTENT' not registered");
        });
    });

    describe('transition definition', () => {
        it('should define transitions correctly', () => {
            const options = { delay: 100, condition: () => true };
            stateMachine.defineTransition('A', 'B', options);

            const transition = stateMachine.transitionMatrix.get('A->B');
            expect(transition).toBeDefined();
            expect(transition.delay).toBe(100);
            expect(typeof transition.condition).toBe('function');
        });

        it('should handle transitions without options', () => {
            stateMachine.defineTransition('A', 'B');

            const transition = stateMachine.transitionMatrix.get('A->B');
            expect(transition).toBeDefined();
            expect(transition.delay).toBe(0);
        });
    });

    describe('context management', () => {
        it('should set and get context values', () => {
            stateMachine.setContext('testKey', 'testValue');
            expect(stateMachine.getContext().testKey).toBe('testValue');
        });

        it('should return full context object', () => {
            stateMachine.setContext('key1', 'value1');
            stateMachine.setContext('key2', 'value2');

            const context = stateMachine.getContext();
            expect(context.key1).toBe('value1');
            expect(context.key2).toBe('value2');
        });
    });

    describe('state transitions', () => {
        beforeEach(() => {
            stateMachine.registerState('A', mockStateA);
            stateMachine.registerState('B', mockStateB);
            stateMachine.setInitialState('A');
        });

        it('should transition between states', async () => {
            await stateMachine.transitionTo('B');

            expect(stateMachine.currentState).toBe('B');
            expect(mockStateA.exitCalled).toBe(true);
            expect(mockStateB.enterCalled).toBe(true);
        });

        it('should handle transition data', async () => {
            const testData = { message: 'test' };
            await stateMachine.transitionTo('B', testData);

            expect(mockStateA.exitData).toEqual(testData);
            expect(mockStateB.enterData).toEqual(testData);
        });

        it('should respect transition delays', async () => {
            stateMachine.defineTransition('A', 'B', { delay: 100 });

            const startTime = Date.now();
            await stateMachine.transitionTo('B');
            const endTime = Date.now();

            expect(endTime - startTime).toBeGreaterThanOrEqual(90); // Allow some tolerance
        });

        it('should throw error for unregistered target state', async () => {
            await expect(stateMachine.transitionTo('NONEXISTENT'))
                .rejects.toThrow("State 'NONEXISTENT' not registered");
        });
    });

    describe('canTransitionTo', () => {
        beforeEach(() => {
            stateMachine.registerState('A', mockStateA);
            stateMachine.registerState('B', mockStateB);
            stateMachine.setInitialState('A');
        });

        it('should return true for defined transitions', () => {
            stateMachine.defineTransition('A', 'B');
            expect(stateMachine.canTransitionTo('B')).toBe(true);
        });

        it('should return false for undefined transitions', () => {
            expect(stateMachine.canTransitionTo('B')).toBe(false);
        });

        it('should allow transitions to ERROR and SHUTDOWN', () => {
            expect(stateMachine.canTransitionTo('ERROR')).toBe(true);
            expect(stateMachine.canTransitionTo('SHUTDOWN')).toBe(true);
        });
    });

    describe('state machine execution', () => {
        beforeEach(() => {
            stateMachine.registerState('A', mockStateA);
            stateMachine.registerState('B', mockStateB);
            stateMachine.registerState('SHUTDOWN', new MockState('SHUTDOWN', {
                execute: () => {
                    stateMachine.stop();
                    return null;
                }
            }));
            stateMachine.setInitialState('A');
        });

        it('should start and execute initial state', async () => {
            mockStateA.behavior.result = { nextState: 'SHUTDOWN' };

            const startPromise = stateMachine.start();

            // Give it a moment to start
            await new Promise(resolve => setTimeout(resolve, 50));

            expect(stateMachine.isRunning).toBe(true);
            expect(mockStateA.enterCalled).toBe(true);
            expect(mockStateA.executeCalled).toBe(true);

            await startPromise;
        });

        it('should handle state transitions during execution', async () => {
            mockStateA.behavior.result = { nextState: 'B' };
            mockStateB.behavior.result = { nextState: 'SHUTDOWN' };

            await stateMachine.start();

            expect(mockStateA.exitCalled).toBe(true);
            expect(mockStateB.enterCalled).toBe(true);
            expect(mockStateB.executeCalled).toBe(true);
        });

        it('should handle errors and transition to ERROR state', async () => {
            const errorState = new MockState('ERROR', {
                execute: () => {
                    stateMachine.stop();
                    return null;
                }
            });

            stateMachine.registerState('ERROR', errorState);
            mockStateA.behavior.result = { error: new Error('Test error') };

            await stateMachine.start();

            expect(errorState.enterCalled).toBe(true);
        });

        it('should stop when requested', () => {
            stateMachine.stop();
            expect(stateMachine.shouldStop).toBe(true);
        });
    });

    describe('error handling', () => {
        it('should handle state execution errors gracefully', async () => {
            const errorState = new MockState('ERROR', {
                execute: () => {
                    stateMachine.stop();
                    return null;
                }
            });

            stateMachine.registerState('A', new MockState('A', {
                execute: () => {
                    throw new Error('Execution error');
                }
            }));
            stateMachine.registerState('ERROR', errorState);
            stateMachine.setInitialState('A');

            await stateMachine.start();

            expect(errorState.enterCalled).toBe(true);
        });
    });

    describe('utility methods', () => {
        it('should return current state', () => {
            stateMachine.registerState('A', mockStateA);
            stateMachine.setInitialState('A');
            expect(stateMachine.getCurrentState()).toBe('A');
        });

        it('should handle delay function', async () => {
            const startTime = Date.now();
            await stateMachine.delay(100);
            const endTime = Date.now();

            expect(endTime - startTime).toBeGreaterThanOrEqual(90);
        });
    });
});

// Helper function to create Jest test environment if not available
if (typeof describe === 'undefined') {
    console.log('Jest test environment not detected. This file requires Jest to run.');
    console.log('Install Jest with: npm install --save-dev jest');
    console.log('Run tests with: npm test');
}