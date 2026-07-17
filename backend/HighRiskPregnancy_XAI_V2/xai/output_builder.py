from xai.feature_defs import FEATURE_DISPLAY_NAMES, FEATURE_UNITS, get_importance_level


def build_xai_output(
        prediction,
        probability,
        shap_df,
        risk_table,
        top_n_features=3):

    low_risk_prob = round(float(probability[0][0]) * 100, 2)
    high_risk_prob = round(float(probability[0][1]) * 100, 2)

    prediction_output = {
        "risk_level":
        "High Risk"
        if prediction[0] == 1
        else "Low Risk",
        "confidence":
        float(probability[0].max()),
        "high_risk_probability": high_risk_prob,
        "low_risk_probability": low_risk_prob
    }

    if risk_table is None or risk_table.empty or risk_table.iloc[0]["Risk Score"] == 0:
        primary_risk = {
            "name": "No significant risk factors identified",
            "evidence_score": 0.0
        }
    else:
        primary_risk = {
            "name": risk_table.iloc[0]["Risk Category"],
            "evidence_score": float(risk_table.iloc[0]["Risk Score"])
        }

    clinical_features = []

    for _, row in shap_df.head(top_n_features).iterrows():

        feature = row["Feature"]

        clinical_features.append({

            "feature":
            feature,

            "display_name":
            FEATURE_DISPLAY_NAMES.get(feature, feature),

            "patient_value":
            row["Patient Value"],

            "unit":
            FEATURE_UNITS.get(feature, ""),

            "shap_value":
            float(row["SHAP Value"]),

            "importance_score":
             round(float(row["Absolute SHAP"]), 4),

            "importance_level":
             get_importance_level(row["Absolute SHAP"])

             })

    xai_output = {

        "prediction":
        prediction_output,

        "primary_risk":
        primary_risk,

        "clinical_features":
        clinical_features,

        "disclaimer":
        "This system is a clinical decision support tool, "
        "not a diagnostic device. All outputs require "
        "clinician review. The prediction is based on a "
        "machine learning model and may not generalize "
        "to all populations."

    }

    return xai_output