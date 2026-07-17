import os
import json
from concurrent.futures import ThreadPoolExecutor, as_completed

from rag.retriever import (
    create_retriever,
    build_context
)

from rag.prompt_builder import build_prompt

from rag.summary_builder import build_patient_summary_for_rag

from rag.vector_store import (
    load_embedding_model,
    load_vector_database
)

from llm.llm_engine import generate_clinical_report


def generate_medical_information(
    retriever,
    patient_summary,
    question,
    prediction_label
):

    retrieved_documents = retriever.invoke(question)

    context = build_context(retrieved_documents)

    risk_category = question.replace("Explain ", "").replace(".", "")

    prompt = build_prompt(
        risk_category,
        patient_summary,
        context,
        prediction_label
    )

    return prompt


def _generate_report_for_one_risk(
    risk,
    risk_scores,
    prediction_label,
    shap_df,
    knowledge_base,
    llm,
    embedding_model,
    project_dir
):
    patient_summary = build_patient_summary_for_rag(
        prediction_label=prediction_label,
        risk_name=risk,
        risk_info=risk_scores[risk]
    )

    print("\n")
    print("=" * 80)
    print("PATIENT SUMMARY SENT TO RAG")
    print("=" * 80)
    print(patient_summary)
    print("=" * 80)
    print("\n")

    print("=" * 60)
    print(f"Generating report for: {risk}")

    vector_db_path = os.path.join(
        project_dir,
        "vector_database",
        risk
    )

    if not os.path.isdir(vector_db_path):
        print(f"WARNING: Vector DB not found for '{risk}' at {vector_db_path}")
        return {
            "risk": risk,
            "report": {
                "patient_summary": "",
                "condition_name": risk,
                "overview": "",
                "why_this_patient_is_at_risk": "",
                "warning_signs": "Information not available in the retrieved medical evidence.",
                "risk_factors": "Information not available in the retrieved medical evidence.",
                "possible_complications": "Information not available in the retrieved medical evidence.",
                "preventive_measures": "Information not available in the retrieved medical evidence.",
                "when_to_seek_medical_help": "",
                "sources": []
            }
        }

    vector_db = load_vector_database(
        vector_db_path,
        embedding_model
    )

    retriever = create_retriever(vector_db)

    question = f"Explain {risk}."

    prompt = generate_medical_information(
        retriever,
        patient_summary,
        question,
        prediction_label
    )

    report = generate_clinical_report(
        llm,
        prompt
    )

    print("=" * 80)
    print(report)
    print("=" * 80)

    report = report.strip()

    if report.startswith("```"):
        report = report.replace("```json", "")
        report = report.replace("```", "")
        report = report.strip()

    try:
        report = json.loads(report)
    except json.JSONDecodeError as e:
        print(f"WARNING: LLM returned malformed JSON for '{risk}': {e}")
        report = {
            "patient_summary": "",
            "condition_name": risk,
            "overview": "",
            "why_this_patient_is_at_risk": "",
            "warning_signs": "Information not available in the retrieved medical evidence.",
            "risk_factors": "Information not available in the retrieved medical evidence.",
            "possible_complications": "Information not available in the retrieved medical evidence.",
            "preventive_measures": "Information not available in the retrieved medical evidence.",
            "when_to_seek_medical_help": "",
            "sources": []
        }

    fields = [
        "warning_signs",
        "risk_factors",
        "possible_complications",
        "preventive_measures",
        "when_to_seek_medical_help"
    ]

    for field in fields:

        if field in report and report[field] == []:

            report[field] = (
                "Information not available in the retrieved medical evidence."
            )

    return {
        "risk": risk,

        "report": report

    }


def generate_reports_for_top_risks(
    top_risks,
    risk_scores,
    prediction_label,
    shap_df,
    knowledge_base,
    llm,
    embedding_model,
    project_dir
):

    if top_risks.empty:
        return []

    risk_order = []
    risk_tasks = []
    for _, row in top_risks.iterrows():
        risk_name = row["Risk Category"]
        risk_order.append(risk_name)
        risk_tasks.append((
            risk_name,
            risk_scores,
            prediction_label,
            shap_df,
            knowledge_base,
            llm,
            embedding_model,
            project_dir
        ))

    results = {}
    with ThreadPoolExecutor(max_workers=3) as executor:
        futures = {
            executor.submit(
                _generate_report_for_one_risk, *task
            ): task[0]
            for task in risk_tasks
        }
        for future in as_completed(futures):
            result = future.result()
            results[result["risk"]] = result

    reports = [results[name] for name in risk_order if name in results]

    return reports