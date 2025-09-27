const BaseState = require('./base-state');

class IdleState extends BaseState {
    constructor() {
        super('IDLE');
    }

    async onEnter(data = {}) {
        await super.onEnter(data);
        logger.log('Entering IDLE state - waiting for next profile...');
    }

    async execute() {
        if (this.isExitRequested()) {
            return { nextState: 'SHUTDOWN' };
        }

        const browser = this.getBrowser();
        const behavior = this.getBehavior();

        if (!browser) {
            return { error: 'Browser not available in context' };
        }

        try {
            // Apply next profile delay (time between finishing one profile and starting next)
            let nextProfileDelay;
            if (behavior) {
                nextProfileDelay = behavior.getNextProfileDelay();
            } else {
                logger.log(' No behavior profile available - using fallback next profile delay');
                nextProfileDelay = this.getHumanizedDelay(4000, 500); // ~3-7s with variation
            }

            logger.log(`⏳ Next profile delay: ${nextProfileDelay}ms`);
            await this.delay(nextProfileDelay);

            logger.log('⏳ Waiting for next profile to appear...');

            // Wait for the next profile photo to load
            const nextProfileLoaded = await browser.waitForProfilePhoto();

            if (nextProfileLoaded) {
                logger.log('Next profile loaded - ready to analyze');
                return { nextState: 'WAITING_FOR_PROFILE' };
            } else {
                logger.log('❌ Timeout waiting for next profile');
                return { nextState: 'ERROR', data: { error: 'Next profile load timeout in idle state' } };
            }

        } catch (error) {
            logger.error('💥 Error during idle phase:', error.message);
            return { nextState: 'ERROR', data: { error } };
        }
    }

    async onExit(data = {}) {
        await super.onExit(data);
    }
}

module.exports = IdleState;