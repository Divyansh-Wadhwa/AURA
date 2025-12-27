"""
LLM-Assisted Semantic Perception Module
========================================
Uses LLM (via OpenRouter) to extract semantic features that keywords/heuristics cannot detect:
- Implicit confidence (not just assertive phrases)
- Semantic clarity (beyond topic relevance)
- Answer depth (substance vs fluff)
- Empathy inference (beyond keyword matching)
- Evasion probability (deflecting questions)

IMPORTANT: LLM is a PERCEPTION ASSISTANT, not a SCORER.
- Outputs numeric features only (0-1 range)
- No explanations, no judgments, no final scores
- Features feed into the decision layer like any other perception output

Provider: OpenRouter (using OpenAI-compatible API with google/gemini-2.0-flash-exp)
"""

import os
import json
import asyncio
from typing import List, Dict, Optional, Any
from dataclasses import dataclass
import numpy as np

# Try to import OpenAI client for OpenRouter
try:
    from openai import OpenAI, AsyncOpenAI
    OPENROUTER_AVAILABLE = True
    print("[LLMSemantic] OpenAI client loaded successfully for OpenRouter")
except ImportError:
    OPENROUTER_AVAILABLE = False
    print("[LLMSemantic] OpenAI client not available - LLM features will be disabled")


@dataclass
class LLMSemanticMetrics:
    """Container for LLM-extracted semantic features."""
    llm_confidence_mean: float = 0.5      # Implicit confidence (0-1)
    llm_clarity_mean: float = 0.5         # Semantic clarity (0-1)
    llm_depth_mean: float = 0.5           # Answer depth/substance (0-1)
    llm_empathy_mean: float = 0.5         # Empathy inference (0-1)
    llm_evasion_mean: float = 0.5         # Evasion probability (0-1)
    llm_available: bool = False           # Whether LLM analysis was performed
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "llm_confidence_mean": self.llm_confidence_mean,
            "llm_clarity_mean": self.llm_clarity_mean,
            "llm_depth_mean": self.llm_depth_mean,
            "llm_empathy_mean": self.llm_empathy_mean,
            "llm_evasion_mean": self.llm_evasion_mean,
            "llm_available": self.llm_available,
        }


# System prompt for LLM analysis - STRICT numeric output only
LLM_SYSTEM_PROMPT = """You analyze interview answers. Output ONLY valid JSON with no other text.

For each answer, estimate these metrics on a 0.0 to 1.0 scale:
- implicit_confidence: How confident does the speaker sound? (tone, certainty, not just keywords)
- semantic_clarity: How clear and understandable is the message? (structure, coherence)
- answer_depth: Does the answer have substance? (specifics, examples, not vague platitudes)
- empathy_inference: Does the speaker show understanding/empathy? (acknowledgment, perspective-taking)
- evasion_probability: Is the speaker avoiding/deflecting the question? (tangents, non-answers)

Output format (ONLY this JSON, nothing else):
{"implicit_confidence": 0.X, "semantic_clarity": 0.X, "answer_depth": 0.X, "empathy_inference": 0.X, "evasion_probability": 0.X}"""


class LLMSemanticAnalyzer:
    """
    Uses LLM (via OpenRouter) to extract semantic features that traditional NLP cannot detect.
    
    This is a PERCEPTION component, not a scoring component.
    All outputs are numeric features for downstream ML models.
    
    Provider: OpenRouter - using OpenAI-compatible API with google/gemini-2.0-flash-exp
    """
    
    def __init__(
        self,
        api_key: Optional[str] = None,
        model: str = "google/gemini-2.0-flash-exp",
        timeout: float = 30.0,
        enabled: bool = True
    ):
        """
        Initialize the LLM analyzer with OpenRouter.
        
        Args:
            api_key: OpenRouter API key (defaults to OPENROUTER_API_KEY env var)
            model: Model identifier for OpenRouter (e.g., google/gemini-2.0-flash-exp)
            timeout: Request timeout in seconds
            enabled: Whether to enable LLM analysis
        """
        self.model = model
        self.timeout = timeout
        self.enabled = enabled and OPENROUTER_AVAILABLE
        self.client = None
        self.async_client = None
        
        if self.enabled:
            api_key = api_key or os.environ.get("OPENROUTER_API_KEY")
            if api_key:
                try:
                    self.client = OpenAI(
                        api_key=api_key,
                        base_url="https://openrouter.ai/api/v1",
                        timeout=timeout,
                        default_headers={
                            "HTTP-Referer": "https://aura-interview.app",
                            "X-Title": "AURA Perception Layer",
                        }
                    )
                    self.async_client = AsyncOpenAI(
                        api_key=api_key,
                        base_url="https://openrouter.ai/api/v1",
                        timeout=timeout,
                        default_headers={
                            "HTTP-Referer": "https://aura-interview.app",
                            "X-Title": "AURA Perception Layer",
                        }
                    )
                    print(f"[LLMSemantic] OpenRouter initialized with model: {model}")
                except Exception as e:
                    print(f"[LLMSemantic] Failed to initialize OpenRouter client: {e}")
                    self.enabled = False
            else:
                print("[LLMSemantic] No OPENROUTER_API_KEY found - LLM features disabled")
                self.enabled = False
        else:
            print("[LLMSemantic] LLM analysis disabled (OpenRouter not available)")
    
    def analyze(self, responses: List[str]) -> LLMSemanticMetrics:
        """
        Analyze responses using LLM (synchronous).
        
        Args:
            responses: List of user response texts
            
        Returns:
            LLMSemanticMetrics with averaged features across all responses
        """
        print(f"[LLMSemantic] analyze() called with {len(responses)} responses")
        print(f"[LLMSemantic] enabled={self.enabled}, client={self.client is not None}")
        
        if not self.enabled:
            print("[LLMSemantic] LLM analysis disabled - returning defaults")
            return LLMSemanticMetrics()
        if not self.client:
            print("[LLMSemantic] No client initialized - returning defaults")
            return LLMSemanticMetrics()
        if not responses:
            print("[LLMSemantic] No responses provided - returning defaults")
            return LLMSemanticMetrics()
        
        try:
            all_metrics = []
            
            for i, response in enumerate(responses):
                if len(response.strip()) < 10:  # Skip very short responses
                    print(f"[LLMSemantic] Skipping response {i+1} (too short: {len(response.strip())} chars)")
                    continue
                
                print(f"[LLMSemantic] Analyzing response {i+1}: '{response[:50]}...'")
                metrics = self._analyze_single(response)
                if metrics:
                    print(f"[LLMSemantic] Got metrics: {metrics}")
                    all_metrics.append(metrics)
                else:
                    print(f"[LLMSemantic] No metrics returned for response {i+1}")
            
            if not all_metrics:
                print("[LLMSemantic] No valid metrics collected - returning defaults")
                return LLMSemanticMetrics()
            
            # Average across all responses
            result = self._aggregate_metrics(all_metrics)
            print(f"[LLMSemantic] Final aggregated metrics: conf={result.llm_confidence_mean:.2f}, clarity={result.llm_clarity_mean:.2f}")
            return result
            
        except Exception as e:
            print(f"[LLMSemantic] Analysis error: {e}")
            import traceback
            traceback.print_exc()
            return LLMSemanticMetrics()
    
    async def analyze_async(self, responses: List[str]) -> LLMSemanticMetrics:
        """
        Analyze responses using LLM (asynchronous).
        
        Args:
            responses: List of user response texts
            
        Returns:
            LLMSemanticMetrics with averaged features across all responses
        """
        if not self.enabled or not self.async_client or not responses:
            return LLMSemanticMetrics()
        
        try:
            # Filter valid responses
            valid_responses = [r for r in responses if len(r.strip()) >= 10]
            
            if not valid_responses:
                return LLMSemanticMetrics()
            
            # Analyze all responses concurrently
            tasks = [self._analyze_single_async(r) for r in valid_responses]
            results = await asyncio.gather(*tasks, return_exceptions=True)
            
            # Filter successful results
            all_metrics = [r for r in results if isinstance(r, dict)]
            
            if not all_metrics:
                return LLMSemanticMetrics()
            
            return self._aggregate_metrics(all_metrics)
            
        except Exception as e:
            print(f"[LLMSemantic] Async analysis error: {e}")
            return LLMSemanticMetrics()
    
    def _analyze_single(self, response: str) -> Optional[Dict[str, float]]:
        """Analyze a single response synchronously."""
        try:
            # Truncate very long responses
            response_text = response[:1500] if len(response) > 1500 else response
            
            user_prompt = f"Analyze this interview answer:\n\"\"\"{response_text}\"\"\""
            
            completion = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": LLM_SYSTEM_PROMPT},
                    {"role": "user", "content": user_prompt}
                ],
                temperature=0.1,
                max_tokens=100,
            )
            
            result_text = completion.choices[0].message.content.strip()
            return self._parse_response(result_text)
            
        except Exception as e:
            print(f"[LLMSemantic] Single analysis error: {e}")
            return None
    
    async def _analyze_single_async(self, response: str) -> Optional[Dict[str, float]]:
        """Analyze a single response asynchronously."""
        try:
            response_text = response[:1500] if len(response) > 1500 else response
            
            user_prompt = f"Analyze this interview answer:\n\"\"\"{response_text}\"\"\""
            
            completion = await self.async_client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": LLM_SYSTEM_PROMPT},
                    {"role": "user", "content": user_prompt}
                ],
                temperature=0.1,
                max_tokens=100,
            )
            
            result_text = completion.choices[0].message.content.strip()
            return self._parse_response(result_text)
            
        except Exception as e:
            print(f"[LLMSemantic] Async single analysis error: {e}")
            return None
    
    def _parse_response(self, response_text: str) -> Optional[Dict[str, float]]:
        """Parse LLM response into metrics dict."""
        try:
            # Try to extract JSON from response
            # Handle cases where LLM might add extra text
            json_start = response_text.find('{')
            json_end = response_text.rfind('}') + 1
            
            if json_start == -1 or json_end == 0:
                print(f"[LLMSemantic] No JSON found in response: {response_text[:100]}")
                return None
            
            json_str = response_text[json_start:json_end]
            data = json.loads(json_str)
            
            # Validate and clamp values
            required_keys = [
                "implicit_confidence", "semantic_clarity", "answer_depth",
                "empathy_inference", "evasion_probability"
            ]
            
            result = {}
            for key in required_keys:
                if key in data:
                    value = float(data[key])
                    result[key] = max(0.0, min(1.0, value))
                else:
                    result[key] = 0.5  # Default to neutral
            
            return result
            
        except json.JSONDecodeError as e:
            print(f"[LLMSemantic] JSON parse error: {e}")
            return None
        except Exception as e:
            print(f"[LLMSemantic] Parse error: {e}")
            return None
    
    def _aggregate_metrics(self, all_metrics: List[Dict[str, float]]) -> LLMSemanticMetrics:
        """Aggregate metrics from multiple responses."""
        if not all_metrics:
            return LLMSemanticMetrics()
        
        # Calculate means for each metric
        confidence_values = [m.get("implicit_confidence", 0.5) for m in all_metrics]
        clarity_values = [m.get("semantic_clarity", 0.5) for m in all_metrics]
        depth_values = [m.get("answer_depth", 0.5) for m in all_metrics]
        empathy_values = [m.get("empathy_inference", 0.5) for m in all_metrics]
        evasion_values = [m.get("evasion_probability", 0.5) for m in all_metrics]
        
        return LLMSemanticMetrics(
            llm_confidence_mean=float(np.mean(confidence_values)),
            llm_clarity_mean=float(np.mean(clarity_values)),
            llm_depth_mean=float(np.mean(depth_values)),
            llm_empathy_mean=float(np.mean(empathy_values)),
            llm_evasion_mean=float(np.mean(evasion_values)),
            llm_available=True
        )


# Fallback analyzer that returns neutral values when LLM is not available
class FallbackLLMAnalyzer:
    """Fallback analyzer that returns neutral/default values."""
    
    def analyze(self, responses: List[str]) -> LLMSemanticMetrics:
        return LLMSemanticMetrics(llm_available=False)
    
    async def analyze_async(self, responses: List[str]) -> LLMSemanticMetrics:
        return LLMSemanticMetrics(llm_available=False)


def create_llm_analyzer(
    api_key: Optional[str] = None,
    model: Optional[str] = None,
    enabled: bool = True
) -> LLMSemanticAnalyzer:
    """
    Factory function to create an LLM analyzer using OpenRouter.
    
    Returns a real analyzer if OpenRouter is available and enabled,
    otherwise returns a fallback analyzer.
    
    Available models via OpenRouter (OpenAI-compatible endpoint):
    - google/gemini-2.5-pro (default, available on OpenAI-compatible endpoint)
    
    Note: Other Gemini models require @openrouter/sdk instead of openai package
    """
    if not enabled or not OPENROUTER_AVAILABLE:
        return FallbackLLMAnalyzer()
    
    # Use environment variable model if not specified, fallback to fast model without reasoning overhead
    if model is None:
        model = os.environ.get("OPENROUTER_PERCEPTION_MODEL", "google/gemini-2.0-flash-001")
    
    analyzer = LLMSemanticAnalyzer(api_key=api_key, model=model, enabled=enabled)
    if not analyzer.enabled:
        return FallbackLLMAnalyzer()
    
    return analyzer
