
import pandas as pd           # Data manipulation  

from xai.clinical_rules import evaluate_feature

# ==========================================================
# Risk Mapping Engine
# ==========================================================
#
# PURPOSE
# -------
# Map the SHAP-important clinical parameters to
# possible pregnancy risk categories.
#
# The contribution of each feature is weighted
# using its SHAP value.
#
# INPUT
# -----
# shap_df
# RISK_KNOWLEDGE_BASE
#
# OUTPUT
# ------
# Ranked pregnancy risk categories
#
# ==========================================================

# ==========================================================
# Risk Mapping Engine
# ==========================================================
#
# PURPOSE
# -------
# Map SHAP-important clinical parameters to the most
# likely pregnancy risk categories.
#
# The final contribution of each feature is based on:
#
#   Normalized SHAP
#       ×
#   Clinical Severity
#       ×
#   Evidence-based Clinical Weight
#
# ==========================================================

def map_risks(shap_df, knowledge_base):

    risk_scores = {}

    # ------------------------------------------------------
    # Normalize SHAP values
    # ------------------------------------------------------

    shap_df = shap_df.copy()

    total_shap = shap_df["Absolute SHAP"].sum()

    if total_shap == 0:
        total_shap = 1e-8

    shap_df["Normalized SHAP"] = (
        shap_df["Absolute SHAP"] / total_shap
    )

    # ------------------------------------------------------
    # Evaluate every pregnancy risk
    # ------------------------------------------------------

    for risk_name, risk_info in knowledge_base.items():

        score = 0

        matched_features = []

        feature_contributions = []

        risk_features = risk_info["features"]

        # --------------------------------------------------
        # Evaluate every SHAP feature
        # --------------------------------------------------

        for _, row in shap_df.iterrows():

            feature = row["Feature"]

            # Skip features not relevant to this risk
            if feature not in risk_features:
                continue

            patient_value = row["Patient Value"]

            # ----------------------------------------------
            # Clinical Evaluation
            # ----------------------------------------------

            clinical_result = evaluate_feature(
                feature,
                patient_value
            )

            severity_score = clinical_result["severity_score"]

            # Ignore clinically normal features
            if severity_score == 0:
                continue

            # ----------------------------------------------
            # SHAP Contribution
            # ----------------------------------------------

            normalized_shap = row["Normalized SHAP"]

            # ----------------------------------------------
            # Disease Weight
            # ----------------------------------------------

            clinical_weight = risk_features[feature]

            # ----------------------------------------------
            # Final Feature Contribution
            # ----------------------------------------------

            feature_score = (
                normalized_shap
                * clinical_weight
                * severity_score
            )

            score += feature_score

            matched_features.append(feature)

            feature_contributions.append({

                "feature": feature,

                "display_name":
                clinical_result["display_name"],

                "patient_value": patient_value,

                "finding":
                clinical_result["finding"],

                "severity":
                clinical_result["severity"],

                "severity_score":
                severity_score,

                "clinical_weight":
                clinical_weight,

                "normalized_shap":
                round(normalized_shap, 4),

                "feature_score":
                round(feature_score, 4)

            })

        # --------------------------------------------------
        # Sort feature contributions
        # --------------------------------------------------

        feature_contributions = sorted(

            feature_contributions,

            key=lambda x: x["feature_score"],

            reverse=True

        )

        # --------------------------------------------------
        # Store Results
        # --------------------------------------------------

        risk_scores[risk_name] = {

            "Risk Score": round(score, 4),

            "Matched Features": matched_features,

            "Feature Contributions": feature_contributions

        }

    return risk_scores

# ==========================================================
# Pregnancy Risk Knowledge Base
# ==========================================================
#
# PURPOSE
# -------
# The Random Forest model predicts whether a pregnancy
# is HIGH RISK or LOW RISK.
#
# SHAP identifies the clinical parameters that contributed
# most to the prediction.
#
# This knowledge base maps those SHAP-important parameters
# to possible pregnancy risk categories.
#
# IMPORTANT
# ---------
# This knowledge base DOES NOT diagnose pregnancy
# complications.
#
# It is only used to identify the pregnancy complications
# that are most consistent with the SHAP explanation.
#
# ==========================================================

# ==========================================================
# Evidence-Based Clinical Knowledge Base
# ==========================================================
#
# PURPOSE
# -------
# This knowledge base maps the clinical parameters used by
# the pretrained Random Forest model to possible pregnancy
# risk categories.
#
# The feature weights were derived from evidence reported
# in international clinical guidelines (WHO, ACOG, ADA),
# obstetric textbooks, and peer-reviewed literature.
#
# IMPORTANT
# ---------
# This knowledge base DOES NOT diagnose pregnancy
# complications.
#
# It is only used to identify the pregnancy complications
# that are most consistent with the SHAP explanation
# generated by the prediction model.
#
# ==========================================================

RISK_KNOWLEDGE_BASE = {

    # ======================================================
    # Preterm Birth
    # ======================================================

    "Preterm Birth": {

        "features": {

            # Previous Child Death
            "D": 5,

            # Previous Abortions
            "A": 5,

            # Maternal Hemoglobin
            "HB": 4,

            # Gravida
            "G": 4,

            # Blood Pressure
            "SystolicBP": 3,
            "DiastolicBP": 3,

            # Previous Deliveries
            "P": 2,

            # Maternal Age
            "Age": 2

        }

    },

    # ======================================================
    # Gestational Diabetes Mellitus (GDM)
    # ======================================================

    "Gestational Diabetes Mellitus (GDM)": {

        "features": {

            # Random Blood Sugar
            "RBS": 5,

            # Long-term Glycemic Control
            "HBA1C": 5,

            # Advanced Maternal Age
            "Age": 2

        }

    },

    # ======================================================
    # Fetal Growth Restriction (FGR)
    # ======================================================

    "Fetal Growth Restriction (FGR)": {

        "features": {

            # Maternal Anemia
            "HB": 5,

            # Maternal Hypertension
            "SystolicBP": 4,
            "DiastolicBP": 4,

            # Maternal Age
            "Age": 2

        }

    },

    # ======================================================
    # Maternal Anemia
    # ======================================================

    "Maternal Anemia": {

        "features": {

            # Diagnostic Biomarker
            "HB": 5,

            # Physiological Compensation
            "HeartRate": 2,
            "RR": 2

        }

    },

    # ======================================================
    # Maternal Infection
    # ======================================================

    "Maternal Infection": {

        "features": {

            # Fever
            "BodyTemp": 5,

            # Tachycardia
            "HeartRate": 3,

            # Tachypnea
            "RR": 3

        }

    },

    # ======================================================
    # Hypertensive Disorders of Pregnancy
    # ======================================================

    "Hypertensive Disorders of Pregnancy": {

        "features": {

            # Diagnostic Blood Pressure
            "SystolicBP": 5,
            "DiastolicBP": 5,

            # Epidemiological Risk Factor
            "Age": 2,

            # Supporting Physiological Marker
            "HeartRate": 2

        }

    }

}
# ==========================================================
# Create Risk Ranking Table
# ==========================================================
#
# Purpose
# -------
# Convert the risk mapping dictionary into a
# clean and readable table.
#
# This table can later be displayed directly
# on the website.
#
# ==========================================================

def create_risk_table(risk_scores):

    risk_table = []

    # Convert dictionary into table rows
    for risk, info in risk_scores.items():

       risk_table.append({

          "Risk Category": risk,

          "Risk Score": round(info["Risk Score"], 4),

          "Matched Features":
          ", ".join(info["Matched Features"]),

          "No. of Features Matched":
          len(info["Matched Features"]),

          "Top Clinical Findings":
          ", ".join([
              item["finding"]
              for item in info["Feature Contributions"][:3]
           ])

        })

    # Create DataFrame
    risk_table = pd.DataFrame(risk_table)

    # Sort by highest score
    risk_table = risk_table.sort_values(
        by="Risk Score",
        ascending=False
    ).reset_index(drop=True)

    return risk_table



# ==========================================================
# Select Top Pregnancy Risk Categories
# ==========================================================
#
# Purpose
# -------
# Select the pregnancy risk categories with the
# highest XAI Evidence Scores.
#
# These risks will later be displayed to the
# clinician and patient.
#
# Input
# -----
# risk_table
#
# Output
# ------
# top_risks
#
# ==========================================================

def get_top_risk_categories(risk_table, top_n=3):

    filtered = risk_table[risk_table["Risk Score"] > 0].copy()

    if filtered.empty:
        # All scores are 0 (protective / Low Risk) — still return top N so
        # clinical reports are generated for the most relevant complications.
        return risk_table.head(top_n).copy()

    return filtered.head(top_n).copy()