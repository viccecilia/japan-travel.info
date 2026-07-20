import socketserver

class Handler(socketserver.StreamRequestHandler):
    def handle(self):
        self.wfile.write(b"220 local-test-smtp\r\n")
        data_mode = False
        auth_stage = 0
        while True:
            line = self.rfile.readline()
            if not line:
                break
            text = line.decode("utf-8", "replace").rstrip("\r\n")
            upper = text.upper()
            if data_mode:
                if text == ".":
                    self.wfile.write(b"250 queued\r\n")
                    data_mode = False
                continue
            if upper.startswith("EHLO"):
                self.wfile.write(b"250-localhost\r\n250 AUTH LOGIN\r\n")
            elif upper == "AUTH LOGIN":
                self.wfile.write(b"334 VXNlcm5hbWU6\r\n")
                auth_stage = 1
            elif auth_stage == 1:
                self.wfile.write(b"334 UGFzc3dvcmQ6\r\n")
                auth_stage = 2
            elif auth_stage == 2:
                self.wfile.write(b"235 authenticated\r\n")
                auth_stage = 0
            elif text:
                if upper.startswith("MAIL FROM") or upper.startswith("RCPT TO"):
                    self.wfile.write(b"250 ok\r\n")
                elif upper == "DATA":
                    self.wfile.write(b"354 end with dot\r\n")
                    data_mode = True
                elif upper == "QUIT":
                    self.wfile.write(b"221 bye\r\n")
                    break
                else:
                    self.wfile.write(b"235 authenticated\r\n")

if __name__ == "__main__":
    with socketserver.TCPServer(("127.0.0.1", 2525), Handler) as server:
        server.serve_forever()
