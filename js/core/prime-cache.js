// Prime Number Caching System
class PrimeCache {
    constructor() {
        // Cache for known primes (up to a reasonable limit)
        this.primeCache = new Set();
        this.compositeCache = new Set(); // Cache composites too for efficiency
        this.maxCachedPrime = 0;
        this.cacheLimit = 100000; // Increased cache limit to 100,000
        
        // Initialize with small primes for immediate use
        this.initializeSmallPrimes();
        
        // Statistics
        this.cacheHits = 0;
        this.cacheMisses = 0;
        this.primesChecked = 0;
    }
    
    initializeSmallPrimes() {
        // Start with the first few primes for immediate performance
        const smallPrimes = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53, 59, 61, 67, 71, 73, 79, 83, 89, 97];
        for (const prime of smallPrimes) {
            this.primeCache.add(prime);
        }
        this.maxCachedPrime = Math.max(...smallPrimes);
    }
    
    // Check if a number is prime, using cache when possible
    isPrime(n) {
        if (n < 2) return false;
        if (n === 2) return true;
        if (n % 2 === 0) return false;
        
        this.primesChecked++;
        
        // Check cache first
        if (n <= this.maxCachedPrime) {
            if (this.primeCache.has(n)) {
                this.cacheHits++;
                return true;
            } else if (this.compositeCache.has(n)) {
                this.cacheHits++;
                return false;
            }
        }
        
        this.cacheMisses++;
        
        // Calculate if prime
        const isPrime = this.calculateIfPrime(n);
        
        // Cache the result if within our limit
        if (n <= this.cacheLimit) {
            if (isPrime) {
                this.primeCache.add(n);
                this.maxCachedPrime = Math.max(this.maxCachedPrime, n);
            } else {
                this.compositeCache.add(n);
            }
        }
        
        return isPrime;
    }
    
    // Efficient prime calculation using trial division with optimizations
    calculateIfPrime(n) {
        // Check against known primes first (up to sqrt(n))
        const sqrt = Math.sqrt(n);
        for (const prime of this.primeCache) {
            if (prime > sqrt) break;
            if (n % prime === 0) return false;
        }
        
        // Trial division for remaining candidates
        // Start from the next odd number after maxCachedPrime
        const start = Math.max(3, this.maxCachedPrime + (this.maxCachedPrime % 2 === 0 ? 1 : 2));
        
        for (let i = start; i <= sqrt; i += 2) {
            if (n % i === 0) return false;
        }
        
        return true;
    }
    
    // Get all primes up to a given limit
    getPrimesUpTo(limit) {
        const primes = [];
        for (let i = 2; i <= limit; i++) {
            if (this.isPrime(i)) {
                primes.push(i);
            }
        }
        return primes;
    }
    
    // Get composites up to a given limit
    getCompositesUpTo(limit) {
        const composites = [];
        for (let i = 4; i <= limit; i++) {
            if (!this.isPrime(i)) {
                composites.push(i);
            }
        }
        return composites;
    }
    
    // Get a sample of primes and composites for evaluation
    getSampleData(sampleSize = 200) {
        // Determine the range we need to check
        let maxNumber = Math.max(1000, sampleSize * 5); // Increased range
        
        // Get primes and composites
        const primes = this.getPrimesUpTo(maxNumber).slice(0, sampleSize);
        const composites = this.getCompositesUpTo(maxNumber).slice(0, sampleSize);
        
        return { primes, composites };
    }
    
    // Pre-cache primes up to a certain number for better performance
    preCacheUpTo(limit) {
        console.log(`Pre-caching primes up to ${limit}...`);
        const startTime = performance.now();
        
        // Use Sieve of Eratosthenes for efficient pre-caching
        const sieve = new Array(limit + 1).fill(true);
        sieve[0] = sieve[1] = false;
        
        for (let i = 2; i * i <= limit; i++) {
            if (sieve[i]) {
                for (let j = i * i; j <= limit; j += i) {
                    sieve[j] = false;
                }
            }
        }
        
        // Add primes to cache
        for (let i = 2; i <= Math.min(limit, this.cacheLimit); i++) {
            if (sieve[i]) {
                this.primeCache.add(i);
                this.maxCachedPrime = Math.max(this.maxCachedPrime, i);
            } else if (i > 1) {
                this.compositeCache.add(i);
            }
        }
        
        const endTime = performance.now();
        console.log(`Pre-caching completed in ${(endTime - startTime).toFixed(2)}ms`);
        console.log(`Cache now contains ${this.primeCache.size} primes up to ${this.maxCachedPrime}`);
    }
    
    // Get cache statistics
    getStats() {
        return {
            cacheSize: this.primeCache.size,
            compositeCacheSize: this.compositeCache.size,
            maxCachedPrime: this.maxCachedPrime,
            cacheHits: this.cacheHits,
            cacheMisses: this.cacheMisses,
            hitRate: this.cacheHits / (this.cacheHits + this.cacheMisses),
            totalChecked: this.primesChecked
        };
    }
    
    // Export cache for persistence (could be saved to localStorage)
    exportCache() {
        return {
            primes: Array.from(this.primeCache).sort((a, b) => a - b),
            composites: Array.from(this.compositeCache).sort((a, b) => a - b),
            maxCachedPrime: this.maxCachedPrime,
            stats: this.getStats()
        };
    }
    
    // Import cache from previous session
    importCache(cacheData) {
        if (cacheData && cacheData.primes) {
            this.primeCache.clear();
            this.compositeCache.clear();
            
            for (const prime of cacheData.primes) {
                this.primeCache.add(prime);
            }
            
            if (cacheData.composites) {
                for (const composite of cacheData.composites) {
                    this.compositeCache.add(composite);
                }
            }
            
            this.maxCachedPrime = cacheData.maxCachedPrime || Math.max(...cacheData.primes);
            console.log(`Imported cache with ${this.primeCache.size} primes and ${this.compositeCache.size} composites up to ${this.maxCachedPrime}`);
        }
    }
    
    // Load cache from localStorage if available
    loadFromStorage() {
        try {
            const stored = localStorage.getItem('primefold-prime-cache');
            if (stored) {
                const cacheData = JSON.parse(stored);
                this.importCache(cacheData);
                return true;
            }
        } catch (error) {
            console.warn('Failed to load prime cache from storage:', error);
        }
        return false;
    }
    
    // Save cache to localStorage
    saveToStorage() {
        try {
            const cacheData = this.exportCache();
            localStorage.setItem('primefold-prime-cache', JSON.stringify(cacheData));
            console.log('Prime cache saved to localStorage');
        } catch (error) {
            console.warn('Failed to save prime cache to storage:', error);
        }
    }
    
    // Clear cache
    clear() {
        this.primeCache.clear();
        this.compositeCache.clear();
        this.maxCachedPrime = 0;
        this.cacheHits = 0;
        this.cacheMisses = 0;
        this.primesChecked = 0;
        this.initializeSmallPrimes();
    }
}

// Global prime cache instance
window.primeCache = new PrimeCache();

// Try to load from localStorage on startup
window.primeCache.loadFromStorage();

// Save cache periodically and on page unload
setInterval(() => {
    window.primeCache.saveToStorage();
}, 30000); // Save every 30 seconds

window.addEventListener('beforeunload', () => {
    window.primeCache.saveToStorage();
}); 