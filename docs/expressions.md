# Expressions Guide for Prime Fold

This guide explains how to write mathematical expressions for use in Prime Fold's PrimeFold (2D) and PrimeGen (1D) modes.

---

## Overview

You can enter mathematical expressions to define functions for visualizing or generating primes. Expressions can use a variety of operators, functions, and constants. Expressions are always written in terms of the variable `n`.

- **PrimeFold mode:** Enter two expressions, separated by a comma, e.g. `f_x(n) = n, f_y(n) = n^2` or simply `n, n^2`.
- **PrimeGen mode:** Enter a single expression, e.g. `f(n) = 2*n + 1` or just `2*n + 1`.

---

## Variables

- `n` — The input integer (typically 1, 2, 3, ...)

---

## Operators

| Operator | Description           | Example         |
|----------|-----------------------|-----------------|
| `+`      | Addition              | `n + 2`         |
| `-`      | Subtraction           | `n - 1`         |
| `*`      | Multiplication        | `2 * n`         |
| `/`      | Division              | `n / 3`         |
| `%`      | Modulo (remainder)    | `n % 2`         |
| `mod`    | Modulo (alternative)  | `n mod 2`       |
| `^`      | Exponentiation        | `n^2`           |

---

## Functions

| Function   | Description                        | Example         |
|------------|------------------------------------|-----------------|
| `sin(x)`   | Sine (radians)                     | `sin(n)`        |
| `cos(x)`   | Cosine (radians)                   | `cos(n)`        |
| `sind(x)`  | Sine (degrees)                     | `sind(n)`       |
| `cosd(x)`  | Cosine (degrees)                   | `cosd(n)`       |
| `sqrt(x)`  | Square root                        | `sqrt(n)`       |
| `log(x)`   | Natural logarithm                  | `log(n)`        |
| `abs(x)`   | Absolute value                     | `abs(n-10)`     |
| `floor(x)` | Floor (round down)                 | `floor(n/2)`    |
| `ceil(x)`  | Ceiling (round up)                 | `ceil(n/2)`     |
| `square(x)`| Square (x^2)                       | `square(n)`     |
| `cube(x)`  | Cube (x^3)                         | `cube(n)`       |

---

## Constants

| Name    | Value                |
|---------|----------------------|
| `pi`    | 3.141592...          |
| `e`     | 2.718281...          |
| `sqrt2` | 1.414213...          |
| `phi`   | 1.618033... (golden) |

---

## Syntax Tips

- Parentheses `()` can be used to group expressions: `(n + 1) * 2`
- Both `^` and `square(x)`, `cube(x)` are supported for powers.
- `mod` and `%` are equivalent for modulo.
- All functions take a single argument: `sin(n)`, `sqrt(n+1)`, etc.
- You can omit `f(n) =` or `f_x(n) =`/`f_y(n) =` and just write the expressions directly.
- Spaces are ignored.

---

## Examples

### PrimeFold (2D)
- `f_x(n) = n, f_y(n) = n^2`
- `n, n^2`
- `sin(n), cos(n)`
- `n, n mod 5`
- `sqrt(n), log(n)`

### PrimeGen (1D)
- `f(n) = 2*n + 1`
- `n^2 + 1`
- `abs(n-10)`
- `cube(n) - 1`

---

If you enter an invalid expression, check the console for errors. For more details, see the main README or Help section in the app. 