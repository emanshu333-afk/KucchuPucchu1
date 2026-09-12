"""
Multi-Model AI Router - Gemini as main brain with intelligent routing.

Architecture:
- Gemini (main) analyzes the question and decides which model to use
- Routes to: Gemini (analysis/synthesis), GPT-4 (coding/creative), Claude (reasoning/long-context)
- Falls back gracefully if any API is unavailable
- All responses are grounded in user's data (topics, vault, published resources)
"""
import logging
import json
import os
from typing import Any, Dict, List, Optional, Literal
from enum import Enum

from django.conf import settings

logger = logging.getLogger(__name__)


class ModelProvider(Enum):
    GEMINI = "gemini"
    OPENAI = "openai"
    ANTHROPIC = "anthropic"


class TaskType(Enum):
    """Types of tasks the assistant handles."""
    STUDY_PLAN = "study_plan"           # Generate study plans, schedules
    CONCEPT_EXPLANATION = "concept_explanation"  # Explain topics, concepts
    PROBLEM_SOLVING = "problem_solving"          # Math, physics problems
    RESOURCE_RECOMMENDATION = "resource_recommendation"  # Books, videos, links
    MOTIVATION_COACHING = "motivation_coaching"  # Encouragement, study tips
    ANALYSIS_SYNTHESIS = "analysis_synthesis"    # Compare, summarize, analyze
    CODE_DEBUGGING = "code_debugging"            # Programming help
    CREATIVE_WRITING = "creative_writing"        # Essays, stories
    GENERAL_CHAT = "general_chat"                # Casual conversation


class ModelConfig:
    """Configuration for each model provider."""
    
    # Model capabilities and preferred tasks
    CAPABILITIES = {
        ModelProvider.GEMINI: {
            "models": ["gemini-1.5-pro", "gemini-1.5-flash", "gemini-1.0-pro"],
            "strengths": [
                TaskType.ANALYSIS_SYNTHESIS,
                TaskType.CONCEPT_EXPLANATION,
                TaskType.RESOURCE_RECOMMENDATION,
                TaskType.GENERAL_CHAT,
            ],
            "max_tokens": 8192,
            "supports_multimodal": True,
        },
        ModelProvider.OPENAI: {
            "models": ["gpt-4o", "gpt-4-turbo", "gpt-3.5-turbo"],
            "strengths": [
                TaskType.CODE_DEBUGGING,
                TaskType.CREATIVE_WRITING,
                TaskType.PROBLEM_SOLVING,
                TaskType.STUDY_PLAN,
            ],
            "max_tokens": 4096,
            "supports_multimodal": True,
        },
        ModelProvider.ANTHROPIC: {
            "models": ["claude-3-5-sonnet-20241022", "claude-3-opus-20240229", "claude-3-haiku-20240307"],
            "strengths": [
                TaskType.ANALYSIS_SYNTHESIS,
                TaskType.CONCEPT_EXPLANATION,
                TaskType.MOTIVATION_COACHING,
                TaskType.GENERAL_CHAT,
            ],
            "max_tokens": 4096,
            "supports_multimodal": True,
        },
    }


class MultiModelRouter:
    """
    Routes tasks to the best available model.
    Gemini acts as the primary analyzer and router.
    """
    
    def __init__(self):
        self.gemini_key = getattr(settings, 'GEMINI_API_KEY', '') or os.getenv('GEMINI_API_KEY', '')
        self.openai_key = getattr(settings, 'AI_API_KEY', '') or os.getenv('OPENAI_API_KEY', '')
        self.anthropic_key = getattr(settings, 'ANTHROPIC_API_KEY', '') or os.getenv('ANTHROPIC_API_KEY', '')
        
        self._init_clients()
    
    def _init_clients(self):
        """Initialize API clients."""
        self.gemini_client = None
        self.openai_client = None
        self.anthropic_client = None
        
        if self.gemini_key:
            try:
                import google.generativeai as genai
                genai.configure(api_key=self.gemini_key)
                self.gemini_client = genai
                logger.info("Gemini client initialized")
            except Exception as e:
                logger.warning(f"Gemini init failed: {e}")
        
        if self.openai_key:
            try:
                from openai import OpenAI
                self.openai_client = OpenAI(api_key=self.openai_key)
                logger.info("OpenAI client initialized")
            except Exception as e:
                logger.warning(f"OpenAI init failed: {e}")
        
        if self.anthropic_key:
            try:
                import anthropic
                self.anthropic_client = anthropic.Anthropic(api_key=self.anthropic_key)
                logger.info("Anthropic client initialized")
            except Exception as e:
                logger.warning(f"Anthropic init failed: {e}")
    
    def classify_task(self, question: str, context: Dict[str, Any]) -> TaskType:
        """
        Use Gemini to classify the task type.
        Falls back to keyword-based classification if Gemini unavailable.
        """
        if self.gemini_client:
            try:
                return self._classify_with_gemini(question, context)
            except Exception as e:
                logger.warning(f"Gemini classification failed: {e}")
        
        return self._classify_keywords(question)
    
    def _classify_with_gemini(self, question: str, context: Dict[str, Any]) -> TaskType:
        """Use Gemini to classify the task."""
        prompt = f"""Classify this student question into ONE task type:

Question: "{question}"

Context: User is a student preparing for exams. They have topics, vault resources, and study plans.

Task types:
- study_plan: Creating schedules, timetables, planning
- concept_explanation: Explaining topics, concepts, theories
- problem_solving: Math, physics, chemistry problems with calculations
- resource_recommendation: Books, videos, links, study materials
- motivation_coaching: Encouragement, study tips, mental support
- analysis_synthesis: Comparing, summarizing, analyzing data
- code_debugging: Programming, coding help
- creative_writing: Essays, stories, creative content
- general_chat: Casual conversation, greetings

Return ONLY the task type name (e.g., "concept_explanation")."""
        
        model = self.gemini_client.GenerativeModel('gemini-1.5-flash')
        response = model.generate_content(prompt)
        task_str = response.text.strip().lower()
        
        try:
            return TaskType(task_str)
        except ValueError:
            return TaskType.GENERAL_CHAT
    
    def _classify_keywords(self, question: str) -> TaskType:
        """Fallback keyword-based classification."""
        q = question.lower()
        
        if any(kw in q for kw in ['plan', 'schedule', 'timetable', 'when to study', 'how many hours']):
            return TaskType.STUDY_PLAN
        if any(kw in q for kw in ['explain', 'what is', 'how does', 'concept', 'theory', 'understand']):
            return TaskType.CONCEPT_EXPLANATION
        if any(kw in q for kw in ['solve', 'calculate', 'problem', 'equation', 'formula', 'derivative', 'integral']):
            return TaskType.PROBLEM_SOLVING
        if any(kw in q for kw in ['book', 'video', 'resource', 'recommend', 'link', 'pdf', 'study material']):
            return TaskType.RESOURCE_RECOMMENDATION
        if any(kw in q for kw in ['motivat', 'encourag', 'tired', 'stress', 'anxiety', 'give up', 'confidence']):
            return TaskType.MOTIVATION_COACHING
        if any(kw in q for kw in ['compare', 'analyze', 'summary', 'difference', 'pros and cons', 'evaluate']):
            return TaskType.ANALYSIS_SYNTHESIS
        if any(kw in q for kw in ['code', 'debug', 'program', 'python', 'javascript', 'error', 'bug']):
            return TaskType.CODE_DEBUGGING
        if any(kw in q for kw in ['write', 'essay', 'story', 'creative', 'poem']):
            return TaskType.CREATIVE_WRITING
        
        return TaskType.GENERAL_CHAT
    
    def select_model(self, task_type: TaskType) -> ModelProvider:
        """Select the best model for the task type."""
        # Check which models are available
        available = []
        if self.gemini_client:
            available.append(ModelProvider.GEMINI)
        if self.openai_client:
            available.append(ModelProvider.OPENAI)
        if self.anthropic_client:
            available.append(ModelProvider.ANTHROPIC)
        
        if not available:
            return None
        
        # Gemini is primary - use it if available for most tasks
        if ModelProvider.GEMINI in available:
            caps = ModelConfig.CAPABILITIES[ModelProvider.GEMINI]
            if task_type in caps["strengths"]:
                return ModelProvider.GEMINI
        
        # Find best alternative
        for provider in available:
            caps = ModelConfig.CAPABILITIES[provider]
            if task_type in caps["strengths"]:
                return provider
        
        # Default to first available
        return available[0]
    
    def generate_response(
        self,
        question: str,
        context: Dict[str, Any],
        grounded_answer: str,
        sources: List[Dict[str, Any]],
    ) -> Dict[str, Any]:
        """
        Generate final response using the best model.
        The grounded_answer contains facts from user's data.
        The model refines/expands it without hallucinating.
        """
        task_type = self.classify_task(question, context)
        provider = self.select_model(task_type)
        
        if not provider:
            return {
                "answer": grounded_answer,
                "model_used": "none (grounded only)",
                "task_type": task_type.value,
                "sources": sources,
            }
        
        # Build the refinement prompt
        system_prompt = self._build_system_prompt(task_type, grounded_answer, sources)
        
        try:
            if provider == ModelProvider.GEMINI:
                return self._generate_gemini(system_prompt, question, task_type)
            elif provider == ModelProvider.OPENAI:
                return self._generate_openai(system_prompt, question, task_type)
            elif provider == ModelProvider.ANTHROPIC:
                return self._generate_anthropic(system_prompt, question, task_type)
        except Exception as e:
            logger.warning(f"{provider.value} generation failed: {e}")
            # Fallback to grounded answer
            return {
                "answer": grounded_answer,
                "model_used": f"{provider.value} (failed, using grounded)",
                "task_type": task_type.value,
                "sources": sources,
            }
        
        return {
            "answer": grounded_answer,
            "model_used": f"{provider.value} (error)",
            "task_type": task_type.value,
            "sources": sources,
        }
    
    def _build_system_prompt(
        self,
        task_type: TaskType,
        grounded_answer: str,
        sources: List[Dict[str, Any]],
    ) -> str:
        """Build system prompt that enforces grounded responses."""
        source_summary = "\n".join([
            f"- {s['kind']}: {s.get('topic', s.get('title', 'unknown'))}"
            for s in sources[:5]
        ])
        
        base = f"""You are PrepPilot's AI Study Assistant. Your role: {task_type.value.replace('_', ' ')}.

CRITICAL RULES:
1. You MUST use ONLY the grounded facts provided below. Do NOT add new facts, topics, links, or resources.
2. If the grounded answer says "No exact topic matched" or "No saved PDF matched", say exactly that.
3. Keep every citation exact. Do not paraphrase sources.
4. Be encouraging and clear. Use student-friendly language.
5. If asked for something not in the grounded data, say "I don't have that in your study data."

GROUNDED FACTS (your only knowledge source):
{grounded_answer}

AVAILABLE SOURCES:
{source_summary or "None"}

Your task: Refine the grounded answer for clarity and tone. Do not add information."""
        
        return base
    
    def _generate_gemini(self, system_prompt: str, question: str, task_type: TaskType) -> Dict[str, Any]:
        """Generate response using Gemini."""
        model = self.gemini_client.GenerativeModel(
            'gemini-1.5-pro',
            system_instruction=system_prompt
        )
        response = model.generate_content(question)
        return {
            "answer": response.text.strip(),
            "model_used": "gemini-1.5-pro",
            "task_type": task_type.value,
        }
    
    def _generate_openai(self, system_prompt: str, question: str, task_type: TaskType) -> Dict[str, Any]:
        """Generate response using OpenAI."""
        response = self.openai_client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": question},
            ],
            max_tokens=1000,
            temperature=0.3,
        )
        return {
            "answer": response.choices[0].message.content.strip(),
            "model_used": "gpt-4o",
            "task_type": task_type.value,
        }
    
    def _generate_anthropic(self, system_prompt: str, question: str, task_type: TaskType) -> Dict[str, Any]:
        """Generate response using Anthropic Claude."""
        response = self.anthropic_client.messages.create(
            model="claude-3-5-sonnet-20241022",
            max_tokens=1000,
            temperature=0.3,
            system=system_prompt,
            messages=[{"role": "user", "content": question}],
        )
        return {
            "answer": response.content[0].text.strip(),
            "model_used": "claude-3-5-sonnet",
            "task_type": task_type.value,
        }


# Global router instance
_router_instance: Optional[MultiModelRouter] = None


def get_router() -> MultiModelRouter:
    """Get or create the global router instance."""
    global _router_instance
    if _router_instance is None:
        _router_instance = MultiModelRouter()
    return _router_instance


class EnhancedStudyAssistant:
    """
    Enhanced assistant that uses the multi-model router.
    Maintains backward compatibility with StudyAssistantEngine interface.
    """
    
    def __init__(self, user):
        self.user = user
        self.base_engine = None  # Will be set lazily
        self.router = get_router()
    
    def _get_base_engine(self):
        """Lazy import to avoid circular dependencies."""
        if self.base_engine is None:
            from PrepPilot.engines.assistant import StudyAssistantEngine
            self.base_engine = StudyAssistantEngine(self.user)
        return self.base_engine
    
    def answer(self, question: str) -> Dict[str, Any]:
        """Enhanced answer with multi-model routing."""
        base_engine = self._get_base_engine()
        
        # Get grounded answer from base engine
        cleaned = question.strip()
        if not cleaned:
            return {
                'answer': 'Please ask a study question first.',
                'sources': [],
                'topics': [],
                'vault_items': [],
                'model_used': 'none',
                'task_type': 'empty',
            }
        
        topics = base_engine.find_topics(cleaned)
        vault_items = base_engine.find_vault_items(cleaned)
        grounded_result = base_engine.build_precise_answer(cleaned, topics, vault_items)
        
        # Route to best model for refinement
        context = {
            'user': self.user,
            'topics': [str(t.id) for t in topics],
            'vault_items': [str(v.id) for v in vault_items],
        }
        
        routed_result = self.router.generate_response(
            cleaned,
            context,
            grounded_result['answer'],
            grounded_result['sources'],
        )
        
        # Merge results
        routed_result['sources'] = grounded_result['sources']
        routed_result['topics'] = [str(topic.id) for topic in topics]
        routed_result['vault_items'] = [str(item.id) for item in vault_items]
        
        # Persist conversation
        from PrepPilot.models import AssistantConversation
        AssistantConversation.objects.create(
            user=self.user,
            question=cleaned,
            answer=routed_result['answer'],
            sources=routed_result['sources'],
        )
        
        return routed_result