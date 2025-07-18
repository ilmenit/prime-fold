// Main application entry point
class PrimeFoldApp {
    constructor() {
        this.currentMode = 'primefold';
        this.isRunning = false;
        this.optimizer = null;
        this.visualization = null;
        this.liveScorer = null;
        this.statsDisplay = null;
        this.userSelectedMainFunction = false; // Track if user selected/edited main function
        this.lastBestScoreShown = null;
        this.lastBestExprShown = null;
        
        this.initialize();
    }
    
    initialize() {
        // Initialize components
        this.loadPrimeData();
        this.setupUI();
        this.setupEventHandlers();
        
        // Set correct display points for initial mode (PrimeFold defaults to 10000)
        if (this.currentMode === 'primefold') {
            document.getElementById('displayPoints').value = '10000';
        }
        
        this.showDefaultVisualization();
        
        // Log after everything is initialized
        setTimeout(() => {
            this.log('Application started. Ready to generate functions.', 'info');
        }, 100);
        
        console.log('PrimeFold Web Application initialized');
    }
    
    loadPrimeData(sampleSize = 200) {
        // Pre-cache primes for better performance
        console.log('Pre-caching primes for better performance...');
        window.primeCache.preCacheUpTo(10000); // Pre-cache up to 10,000
        
        // Use prime cache for dynamic data loading
        const sampleData = window.primeCache.getSampleData(sampleSize);
        
        this.primes = sampleData.primes;
        this.composites = sampleData.composites;
        this.primesSet = new Set(this.primes);
        
        console.log(`Loaded ${this.primes.length} primes and ${this.composites.length} composites from cache`);
        console.log('Cache stats:', window.primeCache.getStats());
    }
    
    reloadDataForNewSampleSize() {
        const newSampleSize = parseInt(document.getElementById('sampleSize').value);
        console.log(`Reloading data for new sample size: ${newSampleSize}`);
        
        // Reload prime data with new sample size
        this.loadPrimeData(newSampleSize);
        
        // Update the live scorer with new data
        this.liveScorer.setData(this.primes, this.composites);
        
        console.log(`Data reloaded for sample size ${newSampleSize}`);
    }
    
    setupUI() {
        // Initialize components
        this.visualization = new Visualization(document.getElementById('visualizationCanvas'));
        this.liveScorer = new LiveScorer();
        this.statsDisplay = new StatsDisplay();
        
        // Set data for evaluators
        this.liveScorer.setData(this.primes, this.composites);
        
        // Set initial mode (this will set default functions and show visualization)
        this.setMode('primefold');
        
        // Update algorithm parameters
        this.updateAlgorithmParams();
        
        // Update statistics title
        this.updateStatisticsTitle();
        
        // Initialize point size control visibility
        this.togglePointSizeControl();
    }
    
    setupEventHandlers() {
        // Mode selection
        document.getElementById('modeSelect').addEventListener('change', (e) => {
            this.setMode(e.target.value);
        });
        
        // Function selectors
        document.getElementById('functionSelect').addEventListener('change', (e) => {
            this.handleFunctionSelection(e.target.value);
        });
        
        document.getElementById('primefoldFunctionSelect').addEventListener('change', (e) => {
            this.handlePrimeFoldFunctionSelection(e.target.value);
        });
        
        // Algorithm selection
        document.getElementById('algorithm').addEventListener('change', () => {
            this.updateAlgorithmParams();
        });
        
        // Parameter changes - update visualization in real-time
        document.getElementById('sampleSize').addEventListener('change', () => {
            this.reloadDataForNewSampleSize();
            this.updateVisualizationFromMainFunction();
            this.updateStatisticsTitle();
        });
        
        // Display Points change - update visualization immediately
        document.getElementById('displayPoints').addEventListener('change', () => {
            this.updateVisualizationFromMainFunction();
        });
        
        // Also listen for input events for more responsive updates
        document.getElementById('displayPoints').addEventListener('input', () => {
            this.updateVisualizationFromMainFunction();
        });
        
        // Symmetry checkbox change
        document.getElementById('enforceSymmetry').addEventListener('change', () => {
            this.log(`Symmetry enforcement ${document.getElementById('enforceSymmetry').checked ? 'enabled' : 'disabled'}`, 'info');
        });
        
        // Visualization options
        document.getElementById('showNonPrimes').addEventListener('change', () => {
            this.updateVisualizationFromMainFunction();
        });
        
        document.getElementById('scalePoints').addEventListener('change', () => {
            this.togglePointSizeControl();
            this.updateVisualizationFromMainFunction();
        });
        
        document.getElementById('pointSize').addEventListener('change', () => {
            this.updateVisualizationFromMainFunction();
        });
        
        // Toggle Start/Stop button
        document.getElementById('generateBtn').addEventListener('click', () => {
            if (this.isRunning) {
                this.stopOptimization();
            } else {
                this.startOptimization();
            }
        });
        
        // Export and Help buttons
        document.getElementById('exportBtn').addEventListener('click', () => {
            this.exportFunction();
        });
        
        document.getElementById('helpBtn').addEventListener('click', () => {
            this.showHelp();
        });
        
        // Log management buttons
        document.getElementById('clearLogBtn').addEventListener('click', () => {
            this.clearLog();
        });
        
        document.getElementById('copyLogBtn').addEventListener('click', () => {
            this.copyLogToClipboard();
        });
        
        // Visualization controls
        document.getElementById('zoomInBtn').addEventListener('click', () => {
            this.visualization.zoomIn();
        });
        
        document.getElementById('zoomOutBtn').addEventListener('click', () => {
            this.visualization.zoomOut();
        });
        
        document.getElementById('resetViewBtn').addEventListener('click', () => {
            this.visualization.resetView();
        });
        
        // Help modal
        const modal = document.getElementById('helpModal');
        const closeBtn = document.querySelector('.close');
        
        closeBtn.addEventListener('click', () => {
            modal.style.display = 'none';
        });
        
        window.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        });
    }
    
    togglePointSizeControl() {
        const scalePoints = document.getElementById('scalePoints').checked;
        const pointSizeControl = document.getElementById('pointSizeControl');
        
        if (scalePoints) {
            pointSizeControl.style.display = 'none';
        } else {
            pointSizeControl.style.display = 'flex';
        }
    }
    
    setMode(mode) {
        this.stopOptimization(); // Stop any running optimization before switching mode
        this.currentMode = mode;
        this.userSelectedMainFunction = false; // Reset on mode change
        
        // Show/hide fitness section based on mode
        setFitnessSectionVisibility(this.currentMode);
        
        // Clear stored visualization data when switching modes
        if (this.visualization) {
            this.visualization.clearStoredData();
        }
        
        // Update UI
        document.getElementById('visualizationTitle').textContent = 
            mode === 'primefold' ? 'PrimeFold Visualization' : 'PrimeGen Visualization';
        
        // Show/hide zoom controls based on mode
        const zoomControls = document.getElementById('zoomControls');
        if (zoomControls) {
            if (mode === 'primegen') {
                zoomControls.style.display = 'none';
            } else {
                zoomControls.style.display = 'flex';
            }
        }
        
        // Show/hide function selectors and displays based on mode
        const functionSelectorSection = document.getElementById('functionsSection');
        const primefoldFunctionSelector = document.getElementById('primefoldFunctionSelector');
        const primegenFunctionSelector = document.getElementById('primegenFunctionSelector');
        const primefoldFunctionDisplay = document.getElementById('primefoldFunctionDisplay');
        const primegenFunctionDisplay = document.getElementById('primegenFunctionDisplay');
        
        if (functionSelectorSection) {
            functionSelectorSection.style.display = 'block';
        }
        
        if (mode === 'primefold') {
            if (primefoldFunctionSelector) primefoldFunctionSelector.style.display = 'block';
            if (primegenFunctionSelector) primegenFunctionSelector.style.display = 'none';
            if (primefoldFunctionDisplay) primefoldFunctionDisplay.style.display = 'block';
            if (primegenFunctionDisplay) primegenFunctionDisplay.style.display = 'none';
        } else {
            if (primefoldFunctionSelector) primefoldFunctionSelector.style.display = 'none';
            if (primegenFunctionSelector) primegenFunctionSelector.style.display = 'block';
            if (primefoldFunctionDisplay) primefoldFunctionDisplay.style.display = 'none';
            if (primegenFunctionDisplay) primegenFunctionDisplay.style.display = 'block';
        }
        
        // Show/hide stats
        const primefoldStats = document.getElementById('primefold-stats');
        const primegenStats = document.getElementById('primegen-stats');
        
        if (primefoldStats) {
            primefoldStats.style.display = mode === 'primefold' ? 'block' : 'none';
        }
        if (primegenStats) {
            primegenStats.style.display = mode === 'primegen' ? 'block' : 'none';
        }
        
        // Show/hide visualization options based on mode
        const visualizationOptions = document.querySelector('.visualization-options');
        if (visualizationOptions) {
            visualizationOptions.style.display = (mode === 'primefold') ? 'flex' : 'none';
        }
        
        // Update function display with default functions
        if (mode === 'primefold') {
            const defaultX = 'n * sind(n)';
            const defaultY = 'n * cosd(n)';
            const functionX = document.getElementById('functionX');
            const functionY = document.getElementById('functionY');
            const lastGeneratedFunction = document.getElementById('lastGeneratedFunction');
            const displayPoints = document.getElementById('displayPoints');
            
            if (functionX) functionX.textContent = defaultX;
            if (functionY) functionY.textContent = defaultY;
            if (functionX) functionX.contentEditable = false;
            if (functionY) functionY.contentEditable = false;
            if (lastGeneratedFunction) lastGeneratedFunction.textContent = `f_x(n) = ${defaultX}, f_y(n) = ${defaultY}`;
            if (displayPoints) displayPoints.value = '10000';
        } else {
            const defaultPrimeGen = 'n * n + n + 41';
            const mainFunction = document.getElementById('mainFunction');
            const lastGeneratedFunction = document.getElementById('lastGeneratedFunction');
            const functionSelect = document.getElementById('functionSelect');
            const mainFunctionUniqueNumbers = document.getElementById('mainFunctionUniqueNumbers');
            const mainFunctionUniquePrimes = document.getElementById('mainFunctionUniquePrimes');
            const displayPoints = document.getElementById('displayPoints');
            
            if (mainFunction) mainFunction.textContent = defaultPrimeGen;
            if (lastGeneratedFunction) lastGeneratedFunction.textContent = defaultPrimeGen;
            if (functionSelect) functionSelect.value = 'n*n+n+41';
            if (mainFunctionUniqueNumbers) mainFunctionUniqueNumbers.textContent = '0';
            if (mainFunctionUniquePrimes) mainFunctionUniquePrimes.textContent = '0';
            if (displayPoints) displayPoints.value = '1000';
        }
        
        // Reset function display to not editable
        if (mode === 'primefold') {
            const functionX = document.getElementById('functionX');
            const functionY = document.getElementById('functionY');
            if (functionX) functionX.contentEditable = false;
            if (functionY) functionY.contentEditable = false;
        } else {
            const mainFunction = document.getElementById('mainFunction');
            if (mainFunction) mainFunction.contentEditable = false;
        }
        
        // Ensure data is current before showing default visualization
        const sampleSizeElement = document.getElementById('sampleSize');
        if (sampleSizeElement) {
            const currentSampleSize = parseInt(sampleSizeElement.value);
            if (this.primes.length !== currentSampleSize) {
                this.reloadDataForNewSampleSize();
            }
        }
        
        // Show default visualization and update score
        this.showDefaultVisualization();
        // Update statistics title
        this.updateStatisticsTitle();
        
        this.log(`Switched to ${mode} mode`, 'info');
    }
    
    handleFunctionSelection(selectedValue) {
        if (selectedValue === 'custom') {
            // Allow manual editing of main function (the visualized one)
            const mainFunctionDiv = document.getElementById('mainFunction');
            mainFunctionDiv.contentEditable = true;
            mainFunctionDiv.focus();
            
            // Remove existing event listeners to prevent duplication
            const newDiv = mainFunctionDiv.cloneNode(true);
            mainFunctionDiv.parentNode.replaceChild(newDiv, mainFunctionDiv);
            
            // Add new event listeners
            newDiv.addEventListener('blur', () => {
                this.userSelectedMainFunction = true;
                // Validate function syntax and math errors
                const expr = newDiv.textContent.trim();
                let isValid = true;
                let errorMsg = '';
                try {
                    const tree = window.expressionParser.parse(expr);
                    isValid = !(tree instanceof IdNode && expr !== 'n');
                    // Math error check: try evaluating for n=1,2,3
                    if (isValid) {
                        for (let n = 1; n <= 3; n++) {
                            let val = tree.evaluate(n);
                            if (!isFinite(val)) {
                                isValid = false;
                                errorMsg = 'Function cannot be evaluated for n=' + n + ' (result: ' + val + ')';
                                break;
                            }
                        }
                    }
                } catch (e) {
                    isValid = false;
                    errorMsg = e.message;
                }
                if (!isValid) {
                    newDiv.classList.add('function-input-invalid');
                    if (errorMsg) this.log('Invalid function: ' + errorMsg, 'error');
                } else {
                    newDiv.classList.remove('function-input-invalid');
                }
                // Ensure data is current before updating function
                const currentSampleSize = parseInt(document.getElementById('sampleSize').value);
                if (this.primes.length !== currentSampleSize) {
                    this.reloadDataForNewSampleSize();
                }
                this.updateVisualizationFromMainFunction();
            });
            newDiv.addEventListener('input', () => {
                // Live validation feedback
                const expr = newDiv.textContent.trim();
                let isValid = true;
                try {
                    const tree = window.expressionParser.parse(expr);
                    isValid = !(tree instanceof IdNode && expr !== 'n');
                    if (isValid) {
                        for (let n = 1; n <= 3; n++) {
                            let val = tree.evaluate(n);
                            if (!isFinite(val)) {
                                isValid = false;
                                break;
                            }
                        }
                    }
                } catch (e) {
                    isValid = false;
                }
                if (!isValid) {
                    newDiv.classList.add('function-input-invalid');
                } else {
                    newDiv.classList.remove('function-input-invalid');
                }
            });
            newDiv.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    newDiv.blur();
                }
            });
            
            this.log('Entered custom function editing mode', 'info');
        } else {
            // Set predefined function
            const functionMap = {
                'n*n+1': 'n * n + 1',
                'n*n+n+41': 'n * n + n + 41',
                'n*n+n+17': 'n * n + n + 17',
                'n*n-79*n+1601': 'n * n - 79 * n + 1601',
                '2*n*n-2*n+53089': '2 * n * n - 2 * n + 53089',
                '36*n*n-810*n+2753': '36 * n * n - 810 * n + 2753',
                '47*n*n-1701*n+10181': '47 * n * n - 1701 * n + 10181',
                '103*n*n-4707*n+50383': '103 * n * n - 4707 * n + 50383',
                '(n*n*n*n*n*n-126*n*n*n*n*n+6217*n*n*n*n-153066*n*n*n+1987786*n*n-13055316*n+34747236)/36': '(n * n * n * n * n * n - 126 * n * n * n * n * n + 6217 * n * n * n * n - 153066 * n * n * n + 1987786 * n * n - 13055316 * n + 34747236) / 36'
            };
            
            const functionText = functionMap[selectedValue];
            if (functionText) {
                // Ensure data is current before updating function
                const currentSampleSize = parseInt(document.getElementById('sampleSize').value);
                if (this.primes.length !== currentSampleSize) {
                    this.reloadDataForNewSampleSize();
                }
                
                document.getElementById('mainFunction').textContent = functionText;
                document.getElementById('mainFunction').contentEditable = false;
                this.userSelectedMainFunction = true;
                this.updateVisualizationFromMainFunction();
                
                this.log(`Selected function: f(n) = ${functionText}`, 'info');
            }
        }
    }
    
    handlePrimeFoldFunctionSelection(selectedValue) {
        if (selectedValue === 'custom') {
            // Allow manual editing of both functions
            const functionXDiv = document.getElementById('functionX');
            const functionYDiv = document.getElementById('functionY');
            
            functionXDiv.contentEditable = true;
            functionYDiv.contentEditable = true;
            functionXDiv.focus();
            
            // Remove existing event listeners to prevent duplication
            const newXDiv = functionXDiv.cloneNode(true);
            const newYDiv = functionYDiv.cloneNode(true);
            functionXDiv.parentNode.replaceChild(newXDiv, functionXDiv);
            functionYDiv.parentNode.replaceChild(newYDiv, functionYDiv);
            
            // Add new event listeners for X function
            newXDiv.addEventListener('blur', () => {
                this.userSelectedMainFunction = true;
                // Validate X function
                const exprX = newXDiv.textContent.trim();
                let isValidX = true;
                let errorMsgX = '';
                try {
                    const treeX = window.expressionParser.parse(exprX);
                    isValidX = !(treeX instanceof IdNode && exprX !== 'n');
                    if (isValidX) {
                        for (let n = 1; n <= 3; n++) {
                            let val = treeX.evaluate(n);
                            if (!isFinite(val)) {
                                isValidX = false;
                                errorMsgX = 'f_x(n) cannot be evaluated for n=' + n + ' (result: ' + val + ')';
                                break;
                            }
                        }
                    }
                } catch (e) {
                    isValidX = false;
                    errorMsgX = e.message;
                }
                if (!isValidX) {
                    newXDiv.classList.add('function-input-invalid');
                    if (errorMsgX) this.log('Invalid f_x(n): ' + errorMsgX, 'error');
                } else {
                    newXDiv.classList.remove('function-input-invalid');
                }
                // Validate Y function as well for completeness
                const exprY = newYDiv.textContent.trim();
                let isValidY = true;
                let errorMsgY = '';
                try {
                    const treeY = window.expressionParser.parse(exprY);
                    isValidY = !(treeY instanceof IdNode && exprY !== 'n');
                    if (isValidY) {
                        for (let n = 1; n <= 3; n++) {
                            let val = treeY.evaluate(n);
                            if (!isFinite(val)) {
                                isValidY = false;
                                errorMsgY = 'f_y(n) cannot be evaluated for n=' + n + ' (result: ' + val + ')';
                                break;
                            }
                        }
                    }
                } catch (e) {
                    isValidY = false;
                    errorMsgY = e.message;
                }
                if (!isValidY) {
                    newYDiv.classList.add('function-input-invalid');
                    if (errorMsgY) this.log('Invalid f_y(n): ' + errorMsgY, 'error');
                } else {
                    newYDiv.classList.remove('function-input-invalid');
                }
                this.updatePrimeFoldVisualization();
            });
            newXDiv.addEventListener('input', () => {
                // Live validation feedback for X
                const exprX = newXDiv.textContent.trim();
                let isValidX = true;
                try {
                    const treeX = window.expressionParser.parse(exprX);
                    isValidX = !(treeX instanceof IdNode && exprX !== 'n');
                    if (isValidX) {
                        for (let n = 1; n <= 3; n++) {
                            let val = treeX.evaluate(n);
                            if (!isFinite(val)) {
                                isValidX = false;
                                break;
                            }
                        }
                    }
                } catch (e) {
                    isValidX = false;
                }
                if (!isValidX) {
                    newXDiv.classList.add('function-input-invalid');
                } else {
                    newXDiv.classList.remove('function-input-invalid');
                }
            });
            newXDiv.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    newXDiv.blur();
                }
            });
            // Add new event listeners for Y function
            newYDiv.addEventListener('blur', () => {
                this.userSelectedMainFunction = true;
                // Validate Y function
                const exprY = newYDiv.textContent.trim();
                let isValidY = true;
                let errorMsgY = '';
                try {
                    const treeY = window.expressionParser.parse(exprY);
                    isValidY = !(treeY instanceof IdNode && exprY !== 'n');
                    if (isValidY) {
                        for (let n = 1; n <= 3; n++) {
                            let val = treeY.evaluate(n);
                            if (!isFinite(val)) {
                                isValidY = false;
                                errorMsgY = 'f_y(n) cannot be evaluated for n=' + n + ' (result: ' + val + ')';
                                break;
                            }
                        }
                    }
                } catch (e) {
                    isValidY = false;
                    errorMsgY = e.message;
                }
                if (!isValidY) {
                    newYDiv.classList.add('function-input-invalid');
                    if (errorMsgY) this.log('Invalid f_y(n): ' + errorMsgY, 'error');
                } else {
                    newYDiv.classList.remove('function-input-invalid');
                }
                // Validate X function as well for completeness
                const exprX = newXDiv.textContent.trim();
                let isValidX = true;
                let errorMsgX = '';
                try {
                    const treeX = window.expressionParser.parse(exprX);
                    isValidX = !(treeX instanceof IdNode && exprX !== 'n');
                    if (isValidX) {
                        for (let n = 1; n <= 3; n++) {
                            let val = treeX.evaluate(n);
                            if (!isFinite(val)) {
                                isValidX = false;
                                errorMsgX = 'f_x(n) cannot be evaluated for n=' + n + ' (result: ' + val + ')';
                                break;
                            }
                        }
                    }
                } catch (e) {
                    isValidX = false;
                    errorMsgX = e.message;
                }
                if (!isValidX) {
                    newXDiv.classList.add('function-input-invalid');
                    if (errorMsgX) this.log('Invalid f_x(n): ' + errorMsgX, 'error');
                } else {
                    newXDiv.classList.remove('function-input-invalid');
                }
                this.updatePrimeFoldVisualization();
            });
            newYDiv.addEventListener('input', () => {
                // Live validation feedback for Y
                const exprY = newYDiv.textContent.trim();
                let isValidY = true;
                try {
                    const treeY = window.expressionParser.parse(exprY);
                    isValidY = !(treeY instanceof IdNode && exprY !== 'n');
                    if (isValidY) {
                        for (let n = 1; n <= 3; n++) {
                            let val = treeY.evaluate(n);
                            if (!isFinite(val)) {
                                isValidY = false;
                                break;
                            }
                        }
                    }
                } catch (e) {
                    isValidY = false;
                }
                if (!isValidY) {
                    newYDiv.classList.add('function-input-invalid');
                } else {
                    newYDiv.classList.remove('function-input-invalid');
                }
            });
            newYDiv.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    newYDiv.blur();
                }
            });
            
            this.log('Entered custom PrimeFold function editing mode', 'info');
        } else if (selectedValue === 'ulam-sind') {
            // Ulam Spiral (sind/cosd)
            const functionX = 'n * sind(n)';
            const functionY = 'n * cosd(n)';
            document.getElementById('functionX').textContent = functionX;
            document.getElementById('functionY').textContent = functionY;
            document.getElementById('functionX').contentEditable = false;
            document.getElementById('functionY').contentEditable = false;
            this.userSelectedMainFunction = true;
            this.updatePrimeFoldVisualization();
            this.log('Selected Ulam Spiral (sind/cosd) functions', 'info');
        } else if (selectedValue === 'ulam-sin') {
            // Ulam Spiral (sin/cos)
            const functionX = 'n * sin(n)';
            const functionY = 'n * cos(n)';
            document.getElementById('functionX').textContent = functionX;
            document.getElementById('functionY').textContent = functionY;
            document.getElementById('functionX').contentEditable = false;
            document.getElementById('functionY').contentEditable = false;
            this.userSelectedMainFunction = true;
            this.updatePrimeFoldVisualization();
            this.log('Selected Ulam Spiral (sin/cos) functions', 'info');
        } else if (selectedValue === 'sacks') {
            // Sacks Spiral (sqrt(n) * cos(n), sqrt(n) * sin(n))
            const functionX = 'sqrt(n) * cos(n)';
            const functionY = 'sqrt(n) * sin(n)';
            document.getElementById('functionX').textContent = functionX;
            document.getElementById('functionY').textContent = functionY;
            document.getElementById('functionX').contentEditable = false;
            document.getElementById('functionY').contentEditable = false;
            this.userSelectedMainFunction = true;
            this.updatePrimeFoldVisualization();
            this.log('Selected Sacks Spiral (cos/sin) functions', 'info');
        } else if (selectedValue === 'sacks-sind') {
            // Sacks Spiral (sqrt(n) * cosd(n), sqrt(n) * sind(n))
            const functionX = 'sqrt(n) * cosd(n)';
            const functionY = 'sqrt(n) * sind(n)';
            document.getElementById('functionX').textContent = functionX;
            document.getElementById('functionY').textContent = functionY;
            document.getElementById('functionX').contentEditable = false;
            document.getElementById('functionY').contentEditable = false;
            this.userSelectedMainFunction = true;
            this.updatePrimeFoldVisualization();
            this.log('Selected Sacks Spiral (cosd/sind) functions', 'info');
        }
    }
    
    updateAlgorithmParams() {
        const algorithm = document.getElementById('algorithm').value;
        
        // Hide all parameter sections
        document.getElementById('lahc-params').style.display = 'none';
        document.getElementById('ga-params').style.display = 'none';
        document.getElementById('sa-params').style.display = 'none';
        
        // Show relevant parameters
        switch (algorithm) {
            case 'lahc':
                document.getElementById('lahc-params').style.display = 'block';
                break;
            case 'ga':
                document.getElementById('ga-params').style.display = 'block';
                break;
            case 'sa':
                document.getElementById('sa-params').style.display = 'block';
                break;
        }
    }
    
    showDefaultVisualization() {
        try {
            if (this.currentMode === 'primefold') {
                // Show default 2D scatter with Ulam spiral-like functions
                this.updatePrimeFoldVisualization();
            } else {
                // Show default hit map with prime generator function
                const defaultPrimeGen = 'n * n + n + 41';
                console.log('Showing default PrimeGen visualization:', defaultPrimeGen);
                this.visualization.updatePrimeGen(defaultPrimeGen);
            }
            
            // Update scores and statistics for the default function (without re-updating visualization)
            this.updateScoresFromMainFunction();
        } catch (error) {
            console.error('Error showing default visualization:', error);
            this.log('Error showing default visualization: ' + error.message, 'error');
        }
    }
    
    startOptimization() {
        if (this.isRunning) return;
        this.isRunning = true;
        this.userSelectedMainFunction = false; // Reset on new optimization
        // Reset best score tracking variables for new experiment
        this.lastBestScoreShown = null;
        this.lastBestExprShown = null;
        // Reset progress bar and scores for new experiment
        document.getElementById('progressFill').style.width = '0%';
        document.getElementById('progressText').textContent = '0%';
        document.getElementById('currentScore').textContent = '0.000';
        document.getElementById('bestScore').textContent = '0.000';
        if (this.currentMode === 'primefold') {
            // Reset functions to 'n' for PrimeFold mode when starting optimization
            document.getElementById('functionX').textContent = 'n';
            document.getElementById('functionY').textContent = 'n';
            document.getElementById('primefoldCombinedScore').textContent = '0.000';
            document.getElementById('primefoldCombinedComplexity').textContent = '1';
        } else {
            // Reset function to 'n' for PrimeGen mode when starting optimization
            document.getElementById('mainFunction').textContent = 'n';
            document.getElementById('mainFunctionScore').textContent = '0.000';
            document.getElementById('mainFunctionComplexity').textContent = '1';
            document.getElementById('mainFunctionUniqueNumbers').textContent = '0';
            document.getElementById('mainFunctionUniquePrimes').textContent = '0';
        }
        // Update button to show Stop
        const generateBtn = document.getElementById('generateBtn');
        generateBtn.textContent = 'Stop';
        generateBtn.classList.remove('primary');
        generateBtn.classList.add('secondary');
        // Ensure data is up to date with current sample size
        const currentSampleSize = parseInt(document.getElementById('sampleSize').value);
        if (this.primes.length !== currentSampleSize) {
            this.reloadDataForNewSampleSize();
        }
        // Update visualization with reset functions
        if (this.currentMode === 'primefold') {
            this.updatePrimeFoldVisualization();
        } else {
            this.updateScoresFromMainFunction();
        }
        
        // Get parameters
        const params = this.getParameters();
        // Create optimizer
        this.optimizer = new OptimizerController();
        // Start optimization
        this.optimizer.startOptimization(params, 
            (data) => this.updateProgress(data),
            (result) => this.handleComplete(result)
        );
        this.log(`Started optimization with ${params.algorithm} algorithm`, 'info');
    }
    
    stopOptimization() {
        if (this.optimizer) {
            this.optimizer.stop();
        }
        this.isRunning = false;
        
        // Update button to show Start
        const generateBtn = document.getElementById('generateBtn');
        generateBtn.textContent = 'Start';
        generateBtn.classList.remove('secondary');
        generateBtn.classList.add('primary');
        
        this.log('Optimization stopped', 'warning');
    }
    
    reset() {
        this.stopOptimization();
        this.userSelectedMainFunction = false; // Reset on reset
        
        // Reset UI
        document.getElementById('progressFill').style.width = '0%';
        document.getElementById('progressText').textContent = '0%';
        document.getElementById('currentScore').textContent = '0.000';
        document.getElementById('bestScore').textContent = '0.000';
        
        // Reset to default functions based on mode
        if (this.currentMode === 'primefold') {
            const defaultX = 'n * sind(n)';
            const defaultY = 'n * cosd(n)';
            document.getElementById('functionX').textContent = defaultX;
            document.getElementById('functionY').textContent = defaultY;
            document.getElementById('functionX').contentEditable = false;
            document.getElementById('functionY').contentEditable = false;
            document.getElementById('lastGeneratedFunction').textContent = `f_x(n) = ${defaultX}, f_y(n) = ${defaultY}`;
            // Reset Display Points for PrimeFold mode
            document.getElementById('displayPoints').value = '10000';
        } else {
            const defaultPrimeGen = 'n * n + n + 41';
            document.getElementById('mainFunction').textContent = defaultPrimeGen;
            document.getElementById('lastGeneratedFunction').textContent = defaultPrimeGen;
            document.getElementById('functionSelect').value = 'n*n+n+41';
            // Reset Display Points for PrimeGen mode
            document.getElementById('displayPoints').value = '1000';
        }
        
        // Reset function display to not editable
        if (this.currentMode === 'primefold') {
            document.getElementById('functionX').contentEditable = false;
            document.getElementById('functionY').contentEditable = false;
        } else {
            document.getElementById('mainFunction').contentEditable = false;
        }
        
        // Ensure data is current before showing default visualization
        const currentSampleSize = parseInt(document.getElementById('sampleSize').value);
        if (this.primes.length !== currentSampleSize) {
            this.reloadDataForNewSampleSize();
        }
        
        // Show default visualization and update score
        this.showDefaultVisualization();
        
        this.log('Application reset to defaults', 'info');
    }
    
    updateProgress(data) {
        const { iteration, maxIterations, currentScore, bestScore, currentExpr, bestExpr } = data;
        
        // Update progress bar
        const progress = (iteration / maxIterations) * 100;
        document.getElementById('progressFill').style.width = `${progress}%`;
        document.getElementById('progressText').textContent = `${Math.round(progress)}%`;
        
        // Update scores - handle null values gracefully
        const currentScoreDisplay = currentScore !== null && currentScore !== undefined ? currentScore.toFixed(3) : '0.000';
        const bestScoreDisplay = bestScore !== null && bestScore !== undefined ? bestScore.toFixed(3) : '0.000';
        document.getElementById('currentScore').textContent = currentScoreDisplay;
        document.getElementById('bestScore').textContent = bestScoreDisplay;
        
        // Update Last Generated function (only when it actually changes)
        const lastGeneratedElement = document.getElementById('lastGeneratedFunction');
        
        // Only update if the function has actually changed to avoid unnecessary DOM updates
        if (lastGeneratedElement.textContent !== currentExpr) {
            // For PrimeGen, strip 'f(n) =' if present
            if (this.currentMode === 'primegen') {
                lastGeneratedElement.textContent = currentExpr.replace(/^f\(n\)\s*=\s*/, '');
            } else {
                lastGeneratedElement.textContent = currentExpr;
            }
            
            // Debug logging for first few iterations and when functions change
            if (iteration <= 10 || iteration % 50 === 0) {
                const scoreDisplay = currentScore !== null && currentScore !== undefined ? currentScore.toFixed(3) : 'null';
                console.log(`Iteration ${iteration}: Last Generated updated to: "${currentExpr}" (score: ${scoreDisplay})`);
            }
        }
        
        // Calculate detailed stats using liveScorer
        let detailedScore;
        if (this.currentMode === 'primefold') {
            const parts = currentExpr.split(',').map(s => s.trim());
            if (parts.length >= 2) {
                const exprX = parts[0].replace('f_x(n) =', '').trim();
                const exprY = parts[1].replace('f_y(n) =', '').trim();
                detailedScore = this.liveScorer.calculateScore(`${exprX},${exprY}`, 'primefold', fitnessConfig);
            } else {
                const fallbackScore = currentScore !== null && currentScore !== undefined ? currentScore : 0;
                detailedScore = { total: fallbackScore, components: { hullArea: 0, spread: 0, balance: 0, complexity: 1 } };
            }
        } else {
            const exprF = currentExpr.replace('f(n) =', '').trim();
            detailedScore = this.liveScorer.calculateScore(exprF, 'primegen', fitnessConfig);
        }
        
        // Update stats display
        this.statsDisplay.updateStats(this.currentMode, detailedScore.total, detailedScore.components);
        
        // Only update main function and visualization when a new best is discovered
        const effectiveBestScore = bestScore !== null && bestScore !== undefined ? bestScore : -Infinity;
        const effectiveLastBestScore = this.lastBestScoreShown !== null && this.lastBestScoreShown !== undefined ? this.lastBestScoreShown : -Infinity;
        
        if (!this.userSelectedMainFunction &&
            (effectiveBestScore > effectiveLastBestScore ||
             (effectiveBestScore === effectiveLastBestScore && bestExpr !== this.lastBestExprShown))
        ) {
            // Calculate bestScoreDisplay once for this block
            const bestScoreDisplay = bestScore !== null && bestScore !== undefined ? bestScore.toFixed(3) : '0.000';
            
            // Ensure data is current before updating function
            const currentSampleSize = parseInt(document.getElementById('sampleSize').value);
            if (this.primes.length !== currentSampleSize) {
                this.reloadDataForNewSampleSize();
            }
            if (this.currentMode === 'primefold') {
                // Parse the best expression for PrimeFold mode
                const parts = bestExpr.split(',').map(s => s.trim());
                if (parts.length >= 2) {
                    const exprX = parts[0].replace('f(n) =', '').trim();
                    const exprY = parts[1].replace('g(n) =', '').trim();
                    document.getElementById('functionX').textContent = `f(n) = ${exprX}`;
                    document.getElementById('functionY').textContent = `g(n) = ${exprY}`;
                    this.updatePrimeFoldScores();
                    // Ensure Score under Function matches Best
                    document.getElementById('primefoldCombinedScore').textContent = bestScoreDisplay;
                }
            } else {
                // For PrimeGen, strip 'f(n) =' if present
                const exprRight = bestExpr.replace(/^f\(n\)\s*=\s*/, '');
                document.getElementById('mainFunction').textContent = exprRight;
                document.getElementById('mainFunctionScore').textContent = bestScoreDisplay;
                // Update complexity for the new best function
                const bestScoreDetails = this.liveScorer.calculateScore(exprRight, this.currentMode, fitnessConfig);
                document.getElementById('mainFunctionComplexity').textContent = Math.round(bestScoreDetails.components.complexity);
                // Update Unique Numbers and Unique Primes
                document.getElementById('mainFunctionUniqueNumbers').textContent = bestScoreDetails.components.uniqueNumbers;
                document.getElementById('mainFunctionUniquePrimes').textContent = bestScoreDetails.components.uniquePrimes;
                // Update Last Generated label
                document.getElementById('lastGeneratedFunction').textContent = exprRight;
            }
            // Update visualization with the new best function
            this.updateVisualization(bestExpr, bestExpr);
            this.log(`New best function found: ${bestExpr} (score: ${bestScoreDisplay})`, 'success');
            // Track last best shown
            this.lastBestScoreShown = bestScore;
            this.lastBestExprShown = bestExpr;
            
            // Update current score to match best score when a new best is found
            // This ensures Score and Best are synchronized
            document.getElementById('currentScore').textContent = bestScoreDisplay;
        }
    }
    
    handleComplete(result) {
        this.isRunning = false;
        
        // Update button to show Start
        const generateBtn = document.getElementById('generateBtn');
        generateBtn.textContent = 'Start';
        generateBtn.classList.remove('secondary');
        generateBtn.classList.add('primary');
        
        // Update with final result
        document.getElementById('progressFill').style.width = '100%';
        document.getElementById('progressText').textContent = '100%';
        
        console.log('Optimization completed:', result);
        this.log('Optimization completed successfully', 'success');
    }
    
    updateVisualization(currentExpr, bestExpr) {
        if (this.currentMode === 'primefold') {
            // Get visualization options
            const showNonPrimes = document.getElementById('showNonPrimes').checked;
            const scalePoints = document.getElementById('scalePoints').checked;
            const pointSize = parseFloat(document.getElementById('pointSize').value);
            this.visualization.updatePrimeFold(currentExpr, { showNonPrimes, scalePoints, pointSize });
        } else {
            this.visualization.updatePrimeGen(currentExpr);
        }
    }
    
    updateScoresFromMainFunction() {
        try {
            if (this.currentMode === 'primefold') {
                this.updatePrimeFoldScores();
            } else {
                const functionText = document.getElementById('mainFunction').textContent;
                console.log('Updating visualization from main function:', functionText);
                this.visualization.updatePrimeGen(functionText);
                // Calculate and update scores for PrimeGen
                const score = this.liveScorer.calculateScore(functionText, 'primegen', fitnessConfig);
                document.getElementById('mainFunctionScore').textContent = score.total.toFixed(3);
                document.getElementById('mainFunctionComplexity').textContent = score.components.complexity;
                document.getElementById('mainFunctionUniqueNumbers').textContent = score.components.uniqueNumbers;
                document.getElementById('mainFunctionUniquePrimes').textContent = score.components.uniquePrimes;
            }
        } catch (error) {
            console.error('Error updating visualization from main function:', error);
            this.log('Error updating visualization: ' + error.message, 'error');
        }
    }
    
    updateVisualizationFromMainFunction() {
        try {
            if (this.currentMode === 'primefold') {
                this.updatePrimeFoldVisualization();
            } else {
                const functionText = document.getElementById('mainFunction').textContent;
                console.log('Updating visualization from main function:', functionText);
                this.visualization.updatePrimeGen(functionText);
                this.updateScoresFromMainFunction();
            }
        } catch (error) {
            console.error('Error updating visualization from main function:', error);
            this.log('Error updating visualization: ' + error.message, 'error');
        }
    }
    
    updatePrimeFoldVisualization() {
        try {
            const functionX = document.getElementById('functionX').textContent;
            const functionY = document.getElementById('functionY').textContent;
            const combinedFunction = `${functionX}, ${functionY}`;
            
            // Get visualization options
            const showNonPrimes = document.getElementById('showNonPrimes').checked;
            const scalePoints = document.getElementById('scalePoints').checked;
            const pointSize = parseFloat(document.getElementById('pointSize').value);
            
            console.log('Updating PrimeFold visualization:', combinedFunction);
            this.visualization.updatePrimeFold(combinedFunction, { showNonPrimes, scalePoints, pointSize });
            this.updatePrimeFoldScores();
        } catch (error) {
            console.error('Error updating PrimeFold visualization:', error);
            this.log('Error updating PrimeFold visualization: ' + error.message, 'error');
        }
    }
    
    updatePrimeFoldScores() {
        try {
            const functionX = document.getElementById('functionX').textContent;
            const functionY = document.getElementById('functionY').textContent;
            const sampleSize = parseInt(document.getElementById('sampleSize').value);
            
            // Ensure fitnessConfig is available
            const config = fitnessConfig || getDefaultFitnessConfig();
            
            // Calculate combined PrimeFold score (evaluates the 2D embedding)
            const combinedScore = this.liveScorer.calculateScore(`${functionX}, ${functionY}`, 'primefold', config);
            
            // Strip function notation for individual complexity calculations
            const exprX = functionX.replace('f(n) =', '').trim();
            const exprY = functionY.replace('g(n) =', '').trim();
            
            // Calculate individual complexities and sum them
            const scoreX = this.liveScorer.calculateScore(exprX, 'primegen', config);
            const scoreY = this.liveScorer.calculateScore(exprY, 'primegen', config);
            const combinedComplexity = scoreX.components.complexity + scoreY.components.complexity;
            
            // Update combined score and complexity
            document.getElementById('primefoldCombinedScore').textContent = combinedScore.total.toFixed(3);
            document.getElementById('primefoldCombinedComplexity').textContent = combinedComplexity;
            
            // Update statistics
            this.statsDisplay.updateStats('primefold', combinedScore.total, combinedScore.components);
            
        } catch (error) {
            console.error('Error updating PrimeFold scores:', error);
            this.log('Error updating PrimeFold scores: ' + error.message, 'error');
        }
    }
    
    getParameters() {
        const algorithm = document.getElementById('algorithm').value;
        const iterations = parseInt(document.getElementById('iterations').value);
        const sampleSize = parseInt(document.getElementById('sampleSize').value);
        const displayPoints = parseInt(document.getElementById('displayPoints').value);
        const enforceSymmetry = document.getElementById('enforceSymmetry').checked;
        
        const params = {
            mode: this.currentMode,
            algorithm,
            iterations,
            sampleSize,
            displayPoints,
            enforceSymmetry,
            primes: this.primes,
            composites: this.composites
        };
        // Pass fitnessConfig for primefold mode
        if (this.currentMode === 'primefold') {
            params.fitnessConfig = fitnessConfig || getDefaultFitnessConfig();
        }
        
        // Add algorithm-specific parameters
        switch (algorithm) {
            case 'lahc':
                params.historyLength = parseInt(document.getElementById('historyLength').value);
                break;
            case 'ga':
                params.populationSize = parseInt(document.getElementById('populationSize').value);
                break;
            case 'sa':
                params.startTemp = parseFloat(document.getElementById('startTemp').value);
                break;
        }
        
        return params;
    }
    
    exportFunction() {
        const mainFunction = document.getElementById('mainFunction').textContent;
        const mainScore = document.getElementById('mainFunctionScore').textContent;
        const timestamp = new Date().toISOString().slice(0, 19);
        
        const content = `PrimeFold ${this.currentMode} Function
Generated: ${timestamp}
Function: ${mainFunction}
Score: ${mainScore}

Usage:
- Copy the function expression
- Use in your own applications
- Test with different ranges`;
        
        const filename = `primefold_${this.currentMode}_${timestamp}.txt`;
        this.downloadFile(filename, content);
        
        this.log(`Function exported: ${filename}`, 'success');
    }
    
    downloadFile(filename, content) {
        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
    
    showHelp() {
        document.getElementById('helpModal').style.display = 'block';
    }
    
    // Logging functionality
    log(message, type = 'info') {
        try {
            const logContainer = document.getElementById('logContainer');
            if (!logContainer) {
                console.warn('Log container not found, logging to console instead');
                console.log(`[${type.toUpperCase()}] ${message}`);
                return;
            }
            
            const logEntry = document.createElement('div');
            logEntry.className = `log-entry ${type}`;
            
            const timestamp = new Date().toLocaleTimeString();
            logEntry.textContent = `[${timestamp}] ${message}`;
            
            logContainer.appendChild(logEntry);
            
            // Auto-scroll to bottom
            logContainer.scrollTop = logContainer.scrollHeight;
            
            // Keep only last 50 entries
            while (logContainer.children.length > 50) {
                logContainer.removeChild(logContainer.firstChild);
            }
        } catch (error) {
            console.error('Error in log function:', error);
            console.log(`[${type.toUpperCase()}] ${message}`);
        }
    }
    
    // Clear log functionality
    clearLog() {
        try {
            const logContainer = document.getElementById('logContainer');
            if (logContainer) {
                logContainer.innerHTML = '';
                this.log('Log cleared', 'info');
            }
        } catch (error) {
            console.error('Error clearing log:', error);
        }
    }
    
    // Copy log to clipboard functionality
    copyLogToClipboard() {
        try {
            const logContainer = document.getElementById('logContainer');
            if (!logContainer) {
                console.warn('Log container not found');
                return;
            }
            
            // Get all log entries
            const logEntries = logContainer.querySelectorAll('.log-entry');
            const logText = Array.from(logEntries)
                .map(entry => entry.textContent)
                .join('\n');
            
            // Copy to clipboard
            if (navigator.clipboard && window.isSecureContext) {
                // Use modern clipboard API
                navigator.clipboard.writeText(logText).then(() => {
                    this.log('Log copied to clipboard', 'success');
                }).catch(err => {
                    console.error('Failed to copy to clipboard:', err);
                    this.fallbackCopyToClipboard(logText);
                });
            } else {
                // Fallback for older browsers
                this.fallbackCopyToClipboard(logText);
            }
        } catch (error) {
            console.error('Error copying log to clipboard:', error);
            this.log('Failed to copy log to clipboard', 'error');
        }
    }
    
    // Fallback copy method for older browsers
    fallbackCopyToClipboard(text) {
        try {
            const textArea = document.createElement('textarea');
            textArea.value = text;
            textArea.style.position = 'fixed';
            textArea.style.left = '-999999px';
            textArea.style.top = '-999999px';
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            
            const successful = document.execCommand('copy');
            document.body.removeChild(textArea);
            
            if (successful) {
                this.log('Log copied to clipboard', 'success');
            } else {
                this.log('Failed to copy log to clipboard', 'error');
            }
        } catch (error) {
            console.error('Fallback copy failed:', error);
            this.log('Failed to copy log to clipboard', 'error');
        }
    }
    
    updateStatisticsTitle() {
        const sampleSize = parseInt(document.getElementById('sampleSize').value);
        const statsTitle = document.getElementById('statsTitle');
        if (statsTitle) {
            statsTitle.textContent = `Statistics for Sample Size: ${sampleSize}`;
        }
    }
}

// Initialize application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new PrimeFoldApp();
    // --- ADDED: Force recalculation after DOM/UI is fully set up ---
    setTimeout(() => {
        if (window.app.currentMode === 'primefold') {
            window.app.updatePrimeFoldScores();
        }
    }, 0);
});

// --- Fitness Function Section Logic ---
const FITNESS_METRICS = [
          { key: 'areaCoverage', label: 'Area Coverage', defaultWeight: 0.50, hasThreshold: true },
  { key: 'separation', label: 'Separation', defaultWeight: 0.25 },
  { key: 'contrast', label: 'Contrast', defaultWeight: 0.20 },
  { key: 'significance', label: 'Significance', defaultWeight: 0.10 },
  { key: 'specificity', label: 'Specificity', defaultWeight: 0.05 }
];

function getDefaultFitnessConfig() {
  const config = {};
  FITNESS_METRICS.forEach(m => {
    const metricConfig = { enabled: true, weight: m.defaultWeight };
    
    // Add threshold for area coverage
    if (m.hasThreshold) {
      metricConfig.threshold = 0.15;
    }
    
    config[m.key] = metricConfig;
  });
  return config;
}

function updateFitnessConfigFromUI() {
  FITNESS_METRICS.forEach(m => {
    const enabled = document.getElementById(`metric-${m.key}`).checked;
    let weight = parseFloat(document.getElementById(`weight-${m.key}`).value);
    // Clamp weight to [0,1] and default to 0 if invalid
    if (isNaN(weight) || weight < 0) weight = 0;
    if (weight > 1) weight = 1;
    
    const config = { enabled, weight };
    
    // Handle threshold for area coverage
    if (m.hasThreshold) {
      const thresholdElement = document.getElementById(`threshold-${m.key}`);
      if (thresholdElement) {
        let threshold = parseFloat(thresholdElement.value);
        if (isNaN(threshold) || threshold < 0) threshold = 0.1;
        if (threshold > 1) threshold = 1;
        config.threshold = threshold;
      }
    }
    
    fitnessConfig[m.key] = config;
  });
  updateFitnessUI();
  // --- ADDED: Update score in PrimeFold mode when fitness function changes ---
  if (window.app && window.app.currentMode === 'primefold') {
    window.app.updatePrimeFoldScores();
  }
}

function updateFitnessUI() {
  // Update weights in UI (auto-normalized)
  FITNESS_METRICS.forEach(m => {
    document.getElementById(`weight-${m.key}`).value = fitnessConfig[m.key].weight;
  });
  // Update formula preview
  const terms = [];
  FITNESS_METRICS.forEach(m => {
    if (fitnessConfig[m.key].enabled && fitnessConfig[m.key].weight > 0) {
      const sign = '+';
      const w = fitnessConfig[m.key].weight;
      const label = m.label;
      terms.push(`${sign === '-' ? '-' : ''}${w} × ${label}`);
    }
  });
  let formula = 'Fitness = ';
  if (terms.length > 0) {
    formula += terms.join(' + ').replace('+ -', '- ');
  } else {
    formula += '0';
  }
  document.getElementById('fitness-formula-preview').textContent = formula;
  // Show warning if all metrics are disabled or all weights are zero
  const warningDiv = document.getElementById('fitness-warning');
  const allDisabled = FITNESS_METRICS.every(m => !fitnessConfig[m.key].enabled);
  const allZero = FITNESS_METRICS.every(m => fitnessConfig[m.key].weight === 0);
  if (allDisabled) {
    warningDiv.textContent = 'At least one metric must be enabled.';
    warningDiv.style.display = '';
  } else if (allZero) {
    warningDiv.textContent = 'At least one metric must have a nonzero weight.';
    warningDiv.style.display = '';
  } else {
    warningDiv.textContent = '';
    warningDiv.style.display = 'none';
  }
}

function resetFitnessConfig() {
  fitnessConfig = getDefaultFitnessConfig();
  FITNESS_METRICS.forEach(m => {
    document.getElementById(`metric-${m.key}`).checked = true;
    document.getElementById(`weight-${m.key}`).value = m.defaultWeight;
    // Reset threshold for area coverage
    if (m.hasThreshold) {
      const thresholdElement = document.getElementById(`threshold-${m.key}`);
      if (thresholdElement) {
        thresholdElement.value = '0.15'; // Set to 0.15 as default
      }
    }
  });
  updateFitnessConfigFromUI();
}

function setupFitnessSection() {
  // Attach event listeners
  FITNESS_METRICS.forEach(m => {
    const metricElement = document.getElementById(`metric-${m.key}`);
    const weightElement = document.getElementById(`weight-${m.key}`);
    
    if (metricElement) {
      metricElement.addEventListener('change', updateFitnessConfigFromUI);
    }
    if (weightElement) {
      weightElement.addEventListener('input', updateFitnessConfigFromUI);
    }
    
    // Add threshold event listener for area coverage
    if (m.hasThreshold) {
      const thresholdElement = document.getElementById(`threshold-${m.key}`);
      if (thresholdElement) {
        thresholdElement.addEventListener('input', updateFitnessConfigFromUI);
      }
    }
  });
  
  const resetBtn = document.getElementById('fitness-reset-btn');
  if (resetBtn) {
    resetBtn.addEventListener('click', resetFitnessConfig);
  }
  
  // Initialize config
  fitnessConfig = getDefaultFitnessConfig();
  updateFitnessUI();
}

// Show/hide fitness section based on mode
function setFitnessSectionVisibility(mode) {
  const section = document.getElementById('fitness-section');
  const symmetryOption = document.getElementById('symmetry-option');
  
  if (mode === 'primefold') {
    section.style.display = '';
    if (symmetryOption) {
      symmetryOption.style.display = 'block';
    }
  } else {
    section.style.display = 'none';
    if (symmetryOption) {
      symmetryOption.style.display = 'none';
    }
  }
}

// --- Integration with rest of app ---
// Initialize fitness config immediately
let fitnessConfig = getDefaultFitnessConfig();

// Call setupFitnessSection() on page load
window.addEventListener('DOMContentLoaded', () => {
  setupFitnessSection();
});

// Example: Call setFitnessSectionVisibility('primefold') when switching modes
// (You should call this from your mode-switching logic)
// setFitnessSectionVisibility('primefold');

// To use the config in the fitness function, pass fitnessConfig as an argument
// (You will need to update evaluators.js/optimizers.js to accept and use this config)
// Example: evaluators.calculatePrimeFoldScore(exprX, exprY, sampleSize, fitnessConfig);

// Resizable Sliders Functionality
class ResizablePanels {
    constructor() {
        this.isResizing = false;
        this.currentResizer = null;
        this.startX = 0;
        this.startY = 0;
        this.startWidth = 0;
        this.startHeight = 0;
        
        this.initialize();
    }
    
    initialize() {
        // Vertical resizer (between left and right panels)
        const verticalResizer = document.getElementById('verticalResizer');
        const leftPanel = document.getElementById('leftPanel');
        const rightPanel = document.getElementById('rightPanel');
        
        // Horizontal resizer (between visualization and log)
        const horizontalResizer = document.getElementById('horizontalResizer');
        const visualizationContainer = document.getElementById('visualizationContainer');
        const logSection = document.getElementById('logSection');
        
        // Add event listeners for vertical resizer
        verticalResizer.addEventListener('mousedown', (e) => {
            this.startResize(e, 'vertical', leftPanel, rightPanel);
        });
        
        // Add event listeners for horizontal resizer
        horizontalResizer.addEventListener('mousedown', (e) => {
            this.startResize(e, 'horizontal', visualizationContainer, logSection);
        });
        
        // Global mouse events
        document.addEventListener('mousemove', (e) => {
            this.handleMouseMove(e);
        });
        
        document.addEventListener('mouseup', () => {
            this.stopResize();
        });
        
        // Prevent text selection during resize
        document.addEventListener('selectstart', (e) => {
            if (this.isResizing) {
                e.preventDefault();
            }
        });
    }
    
    startResize(e, direction, panel1, panel2) {
        this.isResizing = true;
        this.currentResizer = direction;
        this.startX = e.clientX;
        this.startY = e.clientY;
        
        if (direction === 'vertical') {
            this.startWidth = panel1.offsetWidth;
            panel1.classList.add('resizing');
            panel2.classList.add('resizing');
        } else {
            this.startHeight = panel1.offsetHeight;
            panel1.classList.add('resizing');
            panel2.classList.add('resizing');
        }
        
        document.body.style.cursor = direction === 'vertical' ? 'col-resize' : 'row-resize';
        document.body.style.userSelect = 'none';
    }
    
    handleMouseMove(e) {
        if (!this.isResizing) return;
        
        if (this.currentResizer === 'vertical') {
            this.handleVerticalResize(e);
        } else {
            this.handleHorizontalResize(e);
        }
    }
    
    handleVerticalResize(e) {
        const leftPanel = document.getElementById('leftPanel');
        const rightPanel = document.getElementById('rightPanel');
        
        const deltaX = e.clientX - this.startX;
        const newLeftWidth = this.startWidth + deltaX;
        
        // Apply constraints
        const minWidth = 300;
        const maxWidth = 600;
        const constrainedWidth = Math.max(minWidth, Math.min(maxWidth, newLeftWidth));
        
        leftPanel.style.flex = `0 0 ${constrainedWidth}px`;
    }
    
    handleHorizontalResize(e) {
        const visualizationContainer = document.getElementById('visualizationContainer');
        const logSection = document.getElementById('logSection');
        const rightPanel = document.getElementById('rightPanel');
        
        const deltaY = e.clientY - this.startY;
        const rightPanelRect = rightPanel.getBoundingClientRect();
        const resizerRect = document.getElementById('horizontalResizer').getBoundingClientRect();
        
        const relativeY = e.clientY - rightPanelRect.top;
        const totalHeight = rightPanel.offsetHeight;
        const newLogHeight = totalHeight - relativeY;
        
        // Apply constraints
        const minLogHeight = 150;
        const maxLogHeight = totalHeight * 0.7;
        const constrainedLogHeight = Math.max(minLogHeight, Math.min(maxLogHeight, newLogHeight));
        
        logSection.style.height = `${constrainedLogHeight}px`;
        logSection.style.flex = 'none';
        visualizationContainer.style.flex = '1';
    }
    
    stopResize() {
        if (!this.isResizing) return;
        
        this.isResizing = false;
        this.currentResizer = null;
        
        // Remove resizing classes
        document.getElementById('leftPanel').classList.remove('resizing');
        document.getElementById('rightPanel').classList.remove('resizing');
        document.getElementById('visualizationContainer').classList.remove('resizing');
        document.getElementById('logSection').classList.remove('resizing');
        
        // Reset cursor and user select
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        
        // Trigger canvas resize if visualization exists
        if (window.app && window.app.visualization) {
            window.app.visualization.resize();
        }
    }
}

// Initialize resizable panels
window.addEventListener('DOMContentLoaded', () => {
    window.resizablePanels = new ResizablePanels();
}); 