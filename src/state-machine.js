require('./logger');

class StateMachine {
    constructor(initialState = null) {
        this.currentState = null;
        this.states = new Map();
        this.transitionMatrix = new Map();
        this.context = {};
        this.isRunning = false;
        this.shouldStop = false;

        if (initialState) {
            this.setInitialState(initialState);
        }
    }

    registerState(stateName, stateInstance) {
        this.states.set(stateName, stateInstance);
        stateInstance.setStateMachine(this);
    }

    setInitialState(stateName) {
        if (!this.states.has(stateName)) {
            throw new Error(`State '${stateName}' not registered`);
        }
        this.currentState = stateName;
    }

    defineTransition(fromState, toState, options = {}) {
        const key = `${fromState}->${toState}`;
        this.transitionMatrix.set(key, {
            delay: options.delay || 0,
            condition: options.condition || null,
            onTransition: options.onTransition || null
        });
    }

    async transitionTo(newState, data = {}) {
        if (!this.states.has(newState)) {
            throw new Error(`State '${newState}' not registered`);
        }

        const transitionKey = `${this.currentState}->${newState}`;
        const transition = this.transitionMatrix.get(transitionKey);

        if (!transition && this.currentState !== null) {
            logger.warn(`⚠️  No defined transition from '${this.currentState}' to '${newState}' - allowing anyway`);
        }

        // Execute exit logic of current state
        if (this.currentState) {
            const currentStateInstance = this.states.get(this.currentState);
            await currentStateInstance.onExit(data);
        }

        // Apply transition delay if defined
        if (transition && transition.delay > 0) {
            logger.info(`⏳ Transition delay: ${transition.delay}ms (${this.currentState} → ${newState})`);
            await this.delay(transition.delay);
        }

        // Execute transition callback if defined
        if (transition && transition.onTransition) {
            await transition.onTransition(this.currentState, newState, data);
        }

        const previousState = this.currentState;
        this.currentState = newState;

        logger.state(`🔄 State: ${previousState || 'NONE'} → ${newState}`);

        // Execute enter logic of new state
        const newStateInstance = this.states.get(newState);
        await newStateInstance.onEnter(data);
    }

    async start() {
        if (!this.currentState) {
            throw new Error('No initial state set');
        }

        this.isRunning = true;
        this.shouldStop = false;

        logger.info(`🤖 State machine starting in state: ${this.currentState}`);

        // Enter initial state
        const initialStateInstance = this.states.get(this.currentState);
        await initialStateInstance.onEnter({});

        // Main state machine loop
        while (this.isRunning && !this.shouldStop) {
            try {
                const currentStateInstance = this.states.get(this.currentState);
                const result = await currentStateInstance.execute();

                // Handle state transition requests
                if (result && result.nextState) {
                    await this.transitionTo(result.nextState, result.data || {});
                } else if (result && result.error) {
                    logger.error('❌ State execution error:', result.error);
                    await this.transitionTo('ERROR', { error: result.error });
                }

            } catch (error) {
                logger.error('💥 State machine error:', error.message);
                await this.transitionTo('ERROR', { error });
            }
        }

        logger.info('🏁 State machine stopped');
    }

    stop() {
        logger.info('🛑 Stopping state machine...');
        this.shouldStop = true;
    }

    getCurrentState() {
        return this.currentState;
    }

    getContext() {
        return this.context;
    }

    setContext(key, value) {
        this.context[key] = value;
    }

    async delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Helper method to check if a transition is valid
    canTransitionTo(targetState) {
        const transitionKey = `${this.currentState}->${targetState}`;
        return this.transitionMatrix.has(transitionKey) || targetState === 'ERROR' || targetState === 'SHUTDOWN';
    }

    // Debug method to log all registered states and transitions
    logConfiguration() {
        logger.info('📋 State Machine Configuration:');
        logger.info('   States:', Array.from(this.states.keys()));
        logger.info('   Transitions:', Array.from(this.transitionMatrix.keys()));
    }
}

module.exports = StateMachine;