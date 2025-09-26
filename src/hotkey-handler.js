const { GlobalKeyboardListener } = require('node-global-key-listener');

class HotkeyHandler {
    constructor() {
        this.shouldExit = false;
        this.listener = new GlobalKeyboardListener();
        this.setupListeners();
    }

    setupListeners() {
        this.listener.addListener((e, down) => {
            if (e.state === 'DOWN' && e.name === 'ESCAPE' && down['LEFT CTRL']) {
                console.log('🛑 CTRL+ESC detected - Initiating shutdown...');
                this.shouldExit = true;
            }
        });
    }

    isExitRequested() {
        return this.shouldExit;
    }

    cleanup() {
        this.listener.kill();
    }
}

module.exports = HotkeyHandler;