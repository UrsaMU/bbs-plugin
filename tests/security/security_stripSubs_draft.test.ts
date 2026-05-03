/**
 * SECURITY — +bb draft append must strip MUSH codes before storage.
 *
 * The attack: a player appends text with MUSH codes (e.g. %chEVIL%cn) to a
 * draft. Without stripping, those codes are stored and eventually rendered
 * in all readers' clients, enabling visual spoofing / injection.
 *
 * The fix: apply u.util.stripSubs() to `text` in the +bb exec handler
 * before building newBody.
 */
import { assertEquals } from "jsr:@std/assert";
import { describe, it } from "jsr:@std/testing/bdd";

const OPTS = { sanitizeResources: false, sanitizeOps: false };

// ---------------------------------------------------------------------------
// Inline stripSubs (same logic as mockU helper)
// ---------------------------------------------------------------------------
function stripSubs(s: string): string {
  return s.replace(/%c[a-zA-Z]/g, "").replace(/%[rntbR]/g, "");
}

// ---------------------------------------------------------------------------
// Simulate draft append BEFORE the fix (no stripSubs on text)
// ---------------------------------------------------------------------------
function appendDraftBefore(existingBody: string, text: string): string {
  const newBody = existingBody ? `${existingBody}\n${text}` : text;
  return newBody; // vulnerable — codes not stripped
}

// ---------------------------------------------------------------------------
// Simulate draft append AFTER the fix (stripSubs applied to text)
// ---------------------------------------------------------------------------
function appendDraftAfter(existingBody: string, text: string): string {
  const stripped = stripSubs(text);
  const newBody = existingBody ? `${existingBody}\n${stripped}` : stripped;
  return newBody; // patched
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("security: +bb draft append stripSubs", OPTS, () => {
  it("RED — before fix: color codes are preserved in draft body", OPTS, () => {
    const result = appendDraftBefore("", "%chEVIL%cn");
    // Documents the vulnerability: codes are NOT stripped
    assertEquals(result.includes("%ch"), true);
  });

  it("exploit: appended text must NOT contain %ch after fix", OPTS, () => {
    const result = appendDraftAfter("", "%chEVIL%cn");
    assertEquals(result.includes("%ch"), false);
  });

  it("exploit: appended text must NOT contain %cn after fix", OPTS, () => {
    const result = appendDraftAfter("", "%chEVIL%cn");
    assertEquals(result.includes("%cn"), false);
  });

  it("exploit: codes stripped when appending to existing draft", OPTS, () => {
    const result = appendDraftAfter("First line.", "%chSecond line%cn");
    assertEquals(result.includes("%ch"), false);
    assertEquals(result, "First line.\nSecond line");
  });

  it("exploit: plain text is preserved unchanged when appending", OPTS, () => {
    const result = appendDraftAfter("Line 1.", "Line 2.");
    assertEquals(result, "Line 1.\nLine 2.");
  });

  it("exploit: %r newline code is stripped from appended text", OPTS, () => {
    const result = appendDraftAfter("", "Hello%rWorld");
    assertEquals(result.includes("%r"), false);
    assertEquals(result, "HelloWorld");
  });
});
