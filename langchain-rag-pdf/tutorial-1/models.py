import os
from langchain_ollama import OllamaEmbeddings, ChatOllama

class Models:
    def __init__(self):
        # Um die Anbindung zu Ollama herunterzuladen, folgenden Befehl im Terminal ausführen: ollama pull mxbai-embed-large
        self.embeddings_ollama = OllamaEmbeddings(
            model="mxbai-embed-large"
        )

        # Um das Modell herunterzuladen, den folgenden Befehl im Terminal ausführen: ollama pull llama3.2
        self.model_ollama = ChatOllama(
            model="llama3.2",
            temperature=0,
        )