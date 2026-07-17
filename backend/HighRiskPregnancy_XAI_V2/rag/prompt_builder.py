# ==========================================================
# Build Professional Prompt
# ==========================================================
#
# Purpose
# -------
# Create a detailed prompt that instructs the
# LLM to generate a medically accurate,
# evidence-based explanation in JSON format.
#
# ==========================================================

def build_prompt(
    risk_category,
    patient_summary,
    context,
    prediction_label
):

    prompt = f"""
You are an AI Medical Education Assistant.

Your role is to generate a patient-specific clinical explanation.

Use BOTH:

1. Patient-specific XAI information
2. Retrieved medical evidence

IMPORTANT:

• First explain WHY this particular patient was classified as {prediction_label} using the patient-specific XAI information.

• Then explain the predicted pregnancy complication using ONLY the retrieved medical evidence.

• Do NOT invent relationships that are not supported by the retrieved evidence.

• Clearly distinguish between:
    - Model explanation (XAI)
    - Medical explanation (retrieved evidence)

==========================
RULES
==========================

1. Use ONLY the retrieved evidence.

2. Never invent medical information.

3. Do not diagnose the patient.

4. Do not recommend medications.

5. If information is unavailable,
write:
"Information not available in retrieved evidence."

6. Return ONLY valid JSON.

7. Do NOT use markdown.

8. Keep the explanation simple and patient-friendly.

==========================
Predicted Risk
==========================

{risk_category}

==========================
Patient XAI Summary
==========================

{patient_summary}

==========================
Retrieved Medical Evidence
==========================

{context}

==========================
Return JSON ONLY
==========================

{{
    "patient_summary": "",
    "condition_name": "",
    "overview": "",
    "why_this_patient_is_at_risk": "",
    "warning_signs": [],
    "risk_factors": [],
    "possible_complications": [],
    "preventive_measures": [],
    "when_to_seek_medical_help": "",
    "sources": []
}}

"""

    return prompt