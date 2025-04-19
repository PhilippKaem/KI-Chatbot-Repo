from flask import Flask, request, jsonify
from chat import chain_with_history, start_new_session
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

@app.route("/api/new_session", methods=["GET"])
def new_session():
    session_id = start_new_session()
    return jsonify({"session_id": session_id})

@app.route("/chat", methods=["POST"])
def chat():
    data = request.get_json()
    user_input = data.get("input", "")
    session_id = data.get("session_id", "default")

    if not user_input:
        return jsonify({"error": "Keine Eingabe erhalten."}), 400

    try:
        result = chain_with_history(session_id, user_input)
        return jsonify({"answer": result["answer"]})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=False)