from flask import Flask, render_template, request
import ollama

app = Flask(__name__)

@app.route('/')
def home():
    return render_template('index.html')

@app.route('/get', methods=['POST'])
def get_bot_response():
    user_input = request.form['msg']
    response = ollama.chat(user_input)
    return response

if __name__ == '__main__':
    app.run(debug=True)
