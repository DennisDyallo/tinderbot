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
            console.log('👎 Sending quick NOPE (not recently active)...');
        } else {
            console.log('👎 Sending NOPE...');
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
                    console.log('⚠️  No behavior profile available - using fallback quick delay');
                    quickDelay = this.getHumanizedDelay(550, 45); // ~300-800ms with variation
                }

                console.log(`   ⚡ Quick decision delay: ${quickDelay}ms`);
                await this.delay(quickDelay);
            }

            const nopeSuccess = await browser.clickNopeButton();

            if (nopeSuccess) {
                console.log('✅ NOPE sent successfully');

                // Track profile completion for behavior evolution
                const behavior = this.getBehavior();
                if (behavior) {
                    behavior.onProfileCompleted();
                }

                return { nextState: 'IDLE' };
            } else {
                console.log('❌ Failed to send NOPE');
                return { nextState: 'ERROR', data: { error: 'Nope action failed' } };
            }

        } catch (error) {
            console.error('💥 Error sending NOPE:', error.message);
            return { nextState: 'ERROR', data: { error } };
        }
    }

    async onExit(data = {}) {
        await super.onExit(data);
    }
}

module.exports = NopingState;