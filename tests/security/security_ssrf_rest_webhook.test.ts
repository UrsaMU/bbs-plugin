/**
 * SECURITY — exploit test: SSRF via REST PATCH /api/v1/boards/:id
 *
 * The attack: a staff member PATCHes a board's webhookUrl to an IMDS endpoint
 * (http://169.254.169.254/latest/meta-data/) to exfiltrate cloud credentials
 * the next time any post fires the webhook.
 *
 * Before the fix the handler blindly accepts any string; it must return 400.
 */
import { assertEquals } from "jsr:@std/assert";
import { describe, it } from "jsr:@std/testing/bdd";

const OPTS = { sanitizeResources: false, sanitizeOps: false };

// ---------------------------------------------------------------------------
// Inline router under test — we stub only the dependencies that matter.
// ---------------------------------------------------------------------------

// Stub boards store
const fakeBoard = {
  id: "board-1", num: 1, title: "Test Board", category: "General",
  type: "normal", moderators: [], readLock: "all()", writeLock: "all()",
  timeout: 0, anonymous: false, pendingDelete: false,
};

const boardsStore = {
  _data: { ...fakeBoard } as Record<string, unknown>,
  queryOne: async (_q: unknown) => ({ ...fakeBoard }),
  modify: async (_q: unknown, _op: string, patch: Record<string, unknown>) => {
    Object.assign(boardsStore._data, patch);
  },
};

// Stub dbojs — staff user
const dbojs = {
  queryOne: async (_q: unknown) => ({ id: "staff1", flags: "admin" }),
};

// ---------------------------------------------------------------------------
// Import the router handler under test via dynamic re-wiring using a local
// copy of the relevant logic. Rather than trying to mock JSR modules, we
// replicate just the PATCH handler logic here so we can test the guard in
// isolation.  The "before" version has no guard; the "after" version does.
// ---------------------------------------------------------------------------

import { isWebhookUrlSafe } from "../../src/url-safety.ts";

// Simulate the PATCH handler behaviour BEFORE the fix (no URL safety check).
async function patchHandlerBefore(webhookUrl: string): Promise<Response> {
  const allowed = ["title", "readLock", "writeLock", "timeout", "anonymous", "category", "type", "webhookUrl", "archiveTo"];
  const body: Record<string, unknown> = { webhookUrl };
  const patch: Record<string, unknown> = {};
  for (const k of allowed) { if (k in body) patch[k] = body[k]; }
  await boardsStore.modify({}, "$set", patch);
  return Response.json({ ...fakeBoard, ...patch });
}

// Simulate the PATCH handler behaviour AFTER the fix (with URL safety check).
async function patchHandlerAfter(webhookUrl: string): Promise<Response> {
  const allowed = ["title", "readLock", "writeLock", "timeout", "anonymous", "category", "type", "webhookUrl", "archiveTo"];
  const body: Record<string, unknown> = { webhookUrl };
  const patch: Record<string, unknown> = {};
  for (const k of allowed) {
    if (k === "webhookUrl") {
      if (typeof body.webhookUrl === "string" && !isWebhookUrlSafe(body.webhookUrl)) {
        return Response.json({ error: "Invalid webhook URL." }, { status: 400 });
      }
    }
    if (k in body) patch[k] = body[k];
  }
  await boardsStore.modify({}, "$set", patch);
  return Response.json({ ...fakeBoard, ...patch });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("security: SSRF via REST PATCH webhookUrl", OPTS, () => {
  it("RED — before fix: IMDS link-local URL is accepted (200)", OPTS, async () => {
    const res = await patchHandlerBefore("http://169.254.169.254/latest/meta-data/");
    // Documents the vulnerability: handler returns 200, not 400
    assertEquals(res.status, 200);
  });

  it("exploit: PATCH with IMDS URL must be rejected with 400 (after fix)", OPTS, async () => {
    const res = await patchHandlerAfter("http://169.254.169.254/latest/meta-data/");
    assertEquals(res.status, 400);
    const body = await res.json();
    assertEquals(body.error, "Invalid webhook URL.");
  });

  it("exploit: PATCH with RFC-1918 URL must be rejected with 400 (after fix)", OPTS, async () => {
    const res = await patchHandlerAfter("https://192.168.1.100/internal");
    assertEquals(res.status, 400);
  });

  it("exploit: PATCH with loopback URL must be rejected with 400 (after fix)", OPTS, async () => {
    const res = await patchHandlerAfter("https://127.0.0.1/admin");
    assertEquals(res.status, 400);
  });

  it("safe: PATCH with legitimate HTTPS webhook URL is accepted (after fix)", OPTS, async () => {
    const res = await patchHandlerAfter("https://hooks.slack.com/services/T00/B00/abc123");
    assertEquals(res.status, 200);
  });
});
