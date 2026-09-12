"""
Step-by-Step Math Solver - Shows work for complex problems.
Supports: linear equations, quadratic equations, derivatives, integrals, limits, systems of equations.
"""
import logging
import re
import math
import sympy as sp
from typing import Any, Dict, List, Optional, Tuple

logger = logging.getLogger(__name__)

# Initialize sympy symbols - use these globally
x, y, z, t = sp.symbols('x y z t', real=True)

# Symbol locals for sympify to use the same symbols
SYMPY_LOCALS = {'x': x, 'y': y, 'z': z, 't': t, 
                'sin': sp.sin, 'cos': sp.cos, 'tan': sp.tan,
                'asin': sp.asin, 'acos': sp.acos, 'atan': sp.atan,
                'sqrt': sp.sqrt, 'log': sp.log, 'exp': sp.exp,
                'abs': abs, 'round': round, 'min': min, 'max': max, 'pow': pow,
                'pi': sp.pi, 'E': sp.E}


def safe_sympify(expr: str):
    """Safely sympify expression using our predefined symbols."""
    return sp.sympify(expr, locals=SYMPY_LOCALS)


def preprocess_math_expression(expr: str) -> str:
    """
    Convert natural language math to sympy-compatible syntax.
    Handles: implicit multiplication (2x -> 2*x), power (x^2 -> x**2), etc.
    """
    expr = expr.strip()
    
    # Replace ^ with ** for power
    expr = re.sub(r'\^', '**', expr)
    
    # Handle implicit multiplication: 2x -> 2*x, 3(x+1) -> 3*(x+1), x(x+1) -> x*(x+1)
    # Number followed by variable: 2x -> 2*x
    expr = re.sub(r'(\d)([a-zA-Z])', r'\1*\2', expr)
    # Number followed by parenthesis: 2(x+1) -> 2*(x+1)
    expr = re.sub(r'(\d)\(', r'\1*(', expr)
    # Variable followed by parenthesis: x(x+1) -> x*(x+1)
    # But not for function names like sin, cos, etc.
    # Use negative lookbehind to avoid matching inside function names
    expr = re.sub(r'(?<![a-zA-Z])([a-zA-Z])\(', r'\1*(', expr)
    # Parenthesis followed by variable/number: (x+1)2 -> (x+1)*2
    expr = re.sub(r'\)([a-zA-Z0-9])', r')*\1', expr)
    # Parenthesis followed by parenthesis: (x+1)(x+2) -> (x+1)*(x+2)
    expr = re.sub(r'\)\s*\(', ')*(', expr)
    
    # Handle functions without explicit multiplication: sin x -> sin(x)
    # Only match function name followed by space + variable/number (not parenthesis)
    expr = re.sub(r'\b(sin|cos|tan|asin|acos|atan|sqrt|log|exp|abs|round|min|max|pow)\s+([a-zA-Z0-9])', r'\1(\2', expr)
    
    # Handle implicit multiplication around functions: 2 sin x -> 2*sin(x)
    expr = re.sub(r'(\d)\s+(sin|cos|tan|sqrt|log|exp|abs)\(', r'\1*\2(', expr)
    
    return expr


class StepByStepSolver:
    """Solves math problems with detailed step-by-step explanations."""
    
    def __init__(self):
        self.steps: List[Dict[str, str]] = []
    
    def solve(self, question: str) -> Dict[str, Any]:
        """Main entry point - detects problem type and solves with steps."""
        self.steps = []
        q = question.lower().strip()
        
        # Detect problem type - check more specific first
        if self._is_system_of_equations(q):
            return self._solve_system(question)
        elif self._is_quadratic_equation(q):
            return self._solve_quadratic_equation(question)
        elif self._is_linear_equation(q):
            return self._solve_linear_equation(question)
        elif self._is_derivative(q):
            return self._compute_derivative(question)
        elif self._is_integral(q):
            return self._compute_integral(question)
        elif self._is_limit(q):
            return self._compute_limit(question)
        elif self._is_simplification(q):
            return self._simplify_expression(question)
        elif self._is_factorization(q):
            return self._factor_expression(question)
        else:
            return self._generic_solve(question)
    
    def _add_step(self, description: str, expression: str = "", rule: str = ""):
        """Add a step to the solution."""
        self.steps.append({
            "description": description,
            "expression": expression,
            "rule": rule
        })
    
    def _is_linear_equation(self, q: str) -> bool:
        # Must have exactly one equals sign, and no commas (which indicate systems)
        return q.count('=') == 1 and ',' not in q and (bool(re.search(r'(solve|find).*(x|y)\s*[\+\-].*\d', q)) or bool(re.search(r'\d*x\s*[\+\-]\s*\d+\s*=\s*\d+', q)))
    
    def _is_quadratic_equation(self, q: str) -> bool:
        return bool(re.search(r'x\^?2|x\*\*2|x²', q)) and '=' in q
    
    def _is_derivative(self, q: str) -> bool:
        return bool(re.search(r'(derivative|differentiate|d/dx|d/dt|diff)', q))
    
    def _is_integral(self, q: str) -> bool:
        return bool(re.search(r'(integral|integrate|antiderivative|∫)', q))
    
    def _is_limit(self, q: str) -> bool:
        return bool(re.search(r'limit.*(x|t).*->|approaches', q))
    
    def _is_system_of_equations(self, q: str) -> bool:
        return q.count('=') >= 2 and ('x' in q or 'y' in q)
    
    def _is_simplification(self, q: str) -> bool:
        return bool(re.search(r'(simplify|expand|combine)', q))
    
    def _is_factorization(self, q: str) -> bool:
        return bool(re.search(r'(factor|factorize|factorise)', q))
    
    def _extract_equation(self, question: str) -> str:
        """Extract equation from natural language."""
        # Remove common prefixes
        q = re.sub(r'^(solve|find|calculate|what is|compute)\s+', '', question, flags=re.IGNORECASE)
        return q.strip()
    
    def _solve_linear_equation(self, question: str) -> Dict[str, Any]:
        """Solve linear equation with steps."""
        eq_str = self._extract_equation(question)
        self._add_step("Identify the linear equation", eq_str, "Standard form: ax + b = c")
        
        # Preprocess for implicit multiplication
        processed_eq = preprocess_math_expression(eq_str)
        self._add_step("Preprocess equation", processed_eq, "Convert implicit multiplication (2x -> 2*x)")
        
        # Parse equation like "2x + 5 = 15"
        try:
            lhs, rhs = processed_eq.split('=')
            lhs_processed = preprocess_math_expression(lhs.strip())
            rhs_processed = preprocess_math_expression(rhs.strip())
            expr = safe_sympify(lhs_processed) - safe_sympify(rhs_processed)
            self._add_step("Move all terms to one side", f"{expr} = 0", "Subtract RHS from both sides")
            
            # Solve for x
            solution = sp.solve(expr, x)
            if solution:
                self._add_step(f"Isolate the variable", f"x = {solution[0]}", "Divide by coefficient of x")
                return {
                    "answer": f"x = {solution[0]}",
                    "steps": self.steps,
                    "type": "linear_equation",
                    "solution": str(solution[0])
                }
        except Exception as e:
            logger.warning(f"Linear equation solve failed: {e}")
        
        return {"answer": "Could not solve linear equation", "steps": self.steps, "type": "linear_equation"}
    
    def _solve_quadratic_equation(self, question: str) -> Dict[str, Any]:
        """Solve quadratic equation with steps."""
        eq_str = self._extract_equation(question)
        self._add_step("Identify the quadratic equation", eq_str, "Standard form: ax² + bx + c = 0")
        
        # Preprocess
        processed_eq = preprocess_math_expression(eq_str)
        self._add_step("Preprocess equation", processed_eq, "Convert implicit multiplication (2x -> 2*x, x^2 -> x**2)")
        
        try:
            lhs, rhs = processed_eq.split('=')
            lhs_processed = preprocess_math_expression(lhs.strip())
            rhs_processed = preprocess_math_expression(rhs.strip())
            expr = safe_sympify(lhs_processed) - safe_sympify(rhs_processed)
            expr = sp.expand(expr)
            self._add_step("Write in standard form", f"{expr} = 0", "Move all terms to left side")
            
            # Get coefficients
            coeffs = sp.Poly(expr, x).all_coeffs()
            if len(coeffs) == 3:
                a, b, c = coeffs
                self._add_step(f"Identify coefficients", f"a = {a}, b = {b}, c = {c}", "From ax^2 + bx + c = 0")
                
                # Discriminant
                discriminant = b**2 - 4*a*c
                self._add_step("Calculate discriminant", f"Discriminant = b^2 - 4ac = {discriminant}", "Discriminant = b^2 - 4ac")
                
                if discriminant >= 0:
                    sqrt_d = sp.sqrt(discriminant)
                    x1 = (-b + sqrt_d) / (2*a)
                    x2 = (-b - sqrt_d) / (2*a)
                    self._add_step("Apply quadratic formula", "x = (-b +/- sqrt(D)) / 2a", "x = (-b +/- sqrt(b^2 - 4ac)) / 2a")
                    self._add_step(f"Calculate roots", f"x1 = {x1}, x2 = {x2}", "Substitute values")
                    return {
                        "answer": f"x1 = {x1}, x2 = {x2}",
                        "steps": self.steps,
                        "type": "quadratic_equation",
                        "roots": [str(x1), str(x2)]
                    }
                else:
                    # Complex roots
                    x1 = (-b + sp.sqrt(discriminant)) / (2*a)
                    x2 = (-b - sp.sqrt(discriminant)) / (2*a)
                    self._add_step("Complex roots (D < 0)", f"x1 = {x1}, x2 = {x2}", "Use imaginary numbers")
                    return {
                        "answer": f"Complex roots: x1 = {x1}, x2 = {x2}",
                        "steps": self.steps,
                        "type": "quadratic_equation",
                        "roots": [str(x1), str(x2)]
                    }
        except Exception as e:
            logger.warning(f"Quadratic solve failed: {e}")
        
        return {"answer": "Could not solve quadratic equation", "steps": self.steps, "type": "quadratic_equation"}
    
    def _compute_derivative(self, question: str) -> Dict[str, Any]:
        """Compute derivative with steps."""
        # Extract function
        func_match = re.search(r'(derivative|differentiate|diff|d/dx)\s+(?:of\s+)?(.+)', question, re.IGNORECASE)
        if not func_match:
            return {"answer": "Could not parse function", "steps": [], "type": "derivative"}
        
        func_str = func_match.group(2).strip()
        # Preprocess for implicit multiplication
        func_processed = preprocess_math_expression(func_str)
        self._add_step("Identify the function", f"f(x) = {func_processed}", "Extract from question")
        
        try:
            func = safe_sympify(func_processed)
            self._add_step("Apply differentiation rules", f"f'(x) = d/dx[{func_processed}]", "Use power rule, product rule, chain rule as needed")
            
            derivative = sp.diff(func, x)
            self._add_step("Compute derivative", f"f'(x) = {derivative}", "Apply differentiation rules")
            
            # Try to simplify
            simplified = sp.simplify(derivative)
            if simplified != derivative:
                self._add_step("Simplify result", f"f'(x) = {simplified}", "Combine like terms")
                derivative = simplified
            
            return {
                "answer": f"f'(x) = {derivative}",
                "steps": self.steps,
                "type": "derivative",
                "derivative": str(derivative)
            }
        except Exception as e:
            logger.warning(f"Derivative failed: {e}")
            return {"answer": "Could not compute derivative", "steps": self.steps, "type": "derivative"}
    
    def _compute_integral(self, question: str) -> Dict[str, Any]:
        """Compute integral with steps."""
        # Extract function and limits
        integral_match = re.search(r'(integral|integrate|antiderivative|∫)\s+(?:of\s+)?(.+)', question, re.IGNORECASE)
        if not integral_match:
            return {"answer": "Could not parse integral", "steps": [], "type": "integral"}
        
        func_part = integral_match.group(2).strip()
        
        # Check for definite integral
        limits = None
        limit_match = re.search(r'from\s+([\d\.\-]+)\s+to\s+([\d\.\-]+)', func_part, re.IGNORECASE)
        if limit_match:
            a, b = float(limit_match.group(1)), float(limit_match.group(2))
            func_str = func_part[:limit_match.start()].strip()
            limits = (a, b)
        else:
            func_str = func_part
        
        # Preprocess
        func_processed = preprocess_math_expression(func_str)
        self._add_step("Identify the function", f"f(x) = {func_processed}", "Extract integrand")
        
        try:
            func = safe_sympify(func_processed)
            self._add_step("Apply integration rules", "integral f(x) dx", "Use power rule, substitution, parts as needed")
            
            if limits:
                a, b = limits
                integral = sp.integrate(func, (x, a, b))
                self._add_step(f"Evaluate definite integral", f"integral from {a} to {b} of f(x) dx", "Apply Fundamental Theorem of Calculus")
                self._add_step("Evaluate antiderivative at bounds", f"F({b}) - F({a})", "Substitute upper and lower limits")
            else:
                integral = sp.integrate(func, x)
                self._add_step("Apply power rule / basic integrals", f"integral f(x) dx = {integral} + C", "Add constant of integration")
            
            return {
                "answer": f"{integral}" + (" + C" if not limits else ""),
                "steps": self.steps,
                "type": "integral",
                "result": str(integral)
            }
        except Exception as e:
            logger.warning(f"Integral failed: {e}")
            return {"answer": "Could not compute integral", "steps": self.steps, "type": "integral"}
    
    def _compute_limit(self, question: str) -> Dict[str, Any]:
        """Compute limit with steps."""
        # Extract expression and limit point
        limit_match = re.search(r'limit.*(?:x|t)\s*(?:->|approaches)\s*([\d\.\-]+)', question, re.IGNORECASE)
        # Better expression extraction for "limit of sin(x)/x as x approaches 0"
        expr_match = re.search(r'limit\s+of\s+(.+?)\s+as\s+(?:x|t)\s*(?:->|approaches)', question, re.IGNORECASE)
        if not expr_match:
            expr_match = re.search(r'(?:of\s+|limit.*?)(.+?)(?:\s+as\s+|\s+where\s+|\s*$)', question, re.IGNORECASE)
        
        if not limit_match or not expr_match:
            return {"answer": "Could not parse limit", "steps": [], "type": "limit"}
        
        point = float(limit_match.group(1))
        expr_str = expr_match.group(1).strip()
        expr_processed = preprocess_math_expression(expr_str)
        self._add_step("Identify limit", f"limit as x -> {point} of {expr_processed}", "Identify expression and approach point")
        
        try:
            expr = safe_sympify(expr_processed)
            self._add_step("Check direct substitution", f"f({point}) = {expr.subs(x, point)}", "Try plugging in the value")
            
            # Check if direct substitution works
            try:
                direct = expr.subs(x, point)
                if direct.is_finite:
                    self._add_step("Direct substitution works", f"Limit = {direct}", "Function is continuous at this point")
                    return {
                        "answer": f"Limit = {direct}",
                        "steps": self.steps,
                        "type": "limit",
                        "result": str(direct)
                    }
            except Exception:
                pass
            
            # Need algebraic manipulation
            self._add_step("Direct substitution fails (indeterminate form)", "Apply algebraic manipulation", "Factor, rationalize, or use L'Hopital's rule")
            
            limit_result = sp.limit(expr, x, point)
            self._add_step("Compute limit", f"limit as x -> {point} = {limit_result}", "Use algebraic simplification or L'Hopital's rule")
            
            return {
                "answer": f"Limit = {limit_result}",
                "steps": self.steps,
                "type": "limit",
                "result": str(limit_result)
            }
        except Exception as e:
            logger.warning(f"Limit failed: {e}")
            return {"answer": "Could not compute limit", "steps": self.steps, "type": "limit"}
    
    def _solve_system(self, question: str) -> Dict[str, Any]:
        """Solve system of equations."""
        # Extract equation part (remove "solve", "find", etc. prefixes)
        eq_question = self._extract_equation(question)
        self._add_step("Identify system of equations", eq_question, "Multiple equations with multiple variables")
        
        # Extract equations - split by comma first, then each part should have one =
        eq_parts = [part.strip() for part in eq_question.split(',')]
        equations = []
        for part in eq_parts:
            if '=' in part:
                equations.append(part.strip())
        
        if len(equations) < 2:
            # Fallback: try regex
            equations = re.findall(r'([^,=]+=[^,=]+)', eq_question)
        
        if len(equations) < 2:
            return {"answer": "Need at least 2 equations", "steps": self.steps, "type": "system"}
        
        try:
            eq_list = []
            for eq in equations[:2]:  # Handle 2 equations for simplicity
                parts = eq.split('=')
                if len(parts) == 2:
                    lhs, rhs = parts[0], parts[1]
                    lhs_processed = preprocess_math_expression(lhs.strip())
                    rhs_processed = preprocess_math_expression(rhs.strip())
                    eq_list.append(safe_sympify(lhs_processed) - safe_sympify(rhs_processed))
            
            if len(eq_list) < 2:
                return {"answer": "Could not parse equations", "steps": self.steps, "type": "system"}
            
            self._add_step("Write system in standard form", f"{eq_list[0]} = 0, {eq_list[1]} = 0", "Move all terms to one side")
            
            solution = sp.solve(eq_list, (x, y))
            if solution:
                self._add_step("Solve system", f"x = {solution[x]}, y = {solution[y]}", "Substitution or elimination method")
                return {
                    "answer": f"x = {solution[x]}, y = {solution[y]}",
                    "steps": self.steps,
                    "type": "system",
                    "solution": {str(k): str(v) for k, v in solution.items()}
                }
        except Exception as e:
            logger.warning(f"System solve failed: {e}")
        
        return {"answer": "Could not solve system", "steps": self.steps, "type": "system"}
    
    def _simplify_expression(self, question: str) -> Dict[str, Any]:
        """Simplify algebraic expression."""
        func_match = re.search(r'(simplify|expand|combine)\s+(?:the\s+)?(.+)', question, re.IGNORECASE)
        if not func_match:
            return {"answer": "Could not parse expression", "steps": [], "type": "simplification"}
        
        expr_str = func_match.group(2).strip()
        expr_processed = preprocess_math_expression(expr_str)
        self._add_step("Identify expression", expr_processed, "Extract from question")
        
        try:
            expr = safe_sympify(expr_processed)
            operation = func_match.group(1).lower()
            
            if operation == "expand":
                result = sp.expand(expr)
                self._add_step("Expand expression", str(result), "Distribute multiplication over addition")
            elif operation in ["combine", "simplify"]:
                result = sp.simplify(expr)
                self._add_step("Simplify expression", str(result), "Combine like terms, cancel factors")
            else:
                result = sp.simplify(expr)
            
            self._add_step("Result", str(result), "Final simplified form")
            return {
                "answer": str(result),
                "steps": self.steps,
                "type": "simplification",
                "result": str(result)
            }
        except Exception as e:
            logger.warning(f"Simplification failed: {e}")
            return {"answer": "Could not simplify", "steps": self.steps, "type": "simplification"}
    
    def _factor_expression(self, question: str) -> Dict[str, Any]:
        """Factor polynomial expression."""
        func_match = re.search(r'(factor|factorize|factorise)\s+(?:the\s+)?(.+)', question, re.IGNORECASE)
        if not func_match:
            return {"answer": "Could not parse expression", "steps": [], "type": "factorization"}
        
        expr_str = func_match.group(2).strip()
        expr_processed = preprocess_math_expression(expr_str)
        self._add_step("Identify polynomial", expr_processed, "Extract from question")
        
        try:
            expr = safe_sympify(expr_processed)
            self._add_step("Look for common factors / patterns", "Check for GCF, difference of squares, trinomial patterns", "Factor by grouping, special products")
            
            factored = sp.factor(expr)
            self._add_step("Factored form", str(factored), "Write as product of factors")
            
            return {
                "answer": str(factored),
                "steps": self.steps,
                "type": "factorization",
                "result": str(factored)
            }
        except Exception as e:
            logger.warning(f"Factorization failed: {e}")
            return {"answer": "Could not factor", "steps": self.steps, "type": "factorization"}
    
    def _generic_solve(self, question: str) -> Dict[str, Any]:
        """Generic solver for unrecognized problems."""
        try:
            # Try to evaluate as expression
            expr_processed = preprocess_math_expression(self._extract_equation(question))
            result = safe_sympify(expr_processed)
            return {
                "answer": str(result),
                "steps": [{"description": "Evaluated expression", "expression": str(result), "rule": "Direct evaluation"}],
                "type": "expression"
            }
        except Exception:
            return {
                "answer": "I can help solve: linear equations, quadratics, derivatives, integrals, limits, systems, simplifications, and factorizations. Please rephrase your question.",
                "steps": [],
                "type": "unknown"
            }


# Convenience function
def solve_step_by_step(question: str) -> Dict[str, Any]:
    """Solve a math problem with step-by-step explanation."""
    solver = StepByStepSolver()
    return solver.solve(question)