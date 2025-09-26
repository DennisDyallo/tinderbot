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
                console.log('🔍 Checking new profile...');

                // FIRST: Check if profile is recently active
                const isRecentlyActive = await this.browser.checkForRecentlyActive();

                if (isRecentlyActive) {
                    console.log('✅ Found Recently Active - viewing photos');

                    // Wait a bit before viewing photos
                    const thinkingDelay = Math.floor(Math.random() * 2000) + 1000; // 1-3s
                    console.log(`   🤔 Thinking for ${Math.round(thinkingDelay/1000)}s...`);
                    await this.delay(thinkingDelay);

                    // View photos to simulate human behavior
                    await this.browser.viewPhotos();

                    // Final pause before like
                    console.log('   ⏳ Final decision moment...');
                    await this.delay(300);

                    console.log('💖 Sending LIKE');
                    const likeSuccess = await this.browser.clickLikeButton();

                    if (likeSuccess) {
                        console.log('✅ LIKE sent successfully');
                    } else {
                        console.log('❌ Failed to send LIKE - sending NOPE instead');
                        const nopeSuccess = await this.browser.clickNopeButton();
                        if (nopeSuccess) {
                            console.log('👎 NOPE sent as fallback');
                        }
                    }
                } else {
                    console.log('❌ Profile not recently active - sending quick NOPE');

                    // Quick decision - random delay 300-800ms
                    const quickDelay = Math.floor(Math.random() * 500) + 300;
                    console.log(`   ⚡ Quick decision in ${quickDelay}ms...`);
                    await this.delay(quickDelay);

                    const nopeSuccess = await this.browser.clickNopeButton();

                    if (nopeSuccess) {
                        console.log('👎 NOPE sent successfully');
                    } else {
                        console.log('❌ Failed to send NOPE - profile may need manual handling');
                    }
                }

                // Wait before next profile - random delay between 3-8 seconds
                const nextProfileDelay = Math.floor(Math.random() * 5000) + 3000;
                console.log(`⏳ Waiting ${Math.round(nextProfileDelay/1000)}s for next profile...`);
                await this.delay(nextProfileDelay);

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