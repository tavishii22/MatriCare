# FAISS vector database
from langchain_community.vectorstores import FAISS

# HuggingFace embedding model
from langchain_huggingface import HuggingFaceEmbeddings

from config import (
    EMBEDDING_MODEL_NAME,
    EMBEDDING_DEVICE,
    NORMALIZE_EMBEDDINGS,
    PROJECT_DIR
)

# ==========================================================
# Generate Embeddings
# ==========================================================
#
# Purpose
# -------
# Load the embedding model used to convert
# medical text chunks into numerical vectors.
#
# These vectors capture the semantic meaning
# of the text and are later stored inside a
# FAISS vector database.
#
# Output
# ------
# embedding_model : HuggingFace embedding model.
#
# ==========================================================

def load_embedding_model():

    embedding_model = HuggingFaceEmbeddings(

        model_name=EMBEDDING_MODEL_NAME,

        model_kwargs={
            "device": EMBEDDING_DEVICE
        },

        encode_kwargs={
            "normalize_embeddings": NORMALIZE_EMBEDDINGS
        }

    )

    print("[OK] Embedding model loaded successfully!")

    return embedding_model


# ==========================================================
# Create Vector Database
# ==========================================================
#
# Purpose
# -------
# Convert document chunks into vector embeddings
# and store them in a FAISS vector database for
# efficient semantic retrieval.
#
# Input
# -----
# chunks : List of document chunks.
#
# embedding_model : HuggingFace embedding model.
#
# Output
# ------
# vector_db : FAISS vector database.
#
# ==========================================================

def create_vector_database(chunks, embedding_model):

    vector_db = FAISS.from_documents(

        documents=chunks,
        embedding=embedding_model

    )

    print("[OK] Vector database created successfully!")

    return vector_db


# ==========================================================
# Load Vector Database
# ==========================================================
#
# NOTE on allow_dangerous_deserialization=True:
# FAISS indices are generated locally by this project's
# knowledge_loader.py — never from untrusted user input.
# The vector_database/ directory is self-contained and
# version-controlled alongside the code.
#
# ==========================================================

def load_vector_database(vector_db_path, embedding_model):

    vector_db = FAISS.load_local(
        folder_path=str(vector_db_path),
        embeddings=embedding_model,
        allow_dangerous_deserialization=True
    )

    return vector_db



# ==========================================================
# Save Vector Database
# ==========================================================
#
# Purpose
# -------
# Save the FAISS vector database for a specific
# pregnancy risk category.
#
# ==========================================================

# ==========================================================
# Save Vector Database
# ==========================================================
#
# Purpose
# -------
# Save the FAISS vector database for a specific
# pregnancy risk category.
#
# ==========================================================

def save_vector_database(vector_db, risk_category):

    save_path = PROJECT_DIR / "vector_database" / risk_category

    save_path.mkdir(parents=True, exist_ok=True)

    vector_db.save_local(str(save_path))

    print(f"✅ Vector database saved to:\n{save_path}")