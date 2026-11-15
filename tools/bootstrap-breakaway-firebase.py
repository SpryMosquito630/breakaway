#!/usr/bin/env python3
"""Inspect or finish Breakaway Firebase setup; never prints access/API keys.

Run without arguments for permission/billing checks. After the account holder has
accepted Firebase Terms in the console, use --apply to register the existing app.
Only the dedicated Breakaway project below is supported. Firebase's public iOS
configuration is written to GoogleService-Info.plist; no service-account or Apple
private key is needed. Cloud Run/Firestore configuration is managed separately.
"""
import argparse
import base64
import json
from pathlib import Path
import subprocess
import sys
import time
import urllib.error
import urllib.request

PROJECT = "breakaway-analysis-2026-1115"
NUMBER = "467843664681"
BUNDLE = "com.sprymosquito630.breakaway"
TEAM = "23C48WC9WF"
STORE = "6832437565"
ROOT = Path(__file__).resolve().parents[1]
FIREBASE = "https://firebase.googleapis.com/v1beta1/"


class ApiError(Exception):
    def __init__(self, code, status, message):
        self.code, self.status, self.message = code, status, message
        super().__init__(f"HTTP {code} {status}: {message}")


class Setup:
    def __init__(self):
        self.token = subprocess.check_output(
            ["gcloud", "auth", "print-access-token"], text=True
        ).strip()

    def request(self, method, url, data=None):
        request = urllib.request.Request(
            url,
            data=json.dumps(data).encode() if data is not None else None,
            method=method,
            headers={
                "Authorization": "Bearer " + self.token,
                "Content-Type": "application/json",
                "x-goog-user-project": PROJECT,
            },
        )
        try:
            with urllib.request.urlopen(request, timeout=90) as response:
                raw = response.read()
                return json.loads(raw) if raw else {}
        except urllib.error.HTTPError as error:
            # Never include request headers, bodies, or key-bearing URLs in logs.
            payload = json.loads(error.read()).get("error", {})
            raise ApiError(error.code, payload.get("status", ""), payload.get("message", "Request failed")) from None

    def poll(self, operation, base=FIREBASE):
        for _ in range(60):
            if operation.get("done"):
                if "error" in operation:
                    error = operation["error"]
                    raise ApiError(error.get("code", 500), "OPERATION_FAILED", error.get("message", "Operation failed"))
                return operation.get("response", {})
            time.sleep(3)
            operation = self.request("GET", base + operation["name"])
        raise RuntimeError("Cloud operation still pending; inspect its status before retrying")

    def checks(self):
        billing = json.loads(subprocess.check_output([
            "gcloud", "billing", "projects", "describe", PROJECT,
            "--format=json(projectId,billingEnabled)",
        ], text=True))
        if billing.get("projectId") != PROJECT or not billing.get("billingEnabled"):
            raise RuntimeError("Dedicated Breakaway project billing is not enabled")
        permissions = ["firebase.projects.update", "resourcemanager.projects.get",
                       "serviceusage.services.enable", "serviceusage.services.get"]
        granted = self.request("POST", f"https://cloudresourcemanager.googleapis.com/v1/projects/{PROJECT}:testIamPermissions", {"permissions": permissions})
        if set(granted.get("permissions", [])) != set(permissions):
            raise RuntimeError("Missing Firebase bootstrap IAM permissions")
        print(json.dumps({"projectId": PROJECT, "projectNumber": NUMBER,
                          "billingEnabled": True, "requiredPermissionsGranted": True}))

    def apply(self):
        # Existing auth may already be initialized even when Firebase Terms block addFirebase.
        try:
            self.request("GET", FIREBASE + "projects/" + PROJECT)
        except ApiError as error:
            if error.code != 404:
                raise
            operation = self.request("POST", FIREBASE + f"projects/{PROJECT}:addFirebase", {})
            self.poll(operation)
        auth_url = f"https://identitytoolkit.googleapis.com/admin/v2/projects/{PROJECT}/config"
        try:
            self.request("GET", auth_url)
        except ApiError as error:
            if error.code != 404:
                raise
            self.request("POST", f"https://identitytoolkit.googleapis.com/v2/projects/{PROJECT}/identityPlatform:initializeAuth", {})
        auth = self.request("PATCH", auth_url + "?updateMask=signIn.anonymous.enabled,autodeleteAnonymousUsers", {"signIn": {"anonymous": {"enabled": True}}, "autodeleteAnonymousUsers": True})
        apps = self.request("GET", FIREBASE + f"projects/{PROJECT}/iosApps").get("apps", [])
        matches = [app for app in apps if app.get("bundleId") == BUNDLE]
        if len(matches) > 1:
            raise RuntimeError("Multiple matching iOS app registrations; inspect manually")
        app = matches[0] if matches else self.poll(self.request("POST", FIREBASE + f"projects/{PROJECT}/iosApps", {
            "displayName": "Breakaway iOS", "bundleId": BUNDLE, "teamId": TEAM, "appStoreId": STORE,
        }))
        app = self.request("PATCH", FIREBASE + app["name"] + "?updateMask=teamId,appStoreId", {"teamId": TEAM, "appStoreId": STORE})
        app_id = app["appId"]
        check_url = f"https://firebaseappcheck.googleapis.com/v1/projects/{NUMBER}/apps/{app_id}/appAttestConfig"
        check = self.request("PATCH", check_url + "?updateMask=tokenTtl", {"tokenTtl": "3600s"})
        # Only restrict the client key associated with this new iOS app. No Gemini key is touched.
        key_uid = app.get("apiKeyId")
        if not key_uid:
            raise RuntimeError("Firebase iOS app has no associated client API key")
        key_url = f"https://apikeys.googleapis.com/v2/projects/{NUMBER}/locations/global/keys/{key_uid}"
        key = self.request("GET", key_url)
        restrictions = {"iosKeyRestrictions": {"allowedBundleIds": [BUNDLE]},
                        "apiTargets": [{"service": service} for service in [
                            "identitytoolkit.googleapis.com", "securetoken.googleapis.com",
                            "firebaseappcheck.googleapis.com", "firebaseinstallations.googleapis.com"]]}
        update = {"name": key["name"], "restrictions": restrictions}
        if key.get("etag"):
            update["etag"] = key["etag"]
        self.poll(self.request("PATCH", key_url + "?updateMask=restrictions", update), "https://apikeys.googleapis.com/v2/")
        config = self.request("GET", FIREBASE + app["name"] + "/config")
        output = ROOT / "GoogleService-Info.plist"
        output.write_bytes(base64.b64decode(config["configFileContents"]))
        import plistlib
        parsed = plistlib.loads(output.read_bytes())
        if parsed.get("PROJECT_ID") != PROJECT or parsed.get("BUNDLE_ID") != BUNDLE or parsed.get("GOOGLE_APP_ID") != app_id:
            raise RuntimeError("Downloaded public iOS configuration does not match registration")
        print(json.dumps({"projectId": PROJECT, "projectNumber": NUMBER, "firebaseAppId": app_id,
                          "bundleId": BUNDLE, "teamId": TEAM, "appStoreId": STORE,
                          "anonymousEnabled": auth.get("signIn", {}).get("anonymous", {}).get("enabled"),
                          "autodeleteAnonymousUsers": auth.get("autodeleteAnonymousUsers"),
                          "appAttestTokenTtl": check.get("tokenTtl"), "clientApiRestrictions": restrictions,
                          "configurationPath": str(output)}, indent=2))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--apply", action="store_true", help="Finish cloud setup after Firebase Terms acceptance")
    args = parser.parse_args()
    setup = Setup()
    setup.checks()
    if args.apply:
        setup.apply()
    else:
        print("Checks passed. No cloud resources changed. Use --apply after Firebase Terms acceptance.")


if __name__ == "__main__":
    try:
        main()
    except (ApiError, RuntimeError, subprocess.CalledProcessError) as error:
        print(str(error), file=sys.stderr)
        sys.exit(1)
