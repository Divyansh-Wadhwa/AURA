"""
Semantic Depth Analysis Module
==============================
Detects fluent but empty responses by measuring:
- Information Density: Content words / total words
- Specificity Score: Named entities / sentences
- Redundancy Score: Cosine similarity between sentences
- Answer Depth Score: Weighted combination of above

This fixes the problem where shallow but on-topic responses score too high.
"""

import re
import numpy as np
from typing import List, Dict, Optional, Tuple
from dataclasses import dataclass

# Try to import spacy for NER, fallback to regex-based detection
try:
    import spacy
    SPACY_AVAILABLE = True
except ImportError:
    SPACY_AVAILABLE = False
    print("[SemanticDepth] spaCy not available, using fallback NER")


@dataclass
class SemanticDepthMetrics:
    """Container for semantic depth metrics."""
    information_density: float = 0.0      # Content words / total words
    specificity_score: float = 0.0        # Named entities / sentences  
    redundancy_score: float = 0.0         # Avg similarity between sentences
    answer_depth_score: float = 0.0       # Weighted combination
    
    def to_dict(self) -> Dict[str, float]:
        return {
            "information_density": self.information_density,
            "specificity_score": self.specificity_score,
            "redundancy_score": self.redundancy_score,
            "answer_depth_score": self.answer_depth_score,
        }


class SemanticDepthAnalyzer:
    """
    Analyzes semantic depth of responses to detect shallow/empty answers.
    
    Key insight: A response can be fluent and on-topic but still shallow.
    This analyzer measures the actual substance of responses.
    """
    
    # Common function words (stop words) - these don't carry content
    FUNCTION_WORDS = {
        # Articles
        'a', 'an', 'the',
        # Pronouns
        'i', 'me', 'my', 'myself', 'we', 'our', 'ours', 'ourselves',
        'you', 'your', 'yours', 'yourself', 'yourselves',
        'he', 'him', 'his', 'himself', 'she', 'her', 'hers', 'herself',
        'it', 'its', 'itself', 'they', 'them', 'their', 'theirs', 'themselves',
        'what', 'which', 'who', 'whom', 'this', 'that', 'these', 'those',
        # Prepositions
        'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from', 'up', 'down',
        'about', 'into', 'through', 'during', 'before', 'after', 'above', 'below',
        'between', 'under', 'over', 'out', 'off', 'again', 'further',
        # Conjunctions
        'and', 'but', 'or', 'nor', 'so', 'yet', 'both', 'either', 'neither',
        'not', 'only', 'as', 'than', 'when', 'while', 'if', 'because', 'although',
        # Auxiliary verbs
        'is', 'am', 'are', 'was', 'were', 'be', 'been', 'being',
        'have', 'has', 'had', 'having', 'do', 'does', 'did', 'doing',
        'will', 'would', 'could', 'should', 'may', 'might', 'must', 'shall', 'can',
        # Other common words
        'there', 'here', 'then', 'now', 'just', 'also', 'very', 'too', 'quite',
        'really', 'actually', 'basically', 'honestly', 'literally', 'definitely',
        'some', 'any', 'all', 'each', 'every', 'few', 'more', 'most', 'other',
        'such', 'no', 'yes', 'well', 'like', 'just', 'even', 'still',
        'how', 'why', 'where', 'when', 'much', 'many', 'same', 'different',
    }
    
    # Patterns for detecting specific/concrete language (fallback NER)
    SPECIFICITY_PATTERNS = [
        r'\b\d+\b',                          # Numbers
        r'\b\d+%\b',                          # Percentages
        r'\$\d+',                             # Money
        r'\b[A-Z][a-z]+\s+[A-Z][a-z]+\b',    # Proper names (two words)
        r'\b[A-Z]{2,}\b',                     # Acronyms
        r'\b\d{4}\b',                         # Years
        r'\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\b',
        r'\b(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\b',
    ]
    
    def __init__(self, embeddings_func=None):
        """
        Initialize the analyzer.
        
        Args:
            embeddings_func: Function to get embeddings for text (for redundancy calc)
        """
        self.embeddings_func = embeddings_func
        self._nlp = None
        
        if SPACY_AVAILABLE:
            try:
                self._nlp = spacy.load("en_core_web_sm")
                print("[SemanticDepth] Loaded spaCy model for NER")
            except OSError:
                print("[SemanticDepth] spaCy model not found, using fallback NER")
    
    def analyze(self, responses: List[str]) -> SemanticDepthMetrics:
        """
        Analyze semantic depth of responses.
        
        Args:
            responses: List of user response texts
            
        Returns:
            SemanticDepthMetrics with all depth measurements
        """
        if not responses:
            return SemanticDepthMetrics()
        
        metrics = SemanticDepthMetrics()
        
        # Calculate each metric
        metrics.information_density = self._calculate_information_density(responses)
        metrics.specificity_score = self._calculate_specificity_score(responses)
        metrics.redundancy_score = self._calculate_redundancy_score(responses)
        
        # Calculate weighted answer depth score
        # High density + high specificity + low redundancy = high depth
        metrics.answer_depth_score = self._calculate_answer_depth(
            metrics.information_density,
            metrics.specificity_score,
            metrics.redundancy_score
        )
        
        return metrics
    
    def _calculate_information_density(self, responses: List[str]) -> float:
        """
        Calculate information density: content words / total words.
        
        Content words = nouns, verbs, adjectives, adverbs (not function words)
        High density = substantive response
        Low density = filler-heavy response
        """
        total_words = 0
        content_words = 0
        
        for response in responses:
            words = re.findall(r'\b[a-zA-Z]+\b', response.lower())
            total_words += len(words)
            
            # Count content words (not in function words set)
            for word in words:
                if word not in self.FUNCTION_WORDS:
                    content_words += 1
        
        if total_words == 0:
            return 0.0
        
        # Typical range: 0.3-0.7, normalize to 0-1
        raw_density = content_words / total_words
        # Scale: 0.3 -> 0, 0.7 -> 1
        normalized = (raw_density - 0.3) / 0.4
        return float(np.clip(normalized, 0, 1))
    
    def _calculate_specificity_score(self, responses: List[str]) -> float:
        """
        Calculate specificity score: named entities / sentences.
        
        Uses spaCy NER if available, otherwise falls back to regex patterns.
        High specificity = concrete, specific response with names/numbers/places
        Low specificity = abstract, vague response
        """
        total_sentences = 0
        total_entities = 0
        
        for response in responses:
            sentences = self._split_sentences(response)
            total_sentences += len(sentences)
            
            if self._nlp:
                # Use spaCy NER
                doc = self._nlp(response)
                total_entities += len(doc.ents)
            else:
                # Fallback: count specificity patterns
                for pattern in self.SPECIFICITY_PATTERNS:
                    matches = re.findall(pattern, response)
                    total_entities += len(matches)
        
        if total_sentences == 0:
            return 0.0
        
        # Typical range: 0-3 entities per sentence
        raw_specificity = total_entities / total_sentences
        # Scale: 0 -> 0, 2+ -> 1
        normalized = min(raw_specificity / 2.0, 1.0)
        return float(normalized)
    
    def _calculate_redundancy_score(self, responses: List[str]) -> float:
        """
        Calculate redundancy score: average cosine similarity between sentences.
        
        High redundancy = repetitive, rambling response
        Low redundancy = diverse, focused response
        """
        # Collect all sentences
        all_sentences = []
        for response in responses:
            sentences = self._split_sentences(response)
            all_sentences.extend([s for s in sentences if len(s.split()) > 3])
        
        if len(all_sentences) < 2:
            return 0.0  # Can't calculate redundancy with < 2 sentences
        
        if self.embeddings_func:
            # Use embeddings for accurate similarity
            try:
                embeddings = self.embeddings_func(all_sentences)
                if embeddings is not None and len(embeddings) > 1:
                    similarities = []
                    for i in range(len(embeddings)):
                        for j in range(i + 1, len(embeddings)):
                            sim = self._cosine_similarity(embeddings[i], embeddings[j])
                            similarities.append(sim)
                    
                    if similarities:
                        avg_similarity = np.mean(similarities)
                        # Redundancy = how similar sentences are to each other
                        # Scale: 0.5 similarity -> 0 redundancy, 0.9 -> 1
                        redundancy = (avg_similarity - 0.5) / 0.4
                        return float(np.clip(redundancy, 0, 1))
            except Exception as e:
                print(f"[SemanticDepth] Embeddings error: {e}")
        
        # Fallback: word overlap based redundancy
        return self._word_overlap_redundancy(all_sentences)
    
    def _word_overlap_redundancy(self, sentences: List[str]) -> float:
        """Calculate redundancy based on word overlap (fallback method)."""
        if len(sentences) < 2:
            return 0.0
        
        # Convert sentences to word sets
        word_sets = [set(s.lower().split()) for s in sentences]
        
        overlaps = []
        for i in range(len(word_sets)):
            for j in range(i + 1, len(word_sets)):
                if len(word_sets[i]) > 0 and len(word_sets[j]) > 0:
                    intersection = len(word_sets[i] & word_sets[j])
                    union = len(word_sets[i] | word_sets[j])
                    if union > 0:
                        overlaps.append(intersection / union)
        
        if overlaps:
            avg_overlap = np.mean(overlaps)
            # Scale: 0.2 overlap -> 0, 0.6 -> 1
            redundancy = (avg_overlap - 0.2) / 0.4
            return float(np.clip(redundancy, 0, 1))
        
        return 0.0
    
    def _calculate_answer_depth(
        self,
        information_density: float,
        specificity_score: float,
        redundancy_score: float
    ) -> float:
        """
        Calculate overall answer depth score.
        
        Formula: weighted_sum(density, specificity, 1-redundancy)
        
        Weights:
        - Information density: 40% (most important - are there content words?)
        - Specificity: 30% (are there concrete details?)
        - Low redundancy: 30% (is the response diverse, not repetitive?)
        """
        depth_score = (
            0.40 * information_density +
            0.30 * specificity_score +
            0.30 * (1 - redundancy_score)  # Low redundancy = good
        )
        
        return float(np.clip(depth_score, 0, 1))
    
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
