const BaseState = require('./base-state');

class DecidingState extends BaseState {
    constructor() {
        super('DECIDING');
    }

    async onEnter(data = {}) {
        await super.onEnter(data);
        console.log('⏳ Final decision moment...');
    }

    async execute() {
        if (this.isExitRequested()) {
            return { nextState: 'SHUTDOWN' };
        }

        const behavior = this.getBehavior();

        try {
            // Get final pause from behavior profile or use fallback
            let finalPause;
            if (behavior) {
                finalPause = behavior.getFinalPause();
            } else {
                console.log('⚠️  No behavior profile available - using fallback final pause');
                finalPause = this.getHumanizedDelay(333, 40); // ~200-450ms with variation
            }

            console.log(`   ⏱️  Final pause: ${finalPause}ms`);
            await this.delay(finalPause);

            console.log('💖 Decision made - sending LIKE');
            return { nextState: 'LIKING' };

        } catch (error) {
            console.error('💥 Error during decision phase:', error.message);
            return { nextState: 'ERROR', data: { error } };
        }
    }

    async onExit(data = {}) {
        await super.onExit(data);
    }
}

module.exports = DecidingState;