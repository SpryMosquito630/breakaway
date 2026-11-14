# Drill media verification

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
