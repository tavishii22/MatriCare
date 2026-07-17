import os

from config import TOP_K_DOCUMENTS

def create_retriever(vector_db):

    retriever = vector_db.as_retriever(

        search_type="similarity",

        search_kwargs={
            "k": TOP_K_DOCUMENTS
        }

    )

    print("[OK] Retriever created successfully!")

    return retriever



# ==========================================================
# Build Retrieval Context
# ==========================================================
#
# Purpose
# -------
# Combine retrieved document chunks into a
# single structured context that can be passed
# to the Large Language Model (LLM).
#
# Each retrieved chunk includes:
# 1. Source document
# 2. Page number
# 3. Risk category
# 4. Retrieved medical content
#
# Input
# -----
# retrieved_documents : List of retrieved
#                       LangChain documents.
#
# Output
# ------
# context : Structured text containing all
#           retrieved evidence.
#
# ==========================================================

def build_context(retrieved_documents):

    context = ""

    for i, document in enumerate(retrieved_documents, start=1):

        source = os.path.basename(document.metadata.get("source", "Unknown"))

        page = document.metadata.get("page", "Unknown")

        risk = document.metadata.get("risk_category", "Unknown")

        context += f"""
==================================================
Evidence {i}

Risk Category : {risk}

Source : {source}

Page : {page}

Content:
{document.page_content}

==================================================

"""

    print("[OK] Context created successfully!")

    return context