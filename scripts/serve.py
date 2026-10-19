"""Local video preview with byte-range seeking: python scripts/serve.py [--port 3000]."""
import argparse
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import os
from pathlib import Path
import re
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parents[1]


class PreviewHandler(SimpleHTTPRequestHandler):
    def handle(self):
        try:
            super().handle()
        except (BrokenPipeError, ConnectionResetError, ConnectionAbortedError):
            pass

    def end_headers(self):
        self.send_header('Accept-Ranges', 'bytes')
        requested = urlsplit(self.path).path.lower()
        if requested.endswith(('/', '.html', '.htm')):
            self.send_header('Cache-Control', 'no-cache, max-age=0')
        super().end_headers()

    def send_head(self):
        self.byte_range = None
        # SimpleHTTP normalizes URL traversal; resolving also confines symlinks.
        path = Path(self.translate_path(self.path))
        candidates = [path] + ([path / name for name in ('index.html', 'index.htm')]
                               if path.is_dir() else [])
        if any(not candidate.resolve().is_relative_to(ROOT) for candidate in candidates):
            self.send_error(403, 'Path outside preview root')
            return None
        requested = self.headers.get('Range', '')
        match = re.fullmatch(r'bytes=(\d*)-(\d*)', requested.strip())
        # Unsupported/malformed ranges and conditional ranges use the full response.
        if (not match or not any(match.groups()) or self.headers.get('If-Range')
                or not path.is_file()):
            return super().send_head()
        try:
            source = path.open('rb')
        except OSError:
            self.send_error(404, 'File not found')
            return None
        stat = os.fstat(source.fileno())
        size = stat.st_size
        first, last = match.groups()
        if first:
            start = int(first)
            end = min(int(last), size - 1) if last else size - 1
        else:
            suffix = int(last)
            start, end = max(0, size - suffix), size - 1
        if start >= size or end < start or not size:
            source.close()
            self.send_response(416)
            self.send_header('Content-Range', f'bytes */{size}')
            self.send_header('Content-Length', '0')
            self.end_headers()
            return None
        self.send_response(206)
        self.send_header('Content-Type', self.guess_type(str(path)))
        self.send_header('Content-Range', f'bytes {start}-{end}/{size}')
        self.send_header('Content-Length', str(end - start + 1))
        self.send_header('Last-Modified', self.date_time_string(stat.st_mtime))
        self.end_headers()
        source.seek(start)
        self.byte_range = (start, end)
        return source

    def copyfile(self, source, outputfile):
        try:
            if self.byte_range is None:
                return super().copyfile(source, outputfile)
            remaining = self.byte_range[1] - self.byte_range[0] + 1
            while remaining:
                chunk = source.read(min(64 * 1024, remaining))
                if not chunk:
                    break
                outputfile.write(chunk)
                remaining -= len(chunk)
        except (BrokenPipeError, ConnectionResetError, ConnectionAbortedError):
            pass  # Browsers cancel earlier video requests when switching films.


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--port', type=int, default=3000)
    args = parser.parse_args()
    handler = partial(PreviewHandler, directory=str(ROOT))
    with ThreadingHTTPServer(('127.0.0.1', args.port), handler) as server:
        print(f'Preview: http://127.0.0.1:{server.server_port}', flush=True)
        try:
            server.serve_forever()
        except KeyboardInterrupt:
            pass
