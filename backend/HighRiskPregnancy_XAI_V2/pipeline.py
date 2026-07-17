import os
import time
import pandas as pd

# Prediction
from xai.predictor import (
    load_prediction_model,
    predict_risk,
    format_prediction
)

# SHAP
from xai.shap_engine import (
    generate_shap_values,
    create_shap_dataframe
)

# Risk Mapping
from xai.risk_mapper import (
    map_risks,
    create_risk_table,
    get_top_risk_categories,
    RISK_KNOWLEDGE_BASE
)

# Summary
from xai.output_builder import (
    build_xai_output
)

# LLM
from llm.llm_engine import (
    load_llm
)

# Report Generation
from rag.rag_pipeline import (
    generate_reports_for_top_risks
)

from rag.vector_store import load_embedding_model

# ==========================================================
# Global Cache for Reusable Models
# ==========================================================

_CACHE = {}


def _get_embedding_model():
    if "embedding_model" not in _CACHE:
        print("Loading Embedding Model...")
        _CACHE["embedding_model"] = load_embedding_model()
        print("Embedding Model Loaded.")
    return _CACHE["embedding_model"]


def _get_llm():
    if "llm" not in _CACHE:
        print("Loading LLM...")
        _CACHE["llm"] = load_llm()
        print("LLM Loaded.")
    return _CACHE["llm"]


def pipeline_result_to_json(result):
    """
    Convert pipeline result DataFrames to JSON-safe structures
    for sending to the frontend.

    Parameters
    ----------
    result : dict
        The return value of run_complete_pipeline().

    Returns
    -------
    dict
        Same structure with DataFrames converted to lists of dicts.
    """
    output = {}

    for key, value in result.items():
        if isinstance(value, pd.DataFrame):
            if value.empty:
                output[key] = []
            else:
                output[key] = value.to_dict(orient="records")
        else:
            output[key] = value

    return output


def run_complete_pipeline(
    patient_data,
    project_dir
):
    """
    Complete High Risk Pregnancy Prediction Pipeline

    Parameters
    ----------
    patient_data : dict
        Patient clinical parameters received from the website.

    project_dir : str
        Path to the HighRiskPregnancy_XAI project folder.

    Returns
    -------
    dict
        Contains prediction, XAI explanation,
        top risks, reports and execution time.
    """
    start_time = time.perf_counter()

    # Convert website input into DataFrame
    patient = pd.DataFrame([patient_data])

    DISCLAIMER = (
        "This system is a clinical decision support tool, "
        "not a diagnostic device. All outputs require "
        "clinician review."
    )

    result = {
        "prediction": "Error",
        "confidence": 0.0,
        "high_risk_probability": 0.0,
        "low_risk_probability": 0.0,
        "risk_table": pd.DataFrame(),
        "top_risks": pd.DataFrame(),
        "xai_output": None,
        "reports": [],
        "execution_time": 0.0,
        "disclaimer": DISCLAIMER
    }

    # ==========================================================
    # Load Prediction Model
    # ==========================================================

    model_path = os.path.join(
        project_dir,
        "model",
        "random_forest_model.pkl"
    )
    prediction_start = time.perf_counter()

    try:
        model = load_prediction_model(model_path)
    except Exception as e:
        print(f"ERROR loading model: {e}")
        result["execution_time"] = time.perf_counter() - start_time
        return result

    # ==========================================================
    # Predict Pregnancy Risk
    # ==========================================================

    try:
        prediction, probability = predict_risk(
            model,
            patient
        )
    except Exception as e:
        print(f"ERROR during prediction: {e}")
        result["execution_time"] = time.perf_counter() - start_time
        return result

    # ==========================================================
    # Prediction Probabilities
    # ==========================================================

    low_risk_probability = round(probability[0][0] * 100, 2)

    high_risk_probability = round(probability[0][1] * 100, 2)

    prediction_end = time.perf_counter()

    print(f"Prediction Time : {prediction_end - prediction_start:.3f} sec")

    prediction_label, confidence = format_prediction(
        prediction,
        probability
    )

    # ==========================================================
    # Generate SHAP Explanation
    # ==========================================================
    shap_start = time.perf_counter()
    try:
        shap_values = generate_shap_values(
            model,
            patient
        )

        shap_df = create_shap_dataframe(
            patient,
            shap_values
        )
    except Exception as e:
        print(f"ERROR during SHAP generation: {e}")
        result.update({
            "prediction": prediction_label,
            "confidence": confidence,
            "high_risk_probability": high_risk_probability,
            "low_risk_probability": low_risk_probability,
        })
        result["execution_time"] = time.perf_counter() - start_time
        return result

    shap_end = time.perf_counter()

    print(f"SHAP Time : {shap_end - shap_start:.3f} sec")

    # ==========================================================
    # Risk Mapping
    # ==========================================================
    mapping_start = time.perf_counter()
    try:
        risk_scores = map_risks(
            shap_df,
            RISK_KNOWLEDGE_BASE
        )

        risk_table = create_risk_table(
            risk_scores
        )

        top_risks = get_top_risk_categories(
            risk_table,
            top_n=3
        )
    except Exception as e:
        print(f"ERROR during risk mapping: {e}")
        result.update({
            "prediction": prediction_label,
            "confidence": confidence,
            "high_risk_probability": high_risk_probability,
            "low_risk_probability": low_risk_probability,
            "xai_output": build_xai_output(
                prediction, probability, shap_df, None
            ) if 'shap_df' in locals() else None,
        })
        result["execution_time"] = time.perf_counter() - start_time
        return result

    mapping_end = time.perf_counter()

    print(f"Risk Mapping Time : {mapping_end - mapping_start:.3f} sec")

    # ==========================================================
    # Build XAI Output
    # ==========================================================

    xai_output = build_xai_output(
        prediction,
        probability,
        shap_df,
        risk_table
    )

    # ==========================================================
    # Generate Reports (for all predictions — always show top risk guidance)
    # ==========================================================
    report_start = time.perf_counter()

    try:
        embedding_model = _get_embedding_model()
        llm = _get_llm()
        multi_risk_reports = generate_reports_for_top_risks(
            top_risks=top_risks,
            risk_scores=risk_scores,
            prediction_label=prediction_label,
            shap_df=shap_df,
            knowledge_base=RISK_KNOWLEDGE_BASE,
            llm=llm,
            embedding_model=embedding_model,
            project_dir=project_dir
        )
    except Exception as e:
        print(f"ERROR during report generation: {e}")
        multi_risk_reports = []

    report_end = time.perf_counter()

    print(f"Report Generation : {report_end - report_start:.3f} sec")

    # ==========================================================
    # Execution Time
    # ==========================================================

    execution_time = time.perf_counter() - start_time
    print("=" * 60)
    print(f"TOTAL PIPELINE TIME : {execution_time:.3f} sec")
    print("=" * 60)

    # ==========================================================
    # Return Results
    # ==========================================================

    return {
        "prediction": prediction_label,
        "confidence": confidence,
        "high_risk_probability": high_risk_probability,
        "low_risk_probability": low_risk_probability,
        "risk_table": risk_table,
        "top_risks": top_risks,
        "xai_output": xai_output,
        "reports": multi_risk_reports,
        "execution_time": execution_time,
        "disclaimer": DISCLAIMER
    }