// Expression Tree System
class ExprNode {
    constructor() {
        if (this.constructor === ExprNode) {
            throw new Error("ExprNode is abstract and cannot be instantiated");
        }
    }
    
    size() {
        throw new Error("size() must be implemented by subclass");
    }
    
    toStr() {
        throw new Error("toStr() must be implemented by subclass");
    }
    
    evaluate(n) {
        throw new Error("evaluate() must be implemented by subclass");
    }
    
    mutate(rnd) {
        throw new Error("mutate() must be implemented by subclass");
    }
    
    _pickRandomSubtree(rnd) {
        if (rnd.random() < 1 / this.size()) {
            return this;
        }
        if (this instanceof UnaryNode) {
            return this.child._pickRandomSubtree(rnd);
        }
        if (this instanceof BinaryNode) {
            return rnd.choice([this.left, this.right])._pickRandomSubtree(rnd);
        }
        return this;
    }
}

class ConstNode extends ExprNode {
    constructor(value) {
        super();
        this.value = value;
    }
    
    size() {
        return 1;
    }
    
    toStr() {
        return this.value.toString();
    }
    
    evaluate(n) {
        return this.value;
    }
    
    mutate(rnd) {
        if (typeof this.value === 'number' && Number.isInteger(this.value)) {
            return new ConstNode(this.value + rnd.randint(-2, 2));
        } else {
            return new ConstNode(this.value + rnd.uniform(-0.5, 0.5));
        }
    }
}

class IdNode extends ExprNode {
    size() {
        return 1;
    }
    
    toStr() {
        return "n";
    }
    
    evaluate(n) {
        return n;
    }
    
    mutate(rnd) {
        return rnd.random() < 0.3 ? new ConstNode(rnd.randint(1, 10)) : this;
    }
}

class ModNode extends ExprNode {
    constructor(child, mod) {
        super();
        this.child = child;
        this.mod = mod;
    }
    
    size() {
        return 1 + this.child.size();
    }
    
    toStr() {
        return `(${this.child.toStr()} % ${this.mod})`;
    }
    
    evaluate(n) {
        const value = this.child.evaluate(n);
        return value % this.mod;
    }
    
    mutate(rnd) {
        if (rnd.random() < 0.3) {
            const newMod = Math.max(2, Math.min(101, this.mod + rnd.randint(-5, 5)));
            return new ModNode(this.child.mutate(rnd), newMod);
        }
        return this.child.mutate(rnd);
    }
}

class UnaryNode extends ExprNode {
    constructor(op, child) {
        super();
        this.op = op;
        this.child = child;
    }
    
    size() {
        return 1 + this.child.size();
    }
    
    toStr() {
        const inner = this.child.toStr();
        if (this.op === "log") {
            return `log(${inner})`;
        }
        if (this.op === "sqrt") {
            return `sqrt(${inner})`;
        }
        if (this.op === "square") {
            return `(${inner})^2`;
        }
        if (this.op === "cube") {
            return `(${inner})^3`;
        }
        return `${this.op}(${inner})`;
    }
    
    evaluate(n) {
        const value = this.child.evaluate(n);
        switch (this.op) {
            case "sin": return Math.sin(value);
            case "cos": return Math.cos(value);
            case "sqrt": return Math.sqrt(value);
            case "log": return Math.log(value);
            case "abs": return Math.abs(value);
            case "floor": return Math.floor(value);
            case "ceil": return Math.ceil(value);
            case "square": return value * value;
            case "cube": return value * value * value;
            case "sind": return Math.sin(value * Math.PI / 180);
            case "cosd": return Math.cos(value * Math.PI / 180);
            default: return value;
        }
    }
    
    mutate(rnd) {
        if (rnd.random() < 0.3) {
            const unaryOps = Object.keys(UNARY_OPS);
            const newOp = rnd.choice(unaryOps);
            return new UnaryNode(newOp, this.child);
        }
        if (rnd.random() < 0.5) {
            return new UnaryNode(this.op, this.child.mutate(rnd));
        }
        return this.child;
    }
}

class BinaryNode extends ExprNode {
    constructor(op, left, right) {
        super();
        this.op = op;
        this.left = left;
        this.right = right;
    }
    
    size() {
        return 1 + this.left.size() + this.right.size();
    }
    
    toStr() {
        const l = this.left.toStr();
        const r = this.right.toStr();
        if (this.op === "/") {
            return `(${l}) / (${r})`;
        }
        if (this.op === "mod") {
            return `(${l}) % (${r})`;
        }
        if (this.op === "^") {
            return `(${l})^(${r})`;
        }
        return `(${l}) ${this.op} (${r})`;
    }
    
    evaluate(n) {
        const leftVal = this.left.evaluate(n);
        const rightVal = this.right.evaluate(n);
        
        switch (this.op) {
            case "+": return leftVal + rightVal;
            case "-": return leftVal - rightVal;
            case "*": return leftVal * rightVal;
            case "/": return leftVal / rightVal;
            case "mod": return rightVal !== 0 ? leftVal % rightVal : leftVal;
            case "^": 
                // Safe exponentiation with edge case handling
                try {
                    // Handle special cases
                    if (leftVal === 0 && rightVal === 0) {
                        return 1; // 0^0 = 1 (JavaScript convention)
                    }
                    if (leftVal < 0 && rightVal !== Math.floor(rightVal)) {
                        return NaN; // Negative base with non-integer exponent
                    }
                    if (Math.abs(leftVal) > 1e6 || Math.abs(rightVal) > 1e6) {
                        return NaN; // Prevent overflow
                    }
                    const result = Math.pow(leftVal, rightVal);
                    return isFinite(result) ? result : NaN;
                } catch (error) {
                    return NaN;
                }
            default: return leftVal;
        }
    }
    
    mutate(rnd) {
        const choice = rnd.random();
        if (choice < 0.4) {
            return new BinaryNode(this.op, this.left.mutate(rnd), this.right);
        }
        if (choice < 0.8) {
            return new BinaryNode(this.op, this.left, this.right.mutate(rnd));
        }
        const binaryOps = Object.keys(BINARY_OPS);
        return new BinaryNode(rnd.choice(binaryOps), this.left, this.right);
    }
}

// Constants and operations
const UNARY_OPS = {
    "sin": "sin",
    "cos": "cos",
    "sqrt": "sqrt",
    "log": "log",
    "abs": "abs",
    "floor": "floor",
    "ceil": "ceil",
    "square": "square",
    "cube": "cube",
    "sind": "sind",
    "cosd": "cosd"
};

const BINARY_OPS = {
    "+": "+",
    "-": "-",
    "*": "*",
    "/": "/",
    "mod": "mod",
    "^": "^"
};

const IRRATIONAL_CONSTANTS = [
    Math.PI,
    Math.E,
    Math.sqrt(2),
    (1 + Math.sqrt(5)) / 2 // golden ratio
];

// Random number generator with methods
class Random {
    constructor(seed = Date.now()) {
        this.seed = seed;
    }
    
    random() {
        this.seed = (this.seed * 9301 + 49297) % 233280;
        return this.seed / 233280;
    }
    
    randint(min, max) {
        return Math.floor(this.random() * (max - min + 1)) + min;
    }
    
    uniform(min, max) {
        return this.random() * (max - min) + min;
    }
    
    choice(array) {
        return array[this.randint(0, array.length - 1)];
    }
}

// Tree generation functions
function randomLeaf(rnd) {
    const choice = rnd.random();
    if (choice < 0.4) {
        return new IdNode();
    }
    if (choice < 0.6) {
        return new ConstNode(rnd.choice(IRRATIONAL_CONSTANTS));
    }
    return new ConstNode(rnd.randint(1, 10));
}

function randomTree(rnd, maxDepth = 3) {
    if (maxDepth === 0) {
        return randomLeaf(rnd);
    }
    
    const p = rnd.random();
    if (p < 0.2) {
        return new ModNode(randomTree(rnd, maxDepth - 1), rnd.randint(2, 101));
    }
    if (p < 0.5) {
        return new UnaryNode(rnd.choice(Object.keys(UNARY_OPS)), randomTree(rnd, maxDepth - 1));
    }
    return new BinaryNode(rnd.choice(Object.keys(BINARY_OPS)), randomTree(rnd, maxDepth - 1), randomTree(rnd, maxDepth - 1));
}

// Polynomial detection and coefficient perturbation
class PolynomialDetector {
    static isPolynomial(node) {
        if (node instanceof ConstNode || node instanceof IdNode) {
            return true;
        }
        if (node instanceof BinaryNode && (node.op === "+" || node.op === "-" || node.op === "*")) {
            return this.isPolynomial(node.left) && this.isPolynomial(node.right);
        }
        if (node instanceof UnaryNode && (node.op === "square" || node.op === "cube")) {
            return this.isPolynomial(node.child);
        }
        if (node instanceof ModNode) {
            return this.isPolynomial(node.child);
        }
        return false;
    }
    
    static extractCoefficients(node) {
        const coeffs = [];
        this._extractCoeffsRecursive(node, coeffs);
        return coeffs;
    }
    
    static _extractCoeffsRecursive(node, coeffs) {
        if (node instanceof ConstNode) {
            coeffs.push({ node, value: node.value });
        } else if (node instanceof BinaryNode && node.op === "*") {
            // Handle multiplication: find constant * variable patterns
            if (node.left instanceof ConstNode && node.right instanceof IdNode) {
                coeffs.push({ node: node.left, value: node.left.value });
            } else if (node.right instanceof ConstNode && node.left instanceof IdNode) {
                coeffs.push({ node: node.right, value: node.right.value });
            } else {
                this._extractCoeffsRecursive(node.left, coeffs);
                this._extractCoeffsRecursive(node.right, coeffs);
            }
        } else if (node instanceof BinaryNode) {
            this._extractCoeffsRecursive(node.left, coeffs);
            this._extractCoeffsRecursive(node.right, coeffs);
        } else if (node instanceof UnaryNode) {
            this._extractCoeffsRecursive(node.child, coeffs);
        } else if (node instanceof ModNode) {
            this._extractCoeffsRecursive(node.child, coeffs);
        }
    }
    
    static perturbCoefficient(coeffNode, rnd) {
        if (coeffNode instanceof ConstNode) {
            const currentValue = coeffNode.value;
            let newValue;
            
            if (Number.isInteger(currentValue)) {
                // Integer coefficient: small integer perturbation
                newValue = currentValue + rnd.randint(-2, 2);
                // Ensure we don't get zero for important coefficients
                if (Math.abs(currentValue) > 1 && newValue === 0) {
                    newValue = rnd.choice([-1, 1]);
                }
            } else {
                // Float coefficient: small percentage perturbation
                const perturbation = rnd.uniform(-0.1, 0.1);
                newValue = currentValue * (1 + perturbation);
                // Avoid very small values that might cause numerical issues
                if (Math.abs(newValue) < 1e-6) {
                    newValue = rnd.choice([-0.1, 0.1]);
                }
            }
            
            return new ConstNode(newValue);
        }
        return coeffNode;
    }
}

// Enhanced mutation function with coefficient perturbation
function mutateTree(tree, rnd) {
    const action = rnd.random();
    
    // New: Coefficient perturbation for polynomials (15% chance)
    if (action < 0.15 && PolynomialDetector.isPolynomial(tree)) {
        const coeffs = PolynomialDetector.extractCoefficients(tree);
        if (coeffs.length > 0) {
            const selectedCoeff = rnd.choice(coeffs);
            const perturbedCoeff = PolynomialDetector.perturbCoefficient(selectedCoeff.node, rnd);
            
            // Create a deep copy and replace the coefficient by value
            const newTree = deepCopy(tree);
            const success = _replaceCoefficientByValue(newTree, selectedCoeff.value, perturbedCoeff.value);
            if (success) {
                return newTree;
            }
        }
    }
    
    // Adjusted probabilities to sum to 1.0
    if (action < 0.35) {
        // replace subtree
        return randomTree(rnd, 3);
    }
    if (action < 0.70) {
        // mutate inside
        return tree.mutate(rnd);
    }
    if (action < 0.85 && tree instanceof BinaryNode) {
        // swap operands
        return new BinaryNode(tree.op, tree.right, tree.left);
    }
    // delete wrapper if unary (15% chance)
    if (tree instanceof UnaryNode) {
        return tree.child;
    }
    return tree;
}

// Helper function to replace coefficients in tree by value (not reference)
function _replaceCoefficientByValue(node, oldValue, newValue) {
    if (node instanceof ConstNode) {
        // Use relative tolerance for better numerical stability
        const tolerance = Math.max(1e-10, Math.abs(oldValue) * 1e-10);
        if (Math.abs(node.value - oldValue) < tolerance) {
            node.value = newValue;
            return true;
        }
    } else if (node instanceof BinaryNode) {
        // Recursively search in children
        if (_replaceCoefficientByValue(node.left, oldValue, newValue)) {
            return true;
        }
        return _replaceCoefficientByValue(node.right, oldValue, newValue);
    } else if (node instanceof UnaryNode) {
        return _replaceCoefficientByValue(node.child, oldValue, newValue);
    } else if (node instanceof ModNode) {
        return _replaceCoefficientByValue(node.child, oldValue, newValue);
    }
    return false;
}

// Crossover functions
function _collectNodes(node, parent, out) {
    out.push([node, parent]);
    if (node instanceof UnaryNode || node instanceof ModNode) {
        _collectNodes(node.child, node, out);
    } else if (node instanceof BinaryNode) {
        _collectNodes(node.left, node, out);
        _collectNodes(node.right, node, out);
    }
}

function _replaceChild(parent, oldChild, newChild) {
    if (parent instanceof UnaryNode || parent instanceof ModNode) {
        parent.child = newChild;
    } else if (parent instanceof BinaryNode) {
        if (parent.left === oldChild) {
            parent.left = newChild;
        } else {
            parent.right = newChild;
        }
    }
}

function deepCopy(node) {
    if (node instanceof ConstNode) {
        return new ConstNode(node.value);
    }
    if (node instanceof IdNode) {
        return new IdNode();
    }
    if (node instanceof ModNode) {
        return new ModNode(deepCopy(node.child), node.mod);
    }
    if (node instanceof UnaryNode) {
        return new UnaryNode(node.op, deepCopy(node.child));
    }
    if (node instanceof BinaryNode) {
        return new BinaryNode(node.op, deepCopy(node.left), deepCopy(node.right));
    }
    return node;
}

function crossoverTrees(tree1, tree2, rnd) {
    // Work on deep copies
    const t1 = deepCopy(tree1);
    const t2 = deepCopy(tree2);
    
    // Gather all nodes
    const nodes1 = [];
    const nodes2 = [];
    _collectNodes(t1, null, nodes1);
    _collectNodes(t2, null, nodes2);
    
    const [node1, parent1] = rnd.choice(nodes1);
    const [node2, parent2] = rnd.choice(nodes2);
    
    // Deep-copy the sub-trees
    const node1Clone = deepCopy(node1);
    const node2Clone = deepCopy(node2);
    
    // Produce first child
    let child1;
    if (parent1 === null) {
        child1 = node2Clone;
    } else {
        _replaceChild(parent1, node1, node2Clone);
        child1 = t1;
    }
    
    // Produce second child
    let child2;
    if (parent2 === null) {
        child2 = node1Clone;
    } else {
        _replaceChild(parent2, node2, node1Clone);
        child2 = t2;
    }
    
    return [child1, child2];
}

// Export for use in other modules
window.ExprNode = ExprNode;
window.ConstNode = ConstNode;
window.IdNode = IdNode;
window.ModNode = ModNode;
window.UnaryNode = UnaryNode;
window.BinaryNode = BinaryNode;
window.UNARY_OPS = UNARY_OPS;
window.BINARY_OPS = BINARY_OPS;
window.IRRATIONAL_CONSTANTS = IRRATIONAL_CONSTANTS;
window.Random = Random;
window.randomLeaf = randomLeaf;
window.randomTree = randomTree;
window.mutateTree = mutateTree;
window.crossoverTrees = crossoverTrees;
window.deepCopy = deepCopy;
window.PolynomialDetector = PolynomialDetector;
window._replaceCoefficientByValue = _replaceCoefficientByValue; 