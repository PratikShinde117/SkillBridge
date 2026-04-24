"""
Semantic Similarity Engine
==========================
Uses sentence-transformers MiniLM for embedding-based similarity.
Model is loaded ONCE at import time for performance.
"""

import re
import numpy as np
from functools import lru_cache
from typing import List

from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity


# ============================================================
# MODEL SINGLETON — loaded once, reused across all requests
# ============================================================
_model = None


def _get_model() -> SentenceTransformer:
    """Lazy-load model singleton."""
    global _model
    if _model is None:
        print("⏳ Loading MiniLM model...")
        _model = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")
        print("✅ MiniLM model loaded")
    return _model


def split_sentences(text: str) -> List[str]:
    """Split text into sentences."""
    sentences = re.split(r'[.?!\n]', text)
    return [s.strip() for s in sentences if s.strip() and len(s.strip()) > 3]


@lru_cache(maxsize=2000)
def encode_single(text: str) -> tuple:
    """Encode a single text and cache it. Returns tuple for hashability."""
    vec = _get_model().encode([text], normalize_embeddings=True)[0]
    return tuple(vec.tolist())


def encode_batch(texts: List[str]) -> np.ndarray:
    """Encode a batch of texts."""
    if not texts:
        return np.array([])
    return _get_model().encode(texts, normalize_embeddings=True)


def compute_similarity(answer_text: str, reference_text: str) -> float:
    """
    Compute semantic similarity between student answer and reference text.
    
    Strategy:
      1. Split answer into sentences
      2. Encode answer sentences + reference text
      3. For each answer sentence, find max similarity to reference
      4. Return mean of max similarities
    
    Returns: float 0.0 - 1.0
    """
    if not answer_text or not answer_text.strip():
        return 0.0
    if not reference_text or not reference_text.strip():
        return 0.0

    answer_sentences = split_sentences(answer_text)
    if not answer_sentences:
        answer_sentences = [answer_text.strip()]

    # Encode
    answer_embeddings = encode_batch(answer_sentences)
    ref_embedding = encode_batch([reference_text])

    if answer_embeddings.size == 0 or ref_embedding.size == 0:
        return 0.0

    # Compute similarity
    sims = cosine_similarity(answer_embeddings, ref_embedding)
    avg_max_sim = float(np.mean(np.max(sims, axis=1)))

    return round(min(max(avg_max_sim, 0.0), 1.0), 4)


def compute_concept_similarity(
    answer_text: str,
    task_description: str,
    expected_concepts: List[str]
) -> float:
    """
    Compute blended semantic similarity:
      - Similarity to task description
      - Per-concept similarity (average of max per concept)
      - Return weighted blend
    
    Returns: float 0.0 - 1.0
    """
    if not answer_text or not answer_text.strip():
        return 0.0

    answer_sentences = split_sentences(answer_text)
    if not answer_sentences:
        answer_sentences = [answer_text.strip()]

    answer_embeddings = encode_batch(answer_sentences)

    # 1. Similarity to task description
    desc_sim = 0.0
    if task_description and task_description.strip():
        reference = task_description
        if expected_concepts:
            reference += ". " + ". ".join(expected_concepts)
        ref_emb = encode_batch([reference])
        sims = cosine_similarity(answer_embeddings, ref_emb)
        desc_sim = float(np.mean(np.max(sims, axis=1)))

    # 2. Per-concept similarity
    concept_sim = 0.0
    if expected_concepts:
        concept_embs = encode_batch(expected_concepts)
        if concept_embs.size > 0:
            sims = cosine_similarity(answer_embeddings, concept_embs)
            # For each concept, take the max similarity from any answer sentence
            concept_sim = float(np.mean(np.max(sims, axis=0)))

    # Blend: 60% desc, 40% concept
    if expected_concepts:
        blended = 0.6 * desc_sim + 0.4 * concept_sim
    else:
        blended = desc_sim

    return round(min(max(blended, 0.0), 1.0), 4)


def compute_point_similarities(
    answer_text: str,
    expected_points: List[str],
    threshold: float = 0.55
) -> List[dict]:
    """
    For question-based evaluation: check each expected point against answer.
    
    Returns: list of {point, similarity, matched}
    """
    if not answer_text or not expected_points:
        return []

    answer_sentences = split_sentences(answer_text)
    if not answer_sentences:
        answer_sentences = [answer_text.strip()]

    answer_embeddings = encode_batch(answer_sentences)
    point_embeddings = encode_batch(expected_points)

    results = []
    for idx, point in enumerate(expected_points):
        sims = cosine_similarity(answer_embeddings, [point_embeddings[idx]])
        max_sim = float(np.max(sims))
        
        # Adaptive threshold based on point length
        adaptive_threshold = threshold if len(point.split()) >= 8 else threshold - 0.05
        
        results.append({
            "point": point,
            "similarity": round(max_sim, 4),
            "matched": max_sim >= adaptive_threshold
        })

    return results
