"""
Scoring Engine
==============
Shared scoring utilities for both question and scenario evaluation.
"""

from typing import Optional


def compute_completeness(answer_text: str) -> tuple:
    """
    Compute completeness score and label based on answer length.
    
    Returns: (score: 0.0-1.0, label: str)
    """
    if not answer_text or not answer_text.strip():
        return 0.0, "empty"

    word_count = len(answer_text.strip().split())

    if word_count < 5:
        return 0.05, "very_low"
    elif word_count < 15:
        return 0.3, "low"
    elif word_count < 30:
        return 0.6, "low"
    elif word_count < 60:
        return 0.75, "medium"
    elif word_count < 100:
        return 0.85, "medium"
    elif word_count < 200:
        return 0.95, "high"
    else:
        return 1.0, "high"


def compute_weighted_score(
    concept_score: float,
    semantic_score: float,
    completeness_score: float,
    max_marks: float = 5.0,
    weights: Optional[dict] = None
) -> float:
    """
    Compute final weighted score.
    
    Default weights: 0.4 * concept + 0.4 * semantic + 0.2 * completeness
    
    Returns: float (0 to max_marks)
    """
    if weights is None:
        weights = {"concept": 0.4, "semantic": 0.4, "completeness": 0.2}

    weighted = (
        weights.get("concept", 0.4) * concept_score +
        weights.get("semantic", 0.4) * semantic_score +
        weights.get("completeness", 0.2) * completeness_score
    )

    score = round(weighted * max_marks, 1)
    return min(score, max_marks)


def compute_percentage(obtained: float, maximum: float) -> float:
    """Compute percentage, handling zero division."""
    if maximum <= 0:
        return 0.0
    return round((obtained / maximum) * 100, 2)


def get_grade(percentage: float) -> dict:
    """
    Get grade info from percentage.
    
    Returns: {letter, label, color}
    """
    if percentage >= 90:
        return {"letter": "A+", "label": "Outstanding", "color": "#059669"}
    elif percentage >= 80:
        return {"letter": "A", "label": "Excellent", "color": "#059669"}
    elif percentage >= 70:
        return {"letter": "B+", "label": "Very Good", "color": "#2563eb"}
    elif percentage >= 60:
        return {"letter": "B", "label": "Good", "color": "#2563eb"}
    elif percentage >= 50:
        return {"letter": "C", "label": "Average", "color": "#d97706"}
    elif percentage >= 40:
        return {"letter": "D", "label": "Below Average", "color": "#ea580c"}
    else:
        return {"letter": "F", "label": "Needs Improvement", "color": "#dc2626"}
