"""
Study Assistant Engine - precise grounded answers.

The assistant never guesses. It grounds every answer in:
- the student's own topics, current level and priority,
- recommended resources for the matched topic,
- the student's private vault items and published vault items.

If an OPENAI key is configured it may be used for phrasing, but the
facts always come from the database. Without a key the engine uses a
deterministic template so answers stay precise and testable.
"""
import logging
import re
from typing import Any, Dict, List

from django.conf import settings
from django.db.models import Q

from PrepPilot.models import StudyResourceVault, Topic


logger = logging.getLogger(__name__)


STOP_WORDS = {
    'what', 'which', 'how', 'when', 'where', 'why', 'who', 'whom',
    'is', 'are', 'was', 'were', 'be', 'been', 'being', 'do', 'does',
    'did', 'doing', 'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on',
    'at', 'to', 'for', 'of', 'with', 'by', 'about', 'as', 'into',
    'through', 'during', 'before', 'after', 'above', 'below', 'up',
    'down', 'out', 'off', 'over', 'under', 'again', 'further',
    'then', 'once', 'here', 'there', 'all', 'any', 'both', 'each',
    'few', 'more', 'most', 'other', 'some', 'such', 'only', 'own',
    'same', 'than', 'too', 'very', 'can', 'will', 'just', 'should',
    'now', 'me', 'my', 'explain', 'tell', 'give', 'please', 'revise',
    'revision', 'study', 'learn', 'prepare', 'preparation', 'chapter',
    'topic', 'subject', 'exam', 'test', 'mock', 'plan',
}


def tokenize(text: str) -> List[str]:
    words = re.findall(r'[a-zA-Z0-9]+', text.lower())
    return [w for w in words if w not in STOP_WORDS and len(w) > 2]


def score_match(tokens: List[str], haystack: str) -> int:
    hay = haystack.lower()
    score = 0
    for token in tokens:
        if token in hay:
            score += 2 if len(token) > 5 else 1
    return score


class StudyAssistantEngine:
    """Grounded assistant for one student."""

    def __init__(self, user):
        self.user = user

    def find_topics(self, question: str, limit: int = 3) -> List[Topic]:
        tokens = tokenize(question)
        if not tokens:
            return []
        topics = Topic.objects.filter(
            subject__exam__user=self.user
        ).select_related('subject')
        scored = []
        for topic in topics:
            hay = f'{topic.name} {topic.description} {topic.subject.name}'
            score = score_match(tokens, hay)
            if score > 0:
                scored.append((score, topic))
        scored.sort(key=lambda item: item[0], reverse=True)
        return [topic for _, topic in scored[:limit]]

    def find_vault_items(
        self, question: str, limit: int = 3
    ) -> List[StudyResourceVault]:
        tokens = tokenize(question)
        if not tokens:
            return []
        items = StudyResourceVault.objects.filter(
            Q(owner=self.user) | Q(is_published=True)
        )
        scored = []
        for item in items:
            hay = (
                f'{item.title} {item.description} '
                f'{item.subject_name} {item.topic_name}'
            )
            score = score_match(tokens, hay)
            if score > 0:
                scored.append((score, item))
        scored.sort(key=lambda item: item[0], reverse=True)
        return [item for _, item in scored[:limit]]

    def build_precise_answer(
        self,
        question: str,
        topics: List[Topic],
        vault_items: List[StudyResourceVault],
    ) -> Dict[str, Any]:
        lines: List[str] = []
        sources: List[Dict[str, Any]] = []
        if topics:
            lines.append('Matched from your syllabus:')
            for topic in topics:
                lines.append(
                    f'- {topic.subject.name} / {topic.name} '
                    f'(level {topic.current_level}/100, '
                    f'priority {topic.get_priority_display()}, '
                    f'difficulty {topic.difficulty}/5, '
                    f'about {topic.estimated_hours} hrs)'
                )
                sources.append(
                    {
                        'kind': 'topic',
                        'subject': topic.subject.name,
                        'topic': topic.name,
                        'priority': topic.priority,
                        'current_level': topic.current_level,
                    }
                )
            weakest = min(topics, key=lambda t: t.current_level)
            lines.append(
                f'Start with "{weakest.name}" first because it has '
                f'the lowest level ({weakest.current_level}/100).'
            )
        else:
            lines.append(
                'No exact topic matched your words in your syllabus. '
                'I checked all subjects and topics linked to your exams.'
            )
        if vault_items:
            lines.append('Relevant saved resources:')
            for item in vault_items:
                if item.source_type == 'pdf' and item.pdf_file:
                    target = item.pdf_file.url
                else:
                    target = item.link_url
                visibility = (
                    'published' if item.is_published else 'private'
                )
                lines.append(
                    f'- {item.title} [{item.source_type}, {visibility}]: '
                    f'{target}'
                )
                sources.append(
                    {
                        'kind': 'vault',
                        'title': item.title,
                        'source_type': item.source_type,
                        'url': target,
                        'is_published': item.is_published,
                    }
                )
        else:
            lines.append(
                'No saved PDF or link matched. Save one in the vault '
                'with a clear title and I will cite it next time.'
            )
        lines.append(
            'Suggested next step: do one 25-minute focused block on '
            'the first item above, then attempt 5 practice questions.'
        )
        return {
            'answer': '\n'.join(lines),
            'sources': sources,
        }

    def maybe_refine_with_ai(self, draft: str, question: str) -> str:
        api_key = getattr(settings, 'AI_API_KEY', '')
        if not api_key:
            return draft
        try:
            from openai import OpenAI
        except Exception as exc:
            logger.warning('OpenAI package unavailable: %s', exc)
            return draft
        try:
            client = OpenAI(api_key=api_key)
            model = getattr(settings, 'AI_MODEL', 'gpt-4')
            response = client.chat.completions.create(
                model=model,
                messages=[
                    {
                        'role': 'system',
                        'content': (
                            'Rewrite the study answer clearly. '
                            'Do not add new facts, topics, links, '
                            'or files. Keep every citation exact.'
                        ),
                    },
                    {
                        'role': 'user',
                        'content': f'Question: {question}\n\nDraft:\n{draft}',
                    },
                ],
                max_tokens=500,
                temperature=0.2,
            )
            refined = response.choices[0].message.content
            return refined.strip() if refined else draft
        except Exception as exc:
            logger.warning('AI refinement failed: %s', exc)
            return draft

    def answer(self, question: str) -> Dict[str, Any]:
        cleaned = question.strip()
        if not cleaned:
            return {
                'answer': 'Please ask a study question first.',
                'sources': [],
                'topics': [],
                'vault_items': [],
            }
        topics = self.find_topics(cleaned)
        vault_items = self.find_vault_items(cleaned)
        result = self.build_precise_answer(cleaned, topics, vault_items)
        result['answer'] = self.maybe_refine_with_ai(
            result['answer'], cleaned
        )
        result['topics'] = [str(topic.id) for topic in topics]
        result['vault_items'] = [str(item.id) for item in vault_items]
        return result
