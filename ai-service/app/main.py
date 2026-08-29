"""
app/main.py
FastAPI application entry point for the Unfazed AI Service.

Security: All endpoints (except /health) require the X-AI-Service-Key header.
This service is NEVER exposed publicly — it is called only by the Node.js backend.
"""

import os
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from dotenv import load_dotenv

from app.services.model_loader import ModelLoader
from app.routes import no_show, sentiment, soap, scheduling, forecasting

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("unfazed-ai")

# ── Startup / Shutdown lifecycle ─────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Load ML models at startup so they are ready for requests."""
    logger.info("🤖 Unfazed AI Service starting — loading models...")
    ModelLoader.load_all()
    logger.info("✅ All models loaded and ready.")
    yield
    logger.info("Unfazed AI Service shutting down.")


# ── App ───────────────────────────────────────────────────────────────────────

app = FastAPI(
    title="Unfazed AI Service",
    description=(
        "Internal ML/NLP inference service for Unfazed. "
        "Not publicly exposed — called only by the Node.js backend. "
        "AI outputs are decision-support indicators only, NOT clinical diagnoses."
    ),
    version="1.0.0",
    docs_url="/docs",          # Disable in production: docs_url=None
    redoc_url="/redoc",
    lifespan=lifespan,
)

# ── Internal CORS (localhost only) ────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5000", "http://127.0.0.1:5000"],
    allow_credentials=False,
    allow_methods=["POST", "GET"],
    allow_headers=["X-AI-Service-Key", "Content-Type"],
)

# ── API Key Middleware ─────────────────────────────────────────────────────────

AI_SERVICE_API_KEY = os.getenv("AI_SERVICE_API_KEY", "")

@app.middleware("http")
async def api_key_guard(request: Request, call_next):
    """
    Reject requests that don't carry the correct internal API key.
    Health check is exempt so Node can probe liveness without auth.
    """
    if request.url.path in ("/health", "/docs", "/redoc", "/openapi.json"):
        return await call_next(request)

    provided_key = request.headers.get("X-AI-Service-Key", "")
    if not AI_SERVICE_API_KEY or provided_key != AI_SERVICE_API_KEY:
        return JSONResponse(
            status_code=status.HTTP_403_FORBIDDEN,
            content={"detail": "Invalid or missing AI service key."},
        )
    return await call_next(request)


# ── Health Check ──────────────────────────────────────────────────────────────

@app.get("/health", tags=["system"])
async def health_check():
    return {
        "status": "ok",
        "service": "Unfazed AI Service",
        "disclaimer": (
            "AI outputs are decision-support indicators only. "
            "They are NOT clinical diagnoses."
        ),
    }


# ── Routers ───────────────────────────────────────────────────────────────────

app.include_router(no_show.router,    prefix="/predict",   tags=["No-Show Prediction"])
app.include_router(sentiment.router,  prefix="/predict",   tags=["Sentiment Analysis"])
app.include_router(soap.router,       prefix="/generate",  tags=["SOAP Draft"])
app.include_router(scheduling.router, prefix="/recommend", tags=["Smart Scheduling"])
app.include_router(forecasting.router,prefix="/forecast",  tags=["Revenue Forecasting"])
