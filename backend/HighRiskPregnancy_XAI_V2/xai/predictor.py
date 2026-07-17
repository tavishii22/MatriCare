import joblib                 # Load trained Random Forest model  

# ==========================================================
# Load Trained Random Forest Model
# ==========================================================
#
# Purpose:
# --------
# Loads the pretrained Random Forest model from disk.
#
# Input:
# ------
# model_path : str
#
# Output:
# -------
# model : Trained Random Forest Classifier
#
# ==========================================================

def load_prediction_model(model_path):

    model = joblib.load(model_path)

    return model




# ==========================================================
# Prediction Engine
# ==========================================================
#
# Purpose
# -------
# Predict whether a pregnancy is High Risk or Low Risk
# using the pretrained Random Forest model.
#
# Inputs
# ------
# model   : Trained Random Forest model
# patient : DataFrame containing one patient's clinical data
#
# Outputs
# -------
# prediction  : 0 (Low Risk) or 1 (High Risk)
# probability : Prediction probabilities for both classes
#
# ==========================================================

def predict_risk(model, patient):

    # Reorder columns to match exactly what the model was trained on
    if hasattr(model, 'feature_names_in_'):
        patient = patient.reindex(columns=model.feature_names_in_.tolist())

    # Predict class
    prediction = model.predict(patient)

    # Predict probability
    probability = model.predict_proba(patient)

    return prediction, probability


# ==========================================================
# Format Prediction Output
# ==========================================================
#
# Purpose
# -------
# Convert the raw Random Forest prediction into a
# user-friendly prediction label and confidence score.
#
# Inputs
# ------
# prediction  : Output of model.predict()
# probability : Output of model.predict_proba()
#
# Outputs
# -------
# prediction_label : "High Risk" or "Low Risk"
# confidence       : Prediction confidence (%)
#
# ==========================================================

def format_prediction(prediction, probability):

    predicted_class = int(prediction[0])

    confidence = float(probability[0][predicted_class]) * 100

    prediction_label = (
        "High Risk"
        if predicted_class == 1
        else "Low Risk"
    )

    return prediction_label, confidence