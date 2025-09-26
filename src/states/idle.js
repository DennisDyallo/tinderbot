const BaseState = require('./base-state');

class IdleState extends BaseState {
    constructor() {
        super('IDLE');
    }

    async onEnter(data = {}) {
        await super.onEnter(data);
        console.log('😴 Waiting for next profile...');
    }

    async execute() {
        if (this.isExitRequested()) {
            return { nextState: 'SHUTDOWN' };
        }

        const behavior = this.getBehavior();

        try {
            // Get next profile delay from behavior profile or use fallback
            let nextProfileDelay;
            if (behavior) {
                nextProfileDelay = behavior.getNextProfileDelay();
            } else {
                console.log('⚠️  No behavior profile available - using fallback next profile delay');
                nextProfileDelay = this.getHumanizedDelay(5500, 55); // ~2.5-8.5s with variation
            }

            console.log(`⏳ Waiting ${Math.round(nextProfileDelay/1000)}s for next profile...`);
            await this.delay(nextProfileDelay);

            console.log('🔍 Ready for next profile - checking if loaded');
            return { nextState: 'WAITING_FOR_PROFILE' };

        } catch (error) {
            console.error('💥 Error during idle phase:', error.message);
            return { nextState: 'ERROR', data: { error } };
        }
    }

    async onExit(data = {}) {
        await super.onExit(data);
    }
}

module.exports = IdleState;