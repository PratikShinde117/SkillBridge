"""
Feedback Engine
===============
Generates structured, actionable feedback for both question and scenario evaluations.
Rule-based — does NOT depend on LLM for scoring.
"""

from typing import List, Optional


def generate_task_feedback(
    task_title: str,
    concept_score: float,
    semantic_score: float,
    completeness_score: float,
    completeness_label: str,
    detected_concepts: List[str],
    missing_concepts: List[str],
    max_marks: float = 5.0,
    obtained_marks: float = 0.0,
) -> dict:
    """
    Generate structured feedback for a scenario task.
    
    Returns: {
        strength: str,
        weakness: str,
        improvement: str,
        summary: str
    }
    """
    strengths = []
    weaknesses = []
    improvements = []

    pct = (obtained_marks / max_marks * 100) if max_marks > 0 else 0

    # ---- CONCEPT FEEDBACK ----
    if concept_score >= 0.8:
        strengths.append(f"Excellent concept coverage — you correctly addressed {len(detected_concepts)} core concept(s)")
    elif concept_score >= 0.5:
        strengths.append(f"Good concept coverage ({len(detected_concepts)} of {len(detected_concepts) + len(missing_concepts)} concepts detected)")
        if missing_concepts:
            weaknesses.append(f"Missing concepts: {', '.join(missing_concepts[:4])}")
    elif concept_score > 0:
        weaknesses.append(f"Limited concept coverage — only {len(detected_concepts)} of {len(detected_concepts) + len(missing_concepts)} concepts detected")
        if missing_concepts:
            improvements.append(f"Study and include these concepts: {', '.join(missing_concepts[:4])}")
    else:
        weaknesses.append("No expected concepts were detected in your answer")
        if missing_concepts:
            improvements.append(f"Focus on these key concepts: {', '.join(missing_concepts[:4])}")

    # ---- SEMANTIC FEEDBACK ----
    if semantic_score >= 0.7:
        strengths.append("Your explanation aligns well with the expected reasoning and approach")
    elif semantic_score >= 0.5:
        strengths.append("Your answer shows partial alignment with the expected approach")
        improvements.append("Try to explain the reasoning behind your solution more explicitly")
    elif semantic_score >= 0.3:
        weaknesses.append("The answer's reasoning doesn't strongly align with what was expected")
        improvements.append("Review the core principles and explain how they apply to this specific problem")
    else:
        weaknesses.append("Your answer lacks meaningful alignment with the expected solution approach")
        improvements.append("Re-read the task description carefully and address each requirement directly")

    # ---- COMPLETENESS FEEDBACK ----
    if completeness_label in ("empty", "very_low"):
        weaknesses.append("Answer is far too brief or empty")
        improvements.append("Provide a detailed, structured response with examples where applicable")
    elif completeness_label == "low":
        weaknesses.append("Answer is too brief — important details are likely missing")
        improvements.append("Elaborate on your answer with specific details, steps, and justifications")
    elif completeness_label == "medium":
        if pct < 60:
            improvements.append("Consider adding more depth, examples, or step-by-step explanations")
    elif completeness_label == "high":
        strengths.append("Well-detailed response with good depth of explanation")

    # ---- OVERALL SUMMARY ----
    if pct >= 80:
        summary = f"Strong performance on '{task_title}'. Keep up the excellent work!"
    elif pct >= 60:
        summary = f"Good attempt on '{task_title}', but there's room to improve depth and cover missing concepts."
    elif pct >= 40:
        summary = f"Moderate attempt on '{task_title}'. Focus on understanding the core concepts and explaining your reasoning."
    else:
        summary = f"This task needs significant improvement. Review the topic '{task_title}' thoroughly and practice structured problem-solving."

    return {
        "strength": " | ".join(strengths) if strengths else "No major strengths identified",
        "weakness": " | ".join(weaknesses) if weaknesses else "No significant weaknesses",
        "improvement": " | ".join(improvements) if improvements else "Continue with your current approach",
        "summary": summary
    }


def generate_question_feedback(
    question_text: str,
    score: float,
    max_score: float,
    matched_points: List[str],
    missed_points: List[str],
    question_type: str = "descriptive"
) -> dict:
    """
    Generate feedback for a question-based evaluation item.
    
    Returns: {strength, weakness, improvement, summary}
    """
    pct = (score / max_score * 100) if max_score > 0 else 0
    strengths = []
    weaknesses = []
    improvements = []

    if question_type == "mcq":
        if score > 0:
            return {
                "strength": "Correct answer",
                "weakness": "",
                "improvement": "",
                "summary": "MCQ answered correctly."
            }
        else:
            return {
                "strength": "",
                "weakness": "Incorrect answer",
                "improvement": "Review this topic and understand why the correct option is right",
                "summary": "MCQ answered incorrectly."
            }

    # Descriptive
    if matched_points:
        strengths.append(f"Covered {len(matched_points)} key point(s): {', '.join(matched_points[:3])}")
    
    if missed_points:
        weaknesses.append(f"Missed {len(missed_points)} point(s): {', '.join(missed_points[:3])}")
        improvements.append(f"Include these points in your answer: {', '.join(missed_points[:3])}")

    if pct >= 80:
        summary = "Excellent response — comprehensive and well-structured."
    elif pct >= 50:
        summary = "Good response but missing some expected points."
    else:
        summary = "Needs significant improvement — key points were not adequately addressed."

    return {
        "strength": " | ".join(strengths) if strengths else "",
        "weakness": " | ".join(weaknesses) if weaknesses else "",
        "improvement": " | ".join(improvements) if improvements else "",
        "summary": summary
    }


def generate_overall_feedback(
    total_score: float,
    max_score: float,
    percentage: float,
    task_count: int = 0,
    evaluation_type: str = "scenario"
) -> str:
    """Generate overall feedback text for the entire submission."""
    if percentage >= 85:
        return f"Outstanding performance! You scored {total_score}/{max_score} ({percentage}%). Your understanding of the core concepts is excellent. Keep it up!"
    elif percentage >= 70:
        return f"Very good work! You scored {total_score}/{max_score} ({percentage}%). You have a solid understanding, but there's room to deepen your knowledge in some areas."
    elif percentage >= 55:
        return f"Good attempt! You scored {total_score}/{max_score} ({percentage}%). Focus on the missing concepts and try to explain your reasoning more clearly."
    elif percentage >= 40:
        return f"You scored {total_score}/{max_score} ({percentage}%). Your understanding needs improvement — review the core topics and practice applying them to real-world scenarios."
    else:
        return f"You scored {total_score}/{max_score} ({percentage}%). Significant improvement is needed. We recommend re-studying the fundamentals before attempting similar evaluations."
