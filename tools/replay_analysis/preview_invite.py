#!/usr/bin/env python3
"""Owner-local private preview link preparation. Never prints the capability."""
import argparse
import os
from pathlib import Path
from urllib.parse import urlsplit
from pairing import _private_json, prepare_preview_invite

ROOT = Path(__file__).resolve().parents[2]
RUNTIME = ROOT / 'work/replay-service'


def private_link(base, invite, web=False):
    parsed = urlsplit(base.strip())
    if parsed.scheme not in {'exp', 'exps', 'http', 'https'} or not parsed.netloc or parsed.username or parsed.password:
        raise ValueError('Use a valid Expo or web preview origin.')
    path = '/' if web else '/--/coach-connect'
    fragment = f"coachInvite={invite['id']}.{invite['token']}.{int(invite['expiresAt'] * 1000)}"
    return f'{parsed.scheme}://{parsed.netloc}{path}#{fragment}'


def write_private(path, content):
    fd = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
    with os.fdopen(fd, 'w') as stream: stream.write(content + '\n')
    os.chmod(path, 0o600)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--prepare-only', action='store_true')
    args = parser.parse_args()
    invite = prepare_preview_invite(RUNTIME / 'coach-preview-invite.json', RUNTIME / 'coach-preview-grant.json')
    if not args.prepare_only:
        for label in ['cellular', 'wifi']:
            source = ROOT / f'work/expo-{label}-current.txt'
            write_private(RUNTIME / f'coach-private-{label}-url.txt', private_link(source.read_text(), invite))
        write_private(RUNTIME / 'coach-private-web-url.txt', private_link('http://localhost:8086', invite, web=True))
    print('Private preview grant prepared; owner-only files retained. Capability value hidden.')


if __name__ == '__main__': main()
