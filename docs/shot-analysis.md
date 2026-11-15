# Shot analysis

The shipping Analyze tab is an account-free video review section. Players can record or select a video up to 30 seconds / 50 MB, replay at normal or half speed, tap to seek, and step by 0.04 seconds. Playback pauses when leaving the tab, backgrounding the app, or opening the picker. Video duration comes from the loaded player; web and native picker metadata use different duration units.

## Optional body tracking

For an existing local age answer of 13–17 or adult, the selected clip can be processed after explicit per-clip consent and an Analyze movement tap. Unknown ages and under-13 profiles retain local video review without remote processing. No age or training profile is included in the clip request.

The current implementation sends the clip to the configured analysis service's MediaPipe pose endpoint. It does not send frames to OpenAI. The service deletes temporary files after processing. This development service currently runs on the developer's computer and is not production hosting; availability depends on that service and its network connection. Processing errors or cancellation leave the selected video available for local review. Cancelling stops the client request; an already running bounded server task may finish before cleanup.

A validated result contains genuine sampled 2D body landmarks. The overlay uses the video's current playback time, selects the nearest actual sample within at most 0.16 seconds, and omits low-confidence or out-of-frame points and any segment missing either endpoint. Video and skeleton share contain alignment; mismatched duration or orientation/aspect metadata rejects the result. There is no interpolated skeleton across missing intervals.

Body lines and movement labels can be toggled. Torso lean and Arm position identify visible body regions. Kicking knee and Support leg require an explicit kicking-foot choice and identify relative sides; they do not detect the contact phase, identify a backswing, or establish correct form. These landmarks are estimates, not technique ratings, injury assessment, speed measurement or skill scores.

## Local storage

Save replay explicitly copies the video to local replay storage. Pose results remain temporary component state and are not saved. Reopening a saved replay opens the video without stored body tracking. The existing limits of 10 clips / 200 MB, individual confirmed deletion, damaged-store recovery and Settings reset remain in force. There is no account requirement or cloud backup. Legacy tracked replays remain available as videos; the developer viewer distinguishes manual shot review from automatic ball tracking.

## Verification and remaining limits

TypeScript, owned-file formatting, and all current project tests pass. Pose helper tests cover real-sample time matching, missing intervals, confidence and viewport gates, malformed payload rejection, duration/orientation mismatches, and genuine MediaPipe samples from public Pexels video 13189490. An actual upload exposed a negative initial OpenCV timestamp; the backend now normalizes negative preroll to frame-index time, while the frontend continues rejecting negative timestamps. Browser interaction review and real MediaPipe upload testing are performed separately by the coordinating agent; physical-device camera/library permissions and native overlay alignment still need verification. The original local review browser check found and corrected Expo web duration-unit and metadata-event differences.

Browser verification on November 14, 2026 used the documented public Pexels fixture: genuine processing returned 93 samples; the rendered video and SVG shared a 350 × 420 viewport with contain alignment. Timeline tapping sought the actual player to 9.226666 seconds, body labels followed the corresponding pose, and 0.04-second stepping, playback, save, reload and reopening were checked. Browser-specific fixes include explicit media dimensions, a player-owned clock and normalized press-start coordinates for timeline taps. All 219 project tests, TypeScript, formatting and the restricted-proxy test passed; 12 backend tests passed. Physical iOS camera permissions and native alignment still require device verification.

The November 14 visual refinement enlarges replay space, combines stepping/playback with 0.5×/1×/2× speed selection, makes save/restart quiet actions, and folds optional tracking details. White body callouts use the measured contain scale to maintain readable text. A real public clip was reprocessed and checked with actual9.266665s player time, 2× speed and aligned labels. No score/speed estimate was introduced.
