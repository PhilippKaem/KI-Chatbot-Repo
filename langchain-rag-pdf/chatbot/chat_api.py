from flask import Flask, request, jsonify
from chat import retrieval_chain
from flask_cors import CORS

app = Flask(__name__)
CORS(app) 

@app.route("/chat", methods=["POST"])
def chat():
    data = request.get_json()
    user_input = data.get("input", "")
    
    if not user_input:
        return jsonify({"error": "Keine Eingabe erhalten."}), 400
    
    try:
        result = retrieval_chain.invoke({"input": user_input})
        return jsonify({"answer": result["answer"]})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=False)
