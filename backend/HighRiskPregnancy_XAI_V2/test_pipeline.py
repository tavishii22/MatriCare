"""
test_pipeline.py — Quick test for all changes made to the pipeline.

Usage:
    python test_pipeline.py          # Run all tests
    python test_pipeline.py quick    # Run only the fast syntax/import checks
    python test_pipeline.py full     # Run everything (including end-to-end)
"""

import sys
import os
import json
import time
import traceback

PROJECT_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, PROJECT_DIR)

PASS = 0
FAIL = 0


def test(name, func):
    global PASS, FAIL
    try:
        func()
        PASS += 1
        print(f"  [PASS] {name}")
    except Exception as e:
        FAIL += 1
        print(f"  [FAIL] {name}: {e}")


# ==========================================================
# Tests
# ==========================================================

def test_import_feature_defs():
    from xai.feature_defs import FEATURE_DISPLAY_NAMES, FEATURE_UNITS, get_importance_level
    assert FEATURE_DISPLAY_NAMES["D"] == "Previous Child Deaths", "D name mismatch"
    assert FEATURE_UNITS["HB"] == "g/dL"
    assert get_importance_level(0.12) == "Very High"
    assert get_importance_level(0.06) == "High"
    assert get_importance_level(0.03) == "Moderate"
    assert get_importance_level(0.01) == "Low"


def test_no_duplicate_output_builder_defs():
    from xai.output_builder import build_xai_output
    import inspect
    source = inspect.getsource(sys.modules["xai.output_builder"])
    assert source.count("FEATURE_DISPLAY_NAMES") == 2  # import + usage
    assert source.count("FEATURE_UNITS") == 2  # import + usage


def test_summary_builder_no_local_defs():
    from rag.summary_builder import build_patient_summary_for_rag
    import inspect
    source = inspect.getsource(sys.modules["rag.summary_builder"])
    assert "Previous Caesarean" not in source
    assert "get_importance_level" not in source


def test_pipeline_no_duplicate_key():
    import inspect
    from pipeline import run_complete_pipeline
    source = inspect.getsource(sys.modules["pipeline"])
    # Count occurrences of '"confidence"' in the return dict
    # Should appear only once (not twice)
    lines = source.split("\n")
    confidence_count = 0
    in_return = False
    for line in lines:
        if "return {" in line:
            in_return = True
        if in_return:
            if '"confidence"' in line or "'confidence'" in line:
                confidence_count += 1
    assert confidence_count == 1, f"Expected 1 'confidence' key, found {confidence_count}"


def test_pipeline_no_duplicate_import_time():
    import inspect
    from pipeline import run_complete_pipeline
    source = inspect.getsource(sys.modules["pipeline"])
    lines = [l.strip() for l in source.split("\n") if l.strip()]
    time_imports = [l for l in lines if l.startswith("import time") or "import time" in l]
    assert len(time_imports) == 1, f"Expected 1 'import time', found {len(time_imports)}"


def test_lazy_loading_no_print_at_import():
    # Reset the module cache for import test
    for mod in list(sys.modules.keys()):
        if "pipeline" in mod or "llm" in mod or "vector_store" in mod:
            del sys.modules[mod]

    import subprocess
    result = subprocess.run(
        [sys.executable, "-c", "import pipeline; print('DONE')"],
        capture_output=True, text=True, timeout=30,
        cwd=PROJECT_DIR
    )
    assert "Loading Embedding Model" not in result.stdout
    assert "Loading LLM" not in result.stdout
    assert "DONE" in result.stdout


def test_rag_pipeline_no_duplicate_import():
    import inspect
    import rag.rag_pipeline
    source = inspect.getsource(sys.modules["rag.rag_pipeline"])
    count = source.count("from rag.retriever")
    assert count == 1, (
        f"Expected 1 'from rag.retriever' import, found {count}"
    )


def test_retriever_uses_config():
    import inspect
    import rag.retriever
    source = inspect.getsource(sys.modules["rag.retriever"])
    assert "TOP_K_DOCUMENTS" in source
    assert '"k": 5' not in source


def test_no_unused_imports():
    for mod_name in [
        "xai.predictor", "xai.shap_engine",
        "xai.clinical_rules", "xai.risk_mapper",
        "llm.llm_engine"
    ]:
        import inspect
        __import__(mod_name)
        mod = sys.modules[mod_name]
        source = inspect.getsource(mod)
        # Check no 'numpy' is imported at module level
        if mod_name in ("xai.predictor", "xai.shap_engine", "xai.risk_mapper", "xai.clinical_rules"):
            lines = [l.strip() for l in source.split("\n") if l.strip()]
            numpy_lines = [l for l in lines if "import numpy" in l]
            assert len(numpy_lines) == 0, f"{mod_name} has {len(numpy_lines)} numpy import(s)"
        if mod_name in ("xai.clinical_rules",):
            lines = [l.strip() for l in source.split("\n") if l.strip()]
            pandas_lines = [l for l in lines if "import pandas" in l]
            assert len(pandas_lines) == 0, f"{mod_name} has {len(pandas_lines)} pandas import(s)"
        if mod_name in ("llm.llm_engine",):
            assert "import os" not in source


def test_vector_store_no_duplicate_faiss():
    import inspect
    import rag.vector_store
    source = inspect.getsource(sys.modules["rag.vector_store"])
    count = source.count("from langchain_community.vectorstores import FAISS")
    assert count == 1, f"Expected 1 FAISS import, found {count}"


def test_knowledge_loader_no_duplicate_re():
    import inspect
    import rag.knowledge_loader
    source = inspect.getsource(sys.modules["rag.knowledge_loader"])
    count = source.count("import re")
    assert count == 1, f"Expected 1 'import re', found {count}"


def test_pipeline_error_handling_bad_path():
    from pipeline import run_complete_pipeline
    patient = {"Age": 30, "G": 1, "P": 0, "L": 0, "A": 0, "D": 0,
               "SystolicBP": 120, "DiastolicBP": 80, "RBS": 120,
               "BodyTemp": 98.6, "HeartRate": 80, "HB": 12,
               "HBA1C": 5.0, "RR": 16}
    result = run_complete_pipeline(patient, r"C:\nonexistent_path_xyz")
    assert result["prediction"] == "Error", "Should return Error on bad path"


def test_evaluate_feature_boundaries():
    from xai.clinical_rules import evaluate_feature

    result_159 = evaluate_feature("SystolicBP", 159)
    assert result_159["severity_score"] == 3
    assert result_159["finding"] == "Elevated Systolic Blood Pressure"

    result_160 = evaluate_feature("SystolicBP", 160)
    assert result_160["severity_score"] == 5
    assert result_160["finding"] == "Severe Systolic Hypertension"

    result_139 = evaluate_feature("SystolicBP", 139)
    assert result_139["severity_score"] == 0
    assert result_139["finding"] == "Normal"


def test_all_normal_patient():
    from pipeline import run_complete_pipeline
    patient = {"Age": 25, "G": 1, "P": 0, "L": 0, "A": 0, "D": 0,
               "SystolicBP": 110, "DiastolicBP": 70, "RBS": 100,
               "BodyTemp": 98.6, "HeartRate": 75, "HB": 12,
               "HBA1C": 5.0, "RR": 16}
    result = run_complete_pipeline(patient, PROJECT_DIR)
    assert result["prediction"] in ("High Risk", "Low Risk")
    assert result["xai_output"] is not None
    assert "primary_risk" in result["xai_output"]
    assert result["xai_output"]["primary_risk"]["name"] in (
        "No significant risk factors identified",
        "Preterm Birth", "Gestational Diabetes Mellitus (GDM)",
        "Fetal Growth Restriction (FGR)", "Maternal Anemia",
        "Maternal Infection", "Hypertensive Disorders of Pregnancy"
    )
    assert result["execution_time"] > 0


def test_full_pipeline():
    from pipeline import run_complete_pipeline
    patient = {
        "Age": 36, "G": 3, "P": 2, "L": 2, "A": 1, "D": 0,
        "SystolicBP": 150, "DiastolicBP": 100, "RBS": 180,
        "BodyTemp": 98.6, "HeartRate": 110, "HB": 7.5,
        "HBA1C": 6.2, "RR": 26
    }
    result = run_complete_pipeline(patient, PROJECT_DIR)
    assert result["prediction"] in ("High Risk", "Low Risk"), "Missing prediction"
    assert isinstance(result["confidence"], float)
    assert not result["risk_table"].empty
    assert not result["top_risks"].empty
    assert result["xai_output"] is not None
    if result["prediction"] == "High Risk":
        assert len(result["reports"]) > 0, "High Risk should have reports"
    assert result["execution_time"] > 0
    print(f"  Pipeline completed in {result['execution_time']:.3f}s")
    print(f"  Prediction: {result['prediction']} ({result['confidence']:.1f}%)")
    print(f"  Top-3 risks: {list(result['top_risks']['Risk Category'])}")


# ==========================================================
# Run
# ==========================================================

if __name__ == "__main__":
    mode = sys.argv[1] if len(sys.argv) > 1 else "full"

    print("=" * 60)
    print("PIPELINE TEST SUITE")
    print("=" * 60)

    # These tests need .env + API key, skip if not available
    try:
        from config import GROQ_API_KEY
        HAS_API_KEY = bool(GROQ_API_KEY) and GROQ_API_KEY != "your_groq_api_key_here"
    except Exception:
        HAS_API_KEY = False

    print(f"GROQ API Key: {'[SET]' if HAS_API_KEY else '[NOT SET] -- skipping LLM tests'}")
    print()

    # Group 1: Syntax and imports (fast, always run)
    print("--- Group 1: Syntax & Imports ---")
    test("feature_defs content correct", test_import_feature_defs)
    test("output_builder has no duplicate defs", test_no_duplicate_output_builder_defs)
    test("summary_builder no stale D name or dead code", test_summary_builder_no_local_defs)
    test("pipeline no duplicate confidence key", test_pipeline_no_duplicate_key)
    test("pipeline no duplicate import time", test_pipeline_no_duplicate_import_time)
    test("lazy loading (no model init at import)", test_lazy_loading_no_print_at_import)
    test("rag_pipeline no duplicate import", test_rag_pipeline_no_duplicate_import)
    test("retriever uses config not hardcoded k=5", test_retriever_uses_config)
    test("no unused numpy/pandas/os imports", test_no_unused_imports)
    test("vector_store no duplicate FAISS import", test_vector_store_no_duplicate_faiss)
    test("knowledge_loader no duplicate import re", test_knowledge_loader_no_duplicate_re)
    test("evaluate_feature boundary values (159 vs 160)", test_evaluate_feature_boundaries)

    # Group 2: Error handling (always run — no API key needed)
    print()
    print("--- Group 2: Error Handling ---")
    test("bad project_dir returns Error gracefully", test_pipeline_error_handling_bad_path)
    test("all-normal patient does not crash", test_all_normal_patient)

    # Group 3: End-to-end (only if API key is available)
    print()
    if HAS_API_KEY:
        print("--- Group 3: End-to-End (requires API key) ---")
        test("full pipeline with sample patient", test_full_pipeline)
    else:
        print("--- Group 3: End-to-End ---")
        print("  [SKIP] Set GROQ_API_KEY in .env to run end-to-end test")

    print()
    print("=" * 60)
    print(f"RESULTS: {PASS} passed, {FAIL} failed")
    print("=" * 60)

    sys.exit(0 if FAIL == 0 else 1)
