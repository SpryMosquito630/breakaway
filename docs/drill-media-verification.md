# Drill media verification

## Current November 14 in-app clips and refined analysis

18 of 30 drill IDs now have in-app filmed core-action examples, using 15 distinct active clips. This includes 14 ballwork IDs, wall passing, partner passing, partner first touch and marker slalom. The new sole demonstration supersedes the earlier one-foot contact example. Weaker-foot variants reuse the relevant actual technique with explicit learner-foot instructions; no demonstrator dominance is inferred. All 30 distinct library photographs remain.

Fourteen new short MP4 assets (about 8 MB before posters) are genuine footage from sources explicitly permitting reuse: official creator CC BY material and Pexels. Source titles, creators, source URLs, license/change notices, SHA256 and precise movement limits are retained in assets/drill-clips. Original provider overlays remain. These are core-action examples with stated differences, not certification of every authored stage or a coach endorsement. The short portrait pull-back teaching clip is visibly softer and has a quick reset. All loops repeat the original forward action; no fake reverse motion or seamless-loop claim.

The Video demos filter and badges count only in-app direct clips. External references are quiet detail disclosures and are not counted as completed in-app footage. Twelve genuine filming gaps remain; see [drill-filming-gaps.md](drill-filming-gaps.md). No footage was forced onto an unrelated drill to inflate coverage.

Playback begins only after Play, loops muted, supports half speed, and pauses/releases outside the relevant foreground screen. Native bundled numeric assets and Metro web asset objects/strings are validated. Optional remote MP4 support loads only after explicit Play and handles cancellation/retry; no remote source is currently needed for the accepted clips. Existing original posters and unique photo credits remain available. Browser QA verified actual 3.32-second in-app playback, loop/mute, half speed and the fitted 350×196.875 player.

Analyze now gives the replay more room, uses compact step/play/speed controls (0.5×/1×/2×), quiet save/restart actions, folded consent/options and readable white callout pills. Real pose geometry, consent/youth gates, authoritative clock and seeking remain intact. A genuine public-video upload, 9.2-second seeking, frame stepping, playback-rate change and fitted 350×557 replay/overlay were checked at 390×844. Physical native camera/overlay behavior remains unverified. The development body service was resumed in a persistent local session; production hosting remains a separate dependency.

All 223 project tests, TypeScript, formatting and whitespace checks pass. Final iOS production export passes. Full decoding and stream checks validate every new MP4 as silent H.264 yuv420p under 30 seconds. Browser evidence is in output/screenshots/breakaway-analysis-refined.jpg and breakaway-in-app-drill-video.jpg.

## Earlier November 14 online-reference catalog — superseded

The catalog now covers 26 of 30 built-in drill IDs: two unchanged licensed offline films (sole rolls and marker slalom) plus 24 reviewed public YouTube core-technique examples. Four gaps remain: `push`, `weak-roll`, `pass-brake`, and `pass-angle`. Partial matches and instruction-adaptation proposals are excluded. Sources may illustrate the core action with different equipment, cadence or pace; limits remain visible. Weaker-foot examples do not claim the demonstrator's dominance. All 30 distinct photographic assets are preserved, including offline images for online examples.

The two local films loop after Play and pause on navigation blur/background. No player is created for a library row. Online detail/setup retains the photo and optional authored guide, then offers an explicit provider action. Video demos filtering and badges recognize validated local/online examples.

Every current online source has **unknown Made for Kids status**, so all 24 open the timestamped original on YouTube; no current source qualifies for an in-app embed. External playback uses the provider's own controls and is not automatically looped by this app. The optional official embedded player requires verified non-child-directed status and a recognized 13+/adult age band, then explicit user loading. Under-13 and unknown ages cannot create that embed. The disclosure explains provider device/network data collection. Private recordings/profile answers are never serialized into the public-demo document.

The optional player uses the YouTube privacy-enhanced host, genuine native app identity, original provider controls/branding/ads, and official start/end API coordinates. It loops only after user playback and unloads on navigation/background/timer. No copyrighted online source video is bundled or offered for offline download. Original public metadata and research evidence are recorded in [drill-online-video-sources.json](drill-online-video-sources.json); the source-review records do not certify seamless interval boundaries.

Software checks: all 218 tests and TypeScript pass, including interval eligibility, unknown-age/child-status refusal and simulated player start/loop/pause/hidden-document behavior. This catalog integration has not yet received browser/native playback QA or a new production export. The optional embedded player has no eligible live source to exercise. Earlier photo export/browser checks below do not establish runtime verification of these new video paths.

Implementation references: [Expo SDK 58 WebView](https://docs.expo.dev/versions/latest/sdk/webview/), [YouTube official IFrame API](https://developers.google.com/youtube/iframe_api_reference), [YouTube identity requirements](https://developers.google.com/youtube/terms/required-minimum-functionality), and [YouTube developer policies](https://developers.google.com/youtube/terms/developer-policies).

## Current November 14 real-photo source freeze

All 30 built-in drills have distinct genuine photographic media: 28 real still references plus the two unchanged sole/slalom film posters. Keeper drills are included. No built-in uses an authored-diagram or generated-human thumbnail, and no still photograph or alternate crop is assigned to two drills. Still references show relevant contact/setup/handling phases; descriptions state where a complete movement, incoming pass, foot dominance or rolling distribution is not established.

All final stills were visually inspected in labeled contact sheets, including the final six-player upgrade sheet. Source-page licenses, exact crop/frame identities, transformations, downloaded and output SHA256, dimensions, sizes and contextual limits are in `assets/drill-photos/provenance.json`. The three official CC creator-video license records are in `license-evidence.json`. Attribution, license links and changes are present in the app registry, including CC BY-SA derivative terms. Pexels, free Unsplash and file-specific Creative Commons sources are kept distinct.

Photo payload is 1,435,950 bytes, with each still below 120 KiB. The two actual wall-work preview frames are native 240×180 crops and visibly softer than the 900 px photographs in a large view; the L-turn sole-contact macro is 440×330. No artificial enlargement or generative enhancement was used. Step-over uses the approved 900×675 genuine setup photograph; the tiny academic figure was superseded.

Six targeted upgrades now show Alphonso Davies, Virgil van Dijk, Declan Rice, Mohamed Salah, Sergio Busquets and Gervinho in actual action, with primary source identity/license evidence. Heads/bodies and relevant ball contact remain visible; Gervinho is seen from behind with natural partial ball occlusion. Thirteen drill IDs have documented professional/international action. Specialized sole, wall and handling photographs remain. Required source-agency and Jethrude website credits are included.

Static checks enforce coverage of all 30 ground/keeper drills, source/photo/asset/hash uniqueness, exact registry and film-poster references, provenance hashes and budgets. All 210 tests and TypeScript pass, including the six targeted professional-action mappings. The final production iOS export passes with 84 assets (`work/real-pro-photos-final-export`).

Root browser QA at 390×844 found all 30 rows with 30 distinct photographic asset URLs. The photographed library, genuine wall-receiving detail, Salah action detail and accessible source/license disclosures were inspected. De Bruyne's Train hero retains his head, boots and full ball at 390×844 and 320×740; its credit is available in Settings → Privacy & practice notes. The calendar uses the reference's actual states: outlined past dates, a neutral filled circle for today, and muted unframed future dates, with no schedule-driven rings or dots. Evidence is under `output/screenshots/`.

The public cellular SDK 58 manifest, full iOS bundle and a new pro photo were verified with successful HTTP responses and matching asset hash. The user initially reported unimplemented native screens components in Expo Go; installed dependencies matched Expo's supported SDK 58 versions, so no dependency change was made. After client update/reopen instructions, the user confirmed it works. This is user confirmation of recovery, not an independent device frame-rate or full navigation test. No App Store build or submission was changed.

## Earlier November 14 ten-photo stage — superseded

Ten distinct contextual photograph originals are assigned one per drill, with the two existing films/posters unchanged. Sixteen ground-work drills use their own authored movement diagram; two keeper drills use explicit category icons. No image or alternate crop of an original is shared between drills. Sole-contact context is assigned to Touch and freeze (`foundation-stop`), while Pull-back turns uses its authored path. All final photographs were reviewed in a labeled contact sheet.

Provenance, exact transformations, source/license links and output hashes are recorded in `assets/drill-photos`. Static uniqueness tests validate original source IDs, actual registry assets, film poster paths, hashes, size budgets and movement fallbacks without loading React Native assets.

Historical checks for that ten-photo stage: all 208 tests and TypeScript pass; formatting and whitespace checks pass. Production iOS export passes with 66 assets. Browser review at 390×844 confirmed distinct photo/diagram thumbnails, the new Toe taps photo and its working Movement guide switch, and different artwork on the Train screen. The weekly calendar fits at 390×844 and 320×740, shows the actual local November 9–15 dates with November 14 emphasized, and still opens schedule preferences. Completion badges are covered by source review and existing progress tests; no fake completed practice was added for the screenshot. Native device rendering remains unverified. Latest preview: `output/screenshots/breakaway-main-menu-updated.jpg`.

## November 12 historical verification

## Verified

- All 205 tests and TypeScript checks pass.
- The production iOS export passes with 61 assets. The public cellular manifest was verified as SDK 58.
- At 390-point browser width, the photo library and drill detail display cleanly with loaded photography.
- The movement guide opens and completes; Replay, Pause and Resume controls were exercised. Switching back to Photo works.
- The guide is available in pre-timer practice setup. Starting the timer removes the learning media.
- The web blur crash was fixed and the affected interaction rechecked.

## Limits

The browser connection stalled at the End session prompt. Filmed playback, the Video demos filter and final session exit were not runtime verified in this pass. Native/iOS runtime behavior has not been tested. The successful iOS export does not establish device runtime behavior.

At that time, five contextual photographs were shared across 28 ground-work drill mappings. That photo mapping has been replaced by the November 14 one-original-per-drill registry. Filmed coverage remains the same two verified clips. Nonfilmed movement guides are authored top-view schematics, not human demonstrations. Photo provenance is in `assets/drill-photos`; filmed provenance and limits are in `assets/drill-demos`.
