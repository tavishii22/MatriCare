# ==========================================================
# Imports
# ==========================================================

import os
import re

from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter


# ==========================================================
# Project Paths
# ==========================================================

from config import PROJECT_DIR

MEDICAL_DOCUMENTS_DIR = PROJECT_DIR / "MedicalDocuments"

# ==========================================================
# Load Medical Documents
# ==========================================================
#
# Purpose
# -------
# Load all medical PDF documents belonging to a
# selected pregnancy risk category.
#
# The function automatically locates the
# MedicalDocuments folder inside the project.
#
# Input
# -----
# risk_category : Name of the pregnancy risk folder.
#
# Output
# ------
# documents : List of LangChain Document objects.
#
# ==========================================================

def load_medical_documents(risk_category):

    # Create the path to the selected risk folder
    folder_path = MEDICAL_DOCUMENTS_DIR / risk_category

    documents = []

    # Load every PDF inside the folder
    for file_name in os.listdir(folder_path):

        if file_name.lower().endswith(".pdf"):

            pdf_path = folder_path / file_name

            print(f"Loading: {file_name}")

            loader = PyPDFLoader(str(pdf_path))

            documents.extend(loader.load())

    print("\n====================================")
    print(f"Total Documents Loaded : {len(documents)}")
    print("====================================")

    return documents


# ==========================================================
# Clean Medical Documents
# ==========================================================
#
# Purpose
# -------
# Remove unnecessary text extracted from PDFs
# before chunking.
#
# Cleaning includes:
#
# 1. URLs
# 2. Date/time stamps
# 3. Page numbers
# 4. Extra blank lines
# 5. Multiple spaces
#
# ==========================================================

def clean_documents(documents):

    cleaned_documents = []

    for document in documents:

        text = document.page_content

        # Remove URLs
        text = re.sub(r'https?://\S+', '', text)

        # Remove WHO website navigation
        text = re.sub(r'\bDonate\b', '', text)
        text = re.sub(r'©', '', text)

        # Remove language options
        text = re.sub(
        r'العربية|中文|Français|Русский|Español',
        '',
        text,
        flags=re.IGNORECASE
        )

        # Remove ACOG navigation labels
        text = re.sub(r'\bFrequently Asked Questions\b', '', text)
        text = re.sub(r'\bFAQs\b', '', text)

        # Remove date/time patterns
        text = re.sub(
            r'\d{1,2}/\d{1,2}/\d{2,4},\s*\d{1,2}:\d{2}\s*(AM|PM)',
            '',
            text,
            flags=re.IGNORECASE
        )

        # Remove page numbers like 4/5
        text = re.sub(r'\b\d+\s*/\s*\d+\b', '', text)

        # Remove multiple blank lines
        text = re.sub(r'\n\s*\n+', '\n\n', text)

        # Remove multiple spaces
        text = re.sub(r'[ \t]+', ' ', text)

        text = text.strip()

        document.page_content = text

        cleaned_documents.append(document)

    print("[OK] Documents cleaned successfully!")

    return cleaned_documents


# ==========================================================
# Split Documents into Chunks
# ==========================================================
#
# Purpose
# -------
# Split the loaded medical documents into smaller,
# overlapping text chunks suitable for semantic
# search and embedding generation.
#
# Each chunk retains metadata including:
# 1. Source document
# 2. Page number
# 3. Risk category
#
# Input
# -----
# documents : List of LangChain Document objects.
#
# risk_category : Pregnancy risk category.
#
# Output
# ------
# chunks : List of chunked LangChain Documents.
#
# ==========================================================

def split_documents(documents, risk_category):

    text_splitter = RecursiveCharacterTextSplitter(

        chunk_size=1000,
        chunk_overlap=200,
        separators=["\n\n", "\n", ". ", " ", ""]

    )

    # Split documents
    chunks = text_splitter.split_documents(documents)

    # Add useful metadata to every chunk
    for chunk in chunks:

        chunk.metadata["risk_category"] = risk_category

    print("\n====================================")
    print(f"Total Chunks Created : {len(chunks)}")
    print("====================================")

    return chunks