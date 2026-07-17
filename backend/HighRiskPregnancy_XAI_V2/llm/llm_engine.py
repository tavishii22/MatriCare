from langchain_groq import ChatGroq

from config import (
    LLM_MODEL_NAME,
    LLM_TEMPERATURE,
    GROQ_API_KEY
)


# ==========================================================
# Load Groq LLM
# ==========================================================

def load_llm():

    llm = ChatGroq(

        model=LLM_MODEL_NAME,

        temperature=LLM_TEMPERATURE,

        api_key=GROQ_API_KEY

    )

    return llm


# ==========================================================
# Generate Clinical Report
# ==========================================================

def generate_clinical_report(llm, prompt):

    response = llm.invoke(prompt)

    return response.content