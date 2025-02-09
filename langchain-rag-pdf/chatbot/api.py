from fastapi import FastAPI
from pydantic import BaseModel
from chat import retrieval_chain  # Lade deine bestehende Retrieval-Chain

app = FastAPI()

class ChatRequest(BaseModel):
    message: str

@app.post("/chat")
def chat(request: ChatRequest):
    result = retrieval_chain.invoke({"input": request.message})
    return {"response": result["answer"]}