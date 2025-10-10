const BaseState = require('./base-state');

require('../logger');

class WaitingForProfileState extends BaseState {
    constructor(randomProvider = null) {
        super('WAITING_FOR_PROFILE', randomProvider);
        this.maxWaitTime = 30000; // 30 seconds maximum wait
        this.checkInterval = 500; // Check every 500ms
    }

    async onEnter(data = {}) {
        await super.onEnter(data);
        logger.info('⏳ Waiting for first profile to load...');
    }

    async execute() {
        if (this.isExitRequested()) {
            return { nextState: 'SHUTDOWN' };
        }

        const browser = this.getBrowser();
        if (!browser) {
            return { error: 'Browser not available in context' };
        }

        try {
            const profileFound = await browser.waitForProfilePhoto();

            if (profileFound) {
                logger.info(' Profile loaded - ready to analyze');

                // Add small human reaction delay after profile loads
                const reactionDelay = this.getHumanizedDelay(125, 60); // 50-200ms with variation
                logger.info(`     Human reaction delay: ${reactionDelay}ms`);
                await this.delay(reactionDelay);

                return { nextState: 'ANALYZING' };
            } else {
                logger.info('  Profile loading timeout - retrying');
                return { nextState: 'ERROR', data: { error: 'Profile loading timeout' } };
            }

        } catch (error) {
            logger.error('💥 Error waiting for profile:', error.message);
            return { nextState: 'ERROR', data: { error } };
        }
    }


    async onExit(data = {}) {
        await super.onExit(data);
    }
}

module.exports = WaitingForProfileState;