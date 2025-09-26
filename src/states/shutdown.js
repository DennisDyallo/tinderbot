const BaseState = require('./base-state');

class ShutdownState extends BaseState {
    constructor() {
        super('SHUTDOWN');
    }

    async onEnter(data = {}) {
        await super.onEnter(data);

        const reason = data.reason || 'User requested shutdown';
        console.log(`🛑 Shutdown initiated: ${reason}`);
    }

    async execute() {
        console.log('🧹 Beginning cleanup process...');

        try {
            const browser = this.getBrowser();
            const hotkeys = this.getHotkeys();

            // Cleanup browser
            if (browser) {
                await browser.cleanup();
                console.log('✅ Browser cleanup completed');
            }

            // Cleanup hotkeys
            if (hotkeys) {
                hotkeys.cleanup();
                console.log('✅ Hotkey handler cleanup completed');
            }

            console.log('✅ All cleanup completed successfully');

        } catch (error) {
            console.error('⚠️  Error during cleanup:', error.message);
            console.log('🔄 Shutdown will proceed despite cleanup errors');
        }

        console.log('🏁 Shutdown complete - goodbye!');

        // Signal state machine to stop
        if (this.stateMachine) {
            this.stateMachine.stop();
        }

        // This state never transitions - it ends the state machine
        return null;
    }

    async onExit(data = {}) {
        // This state should never exit - it's terminal
        console.log('❌ Warning: Shutdown state should not exit');
    }
}

module.exports = ShutdownState;