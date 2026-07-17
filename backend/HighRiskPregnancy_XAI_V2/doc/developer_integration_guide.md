# Developer Integration Guide — HighRiskPregnancy_XAI

## How to Deliver This Project

**Recommended: Share as a ZIP file** (not git, because the model and vector databases are binary/large files excluded from `.gitignore`).

1. **If the team uses git**: Initialize a repo, then copy `model/` and `vector_database/` separately (or use Git LFS).
2. **If no git**: ZIP the entire project folder as-is — everything works out of the box.

**Important**: The `.gitignore` excludes `model/*.pkl` and `vector_database/`. When you zip, these are included. When you push to git, they are NOT. The team needs these files to run the pipeline.

---

## Project Structure

```
HighRiskPregnancy_XAI/
├── pipeline.py               <-- SOLE ENTRY POINT (call this only)
├── config.py                  <-- Change settings here
├── requirements.txt           <-- Install these
├── .env.example               <-- Rename to .env, add API key
│
├── model/
│   └── random_forest_model.pkl    <-- Pre-trained Random Forest
│
├── xai/                           <-- Prediction + Explainability
│   ├── predictor.py               <-- Load model, predict, format output
│   ├── shap_engine.py             <-- SHAP TreeExplainer (cached)
│   ├── risk_mapper.py             <-- Maps SHAP to 6 risk categories
│   ├── clinical_rules.py          <-- 14 evidence-based clinical thresholds
│   ├── output_builder.py          <-- Builds structured XAI output dict
│   └── feature_defs.py            <-- Shared feature names, units, importance levels
│
├── rag/                           <-- RAG Report Generation
│   ├── knowledge_loader.py        <-- Load PDFs, clean, chunk
│   ├── vector_store.py            <-- FAISS vector DB create/load/save
│   ├── retriever.py               <-- Similarity search + context builder
│   ├── prompt_builder.py          <-- LLM prompt template (JSON output)
│   ├── summary_builder.py         <-- Patient summary for RAG
│   └── rag_pipeline.py            <-- Orchestrates per-risk RAG (parallel)
│
├── llm/
│   └── llm_engine.py              <-- Groq LLM (llama-3.3-70b-versatile)
│
├── vector_database/               <-- Pre-built FAISS indexes (6 risk categories)
├── MedicalDocuments/              <-- Source PDFs (WHO, ACOG, ADA, Cleveland Clinic)
│
├── test_pipeline.py               <-- Test suite
└── doc/
    ├── architecture.md
    ├── improvements.md
    └── developer_integration_guide.md  <-- YOU ARE HERE
```

---

## Setup

```bash
# 1. Install dependencies
pip install -r requirements.txt

# 2. Create .env from template and add your API key
cp .env.example .env
# Edit .env: GROQ_API_KEY=your_groq_api_key_here

# 3. Verify it works
python test_pipeline.py quick
```

---

## The ONLY Function You Need

```python
from pipeline import run_complete_pipeline

result = run_complete_pipeline(
    patient_data={
        "Age": 36,
        "G": 3,               # Gravida (number of pregnancies)
        "P": 2,               # Para (number of deliveries)
        "L": 2,               # Living children
        "A": 1,               # Abortions
        "D": 0,               # Previous child deaths
        "SystolicBP": 150,    # Systolic blood pressure (mmHg)
        "DiastolicBP": 100,   # Diastolic blood pressure (mmHg)
        "RBS": 180,           # Random blood sugar (mg/dL)
        "BodyTemp": 98.6,     # Body temperature (°F)
        "HeartRate": 110,     # Heart rate (bpm)
        "HB": 7.5,            # Hemoglobin (g/dL)
        "HBA1C": 6.2,         # HbA1c (%)
        "RR": 26              # Respiratory rate (breaths/min)
    },
    project_dir="path/to/HighRiskPregnancy_XAI"
)
```

### Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `patient_data` | `dict` | Yes | 14 clinical features (keys above) |
| `project_dir` | `str` | Yes | Absolute path to the project root folder |

### Return Value

```python
{
    "prediction": "High Risk" | "Low Risk" | "Error",
    "confidence": 87.5,               # float (percentage)
    "high_risk_probability": 87.5,    # float (percentage)
    "low_risk_probability": 12.5,     # float (percentage)
    "risk_table": DataFrame,          # pandas DataFrame, sorted by risk score
    "top_risks": DataFrame,           # pandas DataFrame, top 3 (rows with score > 0)
    "xai_output": {                   # structured XAI explanation
        "prediction": {
            "risk_level": "High Risk",
            "confidence": 87.5,
            "high_risk_probability": 87.5,
            "low_risk_probability": 12.5
        },
        "primary_risk": {
            "name": "Preterm Birth",
            "evidence_score": 6.3258
        },
        "clinical_features": [
            {
                "feature": "A",
                "display_name": "Abortions",
                "patient_value": 1.0,
                "unit": "",
                "shap_value": 0.12,
                "importance_score": 0.1200,
                "importance_level": "Very High"
            },
            # ... up to 3 features
        ],
        "disclaimer": "This system is a clinical decision support tool..."
    },
    "reports": [                         # only for High Risk predictions
        {
            "risk": "Preterm Birth",
            "report": {
                "patient_summary": "...",
                "condition_name": "Preterm Birth",
                "overview": "...",
                "why_this_patient_is_at_risk": "...",
                "warning_signs": [...],
                "risk_factors": [...],
                "possible_complications": [...],
                "preventive_measures": [...],
                "when_to_seek_medical_help": "...",
                "sources": ["Pretermbirth_WHO.pdf", ...]
            }
        },
        # ... up to 3 reports total (sorted by risk score descending)
    ],
    "execution_time": 9.128,         # float, seconds
    "disclaimer": "This system is a clinical decision support tool, not a diagnostic device. All outputs require clinician review."
}
```

### Error State
If the pipeline fails at any stage, it **will not crash**. It returns:

```python
{
    "prediction": "Error",      # or "High Risk" / "Low Risk" if prediction succeeded
    "confidence": 0.0,
    "reports": [],              # empty if RAG failed
    "risk_table": DataFrame(),  # empty
    "top_risks": DataFrame(),   # empty
    "xai_output": None,         # None if SHAP failed
    # ... other fields with defaults
}
```

Your frontend should handle `prediction == "Error"` by showing a "Service Unavailable" message.

### Notes on changes

- `xai_output.primary_risk.name` can be `"No significant risk factors identified"` with `evidence_score: 0.0` when all clinical values are normal.
- For Low Risk predictions, `reports` is an empty list — LLM reports are only generated when the model predicts High Risk.
- Reports are always sorted to match the top_risks rank order (highest score first).
- The `disclaimer` field is present at both the top level and inside `xai_output`.

---

## Frontend Integration Guide

### What to display

| Return Field | Frontend Component |
|---|---|
| `prediction` + `confidence` | Risk badge (High Risk = red, Low Risk = green) with confidence percentage |
| `high_risk_probability` | Progress bar or gauge |
| `low_risk_probability` | Same (complement) |
| `xai_output.primary_risk.name` | Primary risk category heading |
| `xai_output.clinical_features` | Feature importance table (3 rows: feature name, value, importance level) |
| `risk_table` | Full risk ranking table (6 rows, all categories with scores) |
| `reports[].report` | Collapsible sections per risk category (overview, warning signs, risks, etc.) |
| `execution_time` | Debug footer (optional) |

### Sample frontend flow

1. User enters 14 clinical values in a form
2. Frontend sends `POST /api/predict` with JSON body matching `patient_data`
3. Backend calls `run_complete_pipeline(patient_data, project_dir)`
4. Backend sends response back as JSON
5. Frontend renders components from the table above

### Important notes for backend

- The first call to `run_complete_pipeline` loads the embedding model (~2-3s) and LLM (~1-2s). Subsequent calls reuse cached instances and are faster.
- RAG reports are generated in parallel (3 concurrent LLM calls). Total time: ~5-15s depending on Groq latency.
- `risk_table` and `top_risks` are pandas DataFrames. Convert to JSON before sending to frontend:
  ```python
  import json
  result["risk_table"] = json.loads(result["risk_table"].to_json(orient="records"))
  result["top_risks"] = json.loads(result["top_risks"].to_json(orient="records"))
  ```
- The `reports` list contains 0 items for Low Risk predictions, or up to 3 items for High Risk (one per top risk category with score > 0).

---

## 6 Risk Categories

| Category | Key Features |
|---|---|
| Preterm Birth | D, A, HB, G, SystolicBP, DiastolicBP, P, Age |
| Gestational Diabetes Mellitus (GDM) | RBS, HBA1C, Age |
| Fetal Growth Restriction (FGR) | HB, SystolicBP, DiastolicBP, Age |
| Maternal Anemia | HB, HeartRate, RR |
| Maternal Infection | BodyTemp, HeartRate, RR |
| Hypertensive Disorders of Pregnancy | SystolicBP, DiastolicBP, Age, HeartRate |

## 14 Clinical Features (input order doesn't matter)

| Key | Full Name | Unit |
|---|---|---|
| `HB` | Hemoglobin | g/dL |
| `RBS` | Random Blood Sugar | mg/dL |
| `HBA1C` | HbA1c | % |
| `Age` | Maternal Age | years |
| `SystolicBP` | Systolic Blood Pressure | mmHg |
| `DiastolicBP` | Diastolic Blood Pressure | mmHg |
| `HeartRate` | Heart Rate | bpm |
| `RR` | Respiratory Rate | breaths/min |
| `BodyTemp` | Body Temperature | °F |
| `G` | Gravida | — |
| `P` | Para | — |
| `A` | Abortions | — |
| `L` | Living Children | — |
| `D` | Previous Child Deaths | — |

---

## Configuration (edit `config.py`)

| Variable | Default | What it controls |
|---|---|---|
| `LLM_MODEL_NAME` | `llama-3.3-70b-versatile` | Groq model for RAG report generation |
| `EMBEDDING_MODEL_NAME` | `BAAI/bge-small-en-v1.5` | HuggingFace embedding model |
| `TOP_K_DOCUMENTS` | `3` | Number of retrieved chunks per RAG query |
| `LLM_TEMPERATURE` | `0` | LLM creativity (0 = deterministic) |

---

## Common Issues

| Symptom | Cause | Fix |
|---|---|---|
| `GROQ_API_KEY not found` | Missing `.env` file | Create `.env` from `.env.example` |
| `No such file: random_forest_model.pkl` | Model not at expected path | Ensure `model/random_forest_model.pkl` exists in `project_dir` |
| `Could not find FAISS index` | Vector DB not built | Ensure `vector_database/<Risk Category>/` exists for each risk |
| Pipeline returns partial results | One stage failed | Check stderr for `ERROR: ...` messages |
| First call is slow (~10s) | Embedding model + LLM cold start | Normal. Subsequent calls are faster (cached) |

---

## Development Team Checklist

- [ ] `pip install -r requirements.txt`
- [ ] Create `.env` with `GROQ_API_KEY`
- [ ] Confirm `model/random_forest_model.pkl` exists
- [ ] Confirm `vector_database/` has 6 subfolders with `index.faiss` + `index.pkl`
- [ ] Run `python test_pipeline.py quick` — all pass
- [ ] Run `python test_pipeline.py full` — pipeline runs end-to-end
- [ ] Call `run_complete_pipeline` with sample data, verify JSON response
- [ ] Convert DataFrames to JSON in the backend API layer
- [ ] Handle `prediction == "Error"` case in frontend