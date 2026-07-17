"""
==========================================================
Project Configuration
==========================================================

Stores all project-wide configuration variables.

Changing paths, model names, or retrieval settings only
requires editing this file.

==========================================================
"""

import os
from pathlib import Path
from dotenv import load_dotenv

# ==========================================================
# Project Root
# ==========================================================

PROJECT_DIR = Path(__file__).resolve().parent

# ==========================================================
# Load Environment Variables
# ==========================================================

load_dotenv(dotenv_path=PROJECT_DIR / ".env")

GROQ_API_KEY = os.getenv("GROQ_API_KEY")

if GROQ_API_KEY is None:
    print(
        f"WARNING: GROQ_API_KEY not found. Expected .env at: {PROJECT_DIR / '.env'}"
    )
    print("RAG report generation will be skipped until a valid key is set.")

# ==========================================================
# Model Paths
# ==========================================================

MODEL_PATH = PROJECT_DIR / "model" / "random_forest_model.pkl"

# ==========================================================
# Embedding Model
# ==========================================================

EMBEDDING_MODEL_NAME = "BAAI/bge-small-en-v1.5"

# ==========================================================
# Embedding Model Configuration
# ==========================================================

EMBEDDING_DEVICE = "cpu"

NORMALIZE_EMBEDDINGS = True

# ==========================================================
# LLM Configuration
# ==========================================================

LLM_MODEL_NAME = "llama-3.3-70b-versatile"

LLM_TEMPERATURE = 0

# ==========================================================
# RAG Configuration
# ==========================================================

TOP_K_DOCUMENTS = 3

VECTOR_DATABASE_DIR = PROJECT_DIR / "vector_database"