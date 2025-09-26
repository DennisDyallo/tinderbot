const RandomProvider = require('./random-provider');

class BehaviorProfile {
    constructor(randomProvider = null) {
        this.randomProvider = randomProvider || RandomProvider.getInstance();
        this.personality = this.selectPersonality();
        this.generateBehavior();
        this.profileCount = 0; // Track profiles processed
        this.sessionStartTime = Date.now();
        this.lastVariationUpdate = 0;
    }

    selectPersonality() {
        const personalities = {
            impatient: {
                thinking: [500, 1500],      // Quick decisions
                quickDecision: [200, 400],  // Very fast nopes
                nextProfile: [2000, 4000],  // Short breaks
                photoCount: [0, 1],         // Few photos
                photoDelay: [300, 800],     // Quick photo viewing
                mouseChance: 0.2,           // Rare mouse movement
                mouseDuration: [1300, 1600], // Fast mouse
                mouseSteps: [8, 12]
            },
            normal: {
                thinking: [1000, 3000],     // Normal thinking
                quickDecision: [300, 800],  // Standard quick decisions
                nextProfile: [3000, 8000],  // Current range
                photoCount: [1, 3],         // 1-3 photos
                photoDelay: [500, 3000],    // Current range
                mouseChance: 0.4,           // 40% chance
                mouseDuration: [1300, 2100], // Current range
                mouseSteps: [10, 24]
            },
            careful: {
                thinking: [2000, 5000],     // Longer thinking
                quickDecision: [500, 1200], // Still quick but not rushed
                nextProfile: [4000, 10000], // Longer breaks
                photoCount: [2, 4],         // More photos
                photoDelay: [800, 4000],    // Slower photo viewing
                mouseChance: 0.6,           // More mouse movement
                mouseDuration: [1600, 2100], // Slower mouse
                mouseSteps: [15, 24]
            }
        };

        // Weighted selection (70% normal, 20% careful, 10% impatient)
        const selectedType = this.randomProvider.randomWeightedChoice({
            impatient: 0.1,
            careful: 0.2,
            normal: 0.7
        });

        return personalities[selectedType];
    }

    generateBehavior() {
        // Generate photo count first
        const photoCount = this.randomProvider.randomInRange(this.personality.photoCount);

        this.timings = {
            // Main flow timings
            thinkingDelay: this.randomProvider.randomInRange(this.personality.thinking),
            quickDecisionDelay: this.randomProvider.randomInRange(this.personality.quickDecision),
            nextProfileDelay: this.randomProvider.randomInRange(this.personality.nextProfile),
            finalPause: this.randomProvider.randomInRange([333, 666]),

            // Photo viewing behavior
            photoViewing: {
                count: photoCount,
                delays: this.generatePhotoDelays(photoCount)
            },

            // Mouse movement behavior
            mouseMovement: {
                shouldMove: this.randomProvider.randomBoolean(this.personality.mouseChance),
                duration: this.randomProvider.randomInRange(this.personality.mouseDuration),
                steps: this.randomProvider.randomInRange(this.personality.mouseSteps)
            }
        };
    }

    generatePhotoDelays(count) {
        const delays = [];
        for (let i = 0; i < count; i++) {
            delays.push(this.randomProvider.randomInRange(this.personality.photoDelay));
        }
        return delays;
    }

    // Helper methods for cleaner access
    getThinkingDelay() { return this.timings.thinkingDelay; }
    getQuickDecisionDelay() { return this.timings.quickDecisionDelay; }
    getNextProfileDelay() { return this.timings.nextProfileDelay; }
    getFinalPause() { return this.timings.finalPause; }

    getPhotoViewingBehavior() { return this.timings.photoViewing; }
    getMouseMovementBehavior() { return this.timings.mouseMovement; }

    // Debug info
    getPersonalityType() {
        if (this.personality.thinking[1] <= 1500) return 'impatient';
        if (this.personality.thinking[1] >= 5000) return 'careful';
        return 'normal';
    }

    // Method called after each profile to track usage and potentially update behavior
    onProfileCompleted() {
        this.profileCount++;

        // Update behavior every 5-10 profiles with some randomness
        const updateInterval = this.randomProvider.randomInRange(5, 10);

        if (this.profileCount - this.lastVariationUpdate >= updateInterval) {
            this.applyBehaviorVariation();
            this.lastVariationUpdate = this.profileCount;
        }
    }

    // Apply subtle variations to make behavior less predictable
    applyBehaviorVariation() {
        console.log(`🔄 Applying behavior variation (profile ${this.profileCount})`);

        // Apply ±10-20% variation to existing timings
        const variationFactor = this.randomProvider.randomFloat(0.85, 1.20);

        // Apply session fatigue (gradually increase delays as session progresses)
        const sessionMinutes = (Date.now() - this.sessionStartTime) / 60000;
        const fatigueFactor = 1 + (sessionMinutes * 0.01); // 1% increase per minute

        const combinedFactor = variationFactor * fatigueFactor;

        // Update timings with variations
        this.timings.thinkingDelay = Math.round(this.timings.thinkingDelay * combinedFactor);
        this.timings.quickDecisionDelay = Math.round(this.timings.quickDecisionDelay * combinedFactor);
        this.timings.nextProfileDelay = Math.round(this.timings.nextProfileDelay * combinedFactor);
        this.timings.finalPause = Math.round(this.timings.finalPause * combinedFactor);

        // Occasionally change photo viewing behavior
        if (this.randomProvider.randomBoolean(0.3)) { // 30% chance
            const newPhotoCount = this.randomProvider.randomInRange(this.personality.photoCount);
            if (newPhotoCount !== this.timings.photoViewing.count) {
                this.timings.photoViewing.count = newPhotoCount;
                this.timings.photoViewing.delays = this.generatePhotoDelays(newPhotoCount);
                console.log(`   📷 Photo viewing updated: ${newPhotoCount} photos`);
            }
        }

        // Occasionally toggle mouse movement
        if (this.randomProvider.randomBoolean(0.2)) { // 20% chance
            this.timings.mouseMovement.shouldMove = this.randomProvider.randomBoolean(this.personality.mouseChance);
            console.log(`   🖱️  Mouse movement toggled: ${this.timings.mouseMovement.shouldMove}`);
        }

        console.log(`   ⚡ Variation applied: ${Math.round((combinedFactor - 1) * 100)}% timing change`);
    }

    // Simulate natural breaks in behavior
    shouldTakeBreak() {
        // Take longer breaks occasionally (every 15-25 profiles)
        const breakInterval = this.randomProvider.randomInRange(15, 25);
        return this.profileCount > 0 && (this.profileCount % breakInterval === 0);
    }

    getBreakDelay() {
        // Natural break: 30-90 seconds
        const breakDelay = this.randomProvider.randomInRange(30000, 90000);
        console.log(`🛑 Taking natural break: ${Math.round(breakDelay/1000)}s`);
        return breakDelay;
    }

    logBehavior() {
        const personalityType = this.getPersonalityType();
        const sessionMinutes = Math.round((Date.now() - this.sessionStartTime) / 60000);

        console.log(`🧠 Personality: ${personalityType} (profiles: ${this.profileCount}, session: ${sessionMinutes}m)`);
        console.log(`   Thinking: ${this.timings.thinkingDelay}ms`);
        console.log(`   Quick decision: ${this.timings.quickDecisionDelay}ms`);
        console.log(`   Next profile: ${this.timings.nextProfileDelay}ms`);
        console.log(`   Photos: ${this.timings.photoViewing.count} (${this.timings.photoViewing.delays.join(', ')}ms)`);
        console.log(`   Mouse: ${this.timings.mouseMovement.shouldMove ? 'yes' : 'no'}${this.timings.mouseMovement.shouldMove ? ` (${this.timings.mouseMovement.duration}ms, ${this.timings.mouseMovement.steps} steps)` : ''}`);
    }
}

module.exports = BehaviorProfile;