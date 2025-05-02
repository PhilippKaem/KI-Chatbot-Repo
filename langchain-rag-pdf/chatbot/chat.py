from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain.chains.combine_documents import create_stuff_documents_chain
from langchain.chains.history_aware_retriever import create_history_aware_retriever
from langchain.chains.retrieval import create_retrieval_chain
from langchain_chroma import Chroma
from models import Models
import uuid

# Initialisierung
models = Models()
embeddings = models.embeddings_ollama
llm = models.model_ollama

# Vektordatenbank
vector_store = Chroma(
    collection_name="documents",
    embedding_function=embeddings,
    persist_directory="./db/chroma_langchain_db"
)

retriever = vector_store.as_retriever(search_type="mmr", search_kwargs={"k": 5, "fetch_k": 10})

# Verlaufsspeicherung
chat_sessions = {}

def start_new_session():
    new_session_id = str(uuid.uuid4())
    chat_sessions[new_session_id] = []
    return new_session_id

def get_chat_history(session_id: str):
    if session_id not in chat_sessions:
        chat_sessions[session_id] = []
    return chat_sessions[session_id]

# Prompt zur Kontextsensitiven Retrieval
retriever_prompt = ChatPromptTemplate.from_messages([
    ("system", "Du bist ein Studienberater für Wirtschaftsinformatik an der DHBW Ravensburg."),
    MessagesPlaceholder(variable_name="chat_history"),
    ("human", "{input}")
])

history_aware_retriever = create_history_aware_retriever(
    llm,
    retriever,
    retriever_prompt
)

answer_prompt = ChatPromptTemplate.from_messages([
    ("system", """Du bist ein erfahrener Studienberater für die DHBW Ravensburg im Studiengang Wirtschaftsinformatik mit dem Studienschwerpunkt Data Science. 
Deine Aufgabe ist es, Studieninteressierte kompetent und verständlich über den Studiengang zu informieren.

Hier sind kontextuelle Informationen zur Beantwortung der Frage:
{context}"""),
    MessagesPlaceholder(variable_name="chat_history"),
    ("human", "{input}")
])

# Stuffing Chain
combine_docs_chain = create_stuff_documents_chain(llm, answer_prompt)

# Retrieval Chain
retrieval_chain = create_retrieval_chain(history_aware_retriever, combine_docs_chain)

def get_message_history(session_id: str):
    return get_chat_history(session_id)

def chain_with_history(session_id: str, input_message: str):
    chat_history = get_message_history(session_id)
    response = retrieval_chain.invoke({
        "input": input_message,
        "chat_history": chat_history
    })

    # Verlauf updaten
    chat_history.append({"role": "user", "content": input_message})
    chat_history.append({"role": "assistant", "content": response["answer"]})

    return response