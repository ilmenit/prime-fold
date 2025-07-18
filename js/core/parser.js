// Simple Expression Parser
class ExpressionParser {
    constructor() {
        this.operators = {
            '+': { precedence: 1, associativity: 'left' },
            '-': { precedence: 1, associativity: 'left' },
            '*': { precedence: 2, associativity: 'left' },
            '/': { precedence: 2, associativity: 'left' },
            '%': { precedence: 2, associativity: 'left' },
            'mod': { precedence: 2, associativity: 'left' },
            '^': { precedence: 3, associativity: 'right' }
        };
        
        this.functions = ['sin', 'cos', 'sqrt', 'log', 'abs', 'floor', 'ceil', 'square', 'cube', 'sind', 'cosd'];
        this.constants = {
            'pi': Math.PI,
            'e': Math.E,
            'sqrt2': Math.sqrt(2),
            'phi': (1 + Math.sqrt(5)) / 2
        };
        this.lastUnknownTokens = [];
    }
    
    parse(expression) {
        this.lastUnknownTokens = [];
        try {
            // Clean the expression
            const cleaned = this.cleanExpression(expression);
            
            // Convert to postfix notation
            const postfix = this.infixToPostfix(cleaned);
            
            // Build expression tree
            const tree = this.buildTree(postfix);
            if (this.lastUnknownTokens.length > 0) {
                throw new Error('Unknown tokens: ' + this.lastUnknownTokens.join(', '));
            }
            return tree;
        } catch (error) {
            console.warn('Failed to parse expression:', expression, error);
            // Return identity function as fallback
            return new IdNode();
        }
    }
    
    cleanExpression(expr) {
        // Remove extra spaces and normalize
        return expr.replace(/\s+/g, ' ').trim();
    }
    
    infixToPostfix(expression) {
        const output = [];
        const operators = [];
        const tokens = this.tokenize(expression);
        
        for (const token of tokens) {
            if (this.isNumber(token)) {
                output.push(parseFloat(token));
            } else if (this.isVariable(token)) {
                output.push(token);
            } else if (this.isConstant(token)) {
                output.push(token); // Push constant token for later processing
            } else if (this.isFunction(token)) {
                operators.push(token);
            } else if (this.isOperator(token)) {
                while (operators.length > 0 && 
                       this.isOperator(operators[operators.length - 1]) &&
                       this.getPrecedence(operators[operators.length - 1]) >= this.getPrecedence(token)) {
                    output.push(operators.pop());
                }
                operators.push(token);
            } else if (token === '(') {
                operators.push(token);
            } else if (token === ')') {
                while (operators.length > 0 && operators[operators.length - 1] !== '(') {
                    output.push(operators.pop());
                }
                if (operators.length > 0 && operators[operators.length - 1] === '(') {
                    operators.pop(); // Remove '('
                }
            } else {
                // Unknown token
                this.lastUnknownTokens.push(token);
            }
        }
        
        while (operators.length > 0) {
            output.push(operators.pop());
        }
        
        return output;
    }
    
    tokenize(expression) {
        const tokens = [];
        let current = '';
        
        for (let i = 0; i < expression.length; i++) {
            const char = expression[i];
            
            if (char === ' ') continue;
            
            if (this.isDigit(char) || char === '.') {
                current += char;
            } else if (this.isLetter(char)) {
                current += char;
            } else {
                if (current) {
                    tokens.push(current);
                    current = '';
                }
                tokens.push(char);
            }
        }
        
        if (current) {
            tokens.push(current);
        }
        
        return tokens;
    }
    
    buildTree(postfix) {
        const stack = [];
        
        for (const token of postfix) {
            if (this.isNumber(token)) {
                stack.push(new ConstNode(token));
            } else if (this.isVariable(token)) {
                stack.push(new IdNode());
            } else if (this.isConstant(token)) {
                stack.push(new ConstNode(this.constants[token]));
            } else if (this.isFunction(token)) {
                if (stack.length > 0) {
                    const operand = stack.pop();
                    stack.push(new UnaryNode(token, operand));
                }
            } else if (this.isOperator(token)) {
                if (stack.length >= 2) {
                    const right = stack.pop();
                    const left = stack.pop();
                    stack.push(new BinaryNode(token, left, right));
                }
            }
        }
        
        return stack.length > 0 ? stack[0] : new IdNode();
    }
    
    isNumber(token) {
        return !isNaN(token) && token !== '';
    }
    
    isVariable(token) {
        return token === 'n';
    }
    
    isConstant(token) {
        return this.constants.hasOwnProperty(token);
    }
    
    isFunction(token) {
        return this.functions.includes(token);
    }
    
    isOperator(token) {
        return this.operators.hasOwnProperty(token);
    }
    
    isDigit(char) {
        return /[0-9]/.test(char);
    }
    
    isLetter(char) {
        return /[a-zA-Z]/.test(char);
    }
    
    getPrecedence(operator) {
        return this.operators[operator]?.precedence || 0;
    }
}

// Global parser instance
window.expressionParser = new ExpressionParser();

// Convenience function
window.parseExpression = (expr) => window.expressionParser.parse(expr); 