"""
Text Perception Layer - Extracts numerical features from text signals.
Produces raw metrics without making behavioral judgments.
"""

import re
import os
import numpy as np
from typing import List, Dict, Any, Optional, Set
from dataclasses import dataclass, field
from collections import Counter
from pathlib import Path

from app.models.loader import get_model_registry
from app.perception.semantic_depth import SemanticDepthAnalyzer, SemanticDepthMetrics
from app.perception.llm_semantic import create_llm_analyzer, LLMSemanticMetrics

# Lexicon directory path
LEXICON_DIR = Path(__file__).parent / "lexicons"


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
    
    # NEW: Vagueness metrics (Step 1)
    vague_phrase_ratio: float = 0.0
    
    # NEW: Semantic depth metrics (Step 2)
    information_density: float = 0.0
    specificity_score: float = 0.0
    redundancy_score: float = 0.0
    answer_depth_score: float = 0.0
    
    # NEW: LLM-assisted semantic metrics (Step 3)
    llm_confidence_mean: float = 0.5
    llm_clarity_mean: float = 0.5
    llm_depth_mean: float = 0.5
    llm_empathy_mean: float = 0.5
    llm_evasion_mean: float = 0.5
    
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
            "vague_phrase_ratio": self.vague_phrase_ratio,
            "information_density": self.information_density,
            "specificity_score": self.specificity_score,
            "redundancy_score": self.redundancy_score,
            "answer_depth_score": self.answer_depth_score,
            "llm_confidence_mean": self.llm_confidence_mean,
            "llm_clarity_mean": self.llm_clarity_mean,
            "llm_depth_mean": self.llm_depth_mean,
            "llm_empathy_mean": self.llm_empathy_mean,
            "llm_evasion_mean": self.llm_evasion_mean,
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
    
    Uses external lexicon files for comprehensive word/phrase detection.
    """
    
    # Assertive phrases - action verbs and confident statements (kept as patterns)
    ASSERTIVE_PHRASES = [
        # Past tense action verbs (demonstrate concrete accomplishments)
        r'\bi led\b', r'\bi managed\b', r'\bi delivered\b', r'\bi achieved\b',
        r'\bi accomplished\b', r'\bi created\b', r'\bi developed\b', r'\bi built\b',
        r'\bi designed\b', r'\bi implemented\b', r'\bi executed\b', r'\bi drove\b',
        r'\bi spearheaded\b', r'\bi initiated\b', r'\bi established\b',
        r'\bi resolved\b', r'\bi solved\b', r'\bi completed\b', r'\bi launched\b',
        r'\bi transformed\b', r'\bi improved\b', r'\bi increased\b', r'\bi reduced\b',
        r'\bi coordinated\b', r'\bi organized\b', r'\bi directed\b',
        # Present tense confident statements
        r'\bi take\b', r'\bi own\b', r'\bi ensure\b', r'\bi maintain\b',
        r'\bi believe strongly\b', r'\bi am confident\b', r'\bi am certain\b',
        # Certainty markers
        r'\bdefinitely\b', r'\bcertainly\b', r'\babsolutely\b',
        r'\bwithout doubt\b', r'\bno question\b', r'\bundoubtedly\b',
        # Strong commitment phrases
        r'\bi will\b(?! not)', r'\bi am committed\b', r'\bi guarantee\b',
        r'\bsuccessfully\b', r'\beffectively\b', r'\bconfidently\b',
    ]
    
    MODAL_VERBS = [
        r'\bcan\b', r'\bcould\b', r'\bmay\b', r'\bmight\b',
        r'\bmust\b', r'\bshall\b', r'\bshould\b', r'\bwill\b',
        r'\bwould\b', r'\bought to\b', r'\bneed to\b'
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
        
        # Load lexicons from files
        self.filler_patterns = self._load_lexicon("filler_words.txt")
        self.hedge_patterns = self._load_lexicon("hedge_words.txt")
        self.vague_patterns = self._load_lexicon("vague_phrases.txt")
        
        print(f"[TextPerception] Loaded {len(self.filler_patterns)} filler patterns")
        print(f"[TextPerception] Loaded {len(self.hedge_patterns)} hedge patterns")
        print(f"[TextPerception] Loaded {len(self.vague_patterns)} vague phrase patterns")
        
        # Initialize semantic depth analyzer (Step 2)
        self.depth_analyzer = SemanticDepthAnalyzer(
            embeddings_func=self.model_registry.get_embeddings_batch
        )
        print("[TextPerception] Initialized SemanticDepthAnalyzer")
        
        # Initialize LLM semantic analyzer (Step 3)
        # Will use fallback if OpenAI not available
        self.llm_analyzer = create_llm_analyzer(
            enabled=os.environ.get("ENABLE_LLM_PERCEPTION", "true").lower() == "true"
        )
        print("[TextPerception] Initialized LLMSemanticAnalyzer")
    
    @staticmethod
    def _load_lexicon(filename: str) -> List[str]:
        """Load patterns from a lexicon file.
        
        Each non-empty, non-comment line becomes a regex pattern.
        """
        filepath = LEXICON_DIR / filename
        patterns = []
        
        if not filepath.exists():
            print(f"[TextPerception] WARNING: Lexicon file not found: {filepath}")
            return patterns
        
        with open(filepath, 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                # Skip empty lines and comments
                if not line or line.startswith('#'):
                    continue
                # Convert to regex pattern with word boundaries
                # Handle multi-word phrases
                pattern = r'\b' + re.escape(line) + r'\b'
                patterns.append(pattern)
        
        return patterns
    
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
        
        # Extract semantic depth metrics (Step 2)
        self._extract_depth_metrics(metrics, user_responses)
        
        # Extract LLM semantic metrics (Step 3)
        self._extract_llm_metrics(metrics, user_responses)
        
        return metrics
    
    def _extract_llm_metrics(
        self,
        metrics: TextMetrics,
        responses: List[str]
    ):
        """Extract LLM-assisted semantic features.
        
        LLM is used as a PERCEPTION ASSISTANT, not a scorer.
        Outputs are numeric features that feed into the decision layer.
        """
        if not responses:
            return
        
        try:
            llm_metrics = self.llm_analyzer.analyze(responses)
            
            metrics.llm_confidence_mean = llm_metrics.llm_confidence_mean
            metrics.llm_clarity_mean = llm_metrics.llm_clarity_mean
            metrics.llm_depth_mean = llm_metrics.llm_depth_mean
            metrics.llm_empathy_mean = llm_metrics.llm_empathy_mean
            metrics.llm_evasion_mean = llm_metrics.llm_evasion_mean
        except Exception as e:
            print(f"[TextPerception] LLM extraction error: {e}")
            # Keep default values (0.5) on error
    
    def _extract_depth_metrics(
        self,
        metrics: TextMetrics,
        responses: List[str]
    ):
        """Extract semantic depth metrics to detect shallow/empty responses."""
        if not responses:
            return
        
        depth_metrics = self.depth_analyzer.analyze(responses)
        
        metrics.information_density = depth_metrics.information_density
        metrics.specificity_score = depth_metrics.specificity_score
        metrics.redundancy_score = depth_metrics.redundancy_score
        metrics.answer_depth_score = depth_metrics.answer_depth_score
    
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
        """Extract assertiveness-related linguistic markers.
        
        Uses HYBRID normalization:
        - Assertive phrases: Per-response basis (did you USE assertive language?)
        - Hedges/fillers/vague: Per-word basis (what % of words are hedging/filler/vague?)
        
        Now uses expanded lexicons loaded from external files.
        """
        total_words = 0
        total_responses = len(responses)
        assertive_responses = 0  # Count of responses with assertive language
        assertive_phrases_total = 0  # Total assertive phrases found
        modal_count = 0
        hedge_count = 0
        filler_count = 0
        vague_count = 0
        
        for response in responses:
            words = response.lower().split()
            total_words += len(words)
            text_lower = response.lower()
            
            # Count assertive phrases in this response
            assertive_in_response = sum(
                len(re.findall(pattern, text_lower, re.IGNORECASE))
                for pattern in self.ASSERTIVE_PHRASES
            )
            assertive_phrases_total += assertive_in_response
            if assertive_in_response > 0:
                assertive_responses += 1
            
            # Modal verbs
            modal_count += sum(
                len(re.findall(pattern, text_lower, re.IGNORECASE))
                for pattern in self.MODAL_VERBS
            )
            
            # Hedge words (from expanded lexicon)
            hedge_count += sum(
                len(re.findall(pattern, text_lower, re.IGNORECASE))
                for pattern in self.hedge_patterns
            )
            
            # Filler words (from expanded lexicon)
            filler_count += sum(
                len(re.findall(pattern, text_lower, re.IGNORECASE))
                for pattern in self.filler_patterns
            )
            
            # Vague phrases (NEW - from lexicon)
            vague_count += sum(
                len(re.findall(pattern, text_lower, re.IGNORECASE))
                for pattern in self.vague_patterns
            )
        
        if total_words > 0 and total_responses > 0:
            # Assertive: Use per-response ratio (what % of responses had assertive language)
            # PLUS boost based on intensity (multiple assertive phrases = more confident)
            response_ratio = assertive_responses / total_responses
            intensity_boost = min(assertive_phrases_total / total_responses, 1.0) * 0.5
            metrics.assertive_phrase_ratio = min(response_ratio + intensity_boost, 1.0)
            
            # Others: Per-word basis (standard)
            metrics.modal_verb_ratio = modal_count / total_words
            metrics.hedge_ratio = hedge_count / total_words
            metrics.filler_word_ratio = filler_count / total_words
            
            # NEW: Vague phrase ratio (per-response basis for multi-word phrases)
            # Normalize by responses since vague phrases are typically per-response
            metrics.vague_phrase_ratio = min(vague_count / total_responses, 1.0)
    
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
