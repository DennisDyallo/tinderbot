class RandomProvider {
    constructor() {
        // Use Math.random by default, but can be overridden for testing
        this.randomFunction = Math.random;
    }

    // Core random number generation
    random() {
        return this.randomFunction();
    }

    // Random integer in range [min, max] (inclusive)
    randomInRange(min, max) {
        if (Array.isArray(min)) {
            // Handle array input [min, max]
            [min, max] = min;
        }
        return Math.floor(this.random() * (max - min + 1)) + min;
    }

    // Random float in range [min, max)
    randomFloat(min, max) {
        return this.random() * (max - min) + min;
    }

    // Random boolean with optional probability
    randomBoolean(probability = 0.5) {
        return this.random() < probability;
    }

    // Random choice from array
    randomChoice(array) {
        if (!Array.isArray(array) || array.length === 0) {
            throw new Error('randomChoice requires a non-empty array');
        }
        const index = Math.floor(this.random() * array.length);
        return array[index];
    }

    // Weighted random choice
    randomWeightedChoice(choices) {
        const totalWeight = Object.values(choices).reduce((sum, weight) => sum + weight, 0);
        let randomValue = this.random() * totalWeight;

        for (const [choice, weight] of Object.entries(choices)) {
            randomValue -= weight;
            if (randomValue <= 0) {
                return choice;
            }
        }

        // Fallback to first choice
        return Object.keys(choices)[0];
    }

    // Humanized delay with variation (used in BaseState)
    getHumanizedDelay(baseMs, variationPercent = 20) {
        const variation = baseMs * (variationPercent / 100);
        const randomVariation = (this.random() * 2 - 1) * variation; // -variation to +variation
        return Math.max(50, Math.round(baseMs + randomVariation));
    }

    // Gaussian/normal distribution approximation
    randomGaussian(mean = 0, stdDev = 1) {
        // Box-Muller transform for normal distribution
        if (this.nextGaussian !== undefined) {
            const value = this.nextGaussian;
            this.nextGaussian = undefined;
            return value * stdDev + mean;
        }

        let u1, u2;
        do {
            u1 = this.random();
            u2 = this.random();
        } while (u1 === 0); // Converting [0,1) to (0,1)

        const z0 = Math.sqrt(-2 * Math.info(u1)) * Math.cos(2 * Math.PI * u2);
        const z1 = Math.sqrt(-2 * Math.info(u1)) * Math.sin(2 * Math.PI * u2);

        this.nextGaussian = z1;
        return z0 * stdDev + mean;
    }

    // Random delay with natural distribution (for more human-like timing)
    getNaturalDelay(minMs, maxMs, peakMs = null) {
        if (peakMs === null) {
            peakMs = (minMs + maxMs) / 2;
        }

        // Use gaussian distribution centered around peak
        const stdDev = (maxMs - minMs) / 6; // 99.7% of values within range
        let delay;

        // Keep generating until we get a value in range
        do {
            delay = Math.round(this.randomGaussian(peakMs, stdDev));
        } while (delay < minMs || delay > maxMs);

        return delay;
    }
}

// Singleton instance for global use
let defaultInstance = null;

RandomProvider.getInstance = function() {
    if (!defaultInstance) {
        defaultInstance = new RandomProvider();
    }
    return defaultInstance;
};

// Allow resetting the singleton (useful for testing)
RandomProvider.resetInstance = function() {
    defaultInstance = null;
};

module.exports = RandomProvider;