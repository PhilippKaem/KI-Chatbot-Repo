import os
import shutil
from dotenv import load_dotenv
from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_chroma import Chroma
from uuid import uuid4
from models import Models

load_dotenv()

# Modelle initialisieren
models = Models()
embeddings = models.embeddings_ollama
llm = models.model_ollama

# Konstanten
data_folder = "./data"
chunk_size = 500
chunk_overlap = 100
db_directory = "./db/chroma_langchain_db"

# Funktion zum Löschen der Datenbank
def delete_db(directory):
    if os.path.exists(directory):
        shutil.rmtree(directory)
        print(f"Deleted existing database directory: {directory}")

# Chroma vector store
def initialize_vector_store():
    print("Initializing Chroma vector store...")
    vector_store = Chroma(
        collection_name="documents",
        embedding_function=embeddings,
        persist_directory=db_directory,
    )
    print("Chroma vector store initialized.")
    return vector_store

# Aufnahme von Dokumenten
def ingest_file(file_path, vector_store):
    if not file_path.lower().endswith('.pdf'):
        print(f"Skipping non-PDF file: {file_path}")
        return

    print(f"Starting to ingest file: {file_path}")
    loader = PyPDFLoader(file_path)
    loaded_documents = loader.load()
    print(f"Loaded {len(loaded_documents)} documents from {file_path}")

    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=chunk_size, chunk_overlap=chunk_overlap, separators=["\n", " ", ""]
    )
    documents = text_splitter.split_documents(loaded_documents)
    print(f"Split into {len(documents)} chunks")

    uuids = [str(uuid4()) for _ in range(len(documents))]
    print(f"Adding {len(documents)} documents to the vector store")
    vector_store.add_documents(documents=documents, ids=uuids)
    print(f"Finished ingesting file: {file_path}")

    # Datei nach Verarbeitung umbenennen
    processed_folder = os.path.join(data_folder, "processed")
    os.makedirs(processed_folder, exist_ok=True)
    new_file_path = os.path.join(processed_folder, os.path.basename(file_path))
    os.rename(file_path, new_file_path)
    print(f"Moved processed file to: {new_file_path}")

# Main Funktion
def main():
    delete_db(db_directory)
    vector_store = initialize_vector_store()

    files = [f for f in os.listdir(data_folder) if f.lower().endswith('.pdf')]
    
    if not files:
        print("No PDF files found. Exiting.")
        return

    for filename in files:
        file_path = os.path.join(data_folder, filename)
        ingest_file(file_path, vector_store)

    print("All files processed. Exiting.")

# Skript starten
if __name__ == "__main__":
    main()