const BaseState = require('./base-state');

class AnalyzingState extends BaseState {
    constructor(randomProvider = null) {
        super('ANALYZING', randomProvider);
    }

    async onEnter(data = {}) {
        await super.onEnter(data);
        logger.log('🔍 Analyzing profile for Recently Active status...');
    }

    async execute() {
        if (this.isExitRequested()) {
            return { nextState: 'SHUTDOWN' };
        }

        // Check for dialogs that might interrupt the flow
        await this.checkForDialogs();

        const browser = this.getBrowser();
        if (!browser) {
            return { error: 'Browser not available in context' };
        }

        try {
            const isRecentlyActive = await browser.checkForRecentlyActive();

            if (isRecentlyActive) {
                logger.log('Profile is Recently Active - proceeding to think');
                return { nextState: 'THINKING', data: { isRecentlyActive: true } };
            } else {
                logger.log('Profile not Recently Active - will send quick nope');
                return { nextState: 'NOPING', data: { isRecentlyActive: false, quickDecision: true } };
            }

        } catch (error) {
            logger.error('💥 Error analyzing profile:', error.message);
            return { nextState: 'ERROR', data: { error } };
        }
    }

    async onExit(data = {}) {
        await super.onExit(data);
    }
}

module.exports = AnalyzingState;