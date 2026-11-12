# Drill demonstration footage

`marker-slalom.mp4` derives from Pexels video 7187061, RDNE Stock project.
Discovery/source listing: https://www.pexels.com/video/man-training-on-a-soccer-field-7187047/ (related video Download link 7187061).
Original download: https://videos.pexels.com/video-files/7187061/7187061-hd_1920_1080_24fps.mp4
License: https://www.pexels.com/license/
Retrieved/reviewed: 2026-11-06.

Pexels permits free use and modification in apps; attribution is appreciated, not required. Restrictions include implying endorsement, selling unaltered copies and redistributing on stock/wallpaper platforms. See the linked license for complete current terms. This footage is integrated as a movement example with original guidance and playback tools, not offered as a stock download. The performer does not endorse Breakaway.

Adaptation: entire 7.54-second source, silent H.264, resized to 960×540. No generated or altered movement. Reviewed at 2 fps across the full clip; feet and ball remain visible as the player weaves around cones, turns and returns. This is illustrative footage, not a coach-vetted tutorial. Use flat markers and the written spacing/pace instructions, not the taller cones or demonstration speed shown. Not mapped to any other drill.

The 28 movement schematics are original code-native diagrams based on this app's written drill instructions. They are top-down guides, not videos or validated body-form instruction.

`sole-contact.mp4` derives from Pexels video 19216281, Videas Cl.
Source page: https://www.pexels.com/video/two-men-in-red-and-black-soccer-uniforms-playing-soccer-19216281/
Original download: https://videos.pexels.com/video-files/19216281/19216281-hd_1920_1080_30fps.mp4
Same Pexels License, reviewed 2026-11-06.

Adaptation: source 0–7.5 seconds only, silent H.264, resized to 960×540. Inspected focused frames at 2fps and first4s at6fps. The front player guides the ball with sole contact. This is explicitly a foot-contact example; it does not establish complete alternating-foot drill execution. The app tells the user to repeat with the other foot and follow the written alternating steps. No coach review or endorsement. Other players visible are not part of this individual drill.


## Encoding and coverage review — 2026-11-08

Both existing assets were re-encoded to silent H.264 CRF27, preset slow, yuv420p, with faststart at the same 960×540 size and original trim. Source identity, movement, and mapping are unchanged. The complete encoded clips were inspected chronologically at 2 fps; ball and feet remain readable. Full ffmpeg decoding passed and ffprobe confirms one H.264 video stream with no audio.

- `sole-contact.mp4`: 7.500 seconds, 573,604 bytes (previously 904,010).
- `marker-slalom.mp4`: 7.542 seconds, 1,421,198 bytes (previously 2,167,823).

Total is 1,994,802 bytes, a reduction of 1,077,031 bytes (35.1%). Updated asset SHA-256 values are in `provenance.json`.

The Pexels License was checked again at https://www.pexels.com/license/ on 2026-11-08. It permits free use and modification, including in apps, with optional attribution; its restrictions still prohibit implied endorsement and redistribution on stock or wallpaper platforms.

Additional research found no qualified footage for alternating inside touches, alternating toe taps, pull-back turns, or V pulls. Three newly downloaded official Pexels sources (9502515, 6077703, 10349012) were rejected after full chronological 2 fps visual inspection. No additional clip or drill mapping was added. Research evidence, source URLs, original download URLs, source hashes, and exclusions are in `work/demo-footage-research/review.json`. This result is a limited search, not a claim that no licensed footage exists.

## Paused posters — 2026-11-08

`sole-contact-poster.jpg` and `marker-slalom-poster.jpg` are unaltered full frames extracted at 1.0 seconds from their corresponding licensed bundled MP4s using ffmpeg (`-frames:v 1 -q:v 3`). They use the same source license and credit above. Both were visually inspected for visible ball and foot contact. Hashes and sizes are in `provenance.json`. Posters appear before first playback and behind visible playback errors; no new footage or movement is implied.

## Previous welcome background reuse — 2026-11-08

The bundled `marker-slalom.mp4` and matching poster previously supplied the decorative welcome background under the same RDNE Stock project / Pexels 7187061 license above. That welcome use has been replaced by the shot sequence documented in `assets/welcome/`; this clip remains the unchanged marker-slalom drill example.


## Additional footage search — 2026-11-12

Five fresh official Pexels downloads were visually screened across each complete sequence. None established an additional exact ball-only drill demonstration. No new clip or drill mapping was added. Mixkit personal-use-only footage and institutional noncommercial resources were also excluded. Details, source URLs, hashes, and movement/visibility reasons are recorded in `research-2026-11-12.json`. The Pexels License was checked again on this date. Existing clip permissions, trims, sizes and mapping remain unchanged.
