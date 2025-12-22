"""
A.U.R.A ML SERVICE - DECISION LAYER
=====================================
FastAPI application for objective interview scoring.

This service:
- Receives perception layer metrics
- Returns deterministic skill scores
- Provides improvement suggestions
- Has NO state, NO memory, NO LLM calls

Run with:
    uvicorn app.main:app --host 0.0.0.0 --port 8000
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .api.routes import router
from .decision.scoring import get_models_status


# =============================================================================
# APPLICATION
# =============================================================================

app = FastAPI(
    title="A.U.R.A Decision Layer",
    description="""
## AI-Based Unified Response Assessment - Decision Layer

This service provides **objective, deterministic scoring** of interview performance
based on features extracted by the Perception Layer.

### Features
- **Confidence** scoring based on assertiveness, voice stability, eye contact
- **Clarity** scoring based on topic relevance, structure, pace
- **Empathy** scoring based on emotional engagement, reflective responses
- **Communication** scoring as a weighted combination of all skills

### Architecture
```
Perception Layer (text/audio/video analysis)
        ↓
Decision Layer (this service)
        ↓
Objective Scores (0-100)
```

### Key Properties
- **Deterministic**: Same input → Same output
- **Stateless**: No memory between requests
- **Pure**: No LLM calls, no side effects
- **Fast**: ~10ms inference time
    """,
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)


# =============================================================================
# CORS MIDDLEWARE
# =============================================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# =============================================================================
# ROUTES
# =============================================================================

# Include API routes
app.include_router(router, prefix="/api/v1")

# Also include at root level for convenience
app.include_router(router)


# =============================================================================
# ROOT ENDPOINT
# =============================================================================

@app.get("/", tags=["Root"])
async def root():
    """Root endpoint with service information."""
    status = get_models_status()
    return {
        "service": "A.U.R.A Decision Layer",
        "version": "1.0.0",
        "status": "healthy" if status["loaded"] else "degraded",
        "models_loaded": status["loaded"],
        "endpoints": {
            "health": "/health",
            "score": "/score",
            "model_info": "/model/info",
            "schema": "/schema",
            "docs": "/docs",
        }
    }


# =============================================================================
# STARTUP/SHUTDOWN EVENTS
# =============================================================================

@app.on_event("startup")
async def startup_event():
    """Load models on startup."""
    status = get_models_status()
    if status["loaded"]:
        print(f"✓ Models loaded: {status['models']}")
    else:
        print("⚠ Warning: Models not loaded")


@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown."""
    print("Shutting down Decision Layer service...")


# =============================================================================
# MAIN
# =============================================================================

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
