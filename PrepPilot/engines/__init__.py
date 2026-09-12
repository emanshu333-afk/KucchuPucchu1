"""
PrepPilot Engines Package
"""
from .topic_priority import TopicPriorityEngine
from .time_budget import TimeBudgetEngine
from .resource_matcher import ResourceMatcherEngine
from .daily_plan import DailyPlanEngine
from .recovery import RecoveryEngine
from .readiness import ReadinessEngine
from .whatif import WhatIfEngine
from .assistant import StudyAssistantEngine
from .ai_router import (
    ClaudeRouter, 
    ClaudeStudyAssistant, 
    classify_task_fast, 
    get_claude_router,
    # Backward compat
    get_router,
    FastAIRouter,
    FastStudyAssistant,
    EnhancedStudyAssistant,
    get_fast_router,
)
from .unit_converter import UnitConverter, convert_units, convert_units_direct
from .step_by_step_solver import StepByStepSolver, solve_step_by_step, preprocess_math_expression
from .physics_chemistry_calculator import (
    PhysicsChemistryCalculator,
    get_formula_calculator,
    calculate_physics,
    calculate_chemistry,
    search_formulas,
    find_formula,
    calculate_formula,
)
from .practice_generator import (
    PracticeProblemGenerator,
    PracticeProblem,
    ProblemDifficulty,
    ProblemType,
    Subject,
    generate_practice_problems,
    generate_by_weak_areas,
    get_practice_problem_generator,
)
from .quiz_engine import (
    QuizEngine,
    QuizSession,
    QuizQuestion,
    QuizStatus,
    QuizMode,
    QuizEngine,
    DailyChallengeManager,
    QuizAnalytics,
    create_quiz_session,
    get_quiz_engine,
    get_daily_challenge_manager,
    get_quiz_analytics,
)

__all__ = [
    'TopicPriorityEngine',
    'TimeBudgetEngine',
    'ResourceMatcherEngine',
    'DailyPlanEngine',
    'RecoveryEngine',
    'ReadinessEngine',
    'WhatIfEngine',
    'StudyAssistantEngine',
    'ClaudeRouter',
    'ClaudeStudyAssistant',
    'classify_task_fast',
    'get_claude_router',
    # Backward compat
    'get_router',
    'FastAIRouter',
    'FastStudyAssistant',
    'EnhancedStudyAssistant',
    'get_fast_router',
    'UnitConverter',
    'convert_units',
    'convert_units_direct',
    'StepByStepSolver',
    'solve_step_by_step',
    'preprocess_math_expression',
    'PhysicsChemistryCalculator',
    'get_formula_calculator',
    'calculate_physics',
    'calculate_chemistry',
    'search_formulas',
    'find_formula',
    'calculate_formula',
    'PracticeProblemGenerator',
    'PracticeProblem',
    'ProblemDifficulty',
    'ProblemType',
    'Subject',
    'generate_practice_problems',
    'generate_by_weak_areas',
    'get_practice_problem_generator',
    'QuizEngine',
    'QuizSession',
    'QuizQuestion',
    'QuizStatus',
    'QuizMode',
    'DailyChallengeManager',
    'QuizAnalytics',
    'create_quiz_session',
    'get_quiz_engine',
    'get_daily_challenge_manager',
    'get_quiz_analytics',
]