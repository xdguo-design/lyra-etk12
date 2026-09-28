#!/usr/bin/env python3
"""统一服务：静态页面 + 自然语音 /tts"""
import asyncio
import os
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse, parse_qs
try:
    import edge_tts
    HAS_TTS = True
except ImportError:
    edge_tts = None
    HAS_TTS = False

ROOT = os.path.dirname(os.path.abspath(__file__))
VOICES = {
    "zh": "zh-CN-XiaoyiNeural",
    "en": "en-US-AnaNeural",
}

class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def log_message(self, fmt, *args):
        print("[srv]", fmt % args)

    def end_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "*")
        self.end_headers()

    def do_GET(self):
        parsed = urlparse(self.path)
        if parsed.path in ("/tts", "/tts/"):
            return self._tts(parsed.query)
        return super().do_GET()

    def _tts(self, query):
        if not HAS_TTS:
            self.send_error(503, "TTS unavailable")
            return
        qs = parse_qs(query)
        text = (qs.get("text") or [""])[0].strip()
        lang = (qs.get("lang") or ["zh"])[0]
        if not text:
            self.send_error(400, "missing text")
            return
        if len(text) > 200:
            text = text[:200]
        voice = VOICES.get(lang, VOICES["zh"])
        try:
            audio = asyncio.run(self._synth(text, voice))
            self.send_response(200)
            self.send_header("Content-Type", "audio/mpeg")
            self.send_header("Cache-Control", "no-store")
            self.end_headers()
            self.wfile.write(audio)
        except Exception as e:
            self.send_error(500, str(e))

    async def _synth(self, text, voice):
        communicate = edge_tts.Communicate(text, voice, rate="+5%", pitch="+5Hz")
        chunks = []
        async for chunk in communicate.stream():
            if chunk["type"] == "audio":
                chunks.append(chunk["data"])
        return b"".join(chunks)

if __name__ == "__main__":
    port = int(os.environ.get("PORT", "8765"))
    print(f"小小学习台 http://0.0.0.0:{port}  (TTS: /tts?text=你好&lang=zh)")
    ThreadingHTTPServer(("0.0.0.0", port), Handler).serve_forever()
