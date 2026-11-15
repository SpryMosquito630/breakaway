"""Only the authenticated hosted parent launches this bounded subprocess."""
import argparse
import json
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'replay_analysis'))
from coaching_worker import joints
from coaching import CoachingError
from worker import InvalidVideo


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('mode', choices=['pose', 'shot-review'])
    parser.add_argument('video')
    parser.add_argument('result')
    parser.add_argument('--include-pose', action='store_true')
    args = parser.parse_args()
    try:
        if args.mode == 'pose':
            value = joints(args.video)
        else:
            from shot_review import review
            value = review(args.video, authorized=True)
            if args.include_pose:
                try:
                    value['pose'] = joints(args.video)
                except Exception:
                    value['pose'] = None
        output = {'ok': True, 'analysis': value}
    except (InvalidVideo, CoachingError) as error:
        output = {'ok': False, 'error': {'code': getattr(error, 'code', 'invalid_video'), 'message': getattr(error, 'message', str(error))}}
    except Exception:
        output = {'ok': False, 'error': {'code': 'analysis_failed', 'message': 'Try a clearer recording.'}}
    Path(args.result).write_text(json.dumps(output, allow_nan=False))


if __name__ == '__main__':
    main()
