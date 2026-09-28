#!/usr/bin/env python3
"""轻量 Edge-TTS 代理，给小小学习台提供自然语音"""
import asyncio
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
import edge_tts

VOICES = {
    "zh": "zh-CN-XiaoyiNeural",
    "zh-warm": "zh-CN-XiaoxiaoNeural",
    "zh-cute": "zh-CN-YunxiaNeural",
    "en": "en-US-AnaNeural",
    "en-female": "en-US-JennyNeural",
}

class Handler(BaseHTTPRequestHandler):
    def log_message(self, fmt, *args):
        print("[tts]", fmt % args)

    def _cors(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")

    def do_OPTIONS(self):
        self.send_response(204)
        self._cors()
        self.end_headers()

    def do_GET(self):
        qs = parse_qs(urlparse(self.path).query)
        text = (qs.get("text") or [""])[0].strip()
        lang = (qs.get("lang") or ["zh"])[0]
        if not text:
            self.send_response(400)
            self._cors()
            self.end_headers()
            self.wfile.write(b"missing text")
            return
        voice = VOICES.get(lang, VOICES["zh"])
        if len(text) > 200:
            text = text[:200]
        try:
            audio = asyncio.run(self._synth(text, voice))
            self.send_response(200)
            self._cors()
            self.send_header("Content-Type", "audio/mpeg")
            self.send_header("Cache-Control", "no-cache")
            self.end_headers()
            self.wfile.write(audio)
        except Exception as e:
            self.send_response(500)
            self._cors()
            self.end_headers()
            self.wfile.write(str(e).encode())

    async def _synth(self, text, voice):
        communicate = edge_tts.Communicate(text, voice, rate="+5%", pitch="+5Hz")
        chunks = []
        async for chunk in communicate.stream():
            if chunk["type"] == "audio":
                chunks.append(chunk["data"])
        return b"".join(chunks)

if __name__ == "__main__":
    port = 8766
    print(f"Edge-TTS proxy on http://0.0.0.0:{port}")
    HTTPServer(("0.0.0.0", port), Handler).serve_forever()
