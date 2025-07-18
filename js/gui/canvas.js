// Canvas-based Visualization System
class Visualization {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.zoom = 1.0;
        this.panX = 0;
        this.panY = 0;
        this.isDragging = false;
        this.lastX = 0;
        this.lastY = 0;
        
        // Store current visualization data for redrawing
        this.currentMode = null;
        this.currentData = null;
        this.currentExpression = null;
        
        this.setupEventListeners();
        this.resizeCanvas();
    }
    
    setupEventListeners() {
        // Mouse events for panning and zooming (only for PrimeFold mode)
        this.canvas.addEventListener('mousedown', (e) => {
            // Only allow mouse events in PrimeFold mode
            if (window.app && window.app.currentMode === 'primefold') {
                this.isDragging = true;
                this.lastX = e.clientX;
                this.lastY = e.clientY;
            }
        });
        
        this.canvas.addEventListener('mousemove', (e) => {
            if (this.isDragging && window.app && window.app.currentMode === 'primefold') {
                const deltaX = e.clientX - this.lastX;
                const deltaY = e.clientY - this.lastY;
                this.panX += deltaX;
                this.panY += deltaY;
                this.lastX = e.clientX;
                this.lastY = e.clientY;
                this.redraw();
            }
        });
        
        this.canvas.addEventListener('mouseup', () => {
            this.isDragging = false;
        });
        
        this.canvas.addEventListener('wheel', (e) => {
            // Only allow wheel events in PrimeFold mode
            if (window.app && window.app.currentMode === 'primefold') {
                e.preventDefault();
                const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
                this.zoom *= zoomFactor;
                this.zoom = Math.max(0.1, Math.min(10, this.zoom));
                this.redraw();
            }
        });
        
        // Window resize
        window.addEventListener('resize', () => {
            this.resizeCanvas();
            this.redraw();
        });
    }
    
    resizeCanvas() {
        const container = this.canvas.parentElement;
        this.canvas.width = container.clientWidth - 40;
        this.canvas.height = container.clientHeight - 40;
    }
    
    resize() {
        this.resizeCanvas();
        this.redraw();
    }
    
    clear() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
    
    // PrimeFold Mode Visualizations
    
    updatePrimeFold(expr, options = {}) {
        try {
            // Store current mode and expression for redrawing
            this.currentMode = 'primefold';
            this.currentExpression = expr;
            this.currentOptions = options;
            
            // Parse expression to get f_x(n) and f_y(n)
            const parts = expr.split(',').map(s => s.trim());
            if (parts.length < 2) {
                console.error('Invalid PrimeFold expression format:', expr);
                return;
            }
            
            // Handle both old format (f(n) =, g(n) =) and new format (f_x(n) =, f_y(n) =)
            let exprX, exprY;
            if (parts[0].includes('f_x(n) =')) {
                exprX = parts[0].replace('f_x(n) =', '').trim();
                exprY = parts[1].replace('f_y(n) =', '').trim();
            } else if (parts[0].includes('f(n) =')) {
                exprX = parts[0].replace('f(n) =', '').trim();
                exprY = parts[1].replace('g(n) =', '').trim();
            } else {
                // Assume direct expressions
                exprX = parts[0];
                exprY = parts[1];
            }
            
            console.log('Parsed PrimeFold expressions:', { exprX, exprY });
            
            // Parse expressions into trees
            const treeX = parseExpression(exprX);
            const treeY = parseExpression(exprY);
            
            // Get display points limit
            const displayPoints = parseInt(document.getElementById('displayPoints').value);
            console.log('Display Points requested:', displayPoints);
            
            // Evaluate coordinates for n from 1 to displayPoints
            const allCoords = [];
            const primeCoords = [];
            const compositeCoords = [];
            
            // Get prime data for classification
            // const app = window.app;
            // const primesSet = app ? new Set(app.primes) : new Set();
            
            // Evaluate for all n from 1 to displayPoints
            for (let n = 1; n <= displayPoints; n++) {
                try {
                    const x = treeX.evaluate(n);
                    const y = treeY.evaluate(n);
                    
                    if (isFinite(x) && isFinite(y)) {
                        const coord = [x, y];
                        allCoords.push(coord);
                        
                        // Classify as prime or composite using primeCache
                        if (window.primeCache.isPrime(n)) {
                            primeCoords.push(coord);
                        } else {
                            compositeCoords.push(coord);
                        }
                    }
                } catch (error) {
                    console.warn(`Error evaluating at n=${n}:`, error);
                }
            }
            
            console.log(`Generated ${allCoords.length} coordinates (${primeCoords.length} primes, ${compositeCoords.length} composites) out of ${displayPoints} requested`);
            if (allCoords.length < displayPoints) {
                console.log('Warning: Not all requested points were generated. This might be due to invalid function evaluations.');
            }
            
            // Store data for redrawing
            this.currentData = { primeCoords, compositeCoords, allCoords };
            
            // Draw visualization
            this.drawPrimeFoldVisualization(primeCoords, compositeCoords, expr, options);
            
        } catch (error) {
            console.error('Error updating PrimeFold visualization:', error);
        }
    }
    
    drawPrimeFoldVisualization(primeCoords, compositeCoords, expr, options = {}) {
        this.clear();
        this.drawGrid();
        this.drawAxes();
        
        // Calculate bounds
        const allCoords = [...primeCoords, ...compositeCoords];
        if (allCoords.length === 0) {
            this.drawTitle("No valid coordinates to display");
            return;
        }
        
        const bounds = this.calculateBounds(allCoords);
        this.setupTransform(bounds);
        
        // Draw composites first (red) - smaller points (only if showNonPrimes is true)
        if (options.showNonPrimes !== false) {
            console.log(`Drawing ${compositeCoords.length} composite points`);
            this.ctx.fillStyle = 'rgba(255, 0, 0, 0.6)';
            this.ctx.strokeStyle = 'rgba(255, 0, 0, 0.8)';
            for (const coord of compositeCoords) {
                if (options.scalePoints) {
                    // Use scaled points (original behavior)
                    this.drawPoint(coord[0], coord[1], 1.5);
                } else {
                    // Use fixed size points
                    const pixelRadius = options.pointSize || 2;
                    this.drawFixedSizePoint(coord[0], coord[1], pixelRadius);
                }
            }
        }
        
        // Draw primes on top (blue) - slightly larger but still small
        console.log(`Drawing ${primeCoords.length} prime points`);
        this.ctx.fillStyle = 'rgba(0, 0, 255, 0.8)';
        this.ctx.strokeStyle = 'rgba(0, 0, 255, 1.0)';
        for (const coord of primeCoords) {
            if (options.scalePoints) {
                // Use scaled points (original behavior)
                this.drawPoint(coord[0], coord[1], 2);
            } else {
                // Use fixed size points
                const pixelRadius = options.pointSize || 2;
                this.drawFixedSizePoint(coord[0], coord[1], pixelRadius);
            }
        }
        
        // Draw legend
        this.drawLegend();
        
        // Draw title
        this.drawTitle(`PrimeFold: ${expr} (${primeCoords.length} primes, ${compositeCoords.length} composites)`);
        
        // Restore transform state
        this.ctx.restore();
    }
    
    // PrimeGen Mode Visualizations
    
    updatePrimeGen(expr) {
        try {
            // Store current mode and expression for redrawing
            this.currentMode = 'primegen';
            this.currentExpression = expr;
            
            // Parse expression to get f(n)
            const exprF = expr.replace('f(n) =', '').trim();
            
            // Parse expression into tree
            const tree = parseExpression(exprF);
            
            // Get display points from app
            const app = window.app;
            const displayPoints = app ? parseInt(document.getElementById('displayPoints').value) : 100;
            
            // Generate sequence (limited by display points)
            const sequence = [];
            const values = []; // Store actual values for debugging
            
            for (let i = 1; i <= displayPoints; i++) {
                try {
                    const value = tree.evaluate(i);
                    if (isFinite(value)) {
                        const roundedValue = Math.round(value);
                        sequence.push(roundedValue);
                        values.push({ n: i, original: value, rounded: roundedValue });
                    } else {
                        sequence.push(0);
                        values.push({ n: i, original: value, rounded: 0 });
                    }
                } catch (error) {
                    sequence.push(0);
                    values.push({ n: i, original: 'error', rounded: 0 });
                }
            }
            
            // Log some debug information for the first few values
            if (values.length > 0) {
                console.log('PrimeGen sequence preview:', values.slice(0, 10));
            }
            
            // Store data for redrawing (with validation)
            if (sequence && values) {
                this.currentData = { sequence, values };
            } else {
                console.warn('Invalid sequence data generated');
                this.currentData = null;
            }
            
            // Draw hit map
            this.drawPrimeGenHitMap(sequence, expr, values);
            
        } catch (error) {
            console.error('Error updating PrimeGen visualization:', error);
        }
    }
    
    drawPrimeGenHitMap(sequence, expr, values) {
        this.clear();
        
        // Calculate grid dimensions
        const gridSize = Math.ceil(Math.sqrt(sequence.length));
        const cellWidth = this.canvas.width / gridSize;
        const cellHeight = this.canvas.height / gridSize;
        
        // Count how many times each generated value appears in the sequence
        const valueCounts = {};
        for (const n of sequence) {
            const num = Math.abs(n);
            valueCounts[num] = (valueCounts[num] || 0) + 1;
        }
        
        // Count primes and unique primes
        let primeCount = 0;
        let uniquePrimeCount = 0;
        const uniquePrimes = new Set();
        
        for (let i = 0; i < sequence.length; i++) {
            const generatedValue = Math.abs(sequence[i]);
            const isPrime = window.primeCache.isPrime(generatedValue);
            
            if (isPrime) {
                primeCount++;
                uniquePrimes.add(generatedValue);
                if (valueCounts[generatedValue] === 1) {
                    uniquePrimeCount++;
                }
            }
        }
        
        // Draw grid
        for (let i = 0; i < sequence.length; i++) {
            const row = Math.floor(i / gridSize);
            const col = i % gridSize;
            
            const x = col * cellWidth;
            const y = row * cellHeight;
            
            // Check if the generated value at position i is prime
            const generatedValue = Math.abs(sequence[i]);
            // Always use the global prime cache for accurate results
            const isPrime = window.primeCache.isPrime(generatedValue);
            const isUniquePrime = isPrime && valueCounts[generatedValue] === 1;
            
            // Color based on prime status
            if (isUniquePrime) {
                this.ctx.fillStyle = '#0000ff'; // Blue for unique primes
            } else if (isPrime) {
                this.ctx.fillStyle = '#00ff00'; // Green for non-unique primes
            } else {
                this.ctx.fillStyle = '#ff0000'; // Red for non-primes
            }
            
            this.ctx.fillRect(x, y, cellWidth, cellHeight);
            
            // Draw border
            this.ctx.strokeStyle = '#333';
            this.ctx.lineWidth = 1;
            this.ctx.strokeRect(x, y, cellWidth, cellHeight);
        }
        
        // Draw legend
        this.drawHitMapLegend();
        
        // Draw title with detailed statistics
        const hitRatio = (uniquePrimeCount / sequence.length * 100).toFixed(1);
        this.drawPrimeGenStats(expr, uniquePrimeCount, primeCount, hitRatio);
    }
    
    // Utility methods
    calculateBounds(coords) {
        if (coords.length === 0) return { minX: -1, maxX: 1, minY: -1, maxY: 1 };
        
        let minX = coords[0][0], maxX = coords[0][0];
        let minY = coords[0][1], maxY = coords[0][1];
        
        for (const coord of coords) {
            minX = Math.min(minX, coord[0]);
            maxX = Math.max(maxX, coord[0]);
            minY = Math.min(minY, coord[1]);
            maxY = Math.max(maxY, coord[1]);
        }
        
        // Add padding to ensure all points are visible
        const padding = 0.05; // 5% padding
        const rangeX = maxX - minX;
        const rangeY = maxY - minY;
        
        // Handle cases where range is very small or zero
        const minRange = Math.max(rangeX, rangeY, 1.0) * 0.01;
        const effectiveRangeX = Math.max(rangeX, minRange);
        const effectiveRangeY = Math.max(rangeY, minRange);
        
        const bounds = {
            minX: minX - effectiveRangeX * padding,
            maxX: maxX + effectiveRangeX * padding,
            minY: minY - effectiveRangeY * padding,
            maxY: maxY + effectiveRangeY * padding
        };
        
        console.log('Calculated bounds:', bounds, 'from', coords.length, 'coordinates');
        return bounds;
    }
    
    setupTransform(bounds) {
        // Add padding to ensure points aren't drawn at the very edge
        const padding = 40;
        const availableWidth = this.canvas.width - padding * 2;
        const availableHeight = this.canvas.height - padding * 2;
        
        // Calculate the scale to fit all points while preserving aspect ratio
        const scaleX = availableWidth / (bounds.maxX - bounds.minX);
        const scaleY = availableHeight / (bounds.maxY - bounds.minY);
        
        // Use the smaller scale to ensure all points fit and maintain aspect ratio
        const scale = Math.min(scaleX, scaleY) * this.zoom;
        
        // Calculate the center of the data
        const centerX = (bounds.minX + bounds.maxX) / 2;
        const centerY = (bounds.minY + bounds.maxY) / 2;
        
        // Calculate the center of the canvas
        const canvasCenterX = this.canvas.width / 2;
        const canvasCenterY = this.canvas.height / 2;
        
        this.ctx.save();
        
        // Apply transformations in the correct order
        this.ctx.translate(canvasCenterX + this.panX, canvasCenterY + this.panY);
        this.ctx.scale(scale, scale);
        this.ctx.translate(-centerX, -centerY);
        
        // Store transformation info for coordinate display
        this.currentTransform = {
            scale,
            centerX,
            centerY,
            bounds,
            canvasCenterX,
            canvasCenterY
        };
    }
    
    drawPoint(x, y, radius) {
        this.ctx.beginPath();
        this.ctx.arc(x, y, radius, 0, 2 * Math.PI);
        this.ctx.fill();
        this.ctx.stroke();
    }
    
    drawFixedSizePoint(x, y, pixelRadius) {
        // Save current context state
        this.ctx.save();
        
        // Reset to screen coordinates (identity transform)
        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
        
        // Convert world coordinates to screen coordinates
        if (this.currentTransform) {
            const screenX = (x - this.currentTransform.centerX) * this.currentTransform.scale + this.currentTransform.canvasCenterX + this.panX;
            const screenY = (y - this.currentTransform.centerY) * this.currentTransform.scale + this.currentTransform.canvasCenterY + this.panY;
            
            // Draw point with fixed pixel size
            this.ctx.beginPath();
            this.ctx.arc(screenX, screenY, pixelRadius, 0, 2 * Math.PI);
            this.ctx.fill();
            this.ctx.stroke();
        }
        
        // Restore context state
        this.ctx.restore();
    }
    
    drawConvexHull(coords) {
        if (coords.length < 3) return;
        
        // Simple convex hull using Graham scan
        const hull = this.grahamScan(coords);
        if (hull.length < 3) return;
        
        this.ctx.strokeStyle = 'rgba(0, 255, 0, 0.8)';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.moveTo(hull[0][0], hull[0][1]);
        for (let i = 1; i < hull.length; i++) {
            this.ctx.lineTo(hull[i][0], hull[i][1]);
        }
        this.ctx.closePath();
        this.ctx.stroke();
    }
    
    grahamScan(points) {
        if (points.length < 3) return points;
        
        // Find the lowest point
        let lowest = 0;
        for (let i = 1; i < points.length; i++) {
            if (points[i][1] < points[lowest][1] || 
                (points[i][1] === points[lowest][1] && points[i][0] < points[lowest][0])) {
                lowest = i;
            }
        }
        
        // Sort by polar angle
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
    
    drawGrid() {
        if (!this.currentTransform) return;
        
        const { bounds, scale } = this.currentTransform;
        
        // Calculate grid spacing based on the scale and data range
        const rangeX = bounds.maxX - bounds.minX;
        const rangeY = bounds.maxY - bounds.minY;
        
        // Choose grid spacing that gives reasonable number of lines
        const targetGridLines = 10;
        const gridSpacingX = this.calculateGridSpacing(rangeX, targetGridLines);
        const gridSpacingY = this.calculateGridSpacing(rangeY, targetGridLines);
        
        // Draw vertical grid lines
        this.ctx.strokeStyle = 'rgba(45, 45, 63, 0.3)';
        this.ctx.lineWidth = 1;
        
        const startX = Math.floor(bounds.minX / gridSpacingX) * gridSpacingX;
        const endX = Math.ceil(bounds.maxX / gridSpacingX) * gridSpacingX;
        
        for (let x = startX; x <= endX; x += gridSpacingX) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, bounds.minY);
            this.ctx.lineTo(x, bounds.maxY);
            this.ctx.stroke();
        }
        
        // Draw horizontal grid lines
        const startY = Math.floor(bounds.minY / gridSpacingY) * gridSpacingY;
        const endY = Math.ceil(bounds.maxY / gridSpacingY) * gridSpacingY;
        
        for (let y = startY; y <= endY; y += gridSpacingY) {
            this.ctx.beginPath();
            this.ctx.moveTo(bounds.minX, y);
            this.ctx.lineTo(bounds.maxX, y);
            this.ctx.stroke();
        }
        
        // Draw sticky coordinate labels
        this.drawStickyCoordinateLabels(bounds);
    }
    
    drawStickyCoordinateLabels(bounds) {
        // Save current context state
        this.ctx.save();
        
        // Reset to screen coordinates (identity transform)
        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
        
        // Calculate current view bounds based on zoom and pan
        const padding = 40;
        const availableWidth = this.canvas.width - padding * 2;
        const availableHeight = this.canvas.height - padding * 2;
        
        // Calculate the current visible area in world coordinates
        const scaleX = availableWidth / (bounds.maxX - bounds.minX);
        const scaleY = availableHeight / (bounds.maxY - bounds.minY);
        const scale = Math.min(scaleX, scaleY) * this.zoom;
        
        const centerX = (bounds.minX + bounds.maxX) / 2;
        const centerY = (bounds.minY + bounds.maxY) / 2;
        
        // Calculate current view bounds
        const viewRangeX = availableWidth / scale;
        const viewRangeY = availableHeight / scale;
        
        const currentMinX = centerX - viewRangeX / 2 - this.panX / scale;
        const currentMaxX = centerX + viewRangeX / 2 - this.panX / scale;
        const currentMinY = centerY - viewRangeY / 2 + this.panY / scale;
        const currentMaxY = centerY + viewRangeY / 2 + this.panY / scale;
        
        console.log('Current view bounds:', { currentMinX, currentMaxX, currentMinY, currentMaxY });
        
        // Draw 9 horizontal labels (bottom edge)
        for (let i = 0; i <= 8; i++) {
            const screenX = padding + (availableWidth * i) / 8;
            const worldX = currentMinX + (currentMaxX - currentMinX) * i / 8;
            
            this.ctx.fillStyle = 'rgba(224, 224, 224, 0.8)';
            this.ctx.font = '11px Arial';
            this.ctx.textAlign = 'center';
            const labelText = worldX >= 0 ? `+${worldX.toFixed(1)}` : worldX.toFixed(1);
            this.ctx.fillText(labelText, screenX, this.canvas.height - 10);
        }
        
        // Draw 9 vertical labels (left edge)
        for (let i = 0; i <= 8; i++) {
            const screenY = padding + (availableHeight * i) / 8;
            const worldY = currentMaxY - (currentMaxY - currentMinY) * i / 8; // Invert Y axis
            
            this.ctx.fillStyle = 'rgba(224, 224, 224, 0.8)';
            this.ctx.font = '11px Arial';
            this.ctx.textAlign = 'right';
            const labelText = worldY >= 0 ? `+${worldY.toFixed(1)}` : worldY.toFixed(1);
            this.ctx.fillText(labelText, padding + 30, screenY + 4);
        }
        
        // Restore context state
        this.ctx.restore();
    }
    
    calculateGridSpacing(range, targetLines) {
        const baseSpacing = range / targetLines;
        const magnitude = Math.pow(10, Math.floor(Math.log10(baseSpacing)));
        const normalized = baseSpacing / magnitude;
        
        if (normalized < 2) return magnitude;
        if (normalized < 5) return 2 * magnitude;
        return 5 * magnitude;
    }
    
    drawCoordinateLabel(x, y, text, position) {
        // Save current context state
        this.ctx.save();
        
        // Reset to screen coordinates (identity transform)
        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
        
        // Convert world coordinates to screen coordinates
        if (this.currentTransform) {
            const screenX = (x - this.currentTransform.centerX) * this.currentTransform.scale + this.currentTransform.canvasCenterX + this.panX;
            const screenY = (y - this.currentTransform.centerY) * this.currentTransform.scale + this.currentTransform.canvasCenterY + this.panY;
            
            this.ctx.fillStyle = 'rgba(224, 224, 224, 0.7)';
            this.ctx.font = '10px Arial';
            this.ctx.textAlign = 'center';
            
            let labelX = screenX;
            let labelY = screenY;
            
            switch (position) {
                case 'bottom':
                    labelY += 15;
                    break;
                case 'left':
                    labelX -= 5;
                    this.ctx.textAlign = 'right';
                    break;
            }
            
            this.ctx.fillText(text, labelX, labelY);
        }
        
        // Restore context state
        this.ctx.restore();
    }
    
    drawAxes() {
        if (!this.currentTransform) return;
        
        const { bounds } = this.currentTransform;
        
        this.ctx.strokeStyle = '#4a4a5a';
        this.ctx.lineWidth = 2;
        
        // X-axis (y = 0)
        if (bounds.minY <= 0 && bounds.maxY >= 0) {
            this.ctx.beginPath();
            this.ctx.moveTo(bounds.minX, 0);
            this.ctx.lineTo(bounds.maxX, 0);
            this.ctx.stroke();
        }
        
        // Y-axis (x = 0)
        if (bounds.minX <= 0 && bounds.maxX >= 0) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, bounds.minY);
            this.ctx.lineTo(0, bounds.maxY);
            this.ctx.stroke();
        }
    }
    
    drawTitle(title) {
        this.ctx.save();
        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
        this.ctx.fillStyle = '#e0e0e0';
        this.ctx.font = '16px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(title, this.canvas.width / 2, 30);
        this.ctx.restore();
    }
    
    drawPrimeGenStats(expr, uniquePrimes, totalPrimes, hitRatio) {
        this.ctx.save();
        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
        // Create semi-transparent background for stats
        const padding = 10;
        const lineHeight = 20;
        const statsHeight = lineHeight * 2 + padding * 2;
        const statsWidth = Math.max(400, this.ctx.measureText(expr).width + 40);
        this.ctx.fillStyle = 'rgba(42, 42, 58, 0.9)';
        this.ctx.fillRect(10, 10, statsWidth, statsHeight);
        // Draw border
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(10, 10, statsWidth, statsHeight);
        // Draw function on first line
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = '14px Arial';
        this.ctx.textAlign = 'left';
        this.ctx.fillText(expr, 20, 30);
        // Draw stats on second line
        const statsText = `${uniquePrimes} unique primes, ${totalPrimes} total primes, ${hitRatio}% hit ratio`;
        this.ctx.fillStyle = '#e0e0e0';
        this.ctx.font = '12px Arial';
        this.ctx.fillText(statsText, 20, 50);
        this.ctx.restore();
    }
    
    drawLegend() {
        this.ctx.save();
        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
        // Create semi-transparent background for legend
        this.ctx.fillStyle = 'rgba(42, 42, 58, 0.8)';
        this.ctx.fillRect(10, this.canvas.height - 80, 200, 70);
        // PrimeFold legend
        this.ctx.font = '14px Arial';
        this.ctx.textAlign = 'left';
        // Primes
        this.ctx.fillStyle = 'rgba(0, 0, 255, 0.8)';
        this.ctx.fillRect(20, this.canvas.height - 70, 20, 20);
        this.ctx.fillStyle = '#e0e0e0';
        this.ctx.fillText('Primes', 50, this.canvas.height - 55);
        // Composites (only if showNonPrimes is true)
        if (this.currentOptions && this.currentOptions.showNonPrimes !== false) {
            this.ctx.fillStyle = 'rgba(255, 0, 0, 0.6)';
            this.ctx.fillRect(20, this.canvas.height - 45, 20, 20);
            this.ctx.fillStyle = '#e0e0e0';
            this.ctx.fillText('Composites', 50, this.canvas.height - 30);
        }
        this.ctx.restore();
    }
    
    drawHitMapLegend() {
        // Create semi-transparent background for legend
        this.ctx.fillStyle = 'rgba(42, 42, 58, 0.8)';
        this.ctx.fillRect(10, this.canvas.height - 80, 200, 70);
        
        this.ctx.font = '14px Arial';
        this.ctx.textAlign = 'left';
        
        // Unique Primes (Blue)
        this.ctx.fillStyle = '#0000ff';
        this.ctx.fillRect(20, this.canvas.height - 70, 20, 20);
        this.ctx.fillStyle = '#e0e0e0';
        this.ctx.fillText('Unique Prime', 50, this.canvas.height - 55);
        
        // Non-unique Primes (Green)
        this.ctx.fillStyle = '#00ff00';
        this.ctx.fillRect(20, this.canvas.height - 50, 20, 20);
        this.ctx.fillStyle = '#e0e0e0';
        this.ctx.fillText('Non-unique Prime', 50, this.canvas.height - 35);
        
        // Non-primes (Red)
        this.ctx.fillStyle = '#ff0000';
        this.ctx.fillRect(20, this.canvas.height - 30, 20, 20);
        this.ctx.fillStyle = '#e0e0e0';
        this.ctx.fillText('Non-prime', 50, this.canvas.height - 15);
    }
    
    isPrime(n) {
        if (n < 2) return false;
        if (n === 2) return true;
        if (n % 2 === 0) return false;
        
        const sqrt = Math.sqrt(n);
        for (let i = 3; i <= sqrt; i += 2) {
            if (n % i === 0) return false;
        }
        return true;
    }
    
    // Zoom and pan controls
    zoomIn() {
        this.zoom *= 1.2;
        this.zoom = Math.min(10, this.zoom);
        this.redraw();
    }
    
    zoomOut() {
        this.zoom *= 0.8;
        this.zoom = Math.max(0.1, this.zoom);
        this.redraw();
    }
    
    resetView() {
        this.zoom = 1.0;
        this.panX = 0;
        this.panY = 0;
        this.redraw();
    }
    
    // Clear stored data (useful when switching modes)
    clearStoredData() {
        this.currentMode = null;
        this.currentData = null;
        this.currentExpression = null;
        this.currentOptions = null;
        // Also reset zoom and pan to defaults
        this.zoom = 1.0;
        this.panX = 0;
        this.panY = 0;
    }
    
    redraw() {
        try {
            // Redraw the current visualization with stored data
            if (this.currentMode === 'primefold' && this.currentData && this.currentExpression) {
                // Validate data before redrawing
                if (Array.isArray(this.currentData.primeCoords) && Array.isArray(this.currentData.compositeCoords)) {
                    this.drawPrimeFoldVisualization(
                        this.currentData.primeCoords, 
                        this.currentData.compositeCoords, 
                        this.currentExpression,
                        this.currentOptions
                    );
                } else {
                    console.warn('Invalid PrimeFold data for redraw');
                    this.clear();
                    this.drawGrid();
                    this.drawAxes();
                }
            } else if (this.currentMode === 'primegen' && this.currentData && this.currentExpression) {
                // Validate data before redrawing
                if (Array.isArray(this.currentData.sequence) && Array.isArray(this.currentData.values)) {
                    this.drawPrimeGenHitMap(
                        this.currentData.sequence, 
                        this.currentExpression, 
                        this.currentData.values
                    );
                } else {
                    console.warn('Invalid PrimeGen data for redraw');
                    this.clear();
                    this.drawGrid();
                    this.drawAxes();
                }
            } else {
                // Fallback: just clear and draw grid/axes
                this.clear();
                this.drawGrid();
                this.drawAxes();
            }
        } catch (error) {
            console.error('Error during redraw:', error);
            // Fallback to basic display
            this.clear();
            this.drawGrid();
            this.drawAxes();
        }
    }
}

// Export for use in other modules
window.Visualization = Visualization; 