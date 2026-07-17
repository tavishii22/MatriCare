from xai.feature_defs import FEATURE_DISPLAY_NAMES


def build_patient_summary_for_rag(
    prediction_label,
    risk_name,
    risk_info
):

    summary = []

    summary.append("=" * 60)
    summary.append("PATIENT CLINICAL SUMMARY")
    summary.append("=" * 60)
    summary.append("")

    summary.append(f"Prediction : {prediction_label}")
    summary.append(f"Current Pregnancy Risk : {risk_name}")
    summary.append(
        f"Clinical Evidence Score : {risk_info['Risk Score']}"
    )

    summary.append("")

    summary.append("Matched Clinical Features")

    if len(risk_info["Matched Features"]) == 0:

        summary.append("None")

    else:

        for feature in risk_info["Matched Features"]:

            summary.append(f"- {feature}")

    summary.append("")

    summary.append("=" * 60)
    summary.append("DETAILED CLINICAL FINDINGS")
    summary.append("=" * 60)
    summary.append("")

    for item in risk_info["Feature Contributions"]:

        summary.append(
            f"{item['display_name']}"
        )

        summary.append(
            f"Patient Value : {item['patient_value']}"
        )

        summary.append(
            f"Finding : {item['finding']}"
        )

        summary.append(
            f"Severity : {item['severity']}"
        )

        summary.append(
            f"Clinical Weight : {item['clinical_weight']}"
        )

        summary.append(
            f"Evidence Contribution : {item['feature_score']}"
        )

        summary.append("")

    return "\n".join(summary)