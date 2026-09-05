const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

const source = fs.readFileSync(path.join(__dirname, "../app/api/speech/transcribe/route.ts"), "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;

async function runCase(audio, expectedStatus, credentialMode = "platform") {
  let requests = 0;
  const modules = {
    "next/server": { NextResponse: Response },
    "next-auth": { getServerSession: async () => ({ user: { id: "42" } }) },
    "../../../../lib/auth": { authOptions: {} },
    "../../../../lib/ai/userAiSettings": {
      getUserAiSettings: async (userId) => {
        assert.equal(userId, 42);
        return { credentialMode };
      },
    },
    "../../../../lib/ai/credentials/resolveAiCredential": {
      resolveAiCredential: async (input) => {
        assert.deepEqual({ ...input }, { userId: 42, provider: "openai", credentialMode });
        return { value: "test-only", baseUrl: "https://speech.example.test/v1/", projectId: "test-project" };
      },
    },
  };
  const context = vm.createContext({
    exports: {},
    require: (id) => {
      assert.ok(id in modules, `Unexpected import: ${id}`);
      return modules[id];
    },
    FormData,
    process: { env: {} },
    console,
    fetch: async (url, options) => {
      requests += 1;
      assert.equal(url, "https://speech.example.test/v1/audio/transcriptions");
      assert.equal(options.headers["OpenAI-Project"], "test-project");
      const file = options.body.get("file");
      assert.equal(file.size, audio.size);
      assert.equal(file.type, audio.type);
      assert.equal(options.body.get("model"), "whisper-1");
      return Response.json({ text: "Test transcript" });
    },
  });
  assert.equal(vm.runInContext("typeof File", context), "undefined");
  vm.runInContext(compiled, context);
  const form = new FormData();
  if (audio !== null) form.append("audio", audio);
  const request = new Request("https://site.example.test/api/speech/transcribe", { method: "POST", body: form });
  const response = await context.exports.POST(request);
  assert.equal(response.status, expectedStatus, JSON.stringify(await response.clone().json()));
  assert.equal(requests, expectedStatus === 200 ? 1 : 0);
  if (expectedStatus === 200) assert.equal((await response.json()).text, "Test transcript");
}

(async () => {
  await runCase(null, 400);
  await runCase("not an audio file", 400);
  await runCase(new Blob([], { type: "audio/webm" }), 400);
  await runCase(new Blob([new Uint8Array(25 * 1024 * 1024 + 1)], { type: "audio/webm" }), 413);
  for (const mode of ["platform", "user", "auto"]) {
    await runCase(new Blob(["test audio"], { type: "audio/webm" }), 200, mode);
  }
  await runCase(new Blob(["test audio"], { type: "audio/mp4" }), 200);
  console.log("PASS: 8 multipart transcription cases without global File; no external API calls.");
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
