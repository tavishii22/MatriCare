# HighRiskPregnancy_XAI — Architecture Document

---

## 1. Architecture Diagram

```
                             ┌─────────────────────────────────────────────────────────────────┐
                             │                  PATIENT DATA (14 values)                        │
                             │  HB, RBS, HBA1C, Age, SysBP, DiaBP, HR, RR, Temp, G, P, A, L, D│
                             └────────────────────────┬────────────────────────────────────────┘
                                                      │
                                                      ▼
                            ┌─────────────────────────────────────────┐
                            │   STEP 1: RANDOM FOREST PREDICTION      │
                            │         xai/predictor.py                │
                            │                                         │
                            │  model = joblib.load(model.pkl)         │
                            │  prediction = model.predict(patient)    │
                            │  probability = model.predict_proba(...) │
                            └────────────────────┬────────────────────┘
                                                      │
                                                      ▼
                            ┌─────────────────────────────────────────┐
                            │   OUTPUT:                               │
                            │   "High Risk" or "Low Risk"             │
                            │   + confidence %                        │
                            └────────────────────┬────────────────────┘
                                                      │
                                                      ▼
                            ┌─────────────────────────────────────────┐
                            │   STEP 2: SHAP EXPLANATION (XAI)        │
                            │         xai/shap_engine.py              │
                            │                                         │
                            │  explainer = TreeExplainer(model)       │
                            │  shap_values = explainer(patient)       │
                            │  shap_df = ranked features table        │
                            └────────────────────┬────────────────────┘
                                                      │
                                                      ▼
                            ┌─────────────────────────────────────────┐
                            │   OUTPUT:                               │
                            │   Each feature → SHAP contribution      │
                            │   (how much each number influenced      │
                            │    the prediction)                      │
                            └────────────────────┬────────────────────┘
                                                      │
                                                      ▼
                            ┌─────────────────────────────────────────┐
                            │   STEP 3: RISK MAPPING                  │
                            │         xai/risk_mapper.py              │
                            │         xai/clinical_rules.py           │
                            │                                         │
                            │  For each of 6 risk categories:         │
                            │  Score = Σ (norm_SHAP × weight × sev.)  │
                            │                                         │
                            │  → risk_table (sorted by score)         │
                            │  → top_3_risks                          │
                            └────────────────────┬────────────────────┘
                                                      │
                                                      ▼
                            ┌─────────────────────────────────────────┐
                            │   STEP 4: RAG REPORT GENERATION         │
                            │         rag/rag_pipeline.py             │
                            │         rag/retriever.py                │
                            │         rag/prompt_builder.py           │
                            │         rag/vector_store.py             │
                            │         rag/summary_builder.py          │
                            │                                         │
                            │  For each top risk:                     │
                            │  1. Search FAISS vector DB              │
                            │  2. Retrieve relevant medical docs      │
                            │  3. Build prompt + patient summary      │
                            │  4. LLM (Groq) → JSON report            │
                            └────────────────────┬────────────────────┘
                                                      │
                                                      ▼
                            ┌─────────────────────────────────────────┐
│   FINAL OUTPUT (JSON)                   │
│                                         │
│  {                                      │
│    "prediction": "High Risk",           │
│    "confidence": 87.5,                  │
│    "high_risk_probability": 87.5,       │
│    "low_risk_probability": 12.5,        │
│    "risk_table": [...],                 │
│    "top_risks": [...],                  │
│    "reports": [                         │
│       { "risk": "...", "report": {...} }│
│    ],                                   │
│    "execution_time": 12.34,             │
│    "disclaimer": "This system is ..."   │
│  }                                      │
                            └─────────────────────────────────────────┘
```

---

## 2. Simple End-to-End Flow (No Technical Jargon)

```
 ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
 │   STEP 1 │───▶│   STEP 2 │───▶│   STEP 3 │───▶│   STEP 4 │
 │  Predict  │    │  Explain  │    │  Map to   │    │ Generate  │
 │  Risk     │    │  Why      │    │  Diseases │    │ Reports   │
 └──────────┘    └──────────┘    └──────────┘    └──────────┘
```

**Step 1 — Predict Risk**
A trained Random Forest model looks at 14 medical numbers (hemoglobin, blood pressure, blood sugar, age, etc.) and decides: **High Risk** or **Low Risk**. It also gives a **confidence percentage** (e.g., "I am 87% sure").

**Step 2 — Explain Why (XAI)**
SHAP opens the AI's "black box" and lists which numbers mattered most. For example:
- "Blood pressure contributed 40% of the decision"
- "Hemoglobin contributed 25%"
- "Age contributed 15%"

**Step 3 — Map to Pregnancy Risks**
The system checks the important numbers against medical rules and **6 known pregnancy risks**:

| # | Risk Category |
|---|---------------|
| 1 | Preterm Birth |
| 2 | Gestational Diabetes (GDM) |
| 3 | Fetal Growth Restriction (FGR) |
| 4 | Maternal Anemia |
| 5 | Maternal Infection |
| 6 | Hypertensive Disorders |

Each risk gets a **score**. The top 3 risks with the highest scores are selected.

**Step 4 — Generate Patient Reports**
For each of the top 3 risks:
1. Search medical PDF guidelines (WHO, ACOG) stored in a vector database
2. Build a prompt with the patient's specific data
3. Send to Groq LLM (a large language model)
4. Receive a detailed, patient-friendly report in JSON format

---

## 3. Detailed Software Architecture

### 3.1 How the Code is Organized

```
HighRiskPregnancy_XAI/
│
├── pipeline.py                 ← THE MAIN ENTRY POINT
│                                  Call run_complete_pipeline(data, dir)
│
├── config.py                   ← All settings in one place
│
├── .env                        ← GROQ_API_KEY (secret)
│
├── model/
│   └── random_forest_model.pkl ← Trained AI model
│
├── xai/                        ← Prediction + Explainability
│   ├── predictor.py            ← Load model, make prediction
│   ├── shap_engine.py          ← Generate SHAP explanations
│   ├── risk_mapper.py          ← Score each pregnancy risk
│   ├── clinical_rules.py       ← Medical thresholds & rules
│   └── output_builder.py       ← Format final XAI output
│
├── rag/                        ← Report Generation (RAG)
│   ├── knowledge_loader.py     ← Load & clean PDF documents
│   ├── vector_store.py         ← Create/load FAISS databases
│   ├── retriever.py            ← Search for relevant info
│   ├── prompt_builder.py       ← Build LLM prompts
│   ├── summary_builder.py      ← Build patient summaries
│   └── rag_pipeline.py         ← Orchestrate RAG flow
│
├── llm/
│   └── llm_engine.py           ← Connect to Groq LLM
│
├── MedicalDocuments/           ← Source PDFs (6 folders)
│   ├── Preterm Birth/
│   ├── Gestational Diabetes Mellitus (GDM)/
│   ├── Fetal Growth Restriction (FGR)/
│   ├── Maternal Anemia/
│   ├── Maternal Infection/
│   └── Hypertensive Disorders of Pregnancy/
│
├── vector_database/            ← Pre-built FAISS indexes (6 folders)
│   └── (same 6 categories)/
│       ├── index.faiss
│       └── index.pkl
│
└── notebooks/                  ← Jupyter notebooks (testing)
```

### 3.2 Pipeline Flow in Detail

```
START
  │
  ▼
Convert patient dict → DataFrame
  │
  ▼
Load Random Forest model (joblib)
  │
  ▼
STEP 1: predict_risk(model, patient)
  │  ├─ prediction = model.predict(patient)     → 0 or 1
  │  └─ probability = model.predict_proba(patient) → [%, %]
  │
  ▼
STEP 2: format_prediction(prediction, probability)
  │  └─ "High Risk" or "Low Risk" + confidence %
  │
  ▼
STEP 3: generate_shap_values(model, patient)
  │  └─ TreeExplainer → shap_values
  │
  ▼
STEP 4: create_shap_dataframe(patient, shap_values)
  │  └─ Table: Feature | Patient Value | SHAP Value | |SHAP|
  │
  ▼
STEP 5: map_risks(shap_df, RISK_KNOWLEDGE_BASE)
  │  └─ Score each of 6 risk categories
  │
  ▼
STEP 6: create_risk_table(risk_scores)
  │  └─ Sorted table of all 6 risks
  │
  ▼
STEP 7: get_top_risk_categories(risk_table, top_n=3)
  │  └─ Top 3 highest scoring risks
  │
  ▼
STEP 8: build_xai_output(prediction, probability, shap_df, risk_table)
  │  └─ Structured XAI dictionary
  │
  ▼
STEP 9: (Only if prediction is "High Risk")
  │  Load embedding model (HuggingFace BGE) — lazy
  │  Load LLM (Groq llama-3.3-70b-versatile) — lazy
  │
  ▼
STEP 10: For each top risk (parallel, 3 at a time):
  │  1. build_patient_summary_for_rag(...)
  │  2. Load FAISS vector DB for that risk
  │  3. Create retriever (similarity search, k=3)
  │  4. Query: "Explain {Risk}."
  │  5. Retrieve relevant documents → context
  │  6. Build prompt (XAI summary + medical evidence)
  │  7. LLM generates JSON report
  │  8. Parse JSON, replace empty fields
  │  9. Reports sorted back into risk rank order
  │
  ▼
Return all results as a single dictionary
```

---

## 4. Formulas

### 4.1 Prediction Confidence

```
confident_class = 0  (Low Risk)  or  1  (High Risk)
confidence = probability[0][confident_class] × 100
```

Example: If `probability = [[0.13, 0.87]]` and prediction is 1 (High Risk):
```
confidence = 0.87 × 100 = 87%
```

### 4.2 Normalized SHAP Value

```
total_abs_shap = Σ |SHAP_value| for all 14 features

normalized_SHAP(feature) = |SHAP_value(feature)| / total_abs_shap
```

This converts each feature's contribution into a **percentage** (0 to 1) so they can be compared and combined fairly.

### 4.3 Risk Score for Each Pregnancy Category

```
For a given risk category (e.g., "Preterm Birth"):

    Risk_Score = Σ [ normalized_SHAP(f) × clinical_weight(f) × severity_score(f) ]

    summed over all features f that:
      - Are listed in the risk's knowledge base
      - Have an abnormal clinical value (severity_score > 0)
```

Where:
- **normalized_SHAP(f)** = how much feature f influenced the AI (0 to 1)
- **clinical_weight(f)** = how relevant feature f is to this disease (1 to 5, defined in knowledge base)
- **severity_score(f)** = how abnormal the patient's value is (0, 1, 2, 3, or 5, from clinical rules)

**Example for Gestational Diabetes (GDM):**

| Feature | norm_SHAP | weight | severity | Score Contribution |
|---------|-----------|--------|----------|-------------------|
| RBS | 0.35 | 5 | 3 | 0.35 × 5 × 3 = 5.25 |
| HBA1C | 0.20 | 5 | 3 | 0.20 × 5 × 3 = 3.00 |
| Age | 0.05 | 2 | 2 | 0.05 × 2 × 2 = 0.20 |
| **Total Risk Score** | | | | **8.45** |

### 4.4 Clinical Weight Values (from Knowledge Base)

| Risk Category | Feature | Weight |
|---------------|---------|--------|
| Preterm Birth | D | 5 |
| | A | 5 |
| | HB | 4 |
| | G | 4 |
| | SysBP | 3 |
| | DiaBP | 3 |
| | P | 2 |
| | Age | 2 |
| Gestational Diabetes (GDM) | RBS | 5 |
| | HBA1C | 5 |
| | Age | 2 |
| Fetal Growth Restriction (FGR) | HB | 5 |
| | SysBP | 4 |
| | DiaBP | 4 |
| | Age | 2 |
| Maternal Anemia | HB | 5 |
| | HeartRate | 2 |
| | RR | 2 |
| Maternal Infection | BodyTemp | 5 |
| | HeartRate | 3 |
| | RR | 3 |
| Hypertensive Disorders | SysBP | 5 |
| | DiaBP | 5 |
| | Age | 2 |
| | HeartRate | 2 |

### 4.5 Severity Scores (from Clinical Rules)

Each feature has severity levels based on the patient's actual value:

| Feature | Condition | Severity Score | Label |
|---------|-----------|:--------------:|-------|
| **Age** | ≥ 35 | 2 | Advanced Maternal Age |
| **G (Gravida)** | ≥ 5 | 5 | Grand Multigravida |
| | ≥ 3 | 3 | Multigravida |
| **P (Para)** | ≥ 4 | 2 | Grand Multiparity |
| **A (Abortions)** | ≥ 3 | 5 | Recurrent Pregnancy Loss |
| | ≥ 1 | 3 | Previous Abortion History |
| **D (Child Deaths)** | ≥ 1 | 5 | Previous Child Death |
| **SystolicBP** | ≥ 160 | 5 | Severe Hypertension |
| | ≥ 140 | 3 | Elevated Systolic BP |
| **DiastolicBP** | ≥ 110 | 5 | Severe Diastolic HTN |
| | ≥ 90 | 3 | Elevated Diastolic BP |
| **RBS** | ≥ 200 | 5 | Marked Hyperglycemia |
| | ≥ 140 | 3 | Elevated RBS |
| **BodyTemp** | ≥ 102.2°F | 5 | High Fever |
| | ≥ 100.4°F | 3 | Fever |
| **HeartRate** | > 120 | 5 | Marked Tachycardia |
| | > 100 | 3 | Tachycardia |
| **HB** | < 7 | 5 | Severe Anemia |
| | < 10 | 3 | Moderate Anemia |
| | < 11 | 1 | Mild Anemia |
| **HBA1C** | ≥ 6.5 | 5 | Diabetic Range |
| | ≥ 5.7 | 3 | Prediabetic Range |
| **RR** | > 30 or < 10 | 5 | Critical |
| | > 20 | 3 | Elevated |

### 4.6 Importance Level (SHAP → Plain Language)

From `output_builder.py`:

| Absolute SHAP Value | Importance Level |
|:-------------------:|:----------------:|
| ≥ 0.10 | Very High |
| ≥ 0.05 | High |
| ≥ 0.02 | Moderate |
| < 0.02 | Low |

---

## 5. Data Flow Summary

```
PATIENT INPUT (14 values)
        │
        ▼
┌──────────────────────────────────────────────────────────────────┐
│                   PIPELINE (pipeline.py)                         │
│                                                                  │
│  [1] Prediction → "High Risk" (87% confidence)                  │
│                                                                  │
│  [2] SHAP → Feature rankings with SHAP values                   │
│                                                                  │
│  [3] Risk Mapping → 6 risk categories scored:                   │
│       1. GDM              Score: 8.45                           │
│       2. FGR              Score: 5.20                           │
│       3. Preterm Birth    Score: 3.10                           │
│       4. (others...)      Score: ...                            │
│                                                                  │
│  [4] RAG Reports for top 3:                                     │
│       ┌─ GDM ─────────────────────────────────────────────────┐  │
│       │ "Patient has elevated blood sugar and HbA1c..."       │  │
│       │ "Warning signs: increased thirst, frequent urination" │  │
│       │ "Risk factors: age > 35, family history..."           │  │
│       │ "Preventive measures: diet control, exercise..."      │  │
│       └───────────────────────────────────────────────────────┘  │
│       ... similar reports for FGR and Preterm Birth              │
└──────────────────────────────────────────────────────────────────┘
        │
        ▼
FINAL OUTPUT (JSON) → Website / Clinician
```

---

## 6. Key Technologies Used

| Component | Technology |
|-----------|-----------|
| Prediction Model | Random Forest (scikit-learn) |
| Model Persistence | joblib (.pkl) |
| Explainability | SHAP TreeExplainer |
| Clinical Rules | Custom rule engine (thresholds + severity scores) |
| Text Embeddings | BAAI/bge-small-en-v1.5 (HuggingFace) |
| Vector Database | FAISS (Facebook AI Similarity Search) |
| Document Loader | PyPDFLoader (langchain) |
| Text Splitter | RecursiveCharacterTextSplitter |
| Large Language Model | Groq — llama-3.3-70b-versatile |
| LLM Framework | LangChain (langchain-groq) |
| Data Handling | pandas, numpy |
| Environment Config | python-dotenv |

---

## 7. File-by-File Responsibility

| File | What It Does |
|------|-------------|
| `config.py` | Stores all paths, model names, API keys, and RAG parameters. Gracefully warns if API key is missing. |
| `pipeline.py` | The main orchestrator. Imports everything and runs the 4 steps in order. Models loaded lazily (not at import time). Also provides `pipeline_result_to_json()` for converting DataFrames to JSON. |
| `xai/predictor.py` | Loads the Random Forest model from disk. Runs `predict()` and `predict_proba()`. |
| `xai/shap_engine.py` | Creates a SHAP TreeExplainer. Generates SHAP values for the patient. Ranks features by |SHAP|. |
| `xai/risk_mapper.py` | Contains the 6-risk knowledge base. Computes risk scores using SHAP + clinical weights + severity. |
| `xai/clinical_rules.py` | Contains 13 medical rule sets with thresholds, severity scores, and patient-friendly messages. Levels auto-sorted by severity. |
| `xai/feature_defs.py` | Single source of truth for feature display names, units, and importance levels. Imported by `output_builder.py` and `summary_builder.py`. |
| `xai/output_builder.py` | Converts XAI results into a clean dictionary for the RAG pipeline and website. |
| `rag/knowledge_loader.py` | Loads PDF files from MedicalDocuments/, cleans them, and splits into chunks. |
| `rag/vector_store.py` | Creates FAISS vector databases from chunks. Loads/saves FAISS indexes. |
| `rag/retriever.py` | Creates a similarity search retriever. Combines retrieved chunks into a context string. |
| `rag/prompt_builder.py` | Builds the prompt template sent to the LLM (requires JSON output). |
| `rag/summary_builder.py` | Builds a patient-specific clinical summary for each risk category. |
| `rag/rag_pipeline.py` | Orchestrates the RAG flow for each top risk (runs 3 risks in parallel via ThreadPoolExecutor). Handles missing vector DBs and malformed JSON gracefully. |
| `llm/llm_engine.py` | Connects to Groq API, sends prompts, and returns LLM responses. |
