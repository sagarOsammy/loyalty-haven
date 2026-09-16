// Exercise the built Worker with synthetic identities and data, never live secrets.
// Run the Sites production build first, then node scripts/verify-private-worker.mjs.
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Miniflare, convertV4MiniflareOptions } from "miniflare";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const server = resolve(root, "dist/server");
const config = JSON.parse(await readFile(resolve(server, "wrangler.json"), "utf8"));
const entries = await readdir(server, { recursive: true });
const modules = entries.filter((name) => name.endsWith(".js"))
  .map((name) => ({ type: "ESModule", path: resolve(server, name) }));
// The entrypoint must be the first module. Explicit modules also cover lazy imports.
modules.sort((a, b) => Number(b.path === resolve(server, config.main)) -
  Number(a.path === resolve(server, config.main)));
const snapshot = {
  memberships: [{ id: "fixture", memberId: "TEST-ONLY-001" }],
  directoryOnlyHotelAccounts: [],
};
const bindings = {
  LOYALTY_OWNER_USER_ID: "test-owner",
  LOYALTY_PRIVATE_SNAPSHOT_JSON: JSON.stringify(snapshot),
};
const workerOptions = {
  name: "private-access-verification",
  modules,
  modulesRoot: server,
  compatibilityDate: config.compatibility_date,
  compatibilityFlags: config.compatibility_flags,
  bindings,
};
// Use Miniflare's supported adapter for the existing explicit module setup.
const options = (values = bindings) => convertV4MiniflareOptions({
  host: "127.0.0.1",
  port: 0,
  workers: [{ ...workerOptions, bindings: values }],
});
const worker = new Miniflare(options());
const identity = (id, email = "owner@example.test") => ({
  "oai-authenticated-user-id": id,
  "oai-authenticated-user-email": email,
});
let passed = 0;
async function check(label, headers, status, error) {
  const response = await worker.dispatchFetch("http://localhost/api/loyalty/private", { headers });
  assert.equal(response.status, status, label);
  assert.equal(response.headers.get("cache-control"), "private, no-store", label);
  const body = await response.json();
  if (status === 200) {
    assert.deepEqual(body.memberships, snapshot.memberships, label);
    assert.deepEqual(body.directoryOnlyHotelAccounts, [], label);
  } else {
    assert.equal(body.error, error, label);
    assert.equal("memberships" in body, false, label);
    assert.equal(JSON.stringify(body).includes("TEST-ONLY-001"), false, label);
  }
  passed++;
  console.log(`PASS ${label}`);
}
try {
  await check("anonymous denied", {}, 401, "authentication_required");
  await check("partial identity denied", { "oai-authenticated-user-id": "test-owner" }, 401, "authentication_required");
  await check("non-owner denied", identity("test-other", "other@example.test"), 403, "owner_access_required");
  await check("configured owner allowed", identity("test-owner"), 200);
  await check("anonymous after owner still denied", {}, 401, "authentication_required");
  await worker.setOptions(options({ ...bindings, LOYALTY_OWNER_USER_ID: "" }));
  await check("missing allowlist fails closed", identity("test-owner"), 503, "owner_not_configured");
  await worker.setOptions(options({ ...bindings, LOYALTY_PRIVATE_SNAPSHOT_JSON: "invalid" }));
  await check("invalid snapshot fails closed", identity("test-owner"), 503, "private_snapshot_unavailable");
  await worker.setOptions(options({
    ...bindings, LOYALTY_OWNER_USER_ID: "", LOYALTY_OWNER_EMAIL: " OWNER@example.test ",
  }));
  await check("normalized owner email allowed", identity("test-email-owner"), 200);
  await check("different email denied", identity("test-other", "other@example.test"), 403, "owner_access_required");
  console.log(`${passed} built-Worker access checks passed using synthetic data.`);
} finally {
  await worker.dispose();
}
