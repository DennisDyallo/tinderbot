const BaseState = require('./base-state');

class DecidingState extends BaseState {
    constructor() {
        super('DECIDING');
    }

    async onEnter(data = {}) {
        await super.onEnter(data);
        logger.log('⏳ Final decision moment...');
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
                logger.log('⚠️  No behavior profile available - using fallback final pause');
                finalPause = this.getHumanizedDelay(333, 40); // ~200-450ms with variation
            }

            logger.log(`   Final pause: ${finalPause}ms`);
            await this.delay(finalPause);

            logger.log(' Decision made - sending LIKE');
            return { nextState: 'LIKING' };

        } catch (error) {
            logger.error('💥 Error during decision phase:', error.message);
            return { nextState: 'ERROR', data: { error } };
        }
    }

    async onExit(data = {}) {
        await super.onExit(data);
    }
}

module.exports = DecidingState;