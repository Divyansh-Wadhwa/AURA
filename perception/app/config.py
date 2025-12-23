import os
from typing import Tuple
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    app_name: str = "AURA Perception Layer"
    debug: bool = False
    host: str = "0.0.0.0"
    port: int = 5001
    
    # Model paths (can be overridden via env vars)
    sentence_transformer_model: str = "all-MiniLM-L6-v2"
    emotion_model: str = "j-hartmann/emotion-english-distilroberta-base"
    sentiment_model: str = "cardiffnlp/twitter-roberta-base-sentiment-latest"
    
    # Normalization settings
    use_zscore_normalization: bool = False  # Use min-max for stable scaling
    normalization_clip_range: Tuple[float, float] = (-2.0, 2.0)
    
    class Config:
        env_file = ".env"


settings = Settings()
