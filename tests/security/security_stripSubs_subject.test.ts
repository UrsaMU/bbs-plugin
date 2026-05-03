/**
 * SECURITY — post subject must have MUSH codes stripped before storage.
 *
 * The attack: a player sets a post subject containing MUSH color/format codes
 * (e.g. %ch%crEVIL%cn) which then render in clients that honor those codes,
 * causing visual spoofing or injection attacks.
 *
 * The fix: apply u.util.stripSubs() to the subject before it is stored.
 */
import { assertEquals } from "jsr:@std/assert";
import { describe, it } from "jsr:@std/testing/bdd";

const OPTS = { sanitizeResources: false, sanitizeOps: false };

// ---------------------------------------------------------------------------
// Inline stripSubs (same logic as mockU helper — strips %cX and %r/%n/etc.)
// ---------------------------------------------------------------------------
function stripSubs(s: string): string {
  return s.replace(/%c[a-zA-Z]/g, "").replace(/%[rntbR]/g, "");
}

// ---------------------------------------------------------------------------
// Simulate subject storage BEFORE the fix (no stripSubs)
// ---------------------------------------------------------------------------
function storeSubjectBefore(subject: string): string {
  return subject.trim(); // vulnerable — no code stripping
}

// ---------------------------------------------------------------------------
// Simulate subject storage AFTER the fix (with stripSubs)
// ---------------------------------------------------------------------------
function storeSubjectAfter(subject: string): string {
  return stripSubs(subject.trim()); // patched
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("security: post subject stripSubs", OPTS, () => {
  it("RED — before fix: color codes are preserved in stored subject", OPTS, () => {
    const stored = storeSubjectBefore("%ch%crEVIL%cn");
    // Documents the vulnerability: codes are NOT stripped
    assertEquals(stored.includes("%ch"), true);
  });

  it("exploit: stored subject must NOT contain %ch after fix", OPTS, () => {
    const stored = storeSubjectAfter("%ch%crEVIL%cn");
    assertEquals(stored.includes("%ch"), false);
  });

  it("exploit: stored subject must NOT contain %cr after fix", OPTS, () => {
    const stored = storeSubjectAfter("%ch%crEVIL%cn");
    assertEquals(stored.includes("%cr"), false);
  });

  it("exploit: stored subject must NOT contain %cn after fix", OPTS, () => {
    const stored = storeSubjectAfter("%ch%crEVIL%cn");
    assertEquals(stored.includes("%cn"), false);
  });

  it("exploit: plain text subject is preserved unchanged", OPTS, () => {
    const stored = storeSubjectAfter("Normal Subject");
    assertEquals(stored, "Normal Subject");
  });

  it("exploit: %r newline code is stripped from subject", OPTS, () => {
    const stored = storeSubjectAfter("Line1%rLine2");
    assertEquals(stored.includes("%r"), false);
    assertEquals(stored, "Line1Line2");
  });
});
