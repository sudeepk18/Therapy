"""
app/services/model_loader.py
Central model loading utility called at app startup.
Ensures all models are preloaded and warm before the first request.
"""

import logging
from app.models import no_show_model, sentiment_model

logger = logging.getLogger(__name__)


class ModelLoader:
    @staticmethod
    def load_all():
        """Load all ML models into memory at startup."""
        try:
            no_show_model.load_model()
        except Exception as e:
            logger.error("Failed to load no-show model: %s", e)

        try:
            sentiment_model.load_model()
        except Exception as e:
            logger.error("Failed to load sentiment model: %s", e)
        
        # Revenue model and SOAP generator are stateless/heuristic
        # — they don't need preloading.
        logger.info("Model loading complete.")
