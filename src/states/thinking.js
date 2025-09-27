const BaseState = require('./base-state');

class ThinkingState extends BaseState {
    constructor(randomProvider = null) {
        super('THINKING', randomProvider);
    }

    async onEnter(data = {}) {
        await super.onEnter(data);
        logger.log(' Thinking about this recently active profile...');
    }

    async execute() {
        if (this.isExitRequested()) {
            return { nextState: 'SHUTDOWN' };
        }

        // Check for dialogs that might interrupt the flow
        await this.checkForDialogs();

        const behavior = this.getBehavior();

        try {
            // Get thinking delay from behavior profile or use fallback
            let thinkingDelay;
            if (behavior) {
                thinkingDelay = behavior.getThinkingDelay();
            } else {
                logger.debug('⚠️  No behavior profile available - using fallback thinking delay');
                thinkingDelay = this.getHumanizedDelay(2000, 50); // 1-3s with variation
            }

            logger.log(`    Thinking for ${Math.round(thinkingDelay/1000)}s...`);
            await this.delay(thinkingDelay);

            logger.debug(' Decision made - time to view photos');
            return { nextState: 'VIEWING_PHOTOS' };

        } catch (error) {
            logger.error('💥 Error during thinking phase:', error.message);
            return { nextState: 'ERROR', data: { error } };
        }
    }

    async onExit(data = {}) {
        await super.onExit(data);
    }
}

module.exports = ThinkingState;