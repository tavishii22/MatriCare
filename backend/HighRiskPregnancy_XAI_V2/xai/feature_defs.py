FEATURE_DISPLAY_NAMES = {
    "HB": "Hemoglobin",
    "RBS": "Random Blood Sugar",
    "HBA1C": "HbA1c",
    "Age": "Maternal Age",
    "SystolicBP": "Systolic Blood Pressure",
    "DiastolicBP": "Diastolic Blood Pressure",
    "HeartRate": "Heart Rate",
    "RR": "Respiratory Rate",
    "BodyTemp": "Body Temperature",
    "G": "Gravida",
    "P": "Para",
    "A": "Abortions",
    "L": "Living Children",
    "D": "Previous Child Deaths"
}

FEATURE_UNITS = {
    "HB": "g/dL",
    "RBS": "mg/dL",
    "HBA1C": "%",
    "Age": "years",
    "SystolicBP": "mmHg",
    "DiastolicBP": "mmHg",
    "HeartRate": "bpm",
    "RR": "breaths/min",
    "BodyTemp": "°F",
    "G": "",
    "P": "",
    "A": "",
    "L": "",
    "D": ""
}


def get_importance_level(shap_value):
    shap_value = abs(shap_value)
    if shap_value >= 0.10:
        return "Very High"
    elif shap_value >= 0.05:
        return "High"
    elif shap_value >= 0.02:
        return "Moderate"
    else:
        return "Low"