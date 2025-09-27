const BaseState = require('./base-state');

class LikingState extends BaseState {
    constructor() {
        super('LIKING');
    }

    async onEnter(data = {}) {
        await super.onEnter(data);
        logger.info('💖 Sending LIKE...');
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
            const likeSuccess = await browser.clickLikeButton();

            if (likeSuccess) {
                logger.info('✅ LIKE sent successfully');

                // Track profile completion for behavior evolution
                const behavior = this.getBehavior();
                if (behavior) {
                    behavior.onProfileCompleted();
                }

                return { nextState: 'IDLE' };
            } else {
                logger.info('❌ Failed to send LIKE');
                return { nextState: 'ERROR', data: { error: 'Like action failed' } };
            }

        } catch (error) {
            logger.error('💥 Error sending LIKE:', error.message);
            return { nextState: 'ERROR', data: { error } };
        }
    }

    async onExit(data = {}) {
        await super.onExit(data);
    }
}

module.exports = LikingState;