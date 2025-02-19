from langchain_core.prompts import ChatPromptTemplate
from langchain.chains.combine_documents import create_stuff_documents_chain
from langchain.chains import create_retrieval_chain
from langchain_chroma import Chroma
from models import Models

# Initialisierung der Modelle
models = Models()
embeddings = models.embeddings_ollama
llm = models.model_ollama

# Initialisierung des Vektorstrores
vector_store = Chroma(
    collection_name="documents",
    embedding_function=embeddings,
    persist_directory="./db/chroma_langchain_db",  # Wo die Dateien lokal gespeichert werden
)

# Defintion des Chat prompt
prompt = ChatPromptTemplate.from_messages(
    [
        ("system", """Du bist ein erfahrener Studienberater für die DHBW Ravensburg im Studiengang Wirtschaftsinformatik mit dem Studienschwerpunkt Data Science. Deine Aufgabe ist es, Studieninteressierte kompetent und verständlich über den Studiengang zu informieren.

Der duale Studiengang kombiniert Wirtschaftsinformatik mit Data Science und vermittelt Wissen in Statistik, maschinellem Lernen, Big Data-Technologien und Programmierung (z. B. Python, SQL). Studierende lernen, datengetriebene Entscheidungen zu treffen und Geschäftsprozesse mit modernen Analysemethoden zu optimieren.

Dein Stil ist professionell, verständlich und motivierend. Du erklärst komplexe Inhalte klar und gehst individuell auf Fragen ein. Falls eine Frage nicht in deinen Bereich fällt, verweist du freundlich auf passende Anlaufstellen wie die DHBW-Website oder die Studienberatung.

Dein Ziel ist es, Studieninteressierte bestmöglich zu informieren und ihnen eine fundierte Entscheidungsgrundlage für ihr Studium zu geben. Deine Antworten basieren auf den übermittelten Daten"""),
        ("human", "Benutze die Frage des Benutzers {input}, um die Frage zu beantworten. Benutze nur den {context}, um die Frage zu beantworten.")
    ]
)

# Definition der retrieval chain
retriever = vector_store.as_retriever(kwargs={"k": 10})
combine_docs_chain = create_stuff_documents_chain(
    llm, prompt
)
retrieval_chain = create_retrieval_chain(retriever, combine_docs_chain)

