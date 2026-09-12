"""
Practice Problem Generator Engine - Generates personalized practice problems
based on student's weak areas, current level, and learning objectives.
"""
import logging
import random
from typing import Any, Dict, List, Optional, Tuple
from dataclasses import dataclass, field
from enum import Enum

from django.conf import settings

logger = logging.getLogger(__name__)


class ProblemDifficulty(Enum):
    EASY = 1
    MEDIUM = 2
    HARD = 3
    EXPERT = 4


class ProblemType(Enum):
    MULTIPLE_CHOICE = "multiple_choice"
    NUMERIC = "numeric"
    TRUE_FALSE = "true_false"
    FILL_IN_BLANK = "fill_in_blank"
    MULTIPLE_SELECT = "multiple_select"


class Subject(Enum):
    PHYSICS = "physics"
    CHEMISTRY = "chemistry"
    MATHEMATICS = "mathematics"


@dataclass
class PracticeProblem:
    """Represents a single practice problem."""
    id: str
    subject: Subject
    topic: str
    difficulty: ProblemDifficulty
    problem_type: ProblemType
    question: str
    options: List[str] = field(default_factory=list)
    correct_answer: Any = None
    explanation: str = ""
    hints: List[str] = field(default_factory=list)
    tags: List[str] = field(default_factory=list)
    estimated_time_seconds: int = 60
    formula_ids: List[str] = field(default_factory=list)
    concept_tags: List[str] = field(default_factory=list)


# Physics problem templates
PHYSICS_PROBLEM_TEMPLATES = {
    'kinetic_energy': {
        'subject': Subject.PHYSICS,
        'topic': 'Mechanics - Kinetic Energy',
        'concept_tags': ['energy', 'kinetic', 'mechanics'],
        'formula_ids': ['kinetic_energy'],
        'templates': [
            {
                'difficulty': ProblemDifficulty.EASY,
                'type': ProblemType.NUMERIC,
                'question': 'A {mass} kg object is moving at {velocity} m/s. What is its kinetic energy?',
                'params': {'mass': (1, 10), 'velocity': (1, 20)},
                'solve_for': 'energy',
            },
            {
                'difficulty': ProblemDifficulty.MEDIUM,
                'type': ProblemType.NUMERIC,
                'question': 'An object has {energy} J of kinetic energy and is moving at {velocity} m/s. What is its mass?',
                'params': {'energy': (10, 5000), 'velocity': (1, 20)},
                'solve_for': 'mass',
            },
            {
                'difficulty': ProblemDifficulty.HARD,
                'type': ProblemType.MULTIPLE_CHOICE,
                'question': 'If the velocity of an object is doubled, its kinetic energy becomes:',
                'options': [
                    'Half',
                    'Same',
                    'Double',
                    'Four times'
                ],
                'correct_answer': 3,
                'explanation': 'Kinetic energy is proportional to velocity squared (KE = 1/2 mv²). Doubling velocity quadruples KE.',
            },
        ],
    },
    'potential_energy': {
        'subject': Subject.PHYSICS,
        'topic': 'Mechanics - Potential Energy',
        'concept_tags': ['energy', 'potential', 'gravity'],
        'formula_ids': ['potential_energy'],
        'templates': [
            {
                'difficulty': ProblemDifficulty.EASY,
                'type': ProblemType.NUMERIC,
                'question': 'A {mass} kg object is lifted to a height of {height} m. What is its gravitational potential energy? (g = 9.81 m/s²)',
                'params': {'mass': (1, 50), 'height': (1, 100)},
                'solve_for': 'energy',
            },
            {
                'difficulty': ProblemDifficulty.MEDIUM,
                'type': ProblemType.NUMERIC,
                'question': 'An object with {mass} kg mass has {energy} J of gravitational potential energy. What height is it at? (g = 9.81 m/s²)',
                'params': {'mass': (1, 50), 'energy': (100, 50000)},
                'solve_for': 'height',
            },
        ],
    },
    'ohms_law': {
        'subject': Subject.PHYSICS,
        'topic': 'Electricity - Ohm\'s Law',
        'concept_tags': ['electricity', 'ohms_law', 'circuits'],
        'formula_ids': ['ohms_law'],
        'templates': [
            {
                'difficulty': ProblemDifficulty.EASY,
                'type': ProblemType.NUMERIC,
                'question': 'A circuit has a voltage of {voltage} V and a resistance of {resistance} Ω. What is the current?',
                'params': {'voltage': (1, 240), 'resistance': (1, 1000)},
                'solve_for': 'current',
            },
            {
                'difficulty': ProblemDifficulty.MEDIUM,
                'type': ProblemType.MULTIPLE_CHOICE,
                'question': 'If the resistance in a circuit is doubled while the voltage remains constant, the current will:',
                'options': [
                    'Double',
                    'Halve',
                    'Remain the same',
                    'Become zero'
                ],
                'correct_answer': 1,
                'explanation': 'According to Ohm\'s Law (V = IR), current is inversely proportional to resistance when voltage is constant.',
            },
        ],
    },
    'ideal_gas_law': {
        'subject': Subject.CHEMISTRY,
        'topic': 'Chemistry - Ideal Gas Law',
        'concept_tags': ['gases', 'ideal_gas_law', 'thermodynamics'],
        'formula_ids': ['ideal_gas_law'],
        'templates': [
            {
                'difficulty': ProblemDifficulty.MEDIUM,
                'type': ProblemType.NUMERIC,
                'question': 'A gas occupies {volume} L at {pressure} atm and {temperature} K. How many moles of gas are present? (R = 0.0821 L·atm/mol·K)',
                'params': {'volume': (0.5, 50), 'pressure': (0.5, 10), 'temperature': (100, 1000)},
                'solve_for': 'moles',
            },
            {
                'difficulty': ProblemDifficulty.HARD,
                'type': ProblemType.MULTIPLE_CHOICE,
                'question': 'If the temperature of an ideal gas is doubled while keeping volume constant, the pressure will:',
                'options': [
                    'Double',
                    'Halve',
                    'Remain the same',
                    'Quadruple'
                ],
                'correct_answer': 0,
                'explanation': 'According to Gay-Lussac\'s Law (P/T = constant), pressure is directly proportional to absolute temperature at constant volume.',
            },
        ],
    },
    'molarity': {
        'subject': Subject.CHEMISTRY,
        'topic': 'Chemistry - Molarity',
        'concept_tags': ['solutions', 'concentration', 'molarity'],
        'formula_ids': ['molarity'],
        'templates': [
            {
                'difficulty': ProblemDifficulty.EASY,
                'type': ProblemType.NUMERIC,
                'question': 'What is the molarity of a solution containing {moles} mol of solute in {volume} L of solution?',
                'params': {'moles': (0.1, 5), 'volume': (0.1, 5)},
                'solve_for': 'molarity',
            },
            {
                'difficulty': ProblemDifficulty.MEDIUM,
                'type': ProblemType.NUMERIC,
                'question': 'How many moles of solute are needed to make {volume} L of a {molarity} M solution?',
                'params': {'volume': (0.1, 5), 'molarity': (0.1, 5)},
                'solve_for': 'moles',
            },
        ],
    },
    'dilution': {
        'subject': Subject.CHEMISTRY,
        'topic': 'Chemistry - Dilution',
        'concept_tags': ['solutions', 'dilution', 'concentration'],
        'formula_ids': ['dilution'],
        'templates': [
            {
                'difficulty': ProblemDifficulty.MEDIUM,
                'type': ProblemType.NUMERIC,
                'question': 'How much water must be added to {v1} mL of a {m1} M solution to make it {m2} M?',
                'params': {'v1': (10, 500), 'm1': (0.1, 10), 'm2': (0.01, 1)},
                'solve_for': 'V2',
            },
            {
                'difficulty': ProblemDifficulty.HARD,
                'type': ProblemType.MULTIPLE_CHOICE,
                'question': 'To prepare 500 mL of 0.1 M HCl from a 12 M stock solution, what volume of stock solution is needed?',
                'options': [
                    '4.17 mL',
                    '41.7 mL',
                    '417 mL',
                    '4.17 L'
                ],
                'correct_answer': 0,
                'explanation': 'Using M1V1 = M2V2: V1 = M2V2/M1 = (0.1 M × 500 mL) / 12 M = 4.17 mL',
            },
        ],
    },
    'ph': {
        'subject': Subject.CHEMISTRY,
        'topic': 'Chemistry - pH Calculations',
        'concept_tags': ['acids_bases', 'ph', 'equilibrium'],
        'formula_ids': ['ph'],
        'templates': [
            {
                'difficulty': ProblemDifficulty.EASY,
                'type': ProblemType.NUMERIC,
                'question': 'What is the pH of a solution with [H+] = {h_conc} M?',
                'params': {'h_conc': [1e-7, 1e-1, 1e-2, 1e-3, 1e-4, 1e-5, 1e-6]},
                'solve_for': 'pH',
            },
            {
                'difficulty': ProblemDifficulty.MEDIUM,
                'type': ProblemType.NUMERIC,
                'question': 'What is the [H+] concentration of a solution with pH = {ph}?',
                'params': {'ph': [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]},
                'solve_for': 'h_concentration',
            },
        ],
    },
}


def generate_problem_from_template(template: Dict[str, Any], template_key: str) -> PracticeProblem:
    """Generate a specific problem instance from a template."""
    import uuid
    
    params = {}
    if 'params' in template:
        for param, value_range in template['params'].items():
            if isinstance(value_range, (list, tuple)) and len(value_range) == 2:
                # Range of numbers (tuple or list with 2 elements)
                params[param] = round(random.uniform(value_range[0], value_range[1]), 2)
            elif isinstance(value_range, (list, tuple)):
                # Discrete values
                params[param] = random.choice(value_range)
            else:
                params[param] = value_range
    
    # Handle the special case for dilution problems
    if 'solve_for' in template and template['solve_for'] == 'V2':
        # For dilution, we need to compute V2
        pass
    
    question = template['question'].format(**params)
    
    problem_id = f"{template_key}_{uuid.uuid4().hex[:8]}"
    
    # Calculate correct answer based on template
    correct_answer = None
    if template.get('solve_for') == 'energy':
        m = params.get('mass', 1)
        v = params.get('velocity', 1)
        correct_answer = 0.5 * m * v * v
    elif template.get('solve_for') == 'mass':
        e = params.get('energy', 1)
        v = params.get('velocity', 1)
        correct_answer = 2 * e / (v * v)
    elif template.get('solve_for') == 'current':
        v = params.get('voltage', 1)
        r = params.get('resistance', 1)
        correct_answer = v / params.get('resistance', 1)
    elif template.get('solve_for') == 'moles':
        if 'volume' in params and 'pressure' in params and 'temperature' in params:
            # Ideal gas law
            v = params.get('volume', 1)
            p = params.get('pressure', 1)
            t = params.get('temperature', 1)
            correct_answer = p * v / (0.0821 * params.get('temperature', 1))
        elif 'volume' in params and 'molarity' in params:
            v = params.get('volume', 1)
            m = params.get('molarity', 1)
            correct_answer = m * v
    elif template.get('solve_for') == 'molarity':
        m = params.get('moles', 1)
        v = params.get('volume', 1)
        correct_answer = m / v
    elif template.get('solve_for') == 'moles':
        if 'volume' in params and 'molarity' in params:
            v = params.get('volume', 1)
            m = params.get('molarity', 1)
            correct_answer = m * v
    elif template.get('solve_for') == 'current':
        v = params.get('voltage', 1)
        r = params.get('resistance', 1)
        correct_answer = v / r
    elif template.get('solve_for') == 'pH':
        h = params.get('h_conc', 1)
        correct_answer = round(-math.log10(h), 2)
    elif template.get('solve_for') == 'h_concentration':
        ph = params.get('ph', 7)
        correct_answer = round(10 ** (-params.get('ph', 7)), 2)
    elif template.get('solve_for') == 'height':
        e = params.get('energy', 1)
        m = params.get('mass', 1)
        g = params.get('gravity', 9.81)
        correct_answer = e / (m * g)
    elif template.get('solve_for') == 'V2':
        m1 = params.get('m1', 1)
        v1 = params.get('v1', 1)
        m2 = params.get('m2', 1)
        correct_answer = m1 * v1 / m2
    
    problem = PracticeProblem(
        id=f"problem_{uuid.uuid4().hex[:8]}",
        subject=template.get('subject', Subject.PHYSICS),
        topic=template.get('topic', ''),
        difficulty=template.get('difficulty', ProblemDifficulty.MEDIUM),
        problem_type=template.get('type', ProblemType.NUMERIC),
        question=question,
        options=template.get('options', []),
        correct_answer=correct_answer,
        explanation=template.get('explanation', ''),
        hints=template.get('hints', []),
        tags=template.get('concept_tags', []),
        formula_ids=template.get('formula_ids', []),
        concept_tags=template.get('concept_tags', []),
    )
    
    # Handle multiple choice options
    if template.get('type') == ProblemType.MULTIPLE_CHOICE:
        if 'options' in template:
            problem.options = template['options']
        if 'correct_answer' in template:
            problem.correct_answer = template['correct_answer']
        if 'explanation' in template:
            problem.explanation = template['explanation']
    
    return problem


class PracticeProblemGenerator:
    """Generates personalized practice problems based on student profile."""
    
    def __init__(self):
        self.templates = PHYSICS_PROBLEM_TEMPLATES
        self.used_problems: set = set()
    
    def generate_problems(
        self,
        subject: Optional[Subject] = None,
        topics: Optional[List[str]] = None,
        difficulty: Optional[ProblemDifficulty] = None,
        problem_type: Optional[ProblemType] = None,
        count: int = 5,
        exclude_used: bool = True,
    ) -> List[PracticeProblem]:
        """Generate a set of practice problems based on criteria."""
        # Filter templates
        available = []
        for key, template_group in self.templates.items():
            if subject and template_group.get('subject') != subject:
                continue
            if topics and template_group.get('topic') not in topics:
                continue
            
            for template in template_group.get('templates', []):
                if difficulty and template['difficulty'] != difficulty:
                    continue
                if problem_type and template['type'] != problem_type:
                    continue
                
                # Check if already used
                problem_key = f"{key}_{template.get('difficulty', ProblemDifficulty.MEDIUM).name}"
                if exclude_used and problem_key in self.used_problems:
                    continue
                    
                available.append((key, template))
        
        if not available:
            return []
        
        # Select random problems
        selected = random.sample(available, min(count, len(available)))
        
        problems = []
        for key, template in selected:
            problem = generate_problem_from_template(template, key)
            self.used_problems.add(f"{key}_{template.get('difficulty', ProblemDifficulty.MEDIUM).name}")
            problems.append(problem)
        
        return problems
    
    def generate_by_weak_areas(
        self,
        weak_topics: List[str],
        count: int = 5,
    ) -> List[PracticeProblem]:
        """Generate problems targeting specific weak topics."""
        # Map weak topics to template keys
        topic_mapping = {
            'kinetic_energy': 'kinetic_energy',
            'potential_energy': 'potential_energy',
            'ohms_law': 'ohms_law',
            'kinematics': 'kinematics',
            'newtons_laws': 'newtons_laws',
            'ideal_gas_law': 'ideal_gas_law',
            'molarity': 'molarity',
            'dilution': 'dilution',
            'ph': 'ph',
            'stoichiometry': 'stoichiometry',
            'kinetics': 'kinetics',
            'thermochemistry': 'thermochemistry',
        }
        
        template_keys = []
        for topic in weak_topics:
            key = topic_mapping.get(topic.lower())
            if key and key in self.templates:
                template_keys.append(key)
        
        if not template_keys:
            return []
        
        problems = []
        for key in template_keys:
            template_group = self.templates.get(key)
            if not template_group:
                continue
            
            for template in template_group.get('templates', []):
                if len(problems) >= 10:
                    break
                problem = generate_problem_from_template(template, key)
                problems.append(problem)
                if len(problems) >= 10:
                    break
        
        return problems[:10]
    
    def mark_used(self, problem_id: str):
        """Mark a problem as used."""
        self.used_problems.add(problem_id)
    
    def reset_used(self):
        """Reset used problems tracker."""
        self.used_problems.clear()


# Convenience functions
def generate_practice_problems(
    subject: Optional[Subject] = None,
    topics: Optional[List[str]] = None,
    difficulty: Optional[ProblemDifficulty] = None,
    problem_type: Optional[ProblemType] = None,
    count: int = 5,
) -> List[PracticeProblem]:
    """Generate practice problems with given criteria."""
    generator = PracticeProblemGenerator()
    return generator.generate_problems(
        subject=subject,
        topics=topics,
        difficulty=difficulty,
        problem_type=problem_type,
        count=count,
    )


def generate_by_weak_areas(weak_topics: List[str], count: int = 5) -> List[PracticeProblem]:
    """Generate problems targeting weak topics."""
    generator = PracticeProblemGenerator()
    return generator.generate_by_weak_areas(weak_topics, count)


def get_practice_problem_generator() -> PracticeProblemGenerator:
    """Get a practice problem generator instance."""
    return PracticeProblemGenerator()