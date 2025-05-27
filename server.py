import http.server
import ssl

class CORSHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET')
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate')
        return super().end_headers()

server_address = ('0.0.0.0', 8000)
httpd = http.server.HTTPServer(server_address, CORSHTTPRequestHandler)
httpd.socket = ssl.wrap_socket(httpd.socket,
                             keyfile="key.pem",
                             certfile="cert.pem",
                             server_side=True)

print("Server running at https://0.0.0.0:8000/")
httpd.serve_forever() 