# AGENTS.md — HighRiskPregnancy_XAI

## Project overview

Explainable AI system for high-risk pregnancy prediction. A Random Forest classifier predicts risk, SHAP explains which features drove the prediction, a clinical rules engine maps those features to 6 pregnancy risk categories, and a RAG pipeline (FAISS + Groq LLM) generates patient-specific clinical reports.

## Entry point

- **`pipeline.py`** — `run_complete_pipeline(patient_data, project_dir)` is the sole entry point. `project_dir` must be passed explicitly (not auto-detected).
- Pipeline order: predict → SHAP → risk mapping → RAG report generation (always runs all stages).
- Helper `pipeline_result_to_json(result)` converts DataFrames to JSON-safe dicts for frontend.

## Configuration

- **`config.py`** — single source of truth for paths, model names, RAG params. Edit here to change anything.
- **`.env`** — must contain `GROQ_API_KEY`. Loaded by `config.py` via `python-dotenv`. Missing key triggers a warning (not a crash).

## Dependencies

`requirements.txt` exists. Install with: `pip install -r requirements.txt`

## Testing

- **`test_pipeline.py`** — runs syntax checks, import checks, error handling, and optional end-to-end test.
  - `python test_pipeline.py quick` — fast syntax/import tests (11 tests, no API key needed).
  - `python test_pipeline.py full` — includes end-to-end pipeline test (requires `.env`).

## ML / LLM specifics

- **Prediction model**: `model/random_forest_model.pkl` — trained Random Forest, loaded with `joblib`.
- **SHAP**: `shap.TreeExplainer` with global cache (rebuilt per model, not per call).
- **LLM**: Groq `llama-3.3-70b-versatile` via `langchain-groq`. Temperature = 0. Lazy-loaded (not at import time).
- **Embedding model**: `BAAI/bge-small-en-v1.5` via HuggingFace (CPU, normalized embeddings). Lazy-loaded.

## RAG pipeline

- Source PDFs in `MedicalDocuments/<Risk Category>/` — loaded via `PyPDFLoader`, cleaned, chunked (1000 chars, 200 overlap).
- Pre-built FAISS vector databases in `vector_database/<Risk Category>/` (6 categories). Must exist before running the pipeline.
- FAISS loading uses `allow_dangerous_deserialization=True`.
- Report generation runs in parallel via `ThreadPoolExecutor(max_workers=3)`.
- LLM prompt expects strictly JSON output (see `prompt_builder.py` for schema). Empty list fields are replaced with a fallback string.
- Missing vector DB or malformed JSON handled gracefully with fallback text.

## 6 risk categories

- Preterm Birth, Gestational Diabetes Mellitus (GDM), Fetal Growth Restriction (FGR), Maternal Anemia, Maternal Infection, Hypertensive Disorders of Pregnancy

## 14 clinical features (model input)

`HB`, `RBS`, `HBA1C`, `Age`, `SystolicBP`, `DiastolicBP`, `HeartRate`, `RR`, `BodyTemp`, `G`, `P`, `A`, `L`, `D`

## Source of truth for display names / units / importance

- **`xai/feature_defs.py`** — single source for `FEATURE_DISPLAY_NAMES`, `FEATURE_UNITS`, `get_importance_level`. Imported by `output_builder.py` and `summary_builder.py`.
- `clinical_rules.py` now uses proper APA 7th edition citations (Baig et al. 2025, Cavazos-Rehg et al. 2015, Rahman et al. 2016, etc.) from the KnowledgeBase PDF — no more "Clinical Parameters Review" placeholders.

## Known quirks

- `output_builder.py` accesses `risk_table.iloc[0]` without checking for empty table — if risk mapping returns no matches, this will crash.
- The `KnowledgeBase/` directory contains a single PDF ("Evidence-Based Pregnancy Risk Knowledge Base.pdf") that documents how `RISK_KNOWLEDGE_BASE` weights were derived. Not used by the pipeline at runtime.
- No linter/formatter configured.