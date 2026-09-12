"""
Claude-Only AI Router - Uses only Anthropic Claude.

Architecture:
- Keyword-based classification (instant, no API)
- Single call to Claude (claude-3-5-haiku for speed, or sonnet for quality)
- Math shortcut for instant calculation responses with actual computation
- Falls back to grounded answer if no API key
"""
import logging
import os
import re
import math
from functools import lru_cache
from typing import Any, Dict, List

from django.conf import settings

logger = logging.getLogger(__name__)


# Safe math evaluation - only allow safe operations
SAFE_MATH_NAMES = {
    'abs': abs, 'round': round, 'min': min, 'max': max,
    'sum': sum, 'pow': pow,
    'sin': math.sin, 'cos': math.cos, 'tan': math.tan,
    'asin': math.asin, 'acos': math.acos, 'atan': math.atan,
    'sqrt': math.sqrt, 'log': math.log, 'log10': math.log10,
    'exp': math.exp, 'pi': math.pi, 'e': math.e,
    'degrees': math.degrees, 'radians': math.radians,
}


def compute_math_expression(expression: str) -> str:
    """
    Safely evaluate a math expression and return the result.
    Returns empty string if evaluation fails.
    """
    try:
        # Clean the expression
        expr = expression.strip()
        
        # Handle "what is X" or "calculate X" patterns
        expr = re.sub(r'^(what is|calculate|compute|solve|find|equals?)\s+', '', expr, flags=re.IGNORECASE)
        expr = re.sub(r'[=?]+$', '', expr).strip()
        
        # Replace common math notation
        expr = expr.replace('^', '**')  # Power operator
        expr = expr.replace('×', '*').replace('÷', '/')  # Unicode operators
        expr = expr.replace('mod', '%')  # Modulo
        
        # Only allow safe characters
        allowed_chars = set('0123456789+-*/().,**% \t\n')
        if not all(c in allowed_chars or c.isalpha() for c in expr):
            return ""
        
        # Evaluate with safe namespace
        result = eval(expr, {"__builtins__": {}}, SAFE_MATH_NAMES)
        
        # Format result nicely
        if isinstance(result, float):
            if result.is_integer():
                return str(int(result))
            return str(round(result, 10)).rstrip('0').rstrip('.')
        return str(result)
    except Exception:
        return ""


def is_math_query(question: str) -> bool:
    """Check if question is a simple math/calculation query."""
    q = question.lower().strip()
    for pattern in MATH_PATTERNS:
        if re.search(pattern, q, re.IGNORECASE):
            return True
    return False


# Math/calculation patterns - answer directly without API
MATH_PATTERNS = [
    r'^[\d\s\+\-\*\/\(\)\.\,\%\^\=\>\<]+$',  # Pure math expression
    r'(calculate|compute|solve|what is|equals?)\s+[\d\s\+\-\*\/\(\)]+',  # "calculate 2+2"
    r'\d+\s*[\+\-\*\/]\s*\d+',  # Basic arithmetic
    r'(derivative|integral|limit)\s+of\s+',  # Calculus
    r'\b(sin|cos|tan|asin|acos|atan|sqrt|log|log10|exp|abs|round|min|max|pow)\s*\(',  # Function calls
    r'\b(pi|e)\b',  # Constants
]

# Quick classification keywords (no API needed)
CLASSIFICATION_KEYWORDS = {
    'problem_solving': [
        'solve', 'calculate', 'compute', 'derivative', 'integral', 'limit',
        'equation', 'formula', 'math', 'physics problem', 'chemistry problem',
        r'what is.*\d+', 'equals?', 'value of', r'find.*x', r'find.*y'
    ],
    'concept_explanation': [
        'explain', 'what is', 'how does', 'concept', 'theory', 'understand',
        'define', 'definition', 'meaning of', 'difference between'
    ],
    'study_plan': [
        'plan', 'schedule', 'timetable', 'when to study', 'how many hours',
        'study plan', 'revision plan', 'daily plan'
    ],
    'resource_recommendation': [
        'book', 'video', 'resource', 'recommend', 'link', 'pdf',
        'study material', 'reference', 'best.*for'
    ],
    'motivation_coaching': [
        'motivat', 'encourag', 'tired', 'stress', 'anxiety', 'give up',
        'confidence', 'burnout', 'focus', 'procrastinat'
    ],
    'code_debugging': [
        'code', 'debug', 'program', 'python', 'javascript', 'error', 'bug',
        'syntax', 'runtime', 'exception', 'compile'
    ],
}


def is_math_query(question: str) -> bool:
    """Check if question is a simple math/calculation query."""
    q = question.lower().strip()
    for pattern in MATH_PATTERNS:
        if re.search(pattern, q, re.IGNORECASE):
            return True
    return False


@lru_cache(maxsize=256)
def classify_task_fast(question: str) -> str:
    """
    Instant keyword-based classification. No API calls.
    Returns task_type string.
    """
    q = question.lower().strip()
    
    # Check math first
    if is_math_query(question):
        return 'problem_solving'
    
    # Score each category
    scores = {}
    for task_type, keywords in CLASSIFICATION_KEYWORDS.items():
        score = sum(1 for kw in keywords if kw in q)
        if score > 0:
            scores[task_type] = score
    
    if scores:
        return max(scores, key=scores.get)
    
    return 'general_chat'


class ClaudeRouter:
    """
    Ultra-fast Claude-only router.
    Single API call to claude-3-5-haiku (fastest) or sonnet.
    """
    
    def __init__(self):
        self.anthropic_key = getattr(settings, 'ANTHROPIC_API_KEY', '') or os.getenv('ANTHROPIC_API_KEY', '')
        self.client = None
        self._init_claude()
    
    def _init_claude(self):
        if self.anthropic_key:
            try:
                import anthropic
                self.client = anthropic.Anthropic(api_key=self.anthropic_key)
                logger.info("Claude client initialized (haiku model)")
            except Exception as e:
                logger.warning(f"Claude init failed: {e}")
    
    def generate_response(
        self,
        question: str,
        context: Dict[str, Any],
        grounded_answer: str,
        sources: List[Dict[str, Any]],
    ) -> Dict[str, Any]:
        """
        Single API call to Claude (haiku for speed).
        Computes math answers directly.
        """
        task_type = classify_task_fast(question)
        
        # For math queries: COMPUTE the actual answer
        if is_math_query(question):
            computed = compute_math_expression(question)
            if computed:
                return {
                    "answer": f"**{computed}**",
                    "model_used": "math engine (computed)",
                    "task_type": task_type,
                    "sources": [],
                }
            # If computation failed, fall through to grounded
        
        # No API key = grounded only
        if not self.client:
            return {
                "answer": grounded_answer,
                "model_used": "grounded only (no API key)",
                "task_type": task_type,
                "sources": sources,
            }
        
        # Single API call to Claude Haiku (fastest)
        try:
            return self._generate_claude(question, grounded_answer, sources)
        except Exception as e:
            logger.warning(f"Claude generation failed: {e}")
            return {
                "answer": grounded_answer,
                "model_used": "grounded (API failed)",
                "task_type": task_type,
                "sources": sources,
            }
    
    def _generate_claude(
        self,
        question: str,
        grounded_answer: str,
        sources: List[Dict[str, Any]],
    ) -> Dict[str, Any]:
        """Single call to Claude 3.5 Haiku (fastest model)."""
        import anthropic
        
        source_summary = "\n".join([
            f"- {s['kind']}: {s.get('topic', s.get('title', 'unknown'))}"
            for s in sources[:3]
        ])
        
        prompt = f"""You are PrepPilot's AI Study Assistant.

RULES:
1. Use ONLY the grounded facts below. No new facts, links, or resources.
2. If grounded answer says "No exact topic matched", say exactly that.
3. Keep citations exact. Be concise and encouraging.

GROUNDED FACTS:
{grounded_answer}

SOURCES:
{source_summary or "None"}

USER QUESTION: {question}

Refine the grounded answer for clarity and tone. Do not add information."""

        response = self.client.messages.create(
            model="claude-3-5-haiku-20241022",  # Fastest Claude model
            max_tokens=800,
            temperature=0.2,
            system="You are PrepPilot's AI Study Assistant. Use only the grounded facts provided. Be concise, encouraging, and accurate.",
            messages=[{"role": "user", "content": f"Grounded facts:\n{grounded_answer}\n\nSources:\n{source_summary or 'None'}\n\nQuestion: {question}"}],
        )
        
        return {
            "answer": response.content[0].text.strip(),
            "model_used": "claude-3-5-haiku",
            "task_type": "claude",
            "sources": sources,
        }


# Global instance
_claude_router_instance = None


def get_claude_router():
    global _claude_router_instance
    if _claude_router_instance is None:
        _claude_router_instance = ClaudeRouter()
    return _claude_router_instance


class ClaudeStudyAssistant:
    """Claude-only study assistant."""
    
    def __init__(self, user):
        self.user = user
        self.base_engine = None
        self.router = get_claude_router()
    
    def _get_base_engine(self):
        if self.base_engine is None:
            from PrepPilot.engines.assistant import StudyAssistantEngine
            self.base_engine = StudyAssistantEngine(self.user)
        return self.base_engine
    
    def answer(self, question: str) -> Dict[str, Any]:
        base_engine = self._get_base_engine()
        
        cleaned = question.strip()
        if not cleaned:
            return {
                'answer': 'Please ask a study question first.',
                'sources': [], 'topics': [], 'vault_items': [],
                'model_used': 'none', 'task_type': 'empty',
            }
        
        topics = base_engine.find_topics(cleaned)
        vault_items = base_engine.find_vault_items(cleaned)
        grounded_result = base_engine.build_precise_answer(cleaned, topics, vault_items)
        
        # Single call to Claude
        context = {'user': self.user}
        routed_result = self.router.generate_response(
            cleaned, context, grounded_result['answer'], grounded_result['sources']
        )
        
        # Merge
        routed_result['sources'] = grounded_result['sources']
        routed_result['topics'] = [str(t.id) for t in topics]
        routed_result['vault_items'] = [str(v.id) for v in vault_items]
        
        # Persist
        from PrepPilot.models import AssistantConversation
        AssistantConversation.objects.create(
            user=self.user, question=cleaned,
            answer=routed_result['answer'], sources=routed_result['sources']
        )
        
        return routed_result


# Backward compatibility aliases
FastAIRouter = ClaudeRouter
FastStudyAssistant = ClaudeStudyAssistant
EnhancedStudyAssistant = ClaudeStudyAssistant

def get_router():
    """Backward compat - returns Claude router."""
    return get_claude_router()


def get_fast_router():
    """Backward compat."""
    return get_claude_router()