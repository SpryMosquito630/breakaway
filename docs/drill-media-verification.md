# Drill media verification

## November 14 source-uniqueness update

Ten distinct contextual photograph originals are assigned one per drill, with the two existing films/posters unchanged. Sixteen ground-work drills use their own authored movement diagram; two keeper drills use explicit category icons. No image or alternate crop of an original is shared between drills. Sole-contact context is assigned to Touch and freeze (`foundation-stop`), while Pull-back turns uses its authored path. All final photographs were reviewed in a labeled contact sheet.

Provenance, exact transformations, source/license links and output hashes are recorded in `assets/drill-photos`. Static uniqueness tests validate original source IDs, actual registry assets, film poster paths, hashes, size budgets and movement fallbacks without loading React Native assets.

Current checks: all 208 tests and TypeScript pass; formatting and whitespace checks pass. Production iOS export passes with 66 assets. Browser review at 390×844 confirmed distinct photo/diagram thumbnails, the new Toe taps photo and its working Movement guide switch, and different artwork on the Train screen. The weekly calendar fits at 390×844 and 320×740, shows the actual local November 9–15 dates with November 14 emphasized, and still opens schedule preferences. Completion badges are covered by source review and existing progress tests; no fake completed practice was added for the screenshot. Native device rendering remains unverified. Latest preview: `output/screenshots/breakaway-main-menu-updated.jpg`.

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
