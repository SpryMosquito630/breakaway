import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import ts from "typescript";

const root = path.resolve(__dirname, "..");
const expoRoot = path.join(root, "node_modules/expo/src/winter");

// Run the installed Expo fetch, FormData patch and serializer. Only native I/O
// boundaries are replaced: no local user files, network or provider is accessed.
function uploadHarness(os: "ios" | "android" | "web" = "ios", hosted = false) {
  const requests: { url: string; init: any; body: Uint8Array }[] = [];
  const files = new Map<string, { bytes: Uint8Array; size?: number }>();
  let canceled = false;
  let reads = 0;
  let onStart = () => {};
  class NativeFormData {
    _parts: unknown[] = [];
  }
  class LocalFile {
    constructor(public uri: string) {
      assert.ok(files.has(uri), "only synthetic fixture files can be opened");
    }
    get name() {
      return path.basename(this.uri);
    }
    get type() {
      return this.name.endsWith(".jpg")
        ? "image/jpeg"
        : this.name.endsWith(".mov")
          ? "video/quicktime"
          : "video/mp4";
    }
    get size() {
      return files.get(this.uri)!.size ?? files.get(this.uri)!.bytes.length;
    }
    async bytes() {
      reads++;
      return files.get(this.uri)!.bytes;
    }
  }
  const modules = new Map<string, any>();
  const mocks: Record<string, any> = {
    "react-native": { Platform: { OS: os } },
    "expo-constants": { default: {} },
    "expo-file-system": { File: LocalFile },
    "expo-crypto": { randomUUID: () => "synthetic-request-id" },
    [path.join(root, "src/config/hostedAnalysis.ts")]: {
      HOSTED_ANALYSIS_CONFIG: hosted ? { base: "https://hosted.example.com" } : null,
    },
    [path.join(root, "src/coachAi/hostedIdentity.ts")]: {
      hostedIdentity: async () => ({
        userId: "guest",
        idToken: "firebase-id-token",
        appCheckToken: "app-attestation",
      }),
    },
    [path.join(root, "src/config/coach.ts")]: { COACH_DEV_ENABLED: true },
    [path.join(root, "src/connected/client.ts")]: {
      connectedClient: {
        auth: {
          getSession: async () => ({
            data: {
              session: {
                access_token: "synthetic-user-token",
                user: { id: "synthetic-user" },
              },
            },
          }),
        },
      },
    },
    [path.join(root, "src/coachAi/pairStore.ts")]: {
      coachPairRevision: () => 0,
      forgetStoredCoachPair: async () => {},
    },
    [path.join(expoRoot, "fetch/ExpoFetchModule.ts")]: {
      ExpoFetchModule: {
        NativeRequest: class {
          async start(url: string, init: any, body: Uint8Array) {
            requests.push({ url, init, body });
            onStart();
          }
          cancel() {
            canceled = true;
          }
        },
      },
    },
    [path.join(expoRoot, "fetch/FetchResponse.ts")]: {
      FetchResponse: class {
        ok = true;
        stopped = false;
        constructor(private cleanup: () => void) {}
        async json() {
          this.cleanup();
          if (this.stopped)
            throw Object.assign(new Error("Stopped"), { name: "AbortError" });
          return { accepted: true };
        }
        abort() {
          this.stopped = true;
        }
      },
    },
  };
  function load(filename: string): any {
    if (filename in mocks) return mocks[filename];
    if (modules.has(filename)) return modules.get(filename);
    const module = { exports: {} };
    modules.set(filename, module.exports);
    const code = ts.transpileModule(readFileSync(filename, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        esModuleInterop: true,
      },
    }).outputText;
    const localRequire = (specifier: string) => {
      if (specifier in mocks) return mocks[specifier];
      if (specifier === "expo/fetch") return load(path.join(expoRoot, "fetch/fetch.ts"));
      if (specifier.startsWith("."))
        return load(path.resolve(path.dirname(filename), `${specifier}.ts`));
      return createRequire(filename)(specifier);
    };
    new Function("require", "module", "exports", code)(
      localRequire,
      module,
      module.exports,
    );
    modules.set(filename, module.exports);
    return module.exports;
  }
  const patched = load(path.join(expoRoot, "FormData.ts")).installFormDataPatch(
    NativeFormData,
  );
  const originalFormData = globalThis.FormData;
  globalThis.FormData = (os === "web" ? originalFormData : patched) as typeof FormData;
  return {
    service: load(path.join(root, "src/coachAi/service.ts")),
    normalize: load(path.join(expoRoot, "fetch/RequestUtils.ts")).normalizeBodyInitAsync,
    files,
    requests,
    reads: () => reads,
    canceled: () => canceled,
    onStart: (callback: () => void) => {
      onStart = callback;
    },
    restore: () => {
      globalThis.FormData = originalFormData;
    },
  };
}
const service = {
  base: "https://synthetic.example/api/replay",
  token: "synthetic-service-token",
  chatPairToken: "synthetic-pair-token",
  chatPairExpiresAt: Date.now() + 600000,
};
const uri = "file:///synthetic/shot.mov";
const bytes = new Uint8Array([0, 255, 13, 10, 42, 128]);

test("hosted native upload uses Firebase auth and stable caller operation ID without local credentials", async () => {
  const h = uploadHarness("ios", true);
  try {
    h.files.set(uri, { bytes });
    const form = await h.service.clipForm({ uri, duration: 30000 });
    await h.service.requestService(
      { ...service, hosted: true },
      "shot-review",
      form,
      new AbortController().signal,
      false,
      undefined,
      "synthetic-operation-id",
    );
    const headers = Object.fromEntries(h.requests[0].init.headers);
    assert.equal(headers.Authorization, "Bearer firebase-id-token");
    assert.equal(headers["X-Firebase-AppCheck"], "app-attestation");
    assert.equal(headers["X-Request-ID"], "synthetic-operation-id");
    assert.equal(headers["X-User-Token"], undefined);
    assert.equal(headers["X-Coach-Pair"], undefined);
    assert.ok(Buffer.from(h.requests[0].body).includes(Buffer.from(bytes)));
    h.files.set(uri, { bytes, size: 26 * 1024 * 1024 });
    await assert.rejects(h.service.clipForm({ uri }), /smaller than 25 MB/);
  } finally {
    h.restore();
  }
});

test("picked clips are preflighted using actual exported bytes before any request", async () => {
  const h = uploadHarness("ios", true);
  try {
    // A short video can be large; duration is not a byte-size estimate.
    h.files.set(uri, { bytes, size: 25 * 1024 * 1024 + 1 });
    await assert.rejects(
      h.service.validateClipAsset({ uri, duration: 1400 }),
      (error: any) =>
        error instanceof h.service.ClipValidationError &&
        /Trim it in Photos/.test(error.message),
    );
    assert.equal(h.reads(), 0);
    assert.equal(h.requests.length, 0);
    // The exact limit is accepted; validation never reads video bytes into JS.
    h.files.set(uri, { bytes, size: 25 * 1024 * 1024 });
    assert.equal((await h.service.validateClipAsset({ uri })).size, 25 * 1024 * 1024);
    h.files.set(uri, { bytes, size: 0 });
    await assert.rejects(h.service.validateClipAsset({ uri }), /could not be read/);
    assert.equal(h.reads(), 0);
  } finally {
    h.restore();
  }
});

test("hosted discovery verifies server auth marker before considering the connection usable", async () => {
  const h = uploadHarness("ios", true);
  const originalFetch = globalThis.fetch;
  try {
    let health: Record<string, unknown> = { available: true, jointViewAvailable: true };
    globalThis.fetch = (async () => new Response(JSON.stringify(health))) as typeof fetch;
    assert.equal(await h.service.discoverService(), null);
    health = { ...health, hosted: true, authentication: "firebase" };
    const found = await h.service.discoverService();
    assert.equal(found.hosted, true);
    assert.equal(found.token, "");
    assert.equal(found.base, "https://hosted.example.com");
  } finally {
    globalThis.fetch = originalFetch;
    h.restore();
  }
});

test("native video reaches Expo's native request with binary multipart, context and auth", async () => {
  for (const os of ["ios", "android"] as const) {
    const h = uploadHarness(os);
    try {
      h.files.set(uri, { bytes });
      const form = await h.service.clipForm(
        { uri, duration: 30000, mimeType: "video/quicktime" },
        { question: "Ünicode ⚽" },
      );
      const result = await h.service.requestService(
        service,
        "shot-review",
        form,
        new AbortController().signal,
      );
      assert.deepEqual(result, { accepted: true });
      assert.equal(h.reads(), 1);
      const request = h.requests[0];
      assert.equal(request.url, `${service.base}/shot-review`);
      const headers = Object.fromEntries(request.init.headers);
      assert.equal(headers.Authorization, `Bearer ${service.token}`);
      assert.equal(headers["X-User-Token"], "synthetic-user-token");
      assert.equal(headers["X-Coach-Pair"], service.chatPairToken);
      assert.equal(headers["X-Include-Pose"], "1");
      const boundary = headers["Content-Type"].split("boundary=")[1];
      assert.match(boundary, /^----ExpoFetchFormBoundary\w{16}$/);
      const text = new TextDecoder().decode(request.body);
      assert.ok(text.startsWith(`--${boundary}\r\n`));
      assert.ok(text.endsWith(`--${boundary}--\r\n`));
      assert.match(
        text,
        /name="video"; filename="shot.mov"\r\ncontent-type: video\/quicktime/,
      );
      assert.match(text, /name="context"\r\n\r\n\{"question":"Ünicode ⚽"\}/);
      assert.ok(
        Buffer.from(request.body).includes(Buffer.from(bytes)),
        "binary file bytes must survive serialization",
      );
    } finally {
      h.restore();
    }
  }
});

test("installed Expo serializer reproduces the rejected legacy URI descriptor", async () => {
  const h = uploadHarness();
  try {
    const form = new FormData();
    form.append("video", { uri, name: "recording.mp4", type: "video/mp4" } as any);
    await assert.rejects(h.normalize(form), /Unsupported FormDataPart implementation/);
    assert.equal(h.requests.length, 0);
  } finally {
    h.restore();
  }
});

test("native upload limits reject picker or actual-file oversize and duration before reading bytes", async () => {
  const h = uploadHarness();
  try {
    h.files.set(uri, { bytes, size: 50 * 1024 * 1024 + 1 });
    await assert.rejects(h.service.clipForm({ uri }), /smaller than 50 MB/);
    await assert.rejects(
      h.service.clipForm({ uri, fileSize: 50 * 1024 * 1024 + 1 }),
      /smaller than 50 MB/,
    );
    await assert.rejects(
      h.service.clipForm({ uri, duration: 30051 }),
      /up to 30 seconds/,
    );
    assert.equal(h.reads(), 0);
    h.files.set(uri, { bytes, size: 50 * 1024 * 1024 });
    await h.service.clipForm({ uri, duration: 30050 });
    assert.equal(h.requests.length, 0);
  } finally {
    h.restore();
  }
});

test("native request abort is checked before upload and forwarded during serialization", async () => {
  const h = uploadHarness();
  try {
    h.files.set(uri, { bytes });
    const form = await h.service.clipForm({ uri });
    const abort = new AbortController();
    abort.abort();
    await assert.rejects(h.service.requestService(service, "pose", form, abort.signal), {
      name: "AbortError",
    });
    assert.equal(h.reads(), 0);
    const during = new AbortController();
    const file = form.get("video") as any;
    const originalRead = file.bytes.bind(file);
    file.bytes = async () => {
      during.abort();
      return originalRead();
    };
    await assert.rejects(
      h.service.requestService(service, "pose", form, during.signal),
      /aborted/,
    );
    assert.equal(h.requests.length, 0);
  } finally {
    h.restore();
  }
});

test("browser File/Blob uploads retain binary content and avoid native file access", async () => {
  const h = uploadHarness("web");
  try {
    const form = await h.service.clipForm(
      { uri: "blob:synthetic", file: new Blob([bytes], { type: "video/mp4" }) },
      { mode: "browser" },
    );
    const response = new Response(form);
    const parts = (await response.formData()) as unknown as {
      get(name: string): unknown;
    };
    const video = parts.get("video") as File;
    assert.equal(video.name, "recording.mp4");
    assert.deepEqual(new Uint8Array(await video.arrayBuffer()), bytes);
    assert.equal(parts.get("context"), '{"mode":"browser"}');
    assert.equal(h.reads(), 0);
  } finally {
    h.restore();
  }
});

test("canceling an active native upload reaches Expo's native cancel hook", async () => {
  const h = uploadHarness();
  try {
    h.files.set(uri, { bytes });
    const form = await h.service.clipForm({ uri });
    const abort = new AbortController();
    h.onStart(() => abort.abort());
    await assert.rejects(h.service.requestService(service, "pose", form, abort.signal), {
      name: "AbortError",
    });
    assert.equal(h.requests.length, 1);
    assert.equal(h.canceled(), true);
  } finally {
    h.restore();
  }
});

test("native food multipart uses File bytes and enforces the actual-file 5 MB bound", async () => {
  const h = uploadHarness();
  const originalFetch = globalThis.fetch;
  const originalURL = process.env.EXPO_PUBLIC_ANALYSIS_URL;
  const originalToken = process.env.EXPO_PUBLIC_ANALYSIS_TOKEN;
  const photoURI = "file:///synthetic/meal.jpg";
  try {
    process.env.EXPO_PUBLIC_ANALYSIS_URL = service.base;
    process.env.EXPO_PUBLIC_ANALYSIS_TOKEN = service.token;
    globalThis.fetch = (async () =>
      new Response(
        JSON.stringify({ available: true, aiAvailable: true }),
      )) as typeof fetch;
    h.files.set(photoURI, { bytes, size: 5 * 1024 * 1024 + 1 });
    await assert.rejects(
      h.service.estimateFoodPhoto({ uri: photoURI }),
      /smaller than 5 MB/,
    );
    assert.equal(h.requests.length, 0);
    assert.equal(h.reads(), 0);
    h.files.set(photoURI, { bytes });
    await h.service.estimateFoodPhoto({ uri: photoURI }, 125);
    const text = new TextDecoder().decode(h.requests[0].body);
    assert.match(text, /name="photo"; filename="meal.jpg"\r\ncontent-type: image\/jpeg/);
    assert.match(text, /\{"portionGrams":125\}/);
    assert.ok(Buffer.from(h.requests[0].body).includes(Buffer.from(bytes)));
  } finally {
    globalThis.fetch = originalFetch;
    if (originalURL === undefined) delete process.env.EXPO_PUBLIC_ANALYSIS_URL;
    else process.env.EXPO_PUBLIC_ANALYSIS_URL = originalURL;
    if (originalToken === undefined) delete process.env.EXPO_PUBLIC_ANALYSIS_TOKEN;
    else process.env.EXPO_PUBLIC_ANALYSIS_TOKEN = originalToken;
    h.restore();
  }
});
