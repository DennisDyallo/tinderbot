const BrowserController = require('./browser-controller');
const HotkeyHandler = require('./hotkey-handler');

class TinderBot {
    constructor() {
        this.browser = new BrowserController();
        this.hotkeys = new HotkeyHandler();
        this.isRunning = false;
    }

    async start() {
        try {
            console.log('🤖 Tinder Bot Starting...');
            console.log('📝 Press CTRL+ESC to stop');
            
            await this.browser.initialize();
            await this.browser.waitForProfileIcon();
            
            this.isRunning = true;
            await this.mainLoop();
            
        } catch (error) {
            console.error('❌ Fatal error:', error.message);
        } finally {
            await this.cleanup();
        }
    }

    async mainLoop() {
        console.log('🔄 Starting main loop...');
        
        while (this.isRunning && !this.hotkeys.isExitRequested()) {
            try {
                console.log('⏱️  5 second pause...');
                await this.delay(5000);

                console.log('🔍 Checking profile...');

                // Check if profile is recently active
                const isRecentlyActive = await this.browser.checkForRecentlyActive();

                if (isRecentlyActive) {
                    console.log('📍 Looking for Recently Active span...');
                    console.log('✅ Found Recently Active - clicking LIKE');
                    const likeSuccess = await this.browser.clickLikeButton();

                    if (likeSuccess) {
                        console.log('💖 LIKE button clicked successfully');
                    } else {
                        console.log('❌ Failed to click LIKE button - skipping profile');
                        const nopeSuccess = await this.browser.clickNopeButton();
                        if (nopeSuccess) {
                            console.log('👎 NOPE button clicked as fallback');
                        }
                    }
                } else {
                    console.log('❌ Profile not recently active - clicking NOPE');
                    const nopeSuccess = await this.browser.clickNopeButton();

                    if (nopeSuccess) {
                        console.log('👎 NOPE button clicked successfully');
                    } else {
                        console.log('❌ Failed to click NOPE button - profile may need manual handling');
                    }
                }

                // Wait a bit before next profile
                console.log('⏳ Waiting for next profile...');
                await this.delay(3000);

            } catch (error) {
                console.error('⚠️  Loop error:', error.message);
                await this.delay(3000); // Recovery pause
            }
        }
        
        console.log('🏁 Main loop ended');
    }

    async delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async cleanup() {
        console.log('🧹 Cleaning up...');
        this.isRunning = false;
        await this.browser.cleanup();
        this.hotkeys.cleanup();
        console.log('✅ Cleanup complete');
    }
}

// Start the bot
const bot = new TinderBot();
bot.start();