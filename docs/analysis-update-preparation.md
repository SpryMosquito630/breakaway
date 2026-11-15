# Analyze update prepared for review

This update is source-only. Native build 8 on TestFlight does not contain these changes. Every new native build and every TestFlight upload still requires separate explicit owner approval.

- App icon uses the previously created neon ball from `output/brand/breakaway-ball-icon-v2-1024.png`, copied exactly into `assets/icon.png` (1024×1024 RGB, no alpha). The signed build8 icon was inspected and still contained the Expo placeholder; Apple displays the icon compiled into the uploaded binary.
- iOS video selection and recording request the existing SDK58 720p H.264 export preset rather than library passthrough. The selected/exported file is checked immediately, before review state or identity restoration. The hosted cap stays25MiB; compression does not guarantee every clip fits. A blocked legacy clip offers replacement rather than a retry that cannot change its bytes.
- Speed and technique use a flat theme-aware stats row with consistent type, explicit manual/AI provenance and honest empty states. A valid withheld review says Not scored. Existing measurement, evidence seeking, retry and disabled flows remain intact.

Verification: TypeScript, scoped upload/review/speed/technique/theme tests and native permission prebuild regression pass. Actual RN-web component previews cover375/390px, light/dark, empty/result/busy/error/offline states, evidence seeking and a2× text simulation. This is not native Dynamic Type or device verification.

An offline macOS AVFoundation test exported a synthetic2-second uncompressed MOV above25MiB (29,492,042bytes) through AVAssetExportPreset1280x720 to a187,478-byte H.264 MP4. Duration,1280×720 dimensions, orientation and16frames/8fps were preserved; full-frame SSIM0.9668 and corner comparisons support no crop. This does not prove iPhone Photos handling, edited trims or the user's private recording. No private clip or live provider call was used; temporary media was deleted.

Before approving another native build, review the actual-component preview. After an approved build, inspect its compiled logo, native microphone/camera/photo descriptions, production App Attest, matching provisioning/Firebase identity and strict code signature. Obtain fresh upload approval, then distribute only to the existing owner group. On the iPhone, verify both a newly selected large short clip and an edited Photos clip retain the intended duration/framing, prepare under the size cap, and complete authenticated analysis. Do not assert authentication works from a local file-size failure.
