from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain.chains.combine_documents import create_stuff_documents_chain
from langchain.chains.history_aware_retriever import create_history_aware_retriever
from langchain.chains.retrieval import create_retrieval_chain
from langchain_chroma import Chroma
from models import Models
import uuid

# Initialisierung der Modelle
models = Models()
embeddings = models.embeddings_ollama
llm = models.model_ollama

# Initialisierung des Vektorstores
vector_store = Chroma(
    collection_name="documents",
    embedding_function=embeddings,
    persist_directory="./db/chroma_langchain_db"
)

retriever = vector_store.as_retriever(search_type="mmr", search_kwargs={"k": 5, "fetch_k": 10})

# Verlaufsspeicherung für mehrere Sessions
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

# Retrieval Chain mit history-aware Retriever
retrieval_chain = create_retrieval_chain(history_aware_retriever, combine_docs_chain)

def chain_with_history(session_id: str, input_message: str):
    chat_history = get_chat_history(session_id)
    response = retrieval_chain.invoke({
        "input": input_message,
        "chat_history": chat_history
    })

    # Verlauf updaten
    chat_history.append({"role": "user", "content": input_message})
    chat_history.append({"role": "assistant", "content": response["answer"]})

    return response["answer"]

# Main-Schleife für Konsolen-Chat mit Sessions
def main():
    print("Starte den DHBW WiBot Chatbot.")
    print("Gib 'new' ein, um eine neue Session zu starten, oder 'exit' zum Beenden.")
    
    session_id = None
    
    while True:
        if session_id is None:
            command = input("Eingabe ('new' für neue Session, 'exit' zum Beenden): ").strip().lower()
            if command == 'exit':
                break
            elif command == 'new':
                session_id = start_new_session()
                print(f"Neue Session gestartet: {session_id}")
            else:
                print("Bitte 'new' oder 'exit' eingeben.")
            continue
        
        user_input = input("Du: ").strip()
        if user_input.lower() in ['exit', 'quit', 'q']:
            print("Session beendet.")
            session_id = None
            continue
        elif user_input.lower() == 'new':
            session_id = start_new_session()
            print(f"Neue Session gestartet: {session_id}")
            continue
        
        answer = chain_with_history(session_id, user_input)
        print("WIBot:", answer, "\n")

if __name__ == "__main__":
    main()
