"""
Text Perception Layer - Extracts numerical features from text signals.
Produces raw metrics without making behavioral judgments.
"""

import re
import numpy as np
from typing import List, Dict, Any, Optional
from dataclasses import dataclass, field
from collections import Counter

from app.models.loader import get_model_registry


@dataclass
class TextMetrics:
    """Container for all text-based metrics."""
    # Semantic relevance
    semantic_relevance_mean: float = 0.0
    semantic_relevance_std: float = 0.0
    topic_drift_ratio: float = 0.0
    
    # Response structure
    avg_sentence_length: float = 0.0
    sentence_length_std: float = 0.0
    avg_response_length_sec: float = 0.0
    response_length_consistency: float = 0.0
    
    # Assertiveness signals
    assertive_phrase_ratio: float = 0.0
    modal_verb_ratio: float = 0.0
    hedge_ratio: float = 0.0
    filler_word_ratio: float = 0.0
    
    # Empathy signals
    empathy_phrase_ratio: float = 0.0
    reflective_response_ratio: float = 0.0
    question_back_ratio: float = 0.0
    
    # Sentiment
    avg_sentiment: float = 0.0
    sentiment_variance: float = 0.0
    negative_spike_count: int = 0
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "semantic_relevance_mean": self.semantic_relevance_mean,
            "semantic_relevance_std": self.semantic_relevance_std,
            "topic_drift_ratio": self.topic_drift_ratio,
            "avg_sentence_length": self.avg_sentence_length,
            "sentence_length_std": self.sentence_length_std,
            "avg_response_length_sec": self.avg_response_length_sec,
            "response_length_consistency": self.response_length_consistency,
            "assertive_phrase_ratio": self.assertive_phrase_ratio,
            "modal_verb_ratio": self.modal_verb_ratio,
            "hedge_ratio": self.hedge_ratio,
            "filler_word_ratio": self.filler_word_ratio,
            "empathy_phrase_ratio": self.empathy_phrase_ratio,
            "reflective_response_ratio": self.reflective_response_ratio,
            "question_back_ratio": self.question_back_ratio,
            "avg_sentiment": self.avg_sentiment,
            "sentiment_variance": self.sentiment_variance,
            "negative_spike_count": self.negative_spike_count
        }


class TextPerception:
    """
    Extracts numerical features from text without making judgments.
    All outputs are raw metrics suitable for downstream processing.
    """
    
    # Linguistic pattern definitions
    ASSERTIVE_PHRASES = [
        r'\bi am\b', r'\bi will\b', r'\bi can\b', r'\bi have\b',
        r'\bdefinitely\b', r'\bcertainly\b', r'\babsolutely\b',
        r'\bwithout doubt\b', r'\bno question\b', r'\bclearly\b',
        r'\bobviously\b', r'\bundoubtedly\b', r'\bsurely\b'
    ]
    
    MODAL_VERBS = [
        r'\bcan\b', r'\bcould\b', r'\bmay\b', r'\bmight\b',
        r'\bmust\b', r'\bshall\b', r'\bshould\b', r'\bwill\b',
        r'\bwould\b', r'\bought to\b', r'\bneed to\b'
    ]
    
    HEDGE_WORDS = [
        r'\bmaybe\b', r'\bperhaps\b', r'\bpossibly\b', r'\bprobably\b',
        r'\bsomewhat\b', r'\bsort of\b', r'\bkind of\b', r'\bi think\b',
        r'\bi guess\b', r'\bi suppose\b', r'\bit seems\b', r'\bi believe\b',
        r'\bin my opinion\b', r'\bgenerally\b', r'\busually\b',
        r'\bapparently\b', r'\bbasically\b', r'\bessentially\b'
    ]
    
    FILLER_WORDS = [
        r'\bum\b', r'\buh\b', r'\blike\b', r'\byou know\b',
        r'\bi mean\b', r'\bactually\b', r'\bliterally\b',
        r'\bbasically\b', r'\bhonestly\b', r'\bso\b', r'\bwell\b',
        r'\banyway\b', r'\bright\b'
    ]
    
    EMPATHY_PHRASES = [
        r'\bi understand\b', r'\bi see\b', r'\bi hear you\b',
        r'\bthat must be\b', r'\bi can imagine\b', r'\bi appreciate\b',
        r'\bthank you for\b', r'\bi recognize\b', r'\bi acknowledge\b',
        r'\bthat sounds\b', r'\bi empathize\b', r'\bi feel\b',
        r'\bfrom your perspective\b', r'\bin your shoes\b'
    ]
    
    REFLECTIVE_PATTERNS = [
        r'^so you', r'^it sounds like', r'^what i hear is',
        r'^you mentioned', r'^you said', r'^you feel',
        r'^you seem', r'^if i understand'
    ]
    
    def __init__(self):
        self.model_registry = get_model_registry()
    
    def extract_metrics(
        self,
        user_responses: List[str],
        interviewer_questions: Optional[List[str]] = None,
        response_durations: Optional[List[float]] = None
    ) -> TextMetrics:
        """
        Extract all text metrics from user responses.
        
        Args:
            user_responses: List of user text responses
            interviewer_questions: Optional list of corresponding questions
            response_durations: Optional list of response durations in seconds
            
        Returns:
            TextMetrics containing all extracted features
        """
        if not user_responses:
            return TextMetrics()
        
        metrics = TextMetrics()
        
        # Extract semantic metrics
        self._extract_semantic_metrics(
            metrics, user_responses, interviewer_questions
        )
        
        # Extract structural metrics
        self._extract_structural_metrics(
            metrics, user_responses, response_durations
        )
        
        # Extract assertiveness metrics
        self._extract_assertiveness_metrics(metrics, user_responses)
        
        # Extract empathy metrics
        self._extract_empathy_metrics(metrics, user_responses)
        
        # Extract sentiment metrics
        self._extract_sentiment_metrics(metrics, user_responses)
        
        return metrics
    
    def _extract_semantic_metrics(
        self,
        metrics: TextMetrics,
        responses: List[str],
        questions: Optional[List[str]]
    ):
        """Extract semantic relevance and topic drift metrics."""
        if not responses:
            return
        
        # Get embeddings for all responses
        response_embeddings = self.model_registry.get_embeddings_batch(responses)
        
        # Calculate semantic relevance to questions if provided
        if questions and len(questions) == len(responses):
            question_embeddings = self.model_registry.get_embeddings_batch(questions)
            relevance_scores = []
            
            for q_emb, r_emb in zip(question_embeddings, response_embeddings):
                similarity = self._cosine_similarity(q_emb, r_emb)
                relevance_scores.append(similarity)
            
            metrics.semantic_relevance_mean = float(np.mean(relevance_scores))
            metrics.semantic_relevance_std = float(np.std(relevance_scores))
        else:
            # Self-similarity as proxy for coherence
            if len(response_embeddings) > 1:
                mean_embedding = np.mean(response_embeddings, axis=0)
                similarities = [
                    self._cosine_similarity(emb, mean_embedding)
                    for emb in response_embeddings
                ]
                metrics.semantic_relevance_mean = float(np.mean(similarities))
                metrics.semantic_relevance_std = float(np.std(similarities))
        
        # Calculate topic drift - measures deviation from conversation coherence
        # NOT raw dissimilarity (which would penalize answering different questions)
        if len(response_embeddings) > 1:
            # Calculate mean embedding as conversation "center"
            mean_embedding = np.mean(response_embeddings, axis=0)
            
            # Measure how much each response deviates from the conversation center
            deviations = [
                1.0 - self._cosine_similarity(emb, mean_embedding)
                for emb in response_embeddings
            ]
            
            # Topic drift is the variance in deviations (inconsistent responses = higher drift)
            # NOT the raw deviation (answering different questions is expected)
            if len(deviations) > 1:
                drift_variance = float(np.std(deviations))
                # Scale to 0-1 range, where 0 = perfectly consistent, 1 = highly inconsistent
                metrics.topic_drift_ratio = min(drift_variance * 2.0, 1.0)
            else:
                metrics.topic_drift_ratio = 0.0
    
    def _extract_structural_metrics(
        self,
        metrics: TextMetrics,
        responses: List[str],
        durations: Optional[List[float]]
    ):
        """Extract response structure metrics."""
        all_sentence_lengths = []
        
        for response in responses:
            sentences = self._split_sentences(response)
            sentence_lengths = [len(s.split()) for s in sentences if s.strip()]
            all_sentence_lengths.extend(sentence_lengths)
        
        if all_sentence_lengths:
            metrics.avg_sentence_length = float(np.mean(all_sentence_lengths))
            metrics.sentence_length_std = float(np.std(all_sentence_lengths))
        
        # Response duration metrics
        if durations:
            metrics.avg_response_length_sec = float(np.mean(durations))
            if len(durations) > 1 and np.mean(durations) > 0:
                cv = np.std(durations) / np.mean(durations)
                metrics.response_length_consistency = float(1.0 / (1.0 + cv))
    
    def _extract_assertiveness_metrics(
        self,
        metrics: TextMetrics,
        responses: List[str]
    ):
        """Extract assertiveness-related linguistic markers."""
        total_words = 0
        assertive_count = 0
        modal_count = 0
        hedge_count = 0
        filler_count = 0
        
        for response in responses:
            words = response.lower().split()
            total_words += len(words)
            text_lower = response.lower()
            
            assertive_count += sum(
                len(re.findall(pattern, text_lower))
                for pattern in self.ASSERTIVE_PHRASES
            )
            modal_count += sum(
                len(re.findall(pattern, text_lower))
                for pattern in self.MODAL_VERBS
            )
            hedge_count += sum(
                len(re.findall(pattern, text_lower))
                for pattern in self.HEDGE_WORDS
            )
            filler_count += sum(
                len(re.findall(pattern, text_lower))
                for pattern in self.FILLER_WORDS
            )
        
        if total_words > 0:
            metrics.assertive_phrase_ratio = assertive_count / total_words
            metrics.modal_verb_ratio = modal_count / total_words
            metrics.hedge_ratio = hedge_count / total_words
            metrics.filler_word_ratio = filler_count / total_words
    
    def _extract_empathy_metrics(
        self,
        metrics: TextMetrics,
        responses: List[str]
    ):
        """Extract empathy and reflective response markers."""
        total_responses = len(responses)
        if total_responses == 0:
            return
        
        empathy_responses = 0
        reflective_responses = 0
        question_back_responses = 0
        
        for response in responses:
            text_lower = response.lower()
            
            # Check for empathy phrases
            has_empathy = any(
                re.search(pattern, text_lower)
                for pattern in self.EMPATHY_PHRASES
            )
            if has_empathy:
                empathy_responses += 1
            
            # Check for reflective patterns
            has_reflective = any(
                re.search(pattern, text_lower)
                for pattern in self.REFLECTIVE_PATTERNS
            )
            if has_reflective:
                reflective_responses += 1
            
            # Check for questions back to interviewer
            if '?' in response:
                question_back_responses += 1
        
        metrics.empathy_phrase_ratio = empathy_responses / total_responses
        metrics.reflective_response_ratio = reflective_responses / total_responses
        metrics.question_back_ratio = question_back_responses / total_responses
    
    def _extract_sentiment_metrics(
        self,
        metrics: TextMetrics,
        responses: List[str]
    ):
        """Extract sentiment analysis metrics."""
        if not responses:
            return
        
        sentiment_scores = []
        negative_threshold = -0.5
        
        for response in responses:
            sentiment_result = self.model_registry.get_sentiment(response)
            
            # Convert to [-1, 1] scale
            score = 0.0
            for item in sentiment_result:
                label = item['label'].lower()
                confidence = item['score']
                
                if 'positive' in label:
                    score += confidence
                elif 'negative' in label:
                    score -= confidence
            
            sentiment_scores.append(score)
        
        if sentiment_scores:
            metrics.avg_sentiment = float(np.mean(sentiment_scores))
            metrics.sentiment_variance = float(np.var(sentiment_scores))
            metrics.negative_spike_count = sum(
                1 for s in sentiment_scores if s < negative_threshold
            )
    
    @staticmethod
    def _cosine_similarity(a: np.ndarray, b: np.ndarray) -> float:
        """Compute cosine similarity between two vectors."""
        norm_a = np.linalg.norm(a)
        norm_b = np.linalg.norm(b)
        if norm_a == 0 or norm_b == 0:
            return 0.0
        return float(np.dot(a, b) / (norm_a * norm_b))
    
    @staticmethod
    def _split_sentences(text: str) -> List[str]:
        """Split text into sentences."""
        sentence_endings = re.compile(r'(?<=[.!?])\s+')
        sentences = sentence_endings.split(text)
        return [s.strip() for s in sentences if s.strip()]
