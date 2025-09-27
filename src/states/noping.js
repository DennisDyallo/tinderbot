const BaseState = require('./base-state');

class NopingState extends BaseState {
    constructor() {
        super('NOPING');
    }

    async onEnter(data = {}) {
        await super.onEnter(data);

        // Store transition data in context for use in execute
        this.setContext('transitionData', data);

        if (data.quickDecision) {
            logger.info('👎 Sending quick NOPE (not recently active)...');
        } else {
            logger.info('👎 Sending NOPE...');
        }
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
            // If this is a quick decision (not recently active), apply quick delay
            const data = this.getContext().transitionData || {};
            if (data.quickDecision) {
                let quickDelay;
                if (behavior) {
                    quickDelay = behavior.getQuickDecisionDelay();
                } else {
                    logger.info('⚠️  No behavior profile available - using fallback quick delay');
                    quickDelay = this.getHumanizedDelay(550, 45); // ~300-800ms with variation
                }

                logger.info(`   ⚡ Quick decision delay: ${quickDelay}ms`);
                await this.delay(quickDelay);
            }

            const nopeSuccess = await browser.clickNopeButton();

            if (nopeSuccess) {
                logger.info('✅ NOPE sent successfully');

                // Track profile completion for behavior evolution
                const behavior = this.getBehavior();
                if (behavior) {
                    behavior.onProfileCompleted();
                }

                return { nextState: 'IDLE' };
            } else {
                logger.info('❌ Failed to send NOPE');
                return { nextState: 'ERROR', data: { error: 'Nope action failed' } };
            }

        } catch (error) {
            logger.error('💥 Error sending NOPE:', error.message);
            return { nextState: 'ERROR', data: { error } };
        }
    }

    async onExit(data = {}) {
        await super.onExit(data);
    }
}

module.exports = NopingState;