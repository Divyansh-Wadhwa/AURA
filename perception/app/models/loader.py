"""
Model Loader - Loads all ML models once at startup.
Models are cached globally and never reloaded during request handling.
"""

import logging
from typing import Optional
from sentence_transformers import SentenceTransformer
from transformers import pipeline, AutoModelForSequenceClassification, AutoTokenizer
import torch

from app.config import settings

logger = logging.getLogger(__name__)


class ModelRegistry:
    """Singleton registry for all ML models loaded at startup."""
    
    _instance: Optional["ModelRegistry"] = None
    _initialized: bool = False
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance
    
    def __init__(self):
        if ModelRegistry._initialized:
            return
        
        self.sentence_transformer: Optional[SentenceTransformer] = None
        self.emotion_classifier = None
        self.sentiment_classifier = None
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        
        ModelRegistry._initialized = True
    
    def load_all_models(self):
        """Load all models at startup. Called once during app initialization."""
        logger.info(f"Loading models on device: {self.device}")
        
        self._load_sentence_transformer()
        self._load_emotion_classifier()
        self._load_sentiment_classifier()
        
        logger.info("All models loaded successfully")
    
    def _load_sentence_transformer(self):
        """Load sentence-transformers model for text embeddings."""
        logger.info(f"Loading SentenceTransformer: {settings.sentence_transformer_model}")
        try:
            self.sentence_transformer = SentenceTransformer(
                settings.sentence_transformer_model,
                device=self.device
            )
            logger.info("SentenceTransformer loaded successfully")
        except Exception as e:
            logger.error(f"Failed to load SentenceTransformer: {e}")
            raise
    
    def _load_emotion_classifier(self):
        """Load emotion classification model from HuggingFace."""
        logger.info(f"Loading emotion classifier: {settings.emotion_model}")
        try:
            self.emotion_classifier = pipeline(
                "text-classification",
                model=settings.emotion_model,
                top_k=None,
                device=0 if self.device == "cuda" else -1
            )
            logger.info("Emotion classifier loaded successfully")
        except Exception as e:
            logger.error(f"Failed to load emotion classifier: {e}")
            raise
    
    def _load_sentiment_classifier(self):
        """Load sentiment analysis model from HuggingFace."""
        logger.info(f"Loading sentiment classifier: {settings.sentiment_model}")
        try:
            self.sentiment_classifier = pipeline(
                "sentiment-analysis",
                model=settings.sentiment_model,
                top_k=None,
                device=0 if self.device == "cuda" else -1
            )
            logger.info("Sentiment classifier loaded successfully")
        except Exception as e:
            logger.error(f"Failed to load sentiment classifier: {e}")
            raise
    
    def get_embedding(self, text: str):
        """Generate embedding for text using sentence-transformer."""
        if self.sentence_transformer is None:
            raise RuntimeError("SentenceTransformer not loaded")
        return self.sentence_transformer.encode(text, convert_to_numpy=True)
    
    def get_embeddings_batch(self, texts: list):
        """Generate embeddings for a batch of texts."""
        if self.sentence_transformer is None:
            raise RuntimeError("SentenceTransformer not loaded")
        return self.sentence_transformer.encode(texts, convert_to_numpy=True)
    
    def get_emotions(self, text: str):
        """Get emotion probabilities for text."""
        if self.emotion_classifier is None:
            raise RuntimeError("Emotion classifier not loaded")
        return self.emotion_classifier(text[:512])[0]
    
    def get_sentiment(self, text: str):
        """Get sentiment scores for text."""
        if self.sentiment_classifier is None:
            raise RuntimeError("Sentiment classifier not loaded")
        return self.sentiment_classifier(text[:512])[0]


# Global model registry instance
model_registry = ModelRegistry()


def get_model_registry() -> ModelRegistry:
    """Get the global model registry instance."""
    return model_registry
