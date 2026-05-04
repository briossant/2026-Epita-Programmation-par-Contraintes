import streamlit as st
import json
import pandas as pd
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from cp_llm.llm_client import MistralClient
from cp_llm.runner import run_pipeline

st.set_page_config(page_title="CP-LLM Demo", layout="wide")

st.title("🧩 Modélisation CP Assistée par LLM")

tab1, tab2 = st.tabs(["🚀 Live Run & Repair", "📊 Benchmark Dashboard"])

with tab1:
    st.header("Live Pipeline Execution")
    problems_dir = ROOT / "benchmark" / "problems"
    problems = (
        [p.stem for p in problems_dir.glob("*.txt")] if problems_dir.exists() else []
    )

    if not problems:
        st.warning("Aucun problème trouvé dans benchmark/problems/")
    else:
        selected_problem = st.selectbox("Sélectionnez un problème :", sorted(problems))

        if st.button("Lancer le pipeline"):
            try:
                from dotenv import load_dotenv

                load_dotenv(ROOT / ".env")
            except ImportError:
                pass

            client = MistralClient()
            problem_path = problems_dir / f"{selected_problem}.txt"
            st.info(f"Enoncé : {problem_path.read_text()}")

            with st.spinner("Exécution de l'analyse..."):
                result = run_pipeline(client, problem_path)

            if result.error_stage:
                st.error(f"Échec à l'étape : {result.error_stage}")
                st.code(result.error_message, language="text")
            else:
                st.success("Génération et vérification réussies !")

            st.subheader("Code Généré")
            st.code(result.generated_code, language="python")

with tab2:
    st.header("Benchmark Comparison")
    report_path = ROOT / "benchmark_report.json"
    if report_path.exists():
        data = json.loads(report_path.read_text())
        df = pd.DataFrame(data)

        cols_to_show = ["problem", "ok", "error_stage", "n_variables_generated"]
        if "generation_time_s" in df.columns:
            cols_to_show.append("generation_time_s")

        st.dataframe(df[cols_to_show])

        if "generation_time_s" in df.columns:
            st.bar_chart(df.set_index("problem")["generation_time_s"])
        else:
            st.info(
                "Lancez `python scripts/run_benchmark.py` pour générer les temps d'exécution."
            )
    else:
        st.warning("Veuillez lancer `run_benchmark.py` pour générer le rapport JSON.")
