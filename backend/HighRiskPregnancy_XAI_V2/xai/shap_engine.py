
import shap
import pandas as pd

_SHAP_EXPLAINER_CACHE = {}

def generate_shap_values(model, patient):

    model_id = id(model)
    if model_id not in _SHAP_EXPLAINER_CACHE:
        _SHAP_EXPLAINER_CACHE[model_id] = shap.TreeExplainer(model)

    explainer = _SHAP_EXPLAINER_CACHE[model_id]

    shap_values = explainer(patient)

    return shap_values



# ==========================================================
# Feature Ranking Engine
# ==========================================================
#
# Purpose
# -------
# Create a ranked table of SHAP contributions
# for the patient's prediction.
#
# Inputs
# ------
# patient     : Patient DataFrame
# shap_values : SHAP explanation object
#
# Output
# ------
# shap_df : DataFrame containing
#           Feature Name
#           Patient Value
#           SHAP Value
#           Absolute SHAP Value
#
# ==========================================================

def create_shap_dataframe(patient, shap_values):

    # SHAP values for the High Risk class (Class 1)
    high_risk_shap = shap_values.values[0, :, 1]

    shap_df = pd.DataFrame({

        "Feature": patient.columns,

        "Patient Value": patient.iloc[0].values,

        "SHAP Value": high_risk_shap

    })

    # Calculate absolute contribution
    shap_df["Absolute SHAP"] = shap_df["SHAP Value"].abs()

    # Sort features by importance
    shap_df = shap_df.sort_values(
        by="Absolute SHAP",
        ascending=False
    ).reset_index(drop=True)

    return shap_df