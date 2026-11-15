#!/usr/bin/env python3
"""Load only server coaching settings from an ignored file, without shell expansion."""
import argparse
import os
from pathlib import Path
import runpy

ALLOWED = {'GEMINI_API_KEY', 'GEMINI_MODEL', 'OPENAI_API_KEY', 'OPENAI_MODEL', 'SUPABASE_URL', 'SUPABASE_PUBLISHABLE_KEY', 'ALLOW_DEV_AI', 'COACH_DEV_PAIRING'}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--env-file', type=Path, default=Path('work/replay-service/coach.env.local'))
    args, server_args = parser.parse_known_args()
    values = {}
    for line in args.env_file.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith('#'): continue
        key, separator, value = line.partition('=')
        key, value = key.strip(), value.strip()
        if not separator or key not in ALLOWED:
            raise SystemExit('Use only documented server settings in the coaching env file.')
        if len(value) >= 2 and value[0] == value[-1] and value[0] in ('"', "'"):
            value = value[1:-1]
        if value: values[key] = value
    os.environ.update(values)
    if not values.get('GEMINI_API_KEY') or not values.get('GEMINI_MODEL'):
        raise SystemExit('Set GEMINI_API_KEY and GEMINI_MODEL in the ignored coaching env file first.')
    import sys
    sys.argv = [str(Path(__file__).with_name('server.py')), *server_args]
    runpy.run_path(sys.argv[0], run_name='__main__')


if __name__ == '__main__': main()
