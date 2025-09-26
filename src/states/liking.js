const BaseState = require('./base-state');

class LikingState extends BaseState {
    constructor() {
        super('LIKING');
    }

    async onEnter(data = {}) {
        await super.onEnter(data);
        console.log('💖 Sending LIKE...');
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
                console.log('✅ LIKE sent successfully');
                return { nextState: 'IDLE' };
            } else {
                console.log('❌ Failed to send LIKE - sending NOPE as fallback');

                const nopeSuccess = await browser.clickNopeButton();
                if (nopeSuccess) {
                    console.log('👎 NOPE sent as fallback');
                    return { nextState: 'IDLE' };
                } else {
                    console.log('💥 Both LIKE and NOPE failed');
                    return { nextState: 'ERROR', data: { error: 'Both like and nope actions failed' } };
                }
            }

        } catch (error) {
            console.error('💥 Error sending LIKE:', error.message);
            return { nextState: 'ERROR', data: { error } };
        }
    }

    async onExit(data = {}) {
        await super.onExit(data);
    }
}

module.exports = LikingState;