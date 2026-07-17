



"""
==============================================================
Clinical Rules Database
==============================================================

Purpose
-------
This file stores evidence-based clinical thresholds for all
clinical parameters used by the Random Forest prediction model.

Each parameter contains:

• Display name
• Units
• Normal reference range
• Clinical importance
• Severity levels
• Urgency
• Risk message

The database is interpreted by a generic evaluation engine.

References
----------
WHO, ACOG, ADA Standards of Care 2026, MEOWS Guideline
Baig et al. (2025), Cavazos-Rehg et al. (2015)
Rahman et al. (2016), Cleveland Clinic
Dutta's Textbook of Obstetrics
==============================================================
"""

CLINICAL_RULES = {

    # ==========================================================
    # 1. Maternal Age
    # ==========================================================

    "Age": {

        "display_name": "Maternal Age",

        "unit": "years",

        "normal_range": "20–34 years",

        "clinical_importance":
        (
            "Advanced maternal age increases the risk of "
            "preterm birth, gestational diabetes, hypertensive "
            "disorders of pregnancy and fetal growth restriction."
        ),

        "levels": [

            {
                "condition": lambda x: x >= 35,

                "finding": "Advanced Maternal Age",

                "severity": "Moderate",

                "severity_score": 2,

                "urgency": "Monitor",

                "risk_message":
                (
                    "Maternal age of 35 years or above is "
                    "associated with increased obstetric risk."
                ),

                "references":
                [
                    "ACOG Obstetric Care Consensus",
                    "Cavazos-Rehg et al. (2015)"
                ]

            }

        ]

    },

    # ==========================================================
    # 2. Gravida
    # ==========================================================

    "G": {

        "display_name": "Gravida",

        "unit": "",

        "normal_range": "1–2 pregnancies",

        "clinical_importance":
        (
            "Increasing gravida has been associated with "
            "higher risk of adverse pregnancy outcomes "
            "including preterm birth."
        ),

        "levels": [

            {

                "condition": lambda x: x >= 5,

                "finding": "Grand Multigravida",

                "severity": "Severe",

                "severity_score": 5,

                "urgency": "Needs Evaluation",

                "risk_message":
                (
                    "Grand multigravida is associated with "
                    "increased maternal and fetal complications."
                ),

                "references":
                [
                    "Baig et al. (2025)"
                ]

            },

            {

                "condition": lambda x: x >= 3,

                "finding": "Multigravida",

                "severity": "Moderate",

                "severity_score": 3,

                "urgency": "Monitor",

                "risk_message":
                (
                    "Multiple pregnancies increase the risk of "
                    "certain obstetric complications."
                ),

                "references":
                [
                    "Baig et al. (2025)"
                ]

            }

        ]

    },

    # ==========================================================
    # 3. Para
    # ==========================================================

    "P": {

        "display_name": "Para",

        "unit": "",

        "normal_range": "0–2 previous deliveries",

        "clinical_importance":
        (
            "Previous deliveries provide important obstetric "
            "history that may influence future pregnancy risk."
        ),

        "levels": [

            {

                "condition": lambda x: x >= 4,

                "finding": "Grand Multiparity",

                "severity": "Moderate",

                "severity_score": 2,

                "urgency": "Monitor",

                "risk_message":
                (
                    "Grand multiparity has been associated with "
                    "higher maternal and neonatal complications."
                ),

                "references":
                [
                    "Baig et al. (2025)"
                ]

            }

        ]

    },

    # ==========================================================
    # 4. Abortions
    # ==========================================================

    "A": {

        "display_name": "Abortions",

        "unit": "",

        "normal_range": "0",

        "clinical_importance":
        (
            "Previous spontaneous or induced abortions increase "
            "the risk of preterm birth and adverse pregnancy outcomes."
        ),

        "levels": [

            {

                "condition": lambda x: x >= 3,

                "finding": "Recurrent Pregnancy Loss",

                "severity": "Severe",

                "severity_score": 5,

                "urgency": "Needs Evaluation",

                "risk_message":
                (
                    "Recurrent pregnancy loss significantly "
                    "increases future obstetric risk."
                ),

                "references":
                [
                    "Baig et al. (2025)",
                    "ACOG"
                ]

            },

            {

                "condition": lambda x: x >= 1,

                "finding": "Previous Abortion History",

                "severity": "Moderate",

                "severity_score": 3,

                "urgency": "Monitor",

                "risk_message":
                (
                    "History of abortion is associated with "
                    "higher risk of preterm birth."
                ),

                "references":
                [
                    "Baig et al. (2025)"
                ]

            }

        ]

    },

    # ==========================================================
    # 5. Previous Child Death
    # ==========================================================

    "D": {

        "display_name": "Previous Child Death",

        "unit": "",

        "normal_range": "0",

        "clinical_importance":
        (
            "A history of previous child death indicates a "
            "high-risk obstetric history requiring closer monitoring."
        ),

        "levels": [

            {

                "condition": lambda x: x >= 1,

                "finding": "Previous Child Death",

                "severity": "Severe",

                "severity_score": 5,

                "urgency": "Needs Evaluation",

                "risk_message":
                (
                    "Previous child death is considered a "
                    "significant high-risk obstetric factor."
                ),

                "references":
                [
                    "Baig et al. (2025)"
                ]

            }

        ]

    },

    # ==========================================================
    # 6. Systolic Blood Pressure
    # ==========================================================

    "SystolicBP": {

        "display_name": "Systolic Blood Pressure",

        "unit": "mmHg",

        "normal_range": "<140 mmHg",

        "clinical_importance":
        (
            "Elevated systolic blood pressure is one of the "
            "primary diagnostic criteria for hypertensive "
            "disorders of pregnancy."
        ),

        "levels": [

            {

                "condition": lambda x: x >= 160,

                "finding": "Severe Systolic Hypertension",

                "severity": "Severe",

                "severity_score": 5,

                "urgency": "Urgent",

                "risk_message":
                (
                    "Severe hypertension requires immediate "
                    "medical evaluation."
                ),

                "references":
                [
                    "ACOG Practice Bulletin"
                ]

            },

            {

                "condition": lambda x: x >= 140,

                "finding": "Elevated Systolic Blood Pressure",

                "severity": "Moderate",

                "severity_score": 3,

                "urgency": "Needs Evaluation",

                "risk_message":
                (
                    "Elevated systolic blood pressure suggests "
                    "possible gestational hypertension."
                ),

                "references":
                [
                    "ACOG Practice Bulletin"
                ]

            }

        ]

    },
    # ==========================================================
    # 7. Diastolic Blood Pressure
    # ==========================================================

    "DiastolicBP": {

        "display_name": "Diastolic Blood Pressure",

        "unit": "mmHg",

        "normal_range": "<90 mmHg",

        "clinical_importance":
        (
            "Elevated diastolic blood pressure is a major diagnostic "
            "criterion for hypertensive disorders of pregnancy."
        ),

        "levels": [

            {

                "condition": lambda x: x >= 110,

                "finding": "Severe Diastolic Hypertension",

                "severity": "Severe",

                "severity_score": 5,

                "urgency": "Urgent",

                "risk_message":
                (
                    "Diastolic blood pressure ≥110 mmHg indicates "
                    "severe hypertension requiring urgent evaluation."
                ),

                "references":
                [
                    "ACOG Practice Bulletin"
                ]

            },

            {

                "condition": lambda x: x >= 90,

                "finding": "Elevated Diastolic Blood Pressure",

                "severity": "Moderate",

                "severity_score": 3,

                "urgency": "Needs Evaluation",

                "risk_message":
                (
                    "Elevated diastolic blood pressure suggests "
                    "possible gestational hypertension."
                ),

                "references":
                [
                    "ACOG Practice Bulletin"
                ]

            }

        ]

    },

    # ==========================================================
    # 8. Random Blood Sugar
    # ==========================================================

    "RBS": {

        "display_name": "Random Blood Sugar",

        "unit": "mg/dL",

        "normal_range": "<140 mg/dL",

        "clinical_importance":
        (
            "Elevated random blood sugar is an important indicator "
            "of hyperglycemia and gestational diabetes."
        ),

        "levels": [

            {

                "condition": lambda x: x >= 200,

                "finding": "Marked Hyperglycemia",

                "severity": "Severe",

                "severity_score": 5,

                "urgency": "Urgent",

                "risk_message":
                (
                    "Random blood sugar ≥200 mg/dL strongly suggests "
                    "significant hyperglycemia requiring immediate evaluation."
                ),

                "references":
                [
                    "ADA Standards of Care 2026",
                    "WHO Guideline"
                ]

            },

            {

                "condition": lambda x: x >= 140,

                "finding": "Elevated Random Blood Sugar",

                "severity": "Moderate",

                "severity_score": 3,

                "urgency": "Needs Evaluation",

                "risk_message":
                (
                    "Elevated random blood sugar increases the likelihood "
                    "of gestational diabetes."
                ),

                "references":
                [
                    "ADA Standards of Care 2026",
                    "WHO Guideline"
                ]

            }

        ]

    },

    # ==========================================================
    # 9. Body Temperature
    # ==========================================================

    "BodyTemp": {

        "display_name": "Body Temperature",

        "unit": "°F",

        "normal_range": "97–99°F",

        "clinical_importance":
        (
            "Maternal fever is an important clinical sign of infection "
            "and possible sepsis."
        ),

        "levels": [

            {

                "condition": lambda x: x >= 102.2,

                "finding": "High Fever",

                "severity": "Severe",

                "severity_score": 5,

                "urgency": "Urgent",

                "risk_message":
                (
                    "High-grade fever may indicate severe infection "
                    "requiring immediate assessment."
                ),

                "references":
                [
                    "WHO",
                    "MEOWS Guideline"
                ]

            },

            {

                "condition": lambda x: x >= 100.4,

                "finding": "Fever",

                "severity": "Moderate",

                "severity_score": 3,

                "urgency": "Needs Evaluation",

                "risk_message":
                (
                    "Maternal fever increases suspicion of infection "
                    "during pregnancy."
                ),

                "references":
                [
                    "WHO",
                    "MEOWS Guideline"
                ]

            }

        ]

    },

    # ==========================================================
    # 10. Heart Rate
    # ==========================================================

    "HeartRate": {

        "display_name": "Heart Rate",

        "unit": "beats/min",

        "normal_range": "60–100 bpm",

        "clinical_importance":
        (
            "Maternal tachycardia may indicate anemia, infection, "
            "or physiological deterioration."
        ),

        "levels": [

            {

                "condition": lambda x: x > 120,

                "finding": "Marked Tachycardia",

                "severity": "Severe",

                "severity_score": 5,

                "urgency": "Urgent",

                "risk_message":
                (
                    "Heart rate above 120 bpm represents significant "
                    "maternal tachycardia."
                ),

                "references":
                [
                    "MEOWS Guideline"
                ]

            },

            {

                "condition": lambda x: x > 100,

                "finding": "Tachycardia",

                "severity": "Moderate",

                "severity_score": 3,

                "urgency": "Needs Evaluation",

                "risk_message":
                (
                    "Maternal tachycardia may indicate anemia, infection "
                    "or cardiovascular stress."
                ),

                "references":
                [
                    "MEOWS Guideline"
                ]

            }

        ]

    },

    # ==========================================================
    # 11. Hemoglobin
    # ==========================================================

    "HB": {

        "display_name": "Hemoglobin",

        "unit": "g/dL",

        "normal_range": "≥11 g/dL",

        "clinical_importance":
        (
            "Hemoglobin is the primary biomarker for maternal anemia."
        ),

        "levels": [

            {

                "condition": lambda x: x < 7,

                "finding": "Severe Maternal Anemia",

                "severity": "Severe",

                "severity_score": 5,

                "urgency": "Urgent",

                "risk_message":
                (
                    "Severe maternal anemia carries significant maternal "
                    "and fetal risk."
                ),

                "references":
                [
                    "WHO",
                    "Cleveland Clinic"
                ]

            },

            {

                "condition": lambda x: x < 10,

                "finding": "Moderate Maternal Anemia",

                "severity": "Moderate",

                "severity_score": 3,

                "urgency": "Needs Evaluation",

                "risk_message":
                (
                    "Moderate maternal anemia requires clinical evaluation "
                    "and treatment."
                ),

                "references":
                [
                    "WHO",
                    "Cleveland Clinic"
                ]

            },

            {

                "condition": lambda x: x < 11,

                "finding": "Mild Maternal Anemia",

                "severity": "Mild",

                "severity_score": 1,

                "urgency": "Monitor",

                "risk_message":
                (
                    "Mild maternal anemia should be monitored and managed."
                ),

                "references":
                [
                    "WHO",
                    "Cleveland Clinic"
                ]

            }

        ]

    },

    # ==========================================================
    # 12. HbA1c
    # ==========================================================

    "HBA1C": {

        "display_name": "HbA1c",

        "unit": "%",

        "normal_range": "<5.7%",

        "clinical_importance":
        (
            "HbA1c reflects long-term glycemic control and supports "
            "assessment of gestational diabetes risk."
        ),

        "levels": [

            {

                "condition": lambda x: x >= 6.5,

                "finding": "Diabetic HbA1c",

                "severity": "Severe",

                "severity_score": 5,

                "urgency": "Needs Evaluation",

                "risk_message":
                (
                    "HbA1c ≥6.5% is consistent with diabetes."
                ),

                "references":
                [
                    "ADA Standards of Care 2026",
                    "WHO Guideline"
                ]

            },

            {

                "condition": lambda x: x >= 5.7,

                "finding": "Prediabetic HbA1c",

                "severity": "Moderate",

                "severity_score": 3,

                "urgency": "Monitor",

                "risk_message":
                (
                    "Elevated HbA1c indicates impaired glucose regulation."
                ),

                "references":
                [
                    "ADA Standards of Care 2026",
                    "WHO Guideline"
                ]

            }

        ]

    },

    # ==========================================================
    # 13. Respiratory Rate
    # ==========================================================

    "RR": {

        "display_name": "Respiratory Rate",

        "unit": "breaths/min",

        "normal_range": "12–20 breaths/min",

        "clinical_importance":
        (
            "Respiratory rate is part of maternal early warning "
            "systems and may indicate infection or physiological compromise."
        ),

        "levels": [

            {

                "condition": lambda x: x > 30 or x < 10,

                "finding": "Critical Respiratory Rate",

                "severity": "Severe",

                "severity_score": 5,

                "urgency": "Urgent",

                "risk_message":
                (
                    "Respiratory rate is critically abnormal."
                ),

                "references":
                [
                    "MEOWS Guideline"
                ]

            },

            {

                "condition": lambda x: x > 20,

                "finding": "Elevated Respiratory Rate",

                "severity": "Moderate",

                "severity_score": 3,

                "urgency": "Needs Evaluation",

                "risk_message":
                (
                    "An elevated respiratory rate may indicate infection, "
                    "anemia or physiological stress."
                ),

                "references":
                [
                    "MEOWS Guideline"
                ]

            }

        ]

    }

}


# ==========================================================
# Generic Clinical Evaluation Engine
# ==========================================================
#
# Purpose
# -------
# Evaluate any clinical feature using the
# evidence-based CLINICAL_RULES database.
#
# Input
# -----
# feature : Feature name (e.g., "HB")
# value   : Patient value
#
# Output
# ------
# Dictionary containing:
#   • Clinical finding
#   • Severity
#   • Severity Score
#   • Urgency
#   • Normal range
#   • Risk message
#   • References
#
# ==========================================================

def evaluate_feature(feature, value):

    # ------------------------------------------------------
    # Check if feature exists
    # ------------------------------------------------------

    if feature not in CLINICAL_RULES:

        raise ValueError(
            f"No clinical rules defined for feature '{feature}'."
        )

    rules = CLINICAL_RULES[feature]

    # ------------------------------------------------------
    # Default Result (Normal)
    # ------------------------------------------------------

    result = {

        "feature": feature,

        "display_name": rules["display_name"],

        "value": value,

        "unit": rules["unit"],

        "normal_range": rules["normal_range"],

        "clinical_importance": rules["clinical_importance"],

        "abnormal": False,

        "finding": "Normal",

        "severity": "None",

        "severity_score": 0,

        "urgency": "Routine",

        "risk_message": "Within normal clinical range.",

        "references": []

    }

    # ------------------------------------------------------
    # Sort levels by severity (highest first)
    # ------------------------------------------------------

    rules["levels"].sort(
        key=lambda x: x["severity_score"],
        reverse=True
    )

    # ------------------------------------------------------
    # Evaluate Rules
    # ------------------------------------------------------

    for level in rules["levels"]:

        if level["condition"](value):

            result.update({

                "abnormal": True,

                "finding": level["finding"],

                "severity": level["severity"],

                "severity_score": level["severity_score"],

                "urgency": level["urgency"],

                "risk_message": level["risk_message"],

                "references": level["references"]

            })

            break

    return result
