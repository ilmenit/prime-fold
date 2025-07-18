// Expression Compilation System
class ExpressionCompiler {
    constructor() {
        this.cache = new Map();
        this.allowedFunctions = {
            "sin": Math.sin,
            "cos": Math.cos,
            "sqrt": x => Math.sqrt(Math.abs(x)),
            "log": x => Math.log(Math.abs(x) + 1e-12),
            "abs": Math.abs,
            "pi": Math.PI,
            "e": Math.E,
            "sqrt2": Math.sqrt(2),
            "phi": (1 + Math.sqrt(5)) / 2 // golden ratio
        };
    }
    
    compileExpression(expr) {
        // Check cache first
        if (this.cache.has(expr)) {
            return this.cache.get(expr);
        }
        
        try {
            // Validate expression
            this.validateExpression(expr);
            
            // Create safe function
            const func = this.createSafeFunction(expr);
            
            // Cache the result
            this.cache.set(expr, func);
            
            return func;
        } catch (error) {
            console.error(`Failed to compile expression: ${expr}`, error);
            // Return identity function as fallback
            return n => n;
        }
    }
    
    validateExpression(expr) {
        // Basic validation - check for dangerous patterns
        const dangerousPatterns = [
            /eval\s*\(/,
            /Function\s*\(/,
            /setTimeout\s*\(/,
            /setInterval\s*\(/,
            /document\./,
            /window\./,
            /localStorage\./,
            /sessionStorage\./,
            /XMLHttpRequest/,
            /fetch\s*\(/,
            /import\s/,
            /require\s*\(/,
            /process\./,
            /global\./,
            /__proto__/,
            /constructor/,
            /prototype/
        ];
        
        for (const pattern of dangerousPatterns) {
            if (pattern.test(expr)) {
                throw new Error(`Expression contains dangerous pattern: ${pattern}`);
            }
        }
    }
    
    createSafeFunction(expr) {
        // Create a safe evaluation context
        const safeEval = (n) => {
            try {
                // Create a new function with restricted scope
                const func = new Function('n', 'sin', 'cos', 'sqrt', 'log', 'abs', 'pi', 'e', 'sqrt2', 'phi', 
                    `return ${expr};`);
                
                return func(n, 
                    this.allowedFunctions.sin,
                    this.allowedFunctions.cos,
                    this.allowedFunctions.sqrt,
                    this.allowedFunctions.log,
                    this.allowedFunctions.abs,
                    this.allowedFunctions.pi,
                    this.allowedFunctions.e,
                    this.allowedFunctions.sqrt2,
                    this.allowedFunctions.phi
                );
            } catch (error) {
                console.warn(`Error evaluating expression: ${expr}`, error);
                return 0; // Return 0 for invalid expressions
            }
        };
        
        // Create vectorized version for arrays
        const vectorizedEval = (arr) => {
            if (Array.isArray(arr)) {
                return arr.map(n => safeEval(n));
            }
            return safeEval(arr);
        };
        
        // Add both scalar and vectorized versions
        vectorizedEval.scalar = safeEval;
        vectorizedEval.vectorized = vectorizedEval;
        
        return vectorizedEval;
    }
    
    // Compile multiple expressions (for PrimeFold mode)
    compileExpressions(exprs) {
        if (typeof exprs === 'string') {
            // Single expression
            return [this.compileExpression(exprs)];
        }
        
        if (Array.isArray(exprs)) {
            // Multiple expressions
            return exprs.map(expr => this.compileExpression(expr));
        }
        
        throw new Error('Invalid expressions format');
    }
    
    // Clear cache
    clearCache() {
        this.cache.clear();
    }
    
    // Get cache size
    getCacheSize() {
        return this.cache.size;
    }
}

// Global compiler instance
window.expressionCompiler = new ExpressionCompiler();

// Convenience functions
window.compileExpression = (expr) => window.expressionCompiler.compileExpression(expr);
window.compileExpressions = (exprs) => window.expressionCompiler.compileExpressions(exprs); 