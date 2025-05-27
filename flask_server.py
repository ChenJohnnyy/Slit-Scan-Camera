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
    print("Access the application at:")
    print("1. On your computer: https://localhost:8000")
    print("2. On your phone: https://10.105.141.221:8000")
    print("\nIMPORTANT: When accessing from your phone:")
    print("1. You'll see a security warning - this is normal")
    print("2. Click 'Advanced'")
    print("3. Click 'Proceed to 10.105.141.221 (unsafe)'")
    print("\nMake sure your phone is on the same WiFi network as your computer.")
    
    app.run(host='0.0.0.0', port=8000, ssl_context=context, debug=True) 