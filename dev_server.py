#!/usr/bin/env python3
"""
GEEK FACTORY — Serveur de Développement avec Auto-Sync RSS
Sert les fichiers statiques et synchronise automatiquement rss.xml dès qu'un article est modifié ou créé.
"""

import sys
import time
import threading
from pathlib import Path
from http.server import SimpleHTTPRequestHandler, HTTPServer
import sync_rss

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8080
DIRECTORY = Path(__file__).resolve().parent

class AutoSyncHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(DIRECTORY), **kwargs)

    def do_GET(self):
        # Si rss.xml est demandé, s'assurer qu'il est synchronisé
        if self.path.startswith("/rss.xml"):
            try:
                sync_rss.sync()
            except Exception as e:
                print(f"[!] Erreur sync RSS on-demand: {e}")
        return super().do_GET()

    def send_error(self, code, message=None, explain=None):
        if code == 404:
            f404 = DIRECTORY / "404.html"
            if f404.exists():
                self.send_response(404)
                self.send_header("Content-Type", "text/html; charset=utf-8")
                content = f404.read_bytes()
                self.send_header("Content-Length", str(len(content)))
                self.end_headers()
                self.wfile.write(content)
                return
        super().send_error(code, message, explain)

def watcher_thread():
    """Surveille les modifications de actualites.html et article-*.html en tâche de fond."""
    last_mtimes = {}
    while True:
        try:
            files_to_watch = list(DIRECTORY.glob("actualites.html")) + list(DIRECTORY.glob("article-*.html"))
            changed = False
            for f in files_to_watch:
                mtime = f.stat().st_mtime
                if f not in last_mtimes or mtime > last_mtimes[f]:
                    last_mtimes[f] = mtime
                    changed = True
            
            if changed:
                sync_rss.sync()
            time.sleep(2)
        except Exception:
            time.sleep(2)

def run_server():
    # Synchronisation initiale
    try:
        sync_rss.sync()
    except Exception as e:
        print(f"[!] Sync initial: {e}")

    # Lancement du watcher en arrière-plan
    w_thread = threading.Thread(target=watcher_thread, daemon=True)
    w_thread.start()

    server_address = ("", PORT)
    httpd = HTTPServer(server_address, AutoSyncHandler)
    print(f"[*] Serveur GEEK FACTORY demarre sur http://localhost:{PORT}")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nArret du serveur.")

if __name__ == "__main__":
    run_server()
