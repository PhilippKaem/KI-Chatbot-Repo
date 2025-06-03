import os
from langchain_ollama import OllamaEmbeddings, ChatOllama

class Models:
    def __init__(self):
        # eingesetzte Embeddings
        self.embeddings_ollama = OllamaEmbeddings(
            model="mxbai-embed-large"
        )

        # eingesetzte Modelle
        self.model_ollama = ChatOllama(
            model="llama3.2",
            temperature=0,
        )