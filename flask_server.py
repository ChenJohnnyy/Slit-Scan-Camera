from flask import Flask, send_from_directory
from flask_cors import CORS
import os
import ssl

app = Flask(__name__)
CORS(app)

@app.route('/')
def serve_index():
    return send_from_directory('.', 'index.html')

@app.route('/<path:path>')
def serve_file(path):
    return send_from_directory('.', path)

if __name__ == '__main__':
    # Kill any existing Python server processes
    os.system("pkill -f 'python3 -m http.server'")
    os.system("pkill -f 'python3 server.py'")
    os.system("pkill -f 'python3 flask_server.py'")
    
    # Create SSL context
    context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
    context.load_cert_chain('cert.pem', 'key.pem')
    
    print("\nServer starting...")
    print("Access the application at: https://localhost:8000")
    
    app.run(host='127.0.0.1', port=8000, ssl_context=context, debug=True) 