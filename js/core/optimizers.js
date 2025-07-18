// Optimization Algorithms
class OptimizerController {
    constructor() {
        this.isRunning = false;
        this.shouldStop = false;
        this.optimizer = null;
        this.interval = null;
    }
    
    startOptimization(params, progressCallback, completeCallback) {
        this.isRunning = true;
        this.shouldStop = false;
        
        // Create optimizer based on algorithm
        switch (params.algorithm) {
            case 'lahc':
                this.optimizer = new LAHCOptimizer(params);
                break;
            case 'ga':
                this.optimizer = new GAOptimizer(params);
                break;
            case 'sa':
                this.optimizer = new SAOptimizer(params);
                break;
            default:
                this.optimizer = new LAHCOptimizer(params);
        }
        
        // Throttle GA using setTimeout loop, others use setInterval
        if (params.algorithm === 'ga') {
            // GA needs more aggressive throttling - break up the step
            const gaStep = () => {
                if (this.shouldStop || this.optimizer.iteration >= this.optimizer.maxIterations) {
                    this.isRunning = false;
                    completeCallback({
                        bestExpr: this.optimizer.bestExpr,
                        bestScore: this.optimizer.bestScore,
                        iterations: this.optimizer.iteration
                    });
                    return;
                }
                
                // Use a longer delay for GA to give browser more breathing room
                setTimeout(() => {
                    const result = this.optimizer.step();
                    progressCallback({
                        iteration: this.optimizer.iteration,
                        maxIterations: this.optimizer.maxIterations,
                        currentScore: result.currentScore,
                        bestScore: result.bestScore,
                        currentExpr: result.currentExpr,
                        bestExpr: result.bestExpr
                    });
                    // Continue with next step
                    gaStep();
                }, 50); // 50ms delay instead of 0ms for GA
            };
            gaStep();
        } else {
            this.interval = setInterval(() => {
                if (this.shouldStop || this.optimizer.iteration >= this.optimizer.maxIterations) {
                    clearInterval(this.interval);
                    this.isRunning = false;
                    completeCallback({
                        bestExpr: this.optimizer.bestExpr,
                        bestScore: this.optimizer.bestScore,
                        iterations: this.optimizer.iteration
                    });
                    return;
                }
                
                const result = this.optimizer.step();
                progressCallback({
                    iteration: this.optimizer.iteration,
                    maxIterations: this.optimizer.maxIterations,
                    currentScore: result.currentScore,
                    bestScore: result.bestScore,
                    currentExpr: result.currentExpr,
                    bestExpr: result.bestExpr
                });
            }, 10); // Update every 10ms for smooth progress
        }
    }
    
    stop() {
        this.shouldStop = true;
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
        this.isRunning = false;
    }
}

// Base optimizer class
class BaseOptimizer {
    constructor(params) {
        this.params = params;
        this.rnd = new Random();
        this.iteration = 0;
        this.maxIterations = params.iterations || 500;
        this.currentExpr = this.generateRandomExpression();
        this.bestExpr = this.currentExpr;
        this.currentScore = this.evaluateExpression(this.currentExpr);
        this.bestScore = this.currentScore;
        this.seenExpressions = new Set(); // Deduplication cache
        this.seenExpressions.add(this._normalizeExpr(this.currentExpr));
    }
    
    generateRandomExpression() {
        if (this.params.mode === 'primefold') {
            if (this.params.enforceSymmetry) {
                // Generate only one function and create a symmetric pair
                const baseExpr = randomTree(this.rnd, 3).toStr();
                const symmetricPair = this.createSymmetricPairFromBase(baseExpr);
                return `f(n) = ${symmetricPair.x}, g(n) = ${symmetricPair.y}`;
            } else {
                const exprX = randomTree(this.rnd, 3).toStr();
                const exprY = randomTree(this.rnd, 3).toStr();
                return `f(n) = ${exprX}, g(n) = ${exprY}`;
            }
        } else {
            const expr = randomTree(this.rnd, 3).toStr();
            return `f(n) = ${expr}`;
        }
    }
    
    evaluateExpression(expr) {
        if (this.params.mode === 'primefold') {
            const parts = expr.split(',').map(s => s.trim());
            if (parts.length >= 2) {
                const exprX = parts[0].replace('f(n) =', '').trim();
                const exprY = parts[1].replace('g(n) =', '').trim();
                return this.evaluatePrimeFold(exprX, exprY);
            }
            return null; // Invalid
        } else {
            const exprF = expr.replace('f(n) =', '').trim();
            return this.evaluatePrimeGen(exprF);
        }
    }
    
    evaluatePrimeFold(exprX, exprY) {
        try {
            // Parse expressions into trees
            const treeX = this.parseExpression(exprX);
            const treeY = this.parseExpression(exprY);
            if (!treeX || !treeY) return null; // Invalid
            // Evaluate for primes and composites
            const primeCoords = [];
            const compositeCoords = [];
            for (const prime of this.params.primes) {
                try {
                    const x = treeX.evaluate(prime);
                    const y = treeY.evaluate(prime);
                    if (isFinite(x) && isFinite(y)) {
                        primeCoords.push([x, y]);
                    }
                } catch (error) {
                    // Skip invalid evaluations
                }
            }
            for (const composite of this.params.composites) {
                try {
                    const x = treeX.evaluate(composite);
                    const y = treeY.evaluate(composite);
                    if (isFinite(x) && isFinite(y)) {
                        compositeCoords.push([x, y]);
                    }
                } catch (error) {
                    // Skip invalid evaluations
                }
            }
            // Check minimum data requirements
            if (primeCoords.length < 10 || compositeCoords.length < 10) {
                return null;
            }
            // Use the enhanced fitness function
            const sampleSize = this.params.displayPoints || 200;
            const result = this.calculateEnhancedFitness(primeCoords, compositeCoords, treeX, treeY, sampleSize, this.params.fitnessConfig);
            return result.total;
        } catch (error) {
            return null;
        }
    }
    
    calculateEnhancedFitness(primeCoords, compositeCoords, treeX, treeY, sampleSize, fitnessConfig) {
        try {
            // Normalize coordinates to prevent scale bias
            const normalizedData = this.normalizeCoordinates(primeCoords, compositeCoords);
            const normalizedPrimes = normalizedData.primeCoords;
            const normalizedComposites = normalizedData.compositeCoords;
            
            // Generate random baseline for comparison
            const randomCoords = this.generateRandomBaseline(treeX, treeY, sampleSize);
            const normalizedRandomData = this.normalizeCoordinates(randomCoords, []);
            const normalizedRandom = normalizedRandomData.primeCoords;
            
            // Use config or defaults
            const config = fitnessConfig || {
                areaCoverage: { enabled: true, weight: 0.50, threshold: 0.50 },
                separation: { enabled: true, weight: 0.25 },
                contrast: { enabled: true, weight: 0.20 },
                significance: { enabled: true, weight: 0.10 },
                specificity: { enabled: true, weight: 0.05 }
            };
            
            // Calculate area coverage score first (prerequisite metric)
            let areaCoverageScore = 0;
            if (config.areaCoverage && config.areaCoverage.enabled) {
                areaCoverageScore = this.calculateAreaCoverageScore(primeCoords, normalizedPrimes);
            }
            
            // Calculate component scores
            const separationScore = this.calculateSeparationScore(normalizedPrimes, normalizedComposites);
            const contrastScore = this.calculateStructuralContrastScore(normalizedPrimes, normalizedComposites);
            const significanceScore = this.calculateStatisticalSignificance(normalizedPrimes, normalizedComposites, normalizedRandom);
            const specificityScore = this.calculatePatternSpecificity(normalizedPrimes, normalizedComposites, normalizedRandom);
            
            // Only apply the area coverage threshold gate if area coverage is enabled
            if (config.areaCoverage && config.areaCoverage.enabled) {
                const areaCoverageThreshold = config.areaCoverage?.threshold || 0.15;
                if (areaCoverageScore < areaCoverageThreshold) {
                    // If area coverage is insufficient, return very low score
                    return {
                        total: areaCoverageScore * 0.1, // Very low score for poor area coverage
                        components: {
                            areaCoverage: areaCoverageScore,
                            separation: 0,
                            contrast: 0,
                            significance: 0,
                            specificity: 0
                        }
                    };
                }
            }
            
            // Stage 2: Calculate full fitness from enabled metrics
            let total = 0;
            if (config.areaCoverage && config.areaCoverage.enabled) total += config.areaCoverage.weight * areaCoverageScore;
            if (config.separation && config.separation.enabled) total += config.separation.weight * separationScore;
            if (config.contrast && config.contrast.enabled) total += config.contrast.weight * contrastScore;
            if (config.significance && config.significance.enabled) total += config.significance.weight * significanceScore;
            if (config.specificity && config.specificity.enabled) total += config.specificity.weight * specificityScore;
            
            return {
                total: Math.max(0, total),
                components: {
                    areaCoverage: areaCoverageScore,
                    separation: separationScore,
                    contrast: contrastScore,
                    significance: significanceScore,
                    specificity: specificityScore
                }
            };
        } catch (error) {
            return {
                total: 0,
                components: { areaCoverage: 0, separation: 0, contrast: 0, significance: 0, specificity: 0 }
            };
        }
    }
    
    evaluatePrimeGen(expr) {
        try {
            const tree = this.parseExpression(expr);
            if (!tree) return null;
            const displayPoints = this.params.displayPoints || 200;
            const sequence = [];
            for (let i = 1; i <= displayPoints; i++) {
                try {
                    const value = tree.evaluate(i);
                    if (isFinite(value)) {
                        sequence.push(Math.round(value));
                    } else {
                        sequence.push(0);
                    }
                } catch (error) {
                    sequence.push(0);
                }
            }
            const uniquePrimes = this.countUniquePrimes(sequence);
            const hitRatio = uniquePrimes / displayPoints;
            return Math.max(0, hitRatio);
        } catch (error) {
            return null;
        }
    }
    
    parseExpression(expr) {
        // Use the expression parser
        try {
            const tree = parseExpression(expr);
            if (window.expressionParser.lastUnknownTokens && window.expressionParser.lastUnknownTokens.length > 0) {
                return null;
            }
            return tree;
        } catch (error) {
            return null;
        }
    }
    
    calculateHullArea(coords) {
        if (coords.length < 3) return 0;
        
        try {
            const hull = this.grahamScan(coords);
            if (hull.length < 3) return 0;
            
            let area = 0;
            for (let i = 0; i < hull.length; i++) {
                const j = (i + 1) % hull.length;
                area += hull[i][0] * hull[j][1];
                area -= hull[j][0] * hull[i][1];
            }
            return Math.abs(area) / 2;
        } catch (error) {
            return 0;
        }
    }
    
    calculateSpread(coords) {
        if (coords.length === 0) return 0;
        
        const centroid = this.calculateCentroid(coords);
        const distances = coords.map(coord => 
            Math.sqrt((coord[0] - centroid[0])**2 + (coord[1] - centroid[1])**2)
        );
        
        const mean = distances.reduce((a, b) => a + b, 0) / distances.length;
        const variance = distances.reduce((a, b) => a + (b - mean)**2, 0) / distances.length;
        
        return Math.sqrt(variance);
    }
    
    calculateBalance(coords) {
        if (coords.length === 0) return 0;
        
        const xs = coords.map(c => c[0]);
        const ys = coords.map(c => c[1]);
        
        const stdX = this.calculateStandardDeviation(xs);
        const stdY = this.calculateStandardDeviation(ys);
        
        if (stdX === 0 || stdY === 0) return 0;
        return Math.min(stdX, stdY) / Math.max(stdX, stdY);
    }
    
    calculateCentroid(coords) {
        const sumX = coords.reduce((sum, coord) => sum + coord[0], 0);
        const sumY = coords.map(c => c[1]).reduce((sum, coord) => sum + coord, 0);
        return [sumX / coords.length, sumY / coords.length];
    }
    
    calculateStandardDeviation(values) {
        const mean = values.reduce((a, b) => a + b, 0) / values.length;
        const variance = values.reduce((a, b) => a + (b - mean)**2, 0) / values.length;
        return Math.sqrt(variance);
    }
    
    grahamScan(points) {
        if (points.length < 3) return points;
        
        let lowest = 0;
        for (let i = 1; i < points.length; i++) {
            if (points[i][1] < points[lowest][1] || 
                (points[i][1] === points[lowest][1] && points[i][0] < points[lowest][0])) {
                lowest = i;
            }
        }
        
        const p0 = points[lowest];
        const sorted = points
            .filter((_, i) => i !== lowest)
            .sort((a, b) => {
                const angleA = Math.atan2(a[1] - p0[1], a[0] - p0[0]);
                const angleB = Math.atan2(b[1] - p0[1], b[0] - p0[0]);
                return angleA - angleB;
            });
        
        const hull = [p0, sorted[0]];
        for (let i = 1; i < sorted.length; i++) {
            while (hull.length > 1 && this.crossProduct(hull[hull.length - 2], hull[hull.length - 1], sorted[i]) <= 0) {
                hull.pop();
            }
            hull.push(sorted[i]);
        }
        
        return hull;
    }
    
    crossProduct(p1, p2, p3) {
        return (p2[0] - p1[0]) * (p3[1] - p1[1]) - (p2[1] - p1[1]) * (p3[0] - p1[0]);
    }
    
    countUniquePrimes(sequence) {
        const uniquePrimes = new Set();
        
        for (const num of sequence) {
            const absNum = Math.abs(num);
            if (absNum >= 2 && window.primeCache.isPrime(absNum)) {
                uniquePrimes.add(absNum);
            }
        }
        return uniquePrimes.size;
    }
    
    calculateComplexity(expr) {
        // Simple complexity measure based on expression length and operations
        let complexity = 1;
        
        // Count operations - escape special regex characters
        const operations = [
            { op: 'sin', regex: 'sin' },
            { op: 'cos', regex: 'cos' },
            { op: 'sqrt', regex: 'sqrt' },
            { op: 'log', regex: 'log' },
            { op: 'abs', regex: 'abs' },
            { op: '+', regex: '\\+' },
            { op: '-', regex: '-' },
            { op: '*', regex: '\\*' },
            { op: '/', regex: '/' },
            { op: '%', regex: '%' }
        ];
        
        for (const { op, regex } of operations) {
            const matches = (expr.match(new RegExp(regex, 'g')) || []).length;
            complexity += matches;
        }
        
        // Penalize long expressions
        complexity += expr.length * 0.01;
        
        return complexity;
    }
    
    // Enhanced Fitness Function Helper Methods
    
    normalizeCoordinates(primeCoords, compositeCoords) {
        // Combine all coordinates for normalization
        const allCoords = [...primeCoords, ...compositeCoords];
        if (allCoords.length === 0) {
            return { primeCoords: [], compositeCoords: [] };
        }
        
        // Calculate bounds
        const xs = allCoords.map(c => c[0]);
        const ys = allCoords.map(c => c[1]);
        const xMin = Math.min(...xs);
        const xMax = Math.max(...xs);
        const yMin = Math.min(...ys);
        const yMax = Math.max(...ys);
        
        // Normalize to [-1, 1] range
        const xRange = xMax - xMin || 1;
        const yRange = yMax - yMin || 1;
        
        const normalizePoint = (point) => [
            (point[0] - xMin) / xRange * 2 - 1,
            (point[1] - yMin) / yRange * 2 - 1
        ];
        
        return {
            primeCoords: primeCoords.map(normalizePoint),
            compositeCoords: compositeCoords.map(normalizePoint)
        };
    }
    
    generateRandomBaseline(treeX, treeY, sampleSize) {
        // Generate random indices from the same range as primes
        if (this.params.primes.length === 0) {
            return [];
        }
        
        const maxPrime = Math.max(...this.params.primes);
        const randomCoords = [];
        
        for (let i = 0; i < sampleSize; i++) {
            const randomN = Math.floor(Math.random() * maxPrime) + 1;
            try {
                const x = treeX.evaluate(randomN);
                const y = treeY.evaluate(randomN);
                if (isFinite(x) && isFinite(y)) {
                    randomCoords.push([x, y]);
                }
            } catch (error) {
                // Skip invalid evaluations
            }
        }
        
        return randomCoords;
    }
    
    calculateSeparationScore(primeCoords, compositeCoords) {
        // Measure average distance from prime points to nearest composite points
        let totalDistance = 0;
        let validCount = 0;
        
        for (const primePoint of primeCoords) {
            let minDistance = Infinity;
            
            for (const compositePoint of compositeCoords) {
                const distance = Math.sqrt(
                    Math.pow(primePoint[0] - compositePoint[0], 2) +
                    Math.pow(primePoint[1] - compositePoint[1], 2)
                );
                minDistance = Math.min(minDistance, distance);
            }
            
            if (minDistance < Infinity) {
                totalDistance += minDistance;
                validCount++;
            }
        }
        
        return validCount > 0 ? totalDistance / validCount : 0;
    }
    
    calculateStructuralContrastScore(primeCoords, compositeCoords) {
        // Calculate local density variance for both sets
        const primeRegularity = this.calculateLocalDensityVariance(primeCoords);
        const compositeRegularity = this.calculateLocalDensityVariance(compositeCoords);
        
        // Return ratio (higher when primes are more organized than composites)
        const epsilon = 1e-9;
        
        // Handle edge cases
        if (compositeRegularity <= epsilon) {
            return primeRegularity > epsilon ? 1.0 : 0.0;
        }
        
        return primeRegularity / compositeRegularity;
    }
    
    calculateLocalDensityVariance(coords, radius = 0.1) {
        if (coords.length < 5) return 0;
        
        const localDensities = [];
        
        for (const point of coords) {
            let count = 0;
            
            for (const otherPoint of coords) {
                const distance = Math.sqrt(
                    Math.pow(point[0] - otherPoint[0], 2) +
                    Math.pow(point[1] - otherPoint[1], 2)
                );
                if (distance <= radius && distance > 0) {
                    count++;
                }
            }
            
            localDensities.push(count);
        }
        
        // Calculate coefficient of variation
        const mean = localDensities.reduce((a, b) => a + b, 0) / localDensities.length;
        const variance = localDensities.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / localDensities.length;
        const stdDev = Math.sqrt(variance);
        
        return mean > 0 ? stdDev / mean : 0;
    }
    
    calculateStatisticalSignificance(primeCoords, compositeCoords, randomCoords) {
        // Compare prime vs random and composite vs random
        const primeVsRandom = this.calculateDistributionDifference(primeCoords, randomCoords);
        const compositeVsRandom = this.calculateDistributionDifference(compositeCoords, randomCoords);
        
        // Higher score when primes differ more from random than composites do
        return Math.max(0, primeVsRandom - compositeVsRandom);
    }
    
    calculateDistributionDifference(coords1, coords2) {
        if (coords1.length === 0 || coords2.length === 0) return 0;
        
        // Calculate centroid distances
        const centroid1 = this.calculateCentroid(coords1);
        const centroid2 = this.calculateCentroid(coords2);
        
        const centroidDistance = Math.sqrt(
            Math.pow(centroid1[0] - centroid2[0], 2) +
            Math.pow(centroid1[1] - centroid2[1], 2)
        );
        
        // Calculate spread differences
        const spread1 = this.calculateSpread(coords1);
        const spread2 = this.calculateSpread(coords2);
        const spreadDifference = Math.abs(spread1 - spread2);
        
        // Calculate Jensen-Shannon divergence
        const jsDivergence = this.calculateJensenShannonDivergence(coords1, coords2);
        
        return centroidDistance + spreadDifference + jsDivergence;
    }
    
    calculateJensenShannonDivergence(coords1, coords2, gridSize = 50) {
        if (coords1.length === 0 || coords2.length === 0) return 0;
        
        // Combine all coordinates to determine bounds
        const allCoords = [...coords1, ...coords2];
        const xs = allCoords.map(c => c[0]);
        const ys = allCoords.map(c => c[1]);
        
        const xMin = Math.min(...xs);
        const xMax = Math.max(...xs);
        const yMin = Math.min(...ys);
        const yMax = Math.max(...ys);
        
        // Create 2D histograms
        const xBins = Array(gridSize + 1).fill().map((_, i) => xMin + (xMax - xMin) * i / gridSize);
        const yBins = Array(gridSize + 1).fill().map((_, i) => yMin + (yMax - yMin) * i / gridSize);
        
        const hist1 = this.create2DHistogram(coords1, xBins, yBins);
        const hist2 = this.create2DHistogram(coords2, xBins, yBins);
        
        // Normalize histograms to probability distributions
        const sum1 = hist1.reduce((a, row) => a + row.reduce((b, val) => b + val, 0), 0);
        const sum2 = hist2.reduce((a, row) => a + row.reduce((b, val) => b + val, 0), 0);
        
        if (sum1 === 0 || sum2 === 0) return 0;
        
        const p1 = hist1.map(row => row.map(val => val / sum1));
        const p2 = hist2.map(row => row.map(val => val / sum2));
        
        // Calculate Jensen-Shannon divergence
        const m = p1.map((row, i) => row.map((val, j) => 0.5 * (val + p2[i][j])));
        
        const kl1 = this.klDivergence(p1, m);
        const kl2 = this.klDivergence(p2, m);
        
        const js = 0.5 * (kl1 + kl2);
        
        // Normalize by log(2) to get value in [0,1]
        return js / Math.log(2);
    }
    
    create2DHistogram(coords, xBins, yBins) {
        const histogram = Array(yBins.length - 1).fill().map(() => Array(xBins.length - 1).fill(0));
        
        for (const coord of coords) {
            const x = coord[0];
            const y = coord[1];
            
            // Find bin indices
            let xBin = -1;
            let yBin = -1;
            
            for (let i = 0; i < xBins.length - 1; i++) {
                if (x >= xBins[i] && x < xBins[i + 1]) {
                    xBin = i;
                    break;
                }
            }
            
            for (let i = 0; i < yBins.length - 1; i++) {
                if (y >= yBins[i] && y < yBins[i + 1]) {
                    yBin = i;
                    break;
                }
            }
            
            if (xBin >= 0 && yBin >= 0) {
                histogram[yBin][xBin]++;
            }
        }
        
        return histogram;
    }
    
    klDivergence(p, q) {
        let divergence = 0;
        
        for (let i = 0; i < p.length; i++) {
            for (let j = 0; j < p[i].length; j++) {
                if (p[i][j] > 0 && q[i][j] > 0) {
                    divergence += p[i][j] * Math.log(p[i][j] / q[i][j]);
                }
            }
        }
        
        return divergence;
    }
    
    calculatePatternSpecificity(primeCoords, compositeCoords, randomCoords) {
        // Test multiple pattern types for specificity
        const patternTests = [];
        
        // 1. Clustering specificity
        const primeClustering = this.calculateClusteringQuality(primeCoords);
        const compositeClustering = this.calculateClusteringQuality(compositeCoords);
        const randomClustering = this.calculateClusteringQuality(randomCoords);
        
        const clusteringSpecificity = (primeClustering - randomClustering) - (compositeClustering - randomClustering);
        patternTests.push(Math.max(0, clusteringSpecificity));
        
        // 2. Linear structure specificity
        const primeLinearity = this.calculateLinearStructure(primeCoords);
        const compositeLinearity = this.calculateLinearStructure(compositeCoords);
        const randomLinearity = this.calculateLinearStructure(randomCoords);
        
        const linearitySpecificity = (primeLinearity - randomLinearity) - (compositeLinearity - randomLinearity);
        patternTests.push(Math.max(0, linearitySpecificity));
        
        // 3. Spatial distribution specificity
        const primeDistribution = this.calculateSpatialDistribution(primeCoords);
        const compositeDistribution = this.calculateSpatialDistribution(compositeCoords);
        const randomDistribution = this.calculateSpatialDistribution(randomCoords);
        
        const distributionSpecificity = Math.abs(primeDistribution - randomDistribution) - 
                                       Math.abs(compositeDistribution - randomDistribution);
        patternTests.push(Math.max(0, distributionSpecificity));
        
        return patternTests.reduce((a, b) => a + b, 0) / patternTests.length;
    }
    
    calculateClusteringQuality(coords) {
        if (coords.length < 10) return 0;
        
        // Simple clustering quality measure using nearest neighbor distances
        const nearestNeighborDistances = [];
        
        for (let i = 0; i < coords.length; i++) {
            let minDistance = Infinity;
            
            for (let j = 0; j < coords.length; j++) {
                if (i !== j) {
                    const distance = Math.sqrt(
                        Math.pow(coords[i][0] - coords[j][0], 2) +
                        Math.pow(coords[i][1] - coords[j][1], 2)
                    );
                    minDistance = Math.min(minDistance, distance);
                }
            }
            
            if (minDistance < Infinity) {
                nearestNeighborDistances.push(minDistance);
            }
        }
        
        // Lower average distance indicates better clustering
        const avgDistance = nearestNeighborDistances.reduce((a, b) => a + b, 0) / nearestNeighborDistances.length;
        return Math.max(0, 1 - avgDistance); // Normalize to [0, 1]
    }
    
    calculateLinearStructure(coords) {
        if (coords.length < 3) return 0;
        
        // Enhanced linear structure detection using Hough transform approach
        const houghScore = this.calculateHoughLineStrength(coords);
        const pcaScore = this.calculatePCALinearity(coords);
        
        // Combine both approaches for better line detection
        return (houghScore + pcaScore) / 2;
    }
    
    calculateHoughLineStrength(coords, imageSize = 64, peaks = 5) {
        if (coords.length < 3) return 0;
        
        // Normalize coordinates to [0, imageSize-1]
        const xs = coords.map(c => c[0]);
        const ys = coords.map(c => c[1]);
        const xMin = Math.min(...xs);
        const xMax = Math.max(...xs);
        const yMin = Math.min(...ys);
        const yMax = Math.max(...ys);
        
        const xRange = xMax - xMin || 1;
        const yRange = yMax - yMin || 1;
        
        // Create binary image
        const image = Array(imageSize).fill().map(() => Array(imageSize).fill(false));
        
        for (const coord of coords) {
            const x = Math.round(((coord[0] - xMin) / xRange) * (imageSize - 1));
            const y = Math.round(((coord[1] - yMin) / yRange) * (imageSize - 1));
            
            if (x >= 0 && x < imageSize && y >= 0 && y < imageSize) {
                image[y][x] = true;
            }
        }
        
        // Simplified Hough transform for line detection
        const angles = 180;
        const houghSpace = Array(angles).fill(0);
        
        // Count points for each angle
        for (let angle = 0; angle < angles; angle++) {
            const rad = (angle * Math.PI) / 180;
            const cos = Math.cos(rad);
            const sin = Math.sin(rad);
            
            for (let y = 0; y < imageSize; y++) {
                for (let x = 0; x < imageSize; x++) {
                    if (image[y][x]) {
                        const r = x * cos + y * sin;
                        let rIndex = Math.floor((r + imageSize) / 2);
                        rIndex = Math.max(0, Math.min(imageSize - 1, rIndex)); // Clamp
                        if (rIndex >= 0 && rIndex < imageSize) {
                            houghSpace[angle]++;
                        }
                    }
                }
            }
        }
        
        // Find peak values
        const sortedValues = [...houghSpace].sort((a, b) => b - a);
        const peakValues = sortedValues.slice(0, peaks);
        const avgPeak = peakValues.reduce((a, b) => a + b, 0) / peakValues.length;
        const avgHough = houghSpace.reduce((a, b) => a + b, 0) / houghSpace.length;
        
        // Handle edge case where avgHough is 0
        if (avgHough <= 1e-12) {
            return avgPeak > 0 ? 1.0 : 0.0;
        }
        
        return avgPeak / avgHough;
    }
    
    calculatePCALinearity(coords) {
        if (coords.length < 3) return 0;
        
        // Calculate principal components to measure linearity
        const xs = coords.map(c => c[0]);
        const ys = coords.map(c => c[1]);
        
        const meanX = xs.reduce((a, b) => a + b, 0) / xs.length;
        const meanY = ys.reduce((a, b) => a + b, 0) / ys.length;
        
        // Center the data
        const centeredXs = xs.map(x => x - meanX);
        const centeredYs = ys.map(y => y - meanY);
        
        // Calculate covariance matrix
        const covXX = centeredXs.reduce((a, b) => a + b * b, 0) / centeredXs.length;
        const covYY = centeredYs.reduce((a, b) => a + b * b, 0) / centeredYs.length;
        const covXY = centeredXs.reduce((a, b, i) => a + b * centeredYs[i], 0) / centeredXs.length;
        
        // Calculate eigenvalues (simplified PCA)
        const trace = covXX + covYY;
        const det = covXX * covYY - covXY * covXY;
        const discriminant = Math.sqrt(trace * trace - 4 * det);
        
        const eigen1 = (trace + discriminant) / 2;
        const eigen2 = (trace - discriminant) / 2;
        
        // Ratio of largest to smallest eigenvalue indicates linearity
        const epsilon = 1e-9;
        return eigen2 > epsilon ? eigen1 / eigen2 : 0;
    }
    
    calculateSpatialDistribution(coords) {
        if (coords.length < 5) return 0;
        
        // Calculate spatial distribution using quadrant analysis
        const quadrants = [0, 0, 0, 0];
        
        for (const coord of coords) {
            const x = coord[0];
            const y = coord[1];
            
            if (x >= 0 && y >= 0) quadrants[0]++;
            else if (x < 0 && y >= 0) quadrants[1]++;
            else if (x < 0 && y < 0) quadrants[2]++;
            else quadrants[3]++;
        }
        
        // Calculate entropy of distribution
        const total = quadrants.reduce((a, b) => a + b, 0);
        let entropy = 0;
        
        for (const count of quadrants) {
            if (count > 0) {
                const p = count / total;
                entropy -= p * Math.log(p);
            }
        }
        
        return entropy;
    }
    

    
    // IMPROVED: Area Coverage Score - Detects lines regardless of scale
    calculateAreaCoverageScore(originalCoords, normalizedCoords) {
        if (originalCoords.length < 3) return 0;
        
        // Calculate convex hull area using normalized coordinates
        const hullArea = this.calculateHullArea(normalizedCoords);
        
        // Calculate isotropy score from PCA (how non-linear the distribution is)
        const isotropyScore = this.calculateIsotropyScore(normalizedCoords);
        
        // Calculate scale imbalance score using ORIGINAL coordinates
        const scaleImbalanceScore = this.calculateScaleImbalanceScore(originalCoords);
        
        // For normalized coordinates, max possible area is 4.0 ([-1,1]×[-1,1])
        // Normalize hull area to [0, 1] range
        const normalizedHullArea = Math.min(1.0, hullArea / 4.0);
        
        // Combine: Area Coverage = Normalized Hull Area × Isotropy Score × Scale Balance Score
        // This ensures area coverage, non-linearity, AND balanced scales
        return normalizedHullArea * isotropyScore * scaleImbalanceScore;
    }
    
    // NEW: Isotropy Score from PCA - Measures how non-linear the distribution is
    calculateIsotropyScore(coords) {
        if (coords.length < 3) return 0;
        
        // Calculate principal components to measure isotropy
        const xs = coords.map(c => c[0]);
        const ys = coords.map(c => c[1]);
        
        const meanX = xs.reduce((a, b) => a + b, 0) / xs.length;
        const meanY = ys.reduce((a, b) => a + b, 0) / ys.length;
        
        // Center the data
        const centeredXs = xs.map(x => x - meanX);
        const centeredYs = ys.map(y => y - meanY);
        
        // Calculate covariance matrix
        const covXX = centeredXs.reduce((a, b) => a + b * b, 0) / centeredXs.length;
        const covYY = centeredYs.reduce((a, b) => a + b * b, 0) / centeredYs.length;
        const covXY = centeredXs.reduce((a, b, i) => a + b * centeredYs[i], 0) / centeredXs.length;
        
        // Calculate eigenvalues (simplified PCA)
        const trace = covXX + covYY;
        const det = covXX * covYY - covXY * covXY;
        const discriminant = Math.sqrt(trace * trace - 4 * det);
        
        const eigen1 = (trace + discriminant) / 2;
        const eigen2 = (trace - discriminant) / 2;
        
        // Isotropy score: ratio of smaller to larger eigenvalue
        // Higher score = more isotropic (less linear)
        const epsilon = 1e-9;
        if (eigen1 <= epsilon) return 0;
        
        const isotropy = eigen2 / eigen1; // Range [0, 1]
        
        // Apply sigmoid transformation to make the score more sensitive
        // This makes it easier to distinguish between linear and non-linear patterns
        // Parameters: steepness = 5, threshold = 0.2 (less aggressive than before)
        return 1 / (1 + Math.exp(-5 * (isotropy - 0.2)));
    }
    
    // NEW: Scale Imbalance Score - Detects extreme range differences in original coordinates
    calculateScaleImbalanceScore(originalCoords) {
        if (originalCoords.length < 3) return 0;
        
        const xs = originalCoords.map(c => c[0]);
        const ys = originalCoords.map(c => c[1]);
        
        // Calculate ranges in original coordinate space
        const xRange = Math.max(...xs) - Math.min(...xs);
        const yRange = Math.max(...ys) - Math.min(...ys);
        
        // If one range is much smaller than the other, it indicates scale imbalance
        const minRange = Math.min(xRange, yRange);
        const maxRange = Math.max(xRange, yRange);
        
        if (maxRange === 0) return 0;
        
        // Calculate range ratio (smaller / larger)
        const rangeRatio = minRange / maxRange; // Range [0, 1]
        
        // Apply sigmoid to penalize extreme imbalances
        // Parameters: steepness = 5, threshold = 0.3
        // This gives high scores for balanced ranges, low scores for extreme imbalances
        return 1 / (1 + Math.exp(-5 * (rangeRatio - 0.3)));
    }
    
    // Symmetry methods for all optimizers
    createSymmetricPairFromBase(baseExpr) {
        // Define symmetric transformations
        const symmetricTransformations = [
            // Trigonometric pairs
            { from: 'sin', to: 'cos', name: 'sin-cos' },
            { from: 'cos', to: 'sin', name: 'cos-sin' },
            { from: 'sind', to: 'cosd', name: 'sind-cosd' },
            { from: 'cosd', to: 'sind', name: 'cosd-sind' },
            
            // Phase shifts
            { from: 'sin', to: 'sin', name: 'sin-phase', phaseShift: Math.PI / 2 },
            { from: 'cos', to: 'cos', name: 'cos-phase', phaseShift: Math.PI / 2 },
            { from: 'sind', to: 'sind', name: 'sind-phase', phaseShift: 90 },
            { from: 'cosd', to: 'cosd', name: 'cosd-phase', phaseShift: 90 },
            
            // Negation
            { from: 'sin', to: 'sin', name: 'sin-neg', negate: true },
            { from: 'cos', to: 'cos', name: 'cos-neg', negate: true },
            { from: 'sind', to: 'sind', name: 'sind-neg', negate: true },
            { from: 'cosd', to: 'cosd', name: 'cosd-neg', negate: true },
            
            // Reciprocal
            { from: 'sin', to: 'sin', name: 'sin-recip', reciprocal: true },
            { from: 'cos', to: 'cos', name: 'cos-recip', reciprocal: true },
            { from: 'sind', to: 'sind', name: 'sind-recip', reciprocal: true },
            { from: 'cosd', to: 'cosd', name: 'cosd-recip', reciprocal: true }
        ];
        
        // Choose a random transformation
        const transformation = this.rnd.choice(symmetricTransformations);
        
        // Parse the base expression
        const baseTree = this.parseExpression(baseExpr);
        
        // Create the first function (base)
        let func1 = deepCopy(baseTree);
        
        // Create the second function by applying transformation
        let func2 = deepCopy(baseTree);
        
        // Apply the transformation to func2
        if (transformation.to !== transformation.from) {
            // Function swap - find and replace trig functions
            this.applyTransformationToTree(func2, transformation);
        }
        
        if (transformation.phaseShift) {
            // Add phase shift to the argument
            this.addPhaseShiftToTree(func2, transformation.phaseShift);
        }
        
        if (transformation.negate) {
            // Negate the entire function
            const negOne = new ConstNode(-1);
            func2 = new BinaryNode('*', negOne, func2);
        }
        
        if (transformation.reciprocal) {
            // Create reciprocal
            const one = new ConstNode(1);
            func2 = new BinaryNode('/', one, func2);
        }
        
        return {
            x: func1.toStr(),
            y: func2.toStr(),
            transformation: transformation.name
        };
    }
    
    // Helper method to apply transformation to a tree
    applyTransformationToTree(tree, transformation) {
        try {
            // Find all unary nodes with the 'from' function and replace with 'to'
            const nodes = this.findUnaryNodes(tree, transformation.from);
            for (const node of nodes) {
                if (node && typeof node.op === 'string') {
                    node.op = transformation.to;
                }
            }
        } catch (error) {
            console.warn('Error applying transformation to tree:', error);
        }
    }
    
    // Helper method to add phase shift to a tree
    addPhaseShiftToTree(tree, phaseShift) {
        try {
            // Find all trig function nodes and add phase shift to their arguments
            const trigOps = ['sin', 'cos', 'sind', 'cosd'];
            const nodes = [];
            
            // Collect all unary nodes with trig functions
            this._findUnaryNodesRecursive(tree, null, nodes);
            const trigNodes = nodes.filter(node => node && trigOps.includes(node.op));
            
            for (const node of trigNodes) {
                if (node.child) {
                    const phaseShiftNode = new ConstNode(phaseShift);
                    node.child = new BinaryNode('+', node.child, phaseShiftNode);
                }
            }
        } catch (error) {
            console.warn('Error adding phase shift to tree:', error);
        }
    }
    
    // Helper method to find unary nodes with specific operation
    findUnaryNodes(tree, op) {
        const nodes = [];
        this._findUnaryNodesRecursive(tree, op, nodes);
        return nodes;
    }
    
    // Helper method to recursively find unary nodes
    _findUnaryNodesRecursive(node, op, nodes) {
        if (node instanceof UnaryNode) {
            if (op === null || node.op === op) {
                nodes.push(node);
            }
            this._findUnaryNodesRecursive(node.child, op, nodes);
        } else if (node instanceof BinaryNode) {
            this._findUnaryNodesRecursive(node.left, op, nodes);
            this._findUnaryNodesRecursive(node.right, op, nodes);
        } else if (node instanceof ModNode) {
            this._findUnaryNodesRecursive(node.child, op, nodes);
        }
    }
    
    // Symmetric mutation method
    performSymmetricMutation(treeX, treeY) {
        try {
            // Define symmetric transformations
            const symmetricTransformations = [
                { from: 'sin', to: 'cos', name: 'sin-cos' },
                { from: 'cos', to: 'sin', name: 'cos-sin' },
                { from: 'sind', to: 'cosd', name: 'sind-cosd' },
                { from: 'cosd', to: 'sind', name: 'cosd-sind' },
                { from: 'sin', to: 'sin', name: 'sin-phase', phaseShift: Math.PI / 2 },
                { from: 'cos', to: 'cos', name: 'cos-phase', phaseShift: Math.PI / 2 },
                { from: 'sind', to: 'sind', name: 'sind-phase', phaseShift: 90 },
                { from: 'cosd', to: 'cosd', name: 'cosd-phase', phaseShift: 90 },
                { from: 'sin', to: 'sin', name: 'sin-neg', negate: true },
                { from: 'cos', to: 'cos', name: 'cos-neg', negate: true },
                { from: 'sind', to: 'sind', name: 'sind-neg', negate: true },
                { from: 'cosd', to: 'cosd', name: 'cosd-neg', negate: true },
                { from: 'sin', to: 'sin', name: 'sin-recip', reciprocal: true },
                { from: 'cos', to: 'cos', name: 'cos-recip', reciprocal: true },
                { from: 'sind', to: 'sind', name: 'sind-recip', reciprocal: true },
                { from: 'cosd', to: 'cosd', name: 'cosd-recip', reciprocal: true }
            ];
            
            // Choose a random transformation
            const transformation = this.rnd.choice(symmetricTransformations);
            
            // Apply transformation to create symmetric pair
            return this.createSymmetricPair(transformation);
        } catch (error) {
            console.warn('Error in symmetric mutation:', error);
            return null;
        }
    }
    
    // Create symmetric pair from transformation
    createSymmetricPair(transformation) {
        try {
            // Create a simple base expression for transformation
            const baseExpr = 'n';
            const baseTree = this.parseExpression(baseExpr);
            
            // Create the first function (base)
            let func1 = deepCopy(baseTree);
            
            // Create the second function by applying transformation
            let func2 = deepCopy(baseTree);
            
            // Apply the transformation to func2
            if (transformation.to !== transformation.from) {
                // Function swap - find and replace trig functions
                this.applyTransformationToTree(func2, transformation);
            }
            
            if (transformation.phaseShift) {
                // Add phase shift to the argument
                this.addPhaseShiftToTree(func2, transformation.phaseShift);
            }
            
            if (transformation.negate) {
                // Negate the entire function
                const negOne = new ConstNode(-1);
                func2 = new BinaryNode('*', negOne, func2);
            }
            
            if (transformation.reciprocal) {
                // Create reciprocal
                const one = new ConstNode(1);
                func2 = new BinaryNode('/', one, func2);
            }
            
            return {
                x: func1.toStr(),
                y: func2.toStr(),
                transformation: transformation.name
            };
        } catch (error) {
            console.warn('Error creating symmetric pair:', error);
            return null;
        }
    }
    
    _normalizeExpr(expr) {
        // For PrimeFold, sort pair for symmetry if needed
        if (this.params.mode === 'primefold') {
            const parts = expr.split(',').map(s => s.trim());
            if (parts.length >= 2) {
                // Optionally sort for symmetry, or just join
                return parts.join(',');
            }
        }
        return expr.trim();
    }
}

// LAHC Optimizer
class LAHCOptimizer extends BaseOptimizer {
    constructor(params) {
        super(params);
        this.history = [];
        this.historyLength = params.historyLength || 50;
    }
    
    step() {
        this.iteration++;
        
        const candidateExpr = this.mutateExpression(this.currentExpr);
        const candidateScore = this.evaluateExpression(candidateExpr);
        
        // Handle null scores - treat them as very low scores
        const effectiveCandidateScore = candidateScore !== null && candidateScore !== undefined ? candidateScore : -Infinity;
        const effectiveCurrentScore = this.currentScore !== null && this.currentScore !== undefined ? this.currentScore : -Infinity;
        const effectiveBestScore = this.bestScore !== null && this.bestScore !== undefined ? this.bestScore : -Infinity;
        
        const shouldAccept = effectiveCandidateScore > effectiveCurrentScore || 
                           (this.history.length > 0 && effectiveCandidateScore > this.history[this.history.length - 1]);
        
        if (shouldAccept) {
            this.currentExpr = candidateExpr;
            this.currentScore = candidateScore; // Keep the original value (null or number)
            
            if (effectiveCandidateScore > effectiveBestScore) {
                this.bestExpr = candidateExpr;
                this.bestScore = candidateScore; // Keep the original value (null or number)
            }
        }
        
        this.history.push(this.currentScore);
        if (this.history.length > this.historyLength) {
            this.history.shift();
        }
        
        return {
            currentExpr: candidateExpr,
            currentScore: candidateScore,
            bestExpr: this.bestExpr,
            bestScore: this.bestScore
        };
    }
    
    mutateExpression(expr) {
        if (this.params.mode === 'primefold') {
            const parts = expr.split(',').map(s => s.trim());
            if (parts.length >= 2) {
                const exprX = parts[0].replace('f(n) =', '').trim();
                const exprY = parts[1].replace('g(n) =', '').trim();
                
                if (this.params.enforceSymmetry) {
                    // In symmetry mode, only mutate one function and derive the other
                    const treeX = this.parseExpression(exprX);
                    const mutatedX = mutateTree(treeX, this.rnd).toStr();
                    
                    // Create symmetric pair from the mutated function
                    const symmetricPair = this.createSymmetricPairFromBase(mutatedX);
                    return `f(n) = ${symmetricPair.x}, g(n) = ${symmetricPair.y}`;
                } else {
                    // Normal mutation for both functions
                    const treeX = this.parseExpression(exprX);
                    const treeY = this.parseExpression(exprY);
                    
                    // NEW: Symmetric mutation (20% chance for PrimeFold mode)
                    if (this.rnd.random() < 0.20) {
                        const symmetricResult = this.performSymmetricMutation(treeX, treeY);
                        if (symmetricResult) {
                            return `f(n) = ${symmetricResult.x}, g(n) = ${symmetricResult.y}`;
                        }
                    }
                    
                    const mutatedX = mutateTree(treeX, this.rnd).toStr();
                    const mutatedY = mutateTree(treeY, this.rnd).toStr();
                    
                    return `f(n) = ${mutatedX}, g(n) = ${mutatedY}`;
                }
            }
        } else {
            const exprF = expr.replace('f(n) =', '').trim();
            const tree = this.parseExpression(exprF);
            const mutated = mutateTree(tree, this.rnd).toStr();
            return `f(n) = ${mutated}`;
        }
        return expr;
    }
    
    // NEW: Symmetric mutation for PrimeFold mode
    performSymmetricMutation(treeX, treeY) {
        // Define symmetric function transformations
        const symmetricTransformations = [
            // Trigonometric pairs
            { from: 'sin', to: 'cos', name: 'sin-cos' },
            { from: 'cos', to: 'sin', name: 'cos-sin' },
            { from: 'sind', to: 'cosd', name: 'sind-cosd' },
            { from: 'cosd', to: 'sind', name: 'cosd-sind' },
            
            // Phase shifts (add π/2 or π)
            { from: 'sin', to: 'sin', name: 'sin-phase', phaseShift: Math.PI / 2 },
            { from: 'cos', to: 'cos', name: 'cos-phase', phaseShift: Math.PI / 2 },
            { from: 'sind', to: 'sind', name: 'sind-phase', phaseShift: 90 },
            { from: 'cosd', to: 'cosd', name: 'cosd-phase', phaseShift: 90 },
            
            // Negation transformations
            { from: 'sin', to: 'sin', name: 'sin-neg', negate: true },
            { from: 'cos', to: 'cos', name: 'cos-neg', negate: true },
            { from: 'sind', to: 'sind', name: 'sind-neg', negate: true },
            { from: 'cosd', to: 'cosd', name: 'cosd-neg', negate: true },
            
            // Reciprocal transformations (1/f)
            { from: 'sin', to: 'sin', name: 'sin-recip', reciprocal: true },
            { from: 'cos', to: 'cos', name: 'cos-recip', reciprocal: true },
            { from: 'sind', to: 'sind', name: 'sind-recip', reciprocal: true },
            { from: 'cosd', to: 'cosd', name: 'cosd-recip', reciprocal: true }
        ];
        
        // Choose a random transformation
        const transformation = this.rnd.choice(symmetricTransformations);
        
        // Find all unary nodes with the 'from' function in both trees
        const nodesX = this.findUnaryNodes(treeX, transformation.from);
        const nodesY = this.findUnaryNodes(treeY, transformation.from);
        
        // If we found matching nodes, apply the transformation
        if (nodesX.length > 0 || nodesY.length > 0) {
            const newTreeX = deepCopy(treeX);
            const newTreeY = deepCopy(treeY);
            
            // Apply transformation to X tree
            if (nodesX.length > 0) {
                const nodeToTransform = this.rnd.choice(nodesX);
                this.applyTransformation(newTreeX, nodeToTransform, transformation);
            }
            
            // Apply transformation to Y tree
            if (nodesY.length > 0) {
                const nodeToTransform = this.rnd.choice(nodesY);
                this.applyTransformation(newTreeY, nodeToTransform, transformation);
            }
            
            return {
                x: newTreeX.toStr(),
                y: newTreeY.toStr(),
                transformation: transformation.name
            };
        }
        
        // If no matching nodes found, try to create a symmetric pair from scratch
        return this.createSymmetricPair(transformation);
    }
    
    // Find all unary nodes with a specific operation
    findUnaryNodes(tree, op) {
        const nodes = [];
        this._findUnaryNodesRecursive(tree, op, nodes);
        return nodes;
    }
    
    _findUnaryNodesRecursive(node, op, nodes) {
        if (node instanceof UnaryNode && node.op === op) {
            nodes.push(node);
        }
        if (node instanceof UnaryNode) {
            this._findUnaryNodesRecursive(node.child, op, nodes);
        } else if (node instanceof BinaryNode) {
            this._findUnaryNodesRecursive(node.left, op, nodes);
            this._findUnaryNodesRecursive(node.right, op, nodes);
        } else if (node instanceof ModNode) {
            this._findUnaryNodesRecursive(node.child, op, nodes);
        }
    }
    
    // Apply a transformation to a specific node
    applyTransformation(tree, targetNode, transformation) {
        if (transformation.to !== transformation.from) {
            // Function swap (e.g., sin -> cos)
            targetNode.op = transformation.to;
        }
        
        if (transformation.phaseShift) {
            // Add phase shift to the argument
            const originalChild = targetNode.child;
            const phaseShiftNode = new ConstNode(transformation.phaseShift);
            targetNode.child = new BinaryNode('+', originalChild, phaseShiftNode);
        }
        
        if (transformation.negate) {
            // Negate the entire function
            const originalNode = deepCopy(targetNode);
            const negOne = new ConstNode(-1);
            // Replace the node with negation
            this._replaceNodeInTree(tree, targetNode, new BinaryNode('*', negOne, originalNode));
        }
        
        if (transformation.reciprocal) {
            // Create reciprocal (1/f)
            const originalNode = deepCopy(targetNode);
            const one = new ConstNode(1);
            // Replace the node with reciprocal
            this._replaceNodeInTree(tree, targetNode, new BinaryNode('/', one, originalNode));
        }
    }
    
    // Replace a node in the tree (helper function)
    _replaceNodeInTree(tree, oldNode, newNode) {
        if (tree === oldNode) {
            // This shouldn't happen in practice, but handle it
            return false;
        }
        
        if (tree instanceof UnaryNode) {
            if (tree.child === oldNode) {
                tree.child = newNode;
                return true;
            }
            return this._replaceNodeInTree(tree.child, oldNode, newNode);
        } else if (tree instanceof BinaryNode) {
            if (tree.left === oldNode) {
                tree.left = newNode;
                return true;
            }
            if (tree.right === oldNode) {
                tree.right = newNode;
                return true;
            }
            return this._replaceNodeInTree(tree.left, oldNode, newNode) || 
                   this._replaceNodeInTree(tree.right, oldNode, newNode);
        } else if (tree instanceof ModNode) {
            if (tree.child === oldNode) {
                tree.child = newNode;
                return true;
            }
            return this._replaceNodeInTree(tree.child, oldNode, newNode);
        }
        
        return false;
    }
    
    // Create a symmetric pair from scratch
    createSymmetricPair(transformation) {
        // Create a base expression
        const baseExpr = randomTree(this.rnd, 2);
        
        // Create the first function
        let func1 = deepCopy(baseExpr);
        if (transformation.from !== 'sin' && transformation.from !== 'cos' && 
            transformation.from !== 'sind' && transformation.from !== 'cosd') {
            // If the transformation doesn't involve trig functions, wrap in the 'from' function
            func1 = new UnaryNode(transformation.from, func1);
        }
        
        // Create the second function by applying transformation
        let func2 = deepCopy(baseExpr);
        if (transformation.to !== 'sin' && transformation.to !== 'cos' && 
            transformation.to !== 'sind' && transformation.to !== 'cosd') {
            // If the transformation doesn't involve trig functions, wrap in the 'to' function
            func2 = new UnaryNode(transformation.to, func2);
        }
        
        // Apply additional transformations
        if (transformation.phaseShift) {
            const phaseShiftNode = new ConstNode(transformation.phaseShift);
            func2 = new UnaryNode(transformation.to || transformation.from, 
                                 new BinaryNode('+', func2, phaseShiftNode));
        }
        
        if (transformation.negate) {
            const negOne = new ConstNode(-1);
            func2 = new BinaryNode('*', negOne, func2);
        }
        
        if (transformation.reciprocal) {
            const one = new ConstNode(1);
            func2 = new BinaryNode('/', one, func2);
        }
        
        return {
            x: func1.toStr(),
            y: func2.toStr(),
            transformation: transformation.name
        };
    }
    
    // NEW: Create symmetric pair from a base expression
    createSymmetricPairFromBase(baseExpr) {
        // Define symmetric transformations
        const symmetricTransformations = [
            // Trigonometric pairs
            { from: 'sin', to: 'cos', name: 'sin-cos' },
            { from: 'cos', to: 'sin', name: 'cos-sin' },
            { from: 'sind', to: 'cosd', name: 'sind-cosd' },
            { from: 'cosd', to: 'sind', name: 'cosd-sind' },
            
            // Phase shifts
            { from: 'sin', to: 'sin', name: 'sin-phase', phaseShift: Math.PI / 2 },
            { from: 'cos', to: 'cos', name: 'cos-phase', phaseShift: Math.PI / 2 },
            { from: 'sind', to: 'sind', name: 'sind-phase', phaseShift: 90 },
            { from: 'cosd', to: 'cosd', name: 'cosd-phase', phaseShift: 90 },
            
            // Negation
            { from: 'sin', to: 'sin', name: 'sin-neg', negate: true },
            { from: 'cos', to: 'cos', name: 'cos-neg', negate: true },
            { from: 'sind', to: 'sind', name: 'sind-neg', negate: true },
            { from: 'cosd', to: 'cosd', name: 'cosd-neg', negate: true },
            
            // Reciprocal
            { from: 'sin', to: 'sin', name: 'sin-recip', reciprocal: true },
            { from: 'cos', to: 'cos', name: 'cos-recip', reciprocal: true },
            { from: 'sind', to: 'sind', name: 'sind-recip', reciprocal: true },
            { from: 'cosd', to: 'cosd', name: 'cosd-recip', reciprocal: true }
        ];
        
        // Choose a random transformation
        const transformation = this.rnd.choice(symmetricTransformations);
        
        // Parse the base expression
        const baseTree = this.parseExpression(baseExpr);
        
        // Create the first function (base)
        let func1 = deepCopy(baseTree);
        
        // Create the second function by applying transformation
        let func2 = deepCopy(baseTree);
        
        // Apply the transformation to func2
        if (transformation.to !== transformation.from) {
            // Function swap - find and replace trig functions
            this.applyTransformationToTree(func2, transformation);
        }
        
        if (transformation.phaseShift) {
            // Add phase shift to the argument
            this.addPhaseShiftToTree(func2, transformation.phaseShift);
        }
        
        if (transformation.negate) {
            // Negate the entire function
            const negOne = new ConstNode(-1);
            func2 = new BinaryNode('*', negOne, func2);
        }
        
        if (transformation.reciprocal) {
            // Create reciprocal
            const one = new ConstNode(1);
            func2 = new BinaryNode('/', one, func2);
        }
        
        return {
            x: func1.toStr(),
            y: func2.toStr(),
            transformation: transformation.name
        };
    }
    
    // Helper method to apply transformation to a tree
    applyTransformationToTree(tree, transformation) {
        try {
            // Find all unary nodes with the 'from' function and replace with 'to'
            const nodes = this.findUnaryNodes(tree, transformation.from);
            for (const node of nodes) {
                if (node && typeof node.op === 'string') {
                    node.op = transformation.to;
                }
            }
        } catch (error) {
            console.warn('Error applying transformation to tree:', error);
        }
    }
    
    // Helper method to add phase shift to a tree
    addPhaseShiftToTree(tree, phaseShift) {
        try {
            // Find all trig function nodes and add phase shift to their arguments
            const trigOps = ['sin', 'cos', 'sind', 'cosd'];
            const nodes = [];
            
            // Collect all unary nodes with trig functions
            this._findUnaryNodesRecursive(tree, null, nodes);
            const trigNodes = nodes.filter(node => node && trigOps.includes(node.op));
            
            for (const node of trigNodes) {
                if (node.child) {
                    const phaseShiftNode = new ConstNode(phaseShift);
                    node.child = new BinaryNode('+', node.child, phaseShiftNode);
                }
            }
        } catch (error) {
            console.warn('Error adding phase shift to tree:', error);
        }
    }
}

// GA Optimizer
class GAOptimizer extends BaseOptimizer {
    constructor(params) {
        super(params);
        this.populationSize = params.populationSize || 10;
        this.population = [];
        
        // Initialize population with deduplication
        while (this.population.length < this.populationSize) {
            const expr = this.generateRandomExpression();
            const norm = this._normalizeExpr(expr);
            if (!this.seenExpressions.has(norm)) {
                this.population.push(expr);
                this.seenExpressions.add(norm);
            }
        }
        
        this.evaluatePopulation();
    }
    
    evaluatePopulation() {
        for (let i = 0; i < this.population.length; i++) {
            const score = this.evaluateExpression(this.population[i]);
            if (score !== null && score > this.bestScore) {
                this.bestScore = score;
                this.bestExpr = this.population[i];
            }
        }
    }
    
    selectParent() {
        const tournamentSize = 3;
        let best = this.rnd.choice(this.population);
        let bestScore = this.evaluateExpression(best);
        let attempts = 0;
        while ((bestScore === null || isNaN(bestScore)) && attempts < 10) {
            best = this.rnd.choice(this.population);
            bestScore = this.evaluateExpression(best);
            attempts++;
        }
        for (let i = 1; i < tournamentSize; i++) {
            let candidate = this.rnd.choice(this.population);
            let candidateScore = this.evaluateExpression(candidate);
            attempts = 0;
            while ((candidateScore === null || isNaN(candidateScore)) && attempts < 10) {
                candidate = this.rnd.choice(this.population);
                candidateScore = this.evaluateExpression(candidate);
                attempts++;
            }
            if (candidateScore !== null && candidateScore > bestScore) {
                best = candidate;
                bestScore = candidateScore;
            }
        }
        return best;
    }
    
    crossover(parent1, parent2) {
        if (this.params.mode === 'primefold') {
            const parts1 = parent1.split(',').map(s => s.trim());
            const parts2 = parent2.split(',').map(s => s.trim());
            
            if (parts1.length >= 2 && parts2.length >= 2) {
                if (this.params.enforceSymmetry) {
                    // In symmetry mode, only crossover the first function and derive the second
                    const exprX1 = parts1[0].replace('f(n) =', '').trim();
                    const exprX2 = parts2[0].replace('f(n) =', '').trim();
                    
                    // Simple crossover: randomly choose one of the X functions
                    const chosenX = this.rnd.choice([exprX1, exprX2]);
                    
                    // Create symmetric pair from the chosen function
                    const symmetricPair = this.createSymmetricPairFromBase(chosenX);
                    return [`f(n) = ${symmetricPair.x}, g(n) = ${symmetricPair.y}`, 
                            `f(n) = ${symmetricPair.x}, g(n) = ${symmetricPair.y}`];
                } else {
                    // Normal crossover for both functions
                    const child1 = `f(n) = ${parts1[0].replace('f(n) =', '').trim()}, g(n) = ${parts2[1].replace('g(n) =', '').trim()}`;
                    const child2 = `f(n) = ${parts2[0].replace('f(n) =', '').trim()}, g(n) = ${parts1[1].replace('g(n) =', '').trim()}`;
                    return [child1, child2];
                }
            }
        } else {
            // For PrimeGen, just return the parents (no crossover for single expressions)
            return [parent1, parent2];
        }
        return [parent1, parent2];
    }
    
    mutate(expr) {
        if (this.rnd.random() < 0.1) {
            return this.generateRandomExpression();
        }
        
        if (this.params.mode === 'primefold') {
            if (this.params.enforceSymmetry) {
                // In symmetry mode, only mutate one function and derive the other
                const parts = expr.split(',').map(s => s.trim());
                if (parts.length >= 2) {
                    const exprX = parts[0].replace('f(n) =', '').trim();
                    const treeX = this.parseExpression(exprX);
                    const mutatedX = mutateTree(treeX, this.rnd).toStr();
                    
                    // Create symmetric pair from the mutated function
                    const symmetricPair = this.createSymmetricPairFromBase(mutatedX);
                    return `f(n) = ${symmetricPair.x}, g(n) = ${symmetricPair.y}`;
                }
            } else {
                // NEW: Symmetric mutation for PrimeFold mode
                if (this.rnd.random() < 0.15) {
                    const parts = expr.split(',').map(s => s.trim());
                    if (parts.length >= 2) {
                        const exprX = parts[0].replace('f(n) =', '').trim();
                        const exprY = parts[1].replace('g(n) =', '').trim();
                        
                        const treeX = this.parseExpression(exprX);
                        const treeY = this.parseExpression(exprY);
                        
                        const symmetricResult = this.performSymmetricMutation(treeX, treeY);
                        if (symmetricResult) {
                            return `f(n) = ${symmetricResult.x}, g(n) = ${symmetricResult.y}`;
                        }
                    }
                }
            }
        }
        
        return expr;
    }
    
    step() {
        this.iteration++;
        const newPopulation = [];
        // Elitism
        if (this.bestExpr) {
            newPopulation.push(this.bestExpr);
        }
        // Generate new population with deduplication
        while (newPopulation.length < this.populationSize) {
            const parent1 = this.selectParent();
            const parent2 = this.selectParent();
            const [child1, child2] = this.crossover(parent1, parent2);
            const mutated1 = this.mutate(child1);
            const mutated2 = this.mutate(child2);
            const norm1 = this._normalizeExpr(mutated1);
            const norm2 = this._normalizeExpr(mutated2);
            if (this.evaluateExpression(mutated1) !== null && !this.seenExpressions.has(norm1)) {
                newPopulation.push(mutated1);
                this.seenExpressions.add(norm1);
            }
            if (newPopulation.length < this.populationSize && this.evaluateExpression(mutated2) !== null && !this.seenExpressions.has(norm2)) {
                newPopulation.push(mutated2);
                this.seenExpressions.add(norm2);
            }
        }
        this.population = newPopulation;
        this.evaluatePopulation();
        // Generate a new candidate for display (Last Generated)
        const parent1 = this.selectParent();
        const parent2 = this.selectParent();
        const [child1, child2] = this.crossover(parent1, parent2);
        const candidateExpr = this.mutate(child1);
        const candidateScore = this.evaluateExpression(candidateExpr);
        return {
            currentExpr: candidateExpr,
            currentScore: candidateScore,
            bestExpr: this.bestExpr,
            bestScore: this.bestScore
        };
    }
}

// SA Optimizer
class SAOptimizer extends BaseOptimizer {
    constructor(params) {
        super(params);
        this.temperature = params.startTemp || 10;
        this.coolingRate = 0.99;
    }
    
    step() {
        this.iteration++;
        let candidateExpr, candidateScore, norm;
        let attempts = 0;
        do {
            candidateExpr = this.mutateExpression(this.currentExpr);
            norm = this._normalizeExpr(candidateExpr);
            candidateScore = this.evaluateExpression(candidateExpr);
            attempts++;
        } while ((candidateScore === null || this.seenExpressions.has(norm)) && attempts < 10);
        if (candidateScore !== null && !this.seenExpressions.has(norm)) {
            this.seenExpressions.add(norm);
            // Handle null scores in comparison
            const effectiveCandidateScore = candidateScore !== null && candidateScore !== undefined ? candidateScore : -Infinity;
            const effectiveCurrentScore = this.currentScore !== null && this.currentScore !== undefined ? this.currentScore : -Infinity;
            const effectiveBestScore = this.bestScore !== null && this.bestScore !== undefined ? this.bestScore : -Infinity;
            
            const deltaE = effectiveCandidateScore - effectiveCurrentScore;
            if (deltaE > 0 || this.rnd.random() < Math.exp(deltaE / this.temperature)) {
                this.currentExpr = candidateExpr;
                this.currentScore = candidateScore; // Keep original value
                if (effectiveCandidateScore > effectiveBestScore) {
                    this.bestExpr = candidateExpr;
                    this.bestScore = candidateScore; // Keep original value
                }
            }
        }
        this.temperature *= this.coolingRate;
        return {
            currentExpr: candidateExpr,
            currentScore: candidateScore,
            bestExpr: this.bestExpr,
            bestScore: this.bestScore
        };
    }
    
    mutateExpression(expr) {
        if (this.params.mode === 'primefold') {
            const parts = expr.split(',').map(s => s.trim());
            if (parts.length >= 2) {
                const exprX = parts[0].replace('f(n) =', '').trim();
                const exprY = parts[1].replace('g(n) =', '').trim();
                
                if (this.params.enforceSymmetry) {
                    // In symmetry mode, only mutate one function and derive the other
                    const treeX = this.parseExpression(exprX);
                    const mutatedX = mutateTree(treeX, this.rnd).toStr();
                    
                    // Create symmetric pair from the mutated function
                    const symmetricPair = this.createSymmetricPairFromBase(mutatedX);
                    return `f(n) = ${symmetricPair.x}, g(n) = ${symmetricPair.y}`;
                } else {
                    // Normal mutation for both functions
                    const treeX = this.parseExpression(exprX);
                    const treeY = this.parseExpression(exprY);
                    
                    // NEW: Symmetric mutation (15% chance for PrimeFold mode)
                    if (this.rnd.random() < 0.15) {
                        const symmetricResult = this.performSymmetricMutation(treeX, treeY);
                        if (symmetricResult) {
                            return `f(n) = ${symmetricResult.x}, g(n) = ${symmetricResult.y}`;
                        }
                    }
                    
                    if (this.rnd.random() < 0.5) {
                        const mutatedX = mutateTree(treeX, this.rnd).toStr();
                        return `f(n) = ${mutatedX}, g(n) = ${exprY}`;
                    } else {
                        const mutatedY = mutateTree(treeY, this.rnd).toStr();
                        return `f(n) = ${exprX}, g(n) = ${mutatedY}`;
                    }
                }
            }
        } else {
            const exprF = expr.replace('f(n) =', '').trim();
            const tree = this.parseExpression(exprF);
            const mutated = mutateTree(tree, this.rnd).toStr();
            return `f(n) = ${mutated}`;
        }
        return expr;
    }
}

// Export for use in other modules
window.OptimizerController = OptimizerController;
window.LAHCOptimizer = LAHCOptimizer;
window.GAOptimizer = GAOptimizer;
window.SAOptimizer = SAOptimizer; 