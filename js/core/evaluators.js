// Evaluators for scoring functions
class Evaluators {
    constructor() {
        this.primes = [];
        this.composites = [];
        this.primesSet = new Set();
    }
    
    setData(primes, composites) {
        this.primes = primes;
        this.composites = composites;
        this.primesSet = new Set(primes);
    }
    
    // PrimeFold Mode Evaluators (2D Embedding) - Enhanced Fitness Function
    calculatePrimeFoldScore(exprX, exprY, sampleSize, fitnessConfig) {
        try {
            console.log('Evaluating PrimeFold:', exprX, exprY, 'Sample size:', sampleSize);
            console.log('Primes:', this.primes.length, 'Composites:', this.composites.length);
            
            // Parse expressions into trees
            const treeX = parseExpression(exprX);
            const treeY = parseExpression(exprY);
            
            // Evaluate for primes and composites (limited by sample size)
            const primeCoords = this.evaluateForPrimes(treeX, treeY, sampleSize);
            const compositeCoords = this.evaluateForComposites(treeX, treeY, sampleSize);
            
            console.log('Prime coords:', primeCoords.length, 'Composite coords:', compositeCoords.length);
            
            // Check minimum data requirements
            if (primeCoords.length < 10 || compositeCoords.length < 10) {
                return {
                    total: 0,
                    components: { areaCoverage: 0, separation: 0, contrast: 0, significance: 0, specificity: 0 }
                };
            }
            
            // Normalize coordinates to prevent scale bias
            const normalizedData = this.normalizeCoordinates(primeCoords, compositeCoords);
            const normalizedPrimes = normalizedData.primeCoords;
            const normalizedComposites = normalizedData.compositeCoords;
            
            // Use config or defaults
            const config = fitnessConfig || {
                areaCoverage: { enabled: true, weight: 0.50, threshold: 0.50 }, // ADJUSTED: Default values to 0.5
                separation: { enabled: true, weight: 0.25 },
                contrast: { enabled: true, weight: 0.20 },
                significance: { enabled: true, weight: 0.10 },
                specificity: { enabled: true, weight: 0.05 }
            };
            
            // Calculate area coverage score first (prerequisite metric)
            let areaCoverageScore = 0;
            if (config.areaCoverage && config.areaCoverage.enabled) {
                // Pass both original and normalized coordinates for proper analysis
                areaCoverageScore = this.calculateAreaCoverageScore(primeCoords, normalizedPrimes);
            }
            
            // Only calculate random baseline if needed
            let normalizedRandom = [];
            if ((config.significance && config.significance.enabled) || (config.specificity && config.specificity.enabled)) {
                const randomCoords = this.generateRandomBaseline(treeX, treeY, sampleSize);
                const normalizedRandomData = this.normalizeCoordinates(randomCoords, []);
                normalizedRandom = normalizedRandomData.primeCoords;
            }
            
            // Calculate component scores only if enabled
            let separationScore, contrastScore, significanceScore, specificityScore;
            if (config.separation && config.separation.enabled) separationScore = this.calculateSeparationScore(normalizedPrimes, normalizedComposites, sampleSize);
            if (config.contrast && config.contrast.enabled) contrastScore = this.calculateStructuralContrastScore(normalizedPrimes, normalizedComposites);
            if (config.significance && config.significance.enabled) significanceScore = this.calculateStatisticalSignificance(normalizedPrimes, normalizedComposites, normalizedRandom);
            if (config.specificity && config.specificity.enabled) specificityScore = this.calculatePatternSpecificity(normalizedPrimes, normalizedComposites, normalizedRandom);
            
            console.log('Component scores:', { 
                areaCoverage: areaCoverageScore,
                separation: separationScore ?? 0, 
                contrast: contrastScore ?? 0, 
                significance: significanceScore ?? 0, 
                specificity: specificityScore ?? 0
            });
            
            // NEW: Two-stage fitness calculation
            // Stage 1: Area coverage gate only applies if area coverage is enabled
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
            
            // Stage 2: Calculate full fitness only if area coverage is sufficient
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
                    separation: separationScore ?? 0,
                    contrast: contrastScore ?? 0,
                    significance: significanceScore ?? 0,
                    specificity: specificityScore ?? 0
                }
            };
        } catch (error) {
            console.error('Error calculating PrimeFold score:', error);
            return {
                total: 0,
                components: { areaCoverage: 0, separation: 0, contrast: 0, significance: 0, specificity: 0 }
            };
        }
    }
    
    // PrimeGen Mode Evaluators (1D Generation)
    calculatePrimeGenScore(expr, sampleSize) {
        try {
            // Parse expression into tree
            const tree = parseExpression(expr);
            
            // Generate sequence
            const sequence = [];
            for (let i = 1; i <= sampleSize; i++) {
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
            
            // Calculate metrics
            const uniqueNumbers = new Set(sequence).size;
            const uniquePrimes = this.countUniquePrimes(sequence);
            const hitRatio = uniquePrimes / sampleSize; // This is p/r where p=uniquePrimes, r=sampleSize
            const complexity = this.calculateComplexity(expr);
            
            // Simplified fitness: p/r (number of unique primes divided by count of numbers in range)
            const total = hitRatio;
            
            return {
                total: Math.max(0, total), // Ensure non-negative
                components: {
                    uniqueNumbers,
                    uniquePrimes,
                    hitRatio,
                    complexity
                }
            };
        } catch (error) {
            console.error('Error calculating PrimeGen score:', error);
            return {
                total: 0,
                components: { uniqueNumbers: 0, uniquePrimes: 0, hitRatio: 0, complexity: 999 }
            };
        }
    }
    
    // Helper methods for PrimeFold
    evaluateForPrimes(treeX, treeY, sampleSize) {
        const coords = [];
        for (const prime of this.primes) {
            try {
                const x = treeX.evaluate(prime);
                const y = treeY.evaluate(prime);
                if (isFinite(x) && isFinite(y)) {
                    coords.push([x, y]);
                }
            } catch (error) {
                // Skip invalid evaluations
            }
            if (coords.length >= sampleSize) break;
        }
        return coords;
    }
    
    evaluateForComposites(treeX, treeY, sampleSize) {
        const coords = [];
        for (const composite of this.composites) {
            try {
                const x = treeX.evaluate(composite);
                const y = treeY.evaluate(composite);
                if (isFinite(x) && isFinite(y)) {
                    coords.push([x, y]);
                }
            } catch (error) {
                // Skip invalid evaluations
            }
            if (coords.length >= sampleSize) break;
        }
        return coords;
    }
    
    calculateHullArea(coords) {
        if (coords.length < 3) return 0;
        
        try {
            // Simple convex hull using Graham scan
            const hull = this.grahamScan(coords);
            if (hull.length < 3) return 0;
            
            // Calculate area using shoelace formula
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
        
        // Calculate standard deviation of distances from centroid
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
        
        // Calculate standard deviations for x and y coordinates
        const xs = coords.map(c => c[0]);
        const ys = coords.map(c => c[1]);
        
        const stdX = this.calculateStandardDeviation(xs);
        const stdY = this.calculateStandardDeviation(ys);
        
        // Balance is higher when stds are similar
        const ratio = Math.min(stdX, stdY) / Math.max(stdX, stdY);
        return ratio;
    }
    
    // Helper methods for PrimeGen
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
    
    isPrime(n) {
        // Use the global prime cache for efficient prime checking
        return window.primeCache.isPrime(n);
    }
    
    // Utility methods
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
            { op: '%', regex: '%' },
            { op: '^', regex: '\\^' }
        ];
        
        for (const { op, regex } of operations) {
            const matches = (expr.match(new RegExp(regex, 'g')) || []).length;
            complexity += matches;
        }
        
        // Penalize long expressions
        complexity += expr.length * 0.01;
        
        return complexity;
    }
    
    calculateCentroid(coords) {
        const sumX = coords.reduce((sum, coord) => sum + coord[0], 0);
        const sumY = coords.reduce((sum, coord) => sum + coord[1], 0);
        return [sumX / coords.length, sumY / coords.length];
    }
    
    calculateStandardDeviation(values) {
        const mean = values.reduce((a, b) => a + b, 0) / values.length;
        const variance = values.reduce((a, b) => a + (b - mean)**2, 0) / values.length;
        return Math.sqrt(variance);
    }
    
    // Graham scan for convex hull
    grahamScan(points) {
        if (points.length < 3) return points;
        
        // Find the lowest point (and leftmost if tied)
        let lowest = 0;
        for (let i = 1; i < points.length; i++) {
            if (points[i][1] < points[lowest][1] || 
                (points[i][1] === points[lowest][1] && points[i][0] < points[lowest][0])) {
                lowest = i;
            }
        }
        
        // Sort points by polar angle with respect to lowest point
        const p0 = points[lowest];
        const sorted = points
            .filter((_, i) => i !== lowest)
            .sort((a, b) => {
                const angleA = Math.atan2(a[1] - p0[1], a[0] - p0[0]);
                const angleB = Math.atan2(b[1] - p0[1], b[0] - p0[0]);
                return angleA - angleB;
            });
        
        // Build hull
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
        
        // Normalize to [-1, 1] range (original approach)
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
        if (this.primes.length === 0) {
            return [];
        }
        
        const maxPrime = Math.max(...this.primes);
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
    
    calculateSeparationScore(primeCoords, compositeCoords, sampleSize) {
        // Measure average distance from prime points to nearest composite points
        let totalDistance = 0;
        let validCount = 0;
        
        // Use sampleSize to limit the number of composite points to check for performance
        const maxCompositeChecks = Math.min(compositeCoords.length, sampleSize);
        const compositeSample = compositeCoords.length > maxCompositeChecks ? 
            compositeCoords.slice(0, maxCompositeChecks) : compositeCoords;
        
        for (const primePoint of primeCoords) {
            let minSquaredDistance = Infinity;
            
            for (const compositePoint of compositeSample) {
                // Use squared distance to avoid expensive sqrt
                const squaredDistance = 
                    Math.pow(primePoint[0] - compositePoint[0], 2) +
                    Math.pow(primePoint[1] - compositePoint[1], 2);
                minSquaredDistance = Math.min(minSquaredDistance, squaredDistance);
            }
            
            if (minSquaredDistance < Infinity) {
                totalDistance += Math.sqrt(minSquaredDistance);
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
    
    calculateLocalDensityVariance(coords, radius = 0.1, sampleSize = 200) {
        if (coords.length < 5) return 0;
        
        const localDensities = [];
        const radiusSquared = radius * radius;
        
        // Use sampleSize to limit the number of points to check for performance
        const maxChecks = Math.min(coords.length, sampleSize);
        const coordSample = coords.length > maxChecks ? coords.slice(0, maxChecks) : coords;
        
        for (const point of coordSample) {
            let count = 0;
            
            for (const otherPoint of coords) {
                // Use squared distance to avoid expensive sqrt
                const squaredDistance = 
                    Math.pow(point[0] - otherPoint[0], 2) +
                    Math.pow(point[1] - otherPoint[1], 2);
                if (squaredDistance <= radiusSquared && squaredDistance > 0) {
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
    
    calculateJensenShannonDivergence(coords1, coords2, gridSize = 25) {
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
    
    calculateClusteringQuality(coords, sampleSize = 150) {
        if (coords.length < 10) return 0;
        
        // Simple clustering quality measure using nearest neighbor distances
        const nearestNeighborDistances = [];
        
        // Use sampleSize to limit the number of points to check for performance
        const maxChecks = Math.min(coords.length, sampleSize);
        const coordSample = coords.length > maxChecks ? coords.slice(0, maxChecks) : coords;
        
        for (let i = 0; i < coordSample.length; i++) {
            let minSquaredDistance = Infinity;
            
            for (let j = 0; j < coords.length; j++) {
                if (i !== j) {
                    // Use squared distance to avoid expensive sqrt
                    const squaredDistance = 
                        Math.pow(coordSample[i][0] - coords[j][0], 2) +
                        Math.pow(coordSample[i][1] - coords[j][1], 2);
                    minSquaredDistance = Math.min(minSquaredDistance, squaredDistance);
                }
            }
            
            if (minSquaredDistance < Infinity) {
                nearestNeighborDistances.push(Math.sqrt(minSquaredDistance));
            }
        }
        
        if (nearestNeighborDistances.length === 0) return 0;
        
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
    
    calculateHoughLineStrength(coords, imageSize = 32, peaks = 5) {
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
        const angles = 90; // Reduced from 180 for performance
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
        // Parameters: steepness = 3, threshold = 0.1 (less aggressive, more balanced)
        return 1 / (1 + Math.exp(-3 * (isotropy - 0.1)));
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
    

}

// Live scorer for real-time evaluation
class LiveScorer {
    constructor() {
        this.evaluators = new Evaluators();
    }
    
    setData(primes, composites) {
        this.evaluators.setData(primes, composites);
    }
    
    calculateScore(expr, mode, fitnessConfig) {
        if (mode === 'primefold') {
            // Parse expression to get f(n) and g(n)
            const parts = expr.split(',').map(s => s.trim());
            if (parts.length >= 2) {
                const exprX = parts[0].replace('f(n) =', '').trim();
                const exprY = parts[1].replace('g(n) =', '').trim();
                // Use sample size from parameters for consistency
                const sampleSize = window.app ? parseInt(document.getElementById('sampleSize').value) : 200;
                return this.evaluators.calculatePrimeFoldScore(exprX, exprY, sampleSize, fitnessConfig);
            } else {
                // Fallback to identity functions
                const sampleSize = window.app ? parseInt(document.getElementById('sampleSize').value) : 200;
                return this.evaluators.calculatePrimeFoldScore('n', 'n', sampleSize, fitnessConfig);
            }
        } else {
            // Parse expression to get f(n)
            const exprF = expr.replace('f(n) =', '').trim();
            // Use sample size from parameters for consistency
            const sampleSize = window.app ? parseInt(document.getElementById('sampleSize').value) : 200;
            return this.evaluators.calculatePrimeGenScore(exprF, sampleSize);
        }
    }
}

// Stats display for UI updates
class StatsDisplay {
    constructor() {
        this.primefoldStats = null;
        this.primegenStats = null;
        // Don't initialize immediately - wait for DOM to be ready
    }
    
    initialize() {
        if (document.readyState === 'loading') {
            // DOM not ready yet, wait for it
            document.addEventListener('DOMContentLoaded', () => {
                this.primefoldStats = document.getElementById('primefold-stats');
                this.primegenStats = document.getElementById('primegen-stats');
            });
        } else {
            // DOM is ready
            this.primefoldStats = document.getElementById('primefold-stats');
            this.primegenStats = document.getElementById('primegen-stats');
        }
    }
    
    updateStats(mode, total, components) {
        try {
            if (mode === 'primefold') {
                this.updatePrimeFoldStats(components);
            } else {
                this.updatePrimeGenStats(components);
            }
            console.log(`Updated ${mode} stats:`, components);
        } catch (error) {
            console.error('Error updating stats:', error);
        }
    }
    
    updatePrimeFoldStats(components) {
        try {
            if (!this.primefoldStats) {
                this.initialize();
            }
            if (!this.primefoldStats) {
                console.warn('PrimeFold stats element not found');
                return;
            }
            const statItems = this.primefoldStats.querySelectorAll('.stat-value');
            if (statItems.length >= 5) {
                statItems[0].textContent = components.areaCoverage.toFixed(3);
                statItems[1].textContent = components.separation.toFixed(3);
                statItems[2].textContent = components.contrast.toFixed(3);
                statItems[3].textContent = components.significance.toFixed(3);
                statItems[4].textContent = components.specificity.toFixed(3);
            }
        } catch (error) {
            console.error('Error updating PrimeFold stats:', error);
        }
    }
    
    updatePrimeGenStats(components) {
        try {
            if (!this.primegenStats) {
                this.initialize();
            }
            if (!this.primegenStats) {
                console.warn('PrimeGen stats element not found');
                return;
            }
            const statItems = this.primegenStats.querySelectorAll('.stat-value');
            if (statItems.length >= 3) {
                statItems[0].textContent = components.uniqueNumbers;
                statItems[1].textContent = components.uniquePrimes;
                statItems[2].textContent = components.hitRatio.toFixed(3);
            }
        } catch (error) {
            console.error('Error updating PrimeGen stats:', error);
        }
    }
    
    reset() {
        // Reset all stats to default values
        const allStatValues = document.querySelectorAll('.stat-value');
        allStatValues.forEach((stat, index) => {
            if (index < 5) { // Updated to handle 5 metrics (areaCoverage + 4 others)
                stat.textContent = '0.000';
            } else {
                stat.textContent = '0';
            }
        });
    }
}

// Export for use in other modules
window.Evaluators = Evaluators;
window.LiveScorer = LiveScorer;
window.StatsDisplay = StatsDisplay; 