"""
Interactive Quiz Engine - Generates and manages adaptive quizzes for students.
Supports multiple question types, adaptive difficulty, timed sessions, and detailed analytics.
"""
import logging
import random
import time
import uuid
from typing import Any, Dict, List, Optional, Set
from dataclasses import dataclass, field
from enum import Enum
from datetime import datetime

from django.conf import settings

from .practice_generator import (
    PracticeProblem, 
    ProblemDifficulty, 
    ProblemType, 
    Subject, 
    generate_practice_problems,
    PracticeProblemGenerator,
)

logger = logging.getLogger(__name__)


class QuizStatus(Enum):
    NOT_STARTED = "not_started"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    ABANDONED = "abandoned"
    TIMED_OUT = "timed_out"


class QuizMode(Enum):
    PRACTICE = "practice"           # No time limit, hints available
    TIMED = "timed"                 # Fixed time limit
    ADAPTIVE = "adaptive"           # Difficulty adjusts based on performance
    EXAM = "exam"                   # Strict exam conditions
    DAILY_CHALLENGE = "daily"       # Daily practice set


@dataclass
class QuizQuestion:
    """A question within a quiz session."""
    problem: Any  # PracticeProblem
    user_answer: Any = None
    is_correct: Optional[bool] = None
    time_spent_seconds: int = 0
    hints_used: int = 0
    attempts: int = 1
    skipped: bool = False
    timestamp: datetime = field(default_factory=datetime.now)


@dataclass
class QuizSession:
    """A complete quiz session with tracking."""
    id: str
    user_id: str
    mode: QuizMode
    status: QuizStatus = QuizStatus.NOT_STARTED
    subject: Optional[Subject] = None
    topics: List[str] = field(default_factory=list)
    difficulty: Optional[int] = None  # For adaptive mode
    questions: List[QuizQuestion] = field(default_factory=list)
    current_question_index: int = 0
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    time_limit_seconds: Optional[int] = None
    max_questions: int = 10
    
    # Adaptive mode settings
    target_accuracy: float = 0.7
    difficulty_adjustment_threshold: float = 0.2
    
    # Stats
    correct_count: int = 0
    incorrect_count: int = 0
    skipped_count: int = 0
    total_time_seconds: int = 0
    hints_used_total: int = 0
    
    def __post_init__(self):
        if self.id is None:
            self.id = str(uuid.uuid4())[:8]


class QuizEngine:
    """Main quiz engine for creating and managing quiz sessions."""
    
    def __init__(self):
        self.active_sessions: Dict[str, QuizSession] = {}
        self.problem_generator = PracticeProblemGenerator()
    
    def create_session(
        self,
        user_id: str,
        mode: QuizMode = QuizMode.PRACTICE,
        subject: Optional[Subject] = None,
        topics: Optional[List[str]] = None,
        difficulty: Optional[int] = None,
        max_questions: int = 10,
        time_limit_minutes: Optional[int] = None,
    ) -> QuizSession:
        """Create a new quiz session."""
        # Generate problems
        problems = generate_practice_problems(
            subject=subject,
            topics=topics,
            difficulty=None,  # We'll set per-question
            count=max_questions,
        )
        
        if not problems:
            raise ValueError("No problems available for the given criteria")
        
        session = QuizSession(
            id=str(uuid.uuid4())[:8],
            user_id=user_id,
            mode=mode,
            subject=subject,
            topics=topics or [],
            max_questions=min(max_questions, len(problems)),
            time_limit_seconds=time_limit_minutes * 60 if time_limit_minutes else None,
        )
        
        # Create quiz questions from problems
        session.questions = [
            QuizQuestion(problem=p) for p in problems[:session.max_questions]
        ]
        
        # For adaptive mode, start with medium difficulty
        if mode == QuizMode.ADAPTIVE:
            session.difficulty = ProblemDifficulty.MEDIUM.value
        
        self.active_sessions[session.id] = session
        return session
    
    def start_session(self, session_id: str) -> QuizSession:
        """Start a quiz session."""
        session = self.active_sessions.get(session_id)
        if not session:
            raise ValueError(f"Session {session_id} not found")
        
        session.status = QuizStatus.IN_PROGRESS
        session.started_at = datetime.now()
        session.current_question_index = 0
        return session
    
    def get_current_question(self, session_id: str) -> Optional[QuizQuestion]:
        """Get the current question for a session."""
        session = self.active_sessions.get(session_id)
        if not session or session.status != QuizStatus.IN_PROGRESS:
            return None
        
        if session.current_question_index >= len(session.questions):
            return None
        
        return session.questions[session.current_question_index]
    
    def submit_answer(
        self,
        session_id: str,
        answer: Any,
        time_spent_seconds: int = 0,
        hints_used: int = 0,
    ) -> Dict[str, Any]:
        """Submit an answer for the current question."""
        session = self.active_sessions.get(session_id)
        if not session or session.status != QuizStatus.IN_PROGRESS:
            return {"error": "Session not found or not in progress"}
        
        question = self.get_current_question(session_id)
        if not question:
            return {"error": "No current question"}
        
        # Check answer
        is_correct = self._check_answer(question.problem, answer)
        question.user_answer = answer
        question.is_correct = is_correct
        question.time_spent_seconds = time_spent_seconds
        question.hints_used = hints_used
        
        # Update stats
        if is_correct:
            session.correct_count += 1
        else:
            session.incorrect_count += 1
        session.total_time_seconds += time_spent_seconds
        session.hints_used_total += hints_used
        
        # Move to next question
        session.current_question_index += 1
        
        # Check if quiz is complete
        is_complete = session.current_question_index >= len(session.questions)
        if is_complete:
            session.status = QuizStatus.COMPLETED
            session.completed_at = datetime.now()
        
        # Adaptive difficulty adjustment
        if session.mode == QuizMode.ADAPTIVE:
            self._adapt_difficulty(session)
        
        # Check time limit
        if session.time_limit_seconds:
            elapsed = (datetime.now() - session.started_at).total_seconds()
            if elapsed >= session.time_limit_seconds:
                session.status = QuizStatus.TIMED_OUT
                is_complete = True
        
        return {
            "is_correct": is_correct,
            "correct_answer": question.problem.correct_answer,
            "explanation": question.problem.explanation,
            "is_complete": is_complete,
            "progress": {
                "current": session.current_question_index,
                "total": len(session.questions),
                "correct": session.correct_count,
                "incorrect": session.incorrect_count,
            },
            "next_question": self.get_current_question(session_id).__dict__ if not is_complete else None,
        }
    
    def _check_answer(self, problem: PracticeProblem, answer: Any) -> bool:
        """Check if the answer is correct."""
        if problem.problem_type == ProblemType.NUMERIC:
            # Allow small floating point tolerance
            try:
                user_val = float(answer)
                correct_val = float(problem.correct_answer)
                return abs(user_val - correct_val) < 0.01
            except (ValueError, TypeError):
                return False
        elif problem.problem_type == ProblemType.MULTIPLE_CHOICE:
            return str(answer).strip() == str(problem.correct_answer).strip()
        elif problem.problem_type == ProblemType.TRUE_FALSE:
            return str(answer).lower().strip() == str(problem.correct_answer).lower().strip()
        elif problem.problem_type == ProblemType.FILL_IN_BLANK:
            return str(answer).strip().lower() == str(problem.correct_answer).strip().lower()
        elif problem.problem_type == ProblemType.MULTIPLE_SELECT:
            # For multiple select, check if all selected options are correct
            if isinstance(answer, list) and isinstance(problem.correct_answer, list):
                return set(answer) == set(problem.correct_answer)
            return False
        return False
    
    def _adapt_difficulty(self, session: QuizSession):
        """Adjust difficulty based on recent performance in adaptive mode."""
        if len(session.questions) < 3:
            return  # Need some data
        
        # Look at last 3 questions
        recent = session.questions[-3:]
        correct = sum(1 for q in recent if q.is_correct)
        accuracy = correct / len(recent)
        
        target = session.target_accuracy
        threshold = session.difficulty_adjustment_threshold
        
        if accuracy > target + session.difficulty_adjustment_threshold and session.difficulty < ProblemDifficulty.EXPERT.value:
            session.difficulty += 1
        elif accuracy < target - session.difficulty_adjustment_threshold and session.difficulty > ProblemDifficulty.EASY.value:
            session.difficulty -= 1
    
    def get_session_results(self, session_id: str) -> Dict[str, Any]:
        """Get detailed results for a completed session."""
        session = self.active_sessions.get(session_id)
        if not session:
            return {"error": "Session not found"}
        
        total_questions = len(session.questions)
        if total_questions == 0:
            return {"error": "No questions in session"}
        
        accuracy = session.correct_count / total_questions if total_questions > 0 else 0
        avg_time = session.total_time_seconds / total_questions if total_questions > 0 else 0
        
        # Per-topic breakdown
        topic_stats = {}
        for q in session.questions:
            topic = q.problem.topic
            if topic not in topic_stats:
                topic_stats[topic] = {"correct": 0, "total": 0}
            topic_stats[topic]["total"] += 1
            if q.is_correct:
                topic_stats[topic]["correct"] += 1
        
        return {
            "session_id": session.id,
            "mode": session.mode.value,
            "status": session.status.value,
            "total_questions": total_questions,
            "correct": session.correct_count,
            "incorrect": session.incorrect_count,
            "skipped": session.skipped_count,
            "accuracy": round(accuracy * 100, 1),
            "total_time_seconds": session.total_time_seconds,
            "avg_time_per_question": round(avg_time, 1),
            "hints_used": session.hints_used_total,
            "topic_breakdown": {
                topic: {
                    "correct": stats["correct"],
                    "total": stats["total"],
                    "accuracy": round(stats["correct"] / stats["total"] * 100, 1) if stats["total"] > 0 else 0
                }
                for topic, stats in topic_stats.items()
            },
            "questions": [
                {
                    "question": q.problem.question[:100] + "..." if len(q.problem.question) > 100 else q.problem.question,
                    "correct": q.is_correct,
                    "user_answer": q.user_answer,
                    "correct_answer": q.problem.correct_answer,
                    "time_spent": q.time_spent_seconds,
                    "hints_used": q.hints_used,
                }
                for q in session.questions
            ],
        }
    
    def skip_question(self, session_id: str) -> Dict[str, Any]:
        """Skip the current question."""
        session = self.active_sessions.get(session_id)
        if not session or session.status != QuizStatus.IN_PROGRESS:
            return {"error": "Session not found or not in progress"}
        
        question = self.get_current_question(session_id)
        if not question:
            return {"error": "No current question"}
        
        question.skipped = True
        session.skipped_count += 1
        session.current_question_index += 1
        
        is_complete = session.current_question_index >= len(session.questions)
        if is_complete:
            session.status = QuizStatus.COMPLETED
            session.completed_at = datetime.now()
        
        return {
            "is_complete": is_complete,
            "next_question": self.get_current_question(session_id).__dict__ if not is_complete else None,
        }
    
    def get_hint(self, session_id: str) -> Dict[str, Any]:
        """Get a hint for the current question."""
        session = self.active_sessions.get(session_id)
        if not session or session.status != QuizStatus.IN_PROGRESS:
            return {"error": "Session not found or not in progress"}
        
        question = self.get_current_question(session_id)
        if not question:
            return {"error": "No current question"}
        
        if not question.problem.hints:
            return {"hint": "No hints available for this question"}
        
        hint_index = min(question.hints_used, len(question.problem.hints) - 1)
        hint = question.problem.hints[hint_index]
        question.hints_used += 1
        
        return {
            "hint": hint,
            "hints_remaining": len(question.problem.hints) - question.hints_used,
        }
    
    def end_session(self, session_id: str) -> Dict[str, Any]:
        """End a quiz session early."""
        session = self.active_sessions.get(session_id)
        if not session:
            return {"error": "Session not found"}
        
        session.status = QuizStatus.ABANDONED
        session.completed_at = datetime.now()
        
        return self.get_session_results(session_id)
    
    def get_active_sessions(self, user_id: str) -> List[QuizSession]:
        """Get all active sessions for a user."""
        return [
            s for s in self.active_sessions.values()
            if s.user_id == user_id and s.status in [QuizStatus.NOT_STARTED, QuizStatus.IN_PROGRESS]
        ]
    
    def cleanup_old_sessions(self, max_age_hours: int = 24):
        """Clean up old completed/abandoned sessions."""
        cutoff = datetime.now().timestamp() - (max_age_hours * 3600)
        to_remove = []
        for session_id, session in self.active_sessions.items():
            if session.completed_at and session.completed_at.timestamp() < cutoff:
                to_remove.append(session_id)
            elif session.status in [QuizStatus.ABANDONED, QuizStatus.TIMED_OUT]:
                if session.started_at and session.started_at.timestamp() < cutoff:
                    to_remove.append(session_id)
        
        for session_id in to_remove:
            del self.active_sessions[session_id]


# Daily Challenge Manager
class DailyChallengeManager:
    """Manages daily challenge quizzes."""
    
    def __init__(self):
        self.challenge_history: Dict[str, Dict] = {}  # user_id -> {date: session_id}
    
    def get_daily_challenge(
        self,
        user_id: str,
        quiz_engine: 'QuizEngine',
    ) -> QuizSession:
        """Get or create today's daily challenge for a user."""
        today = datetime.now().date().isoformat()
        
        # Check if already completed today
        if user_id in self.challenge_history and today in self.challenge_history[user_id]:
            session_id = self.challenge_history[user_id][today]
            session = quiz_engine.active_sessions.get(session_id)
            if session and session.status == QuizStatus.COMPLETED:
                return session  # Already completed today
        
        # Create new daily challenge
        session = quiz_engine.create_session(
            user_id=user_id,
            mode=QuizMode.DAILY_CHALLENGE,
            subject=None,  # Mix of subjects
            max_questions=5,
            time_limit_minutes=10,
        )
        
        quiz_engine.start_session(session.id)
        
        # Record in history
        if user_id not in self.challenge_history:
            self.challenge_history[user_id] = {}
        self.challenge_history[user_id][today] = session.id
        
        return session
    
    def get_streak(self, user_id: str) -> int:
        """Get current streak of completed daily challenges."""
        if user_id not in self.challenge_history:
            return 0
        
        streak = 0
        today = datetime.now().date()
        while True:
            date_str = today.isoformat()
            if date_str in self.challenge_history.get(user_id, {}):
                session_id = self.challenge_history[user_id][date_str]
                # Would need to check if actually completed
                streak += 1
                today = today - datetime.timedelta(days=1)
            else:
                break
        return streak


# Quiz Analytics
class QuizAnalytics:
    """Provides analytics on quiz performance."""
    
    def __init__(self, quiz_engine: QuizEngine):
        self.engine = quiz_engine
    
    def get_user_performance(self, user_id: str) -> Dict[str, Any]:
        """Get overall performance stats for a user."""
        sessions = self.engine.get_active_sessions(user_id)
        completed = [s for s in self.engine.active_sessions.values() 
                    if s.user_id == user_id and s.status == QuizStatus.COMPLETED]
        
        if not completed:
            return {"message": "No completed sessions yet"}
        
        total_questions = sum(len(s.questions) for s in completed)
        total_correct = sum(s.correct_count for s in completed)
        total_time = sum(s.total_time_seconds for s in completed)
        
        # Per-subject stats
        subject_stats = {}
        for session in completed:
            for q in session.questions:
                subj = q.problem.subject.value if q.problem.subject else "unknown"
                if subj not in subject_stats:
                    subject_stats[subj] = {"correct": 0, "total": 0}
                subject_stats[subj]["total"] += 1
                if q.is_correct:
                    subject_stats[subj]["correct"] += 1
        
        return {
            "total_sessions": len(completed),
            "total_questions": total_questions,
            "total_correct": total_correct,
            "overall_accuracy": round(total_correct / total_questions * 100, 1) if total_questions > 0 else 0,
            "total_time_hours": round(sum(s.total_time_seconds for s in completed) / 3600, 2),
            "avg_session_time_minutes": round(sum(s.total_time_seconds for s in completed) / len(completed) / 60, 1) if completed else 0,
            "subject_breakdown": {
                subj: {
                    "correct": stats["correct"],
                    "total": stats["total"],
                    "accuracy": round(stats["correct"] / stats["total"] * 100, 1) if stats["total"] > 0 else 0
                }
                for subj, stats in subject_stats.items()
            },
        }
    
    def get_learning_progress(self, user_id: str) -> Dict[str, Any]:
        """Track learning progress over time."""
        sessions = self.engine.get_active_sessions(user_id)
        completed = [s for s in self.engine.active_sessions.values() 
                    if s.user_id == user_id and s.status == QuizStatus.COMPLETED]
        completed.sort(key=lambda s: s.completed_at or datetime.min)
        
        # Track accuracy over time
        progress = []
        for session in completed:
            total = len(session.questions)
            correct = session.correct_count
            progress.append({
                "date": session.completed_at.isoformat() if session.completed_at else None,
                "accuracy": round(correct / total * 100, 1) if total > 0 else 0,
                "questions": total,
            })
        
        return {
            "progress": progress,
            "trend": "improving" if len(progress) > 2 and progress[-1]["accuracy"] > progress[-3]["accuracy"] else "stable",
        }


# Convenience functions
def create_quiz_session(
    user_id: str,
    mode: QuizMode = QuizMode.PRACTICE,
    subject: Optional[Subject] = None,
    topics: Optional[List[str]] = None,
    max_questions: int = 10,
    time_limit_minutes: Optional[int] = None,
) -> QuizSession:
    """Quick function to create a quiz session."""
    engine = QuizEngine()
    return engine.create_session(user_id, mode, subject, topics, None, max_questions, time_limit_minutes)


def get_quiz_engine() -> QuizEngine:
    """Get a quiz engine instance."""
    return QuizEngine()


def get_daily_challenge_manager() -> DailyChallengeManager:
    """Get the daily challenge manager."""
    return DailyChallengeManager()


def get_quiz_analytics(engine: Optional[QuizEngine] = None) -> QuizAnalytics:
    """Get quiz analytics."""
    if engine is None:
        engine = QuizEngine()
    return QuizAnalytics(engine)