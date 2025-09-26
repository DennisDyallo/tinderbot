class BaseState {
    constructor(name) {
        this.name = name;
        this.stateMachine = null;
    }

    setStateMachine(stateMachine) {
        this.stateMachine = stateMachine;
    }

    getContext() {
        return this.stateMachine ? this.stateMachine.getContext() : {};
    }

    setContext(key, value) {
        if (this.stateMachine) {
            this.stateMachine.setContext(key, value);
        }
    }

    async onEnter(data = {}) {
        // Override in subclasses
        console.log(`🟢 Entering ${this.name} state`);
    }

    async onExit(data = {}) {
        // Override in subclasses
        console.log(`🔴 Exiting ${this.name} state`);
    }

    async execute() {
        // Override in subclasses - should return { nextState?, data?, error? }
        throw new Error(`execute() method not implemented for ${this.name} state`);
    }

    async delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Helper to get browser controller from context
    getBrowser() {
        const context = this.getContext();
        return context.browser;
    }

    // Helper to get hotkey handler from context
    getHotkeys() {
        const context = this.getContext();
        return context.hotkeys;
    }

    // Helper to get behavior profile from context
    getBehavior() {
        const context = this.getContext();
        return context.behavior;
    }

    // Helper to check if exit was requested
    isExitRequested() {
        const hotkeys = this.getHotkeys();
        return hotkeys ? hotkeys.isExitRequested() : false;
    }

    // Common method to generate humanized delay with some randomness
    getHumanizedDelay(baseMs, variationPercent = 20) {
        const variation = baseMs * (variationPercent / 100);
        const randomVariation = (Math.random() * 2 - 1) * variation; // -variation to +variation
        return Math.max(50, Math.round(baseMs + randomVariation)); // minimum 50ms
    }
}

module.exports = BaseState;