#!/usr/bin/env python3
"""Explicit-project deployment. Defaults to printing a plan; never reads local secrets."""
import argparse
import json
from pathlib import Path
import shutil
import subprocess
import tempfile
from core import safe_project

ROOT = Path(__file__).resolve().parents[2]
REPLAY_FILES = ('coaching.py', 'coaching_worker.py', 'detector.py', 'worker.py', 'shot_review.py', 'food_image.py', 'bootstrap_pose.py', 'requirements.txt', 'requirements-joints.txt')
HOSTED_FILES = ('app.py', 'core.py', 'ledger.py', 'worker.py', 'requirements.txt')


def stage(directory):
    directory = Path(directory)
    for folder, files in [('replay_analysis', REPLAY_FILES), ('hosted_analysis', HOSTED_FILES)]:
        target = directory / 'tools' / folder
        target.mkdir(parents=True, exist_ok=True)
        for name in files:
            shutil.copyfile(ROOT / 'tools' / folder / name, target / name)
    shutil.copyfile(Path(__file__).with_name('Dockerfile'), directory / 'Dockerfile')
    (directory / '.dockerignore').write_text('*\n!Dockerfile\n!tools/\n!tools/**\n')
    (directory / '.gcloudignore').write_text('.git\n**/__pycache__\n*.pyc\n')
    return sorted(str(path.relative_to(directory)) for path in directory.rglob('*') if path.is_file())


def commands(args):
    project = safe_project(args.project)
    image = f'{args.region}-docker.pkg.dev/{project}/analysis/worker:{args.tag}'
    service_account = f'breakaway-analysis@{project}.iam.gserviceaccount.com'
    environment = {
        'GOOGLE_CLOUD_PROJECT': project,
        'GEMINI_MODEL': args.model,
        'HOSTED_AUTH_READY': 'true' if args.auth_ready else 'false',
        'FIREBASE_ALLOWED_APP_IDS': args.app_id or '',
        'USER_DAILY_LIMIT': '2',
        'GLOBAL_DAILY_LIMIT': '10',
    }
    # JSON is a YAML subset; use an env file to avoid delimiter/shell interpolation.
    build_account = f'projects/{project}/serviceAccounts/breakaway-build@{project}.iam.gserviceaccount.com'
    build = ['gcloud', 'builds', 'submit', '--project=' + project, '--region=' + args.region,
             '--tag=' + image, '--service-account=' + build_account,
             '--gcs-source-staging-dir=gs://' + project + '-build/source',
             '--gcs-log-dir=gs://' + project + '-build/logs', '--quiet']
    deploy = ['gcloud', 'run', 'deploy', 'breakaway-analysis', '--project=' + project, '--region=' + args.region,
              '--image=' + image, '--service-account=' + service_account, '--allow-unauthenticated',
              '--cpu=1', '--memory=2Gi', '--concurrency=1', '--min=0', '--max=1', '--max-instances=1',
              '--timeout=120s', '--execution-environment=gen2', '--set-env-vars=HOSTED_AUTH_READY=false', '--quiet']
    if args.secret_version:
        deploy.append('--set-secrets=GEMINI_API_KEY=breakaway-gemini-key:' + args.secret_version)
    return environment, build, deploy


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--project', required=True)
    parser.add_argument('--region', default='us-west1', choices=['us-west1'])
    parser.add_argument('--tag', default='initial')
    parser.add_argument('--model', required=True)
    parser.add_argument('--app-id')
    parser.add_argument('--auth-ready', action='store_true')
    parser.add_argument('--secret-version')
    parser.add_argument('--apply', action='store_true')
    args = parser.parse_args()
    if args.auth_ready and (not args.app_id or not args.secret_version):
        parser.error('Ready mode requires an attested app ID and pinned server secret version.')
    environment, build, deploy = commands(args)
    with tempfile.TemporaryDirectory(prefix='breakaway-build-') as context:
        manifest = stage(context)
        print(json.dumps({'project': args.project, 'limits': {'cpu': 1, 'max_instances': 1, 'user_daily': 2, 'global_daily': 10}, 'auth_ready': args.auth_ready, 'source_manifest': manifest, 'build': build, 'deploy': deploy}, indent=2))
        if not args.apply:
            return
        description = subprocess.check_output(['gcloud', 'projects', 'describe', args.project, '--format=json'], text=True)
        if json.loads(description).get('name') != 'Breakaway Analysis':
            raise SystemExit('Refusing deployment outside the explicitly named Breakaway Analysis project.')
        environment_file = Path(context) / 'runtime-env.json'
        # The env file has only public project/model/config values; do not send it to build.
        subprocess.run(build + [context], check=True)
        for collection in ('analysis_jobs', 'analysis_results', 'analysis_usage'):
            subprocess.run(['gcloud', 'firestore', 'fields', 'ttls', 'update', 'expires_at',
                            '--collection-group=' + collection, '--database=(default)',
                            '--enable-ttl', '--async', '--project=' + args.project, '--quiet'], check=True)
        environment_file.write_text(json.dumps(environment))
        deploy = [arg for arg in deploy if not arg.startswith('--set-env-vars=')]
        subprocess.run(deploy + ['--env-vars-file=' + str(environment_file)], check=True)


if __name__ == '__main__':
    main()
