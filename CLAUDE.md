# bbs-plugin — Claude Code Instructions

## Project identity

External UrsaMU plugin: full-featured Myrddin-style BBS — boards,
threading, categories, IC/OOC tags, sticky posts, board moderators,
post flagging, reply watching, Discord webhooks, scene linking, archive
boards, and v2.3 format-attribute hooks on the listings. Targets
ursamu **^2.3.0**.

- **Ecosystem skill**: load `/ursamu-dev` before working here.
- **API reference**: `/Users/kumakun/.claude/skills/ursamu-dev/references/api-reference.md`
  is authoritative for every type, method, import path, and event payload.
  Read it before writing code. Never guess signatures.

---

## Commands

```bash
deno task check    # type-check entry (index.ts)
deno task lint     # must be clean
deno task test     # full suite
```

## Pre-commit checklist (all must pass)

```bash
deno check --unstable-kv index.ts
deno lint
deno test --allow-all --unstable-kv --no-check tests/
```

---

## Repo layout

```
index.ts                 Plugin entry — re-exports src/index.ts default
mod.ts                   JSR exports (default plugin + DB types)
src/index.ts             IPlugin object — init/remove, route + hooks
src/commands/            addCmd registrations (reading, posting, social, …)
src/db.ts                DBO("bbs.boards") + DBO("bbs.posts") + interfaces
src/display.ts           Render helpers (formatPost, header, bbDate)
src/query.ts             findBoard / getBoardPosts / parsing helpers
src/tracking.ts          Per-player read/unread tracking
src/permissions.ts       canRead / canPost / canModerate
src/router.ts            REST handler for /api/v1/boards
src/cleanup.ts           Post-expiry sweep
src/webhook.ts           Discord webhook poster (SSRF-guarded)
tests/                   Deno test files
ursamu.plugin.json       Plugin manifest consumed by ursamu loader
```

---

## Imports

```typescript
import {
  addCmd, dbojs, DBO, gameHooks, send,
  registerPluginRoute,
  resolveFormat, type FormatSlot,
  registerFormatHandler, unregisterFormatHandler,
} from "@ursamu/ursamu";
import type { ICmd, IPlugin, IDBObj, IUrsamuSDK, SessionEvent } from "@ursamu/ursamu";
```

The bare specifier resolves through `deno.json` import map to
`jsr:@ursamu/ursamu@^2.3.0`. DBO namespace rule: collection names
prefixed with `bbs.` (e.g. `bbs.boards`, `bbs.posts`).

---

## addCmd skeleton

```typescript
addCmd({
  name: "+bbread",
  pattern: /^\+?bbread\s*(.*)/i,
  lock: "connected",
  category: "BBS",
  help: `+bbread [<args>]  — Read BBS boards or posts.`,
  exec: async (u: IUrsamuSDK) => {
    const args = (u.cmd.args[0] ?? "").trim();
    // ...
  },
});
```

### Lock levels — same as core

`""`, `"connected"`, `"connected builder+"`, `"connected admin+"`,
`"connected wizard"`.

---

## Format hooks (v2.3+)

The board listing (`+bbread` with no args) and the per-board post
listing (`+bbread <board#>`) both support two slots resolved via
`resolveFormat`:

| Slot | `%0` value | Effect |
|------|------------|--------|
| `BBFORMAT` | Default rendered block | Full listing override |
| `BBROWFORMAT` | Default rendered row | Per-row override (one board or one post) |

Two-tier lookup (mirrors WHO/PS): `#0` (game-wide) → enactor (`u.me`) →
plugin handler → built-in default.

Helper (in `src/commands/reading.ts`):

```typescript
async function resolveGlobalFormat(u, slot, defaultArg) {
  const root = await dbojs.queryOne({ id: "0" });
  if (root) {
    const onRoot = await resolveFormat(u, root as IDBObj, slot as FormatSlot, defaultArg);
    if (onRoot != null) return onRoot;
  }
  return await resolveFormat(u, u.me, slot as FormatSlot, defaultArg);
}
```

Cast unknown slot names as `slot as FormatSlot` — plugin-defined slot
names are not in the core union but `resolveFormat` accepts any string
at runtime.

---

## Key SDK idioms

```typescript
// Strip MUSH codes BEFORE DB ops or length checks (always)
const clean = u.util.stripSubs(u.cmd.args[0]).trim();

// DB writes — op must be "$set" | "$inc" | "$unset" only
await posts.modify({ id: p.id }, "$set", { editCount: p.editCount + 1 });

// Target resolution — always guard
const target = await u.util.target(u.me, raw, true);
if (!target) { u.send("Not found."); return; }
```

---

## MUSH color codes

| Code | Effect | Code | Effect |
|------|--------|------|--------|
| `%ch` | Bold | `%cn` | Reset (close every open code) |
| `%cr` | Red | `%cg` | Green |
| `%cb` | Blue | `%cy` | Yellow |
| `%cw` | White | `%cc` | Cyan |
| `%r`  | Newline | `%t` | Tab |

---

## Plugin lifecycle (three phases — non-negotiable)

```
Phase 1 — module load   import "./commands/*.ts" → addCmd() fires at load time
Phase 2 — init()        register routes, attach gameHooks listeners → return true
Phase 3 — remove()      detach hooks with the SAME named function reference
```

Pair every `gameHooks.on(evt, fn)` in `init()` with `gameHooks.off(evt, fn)`
in `remove()` using the same named reference.

---

## Test patterns

Required boilerplate for tests that touch service layer:

```typescript
const OPTS = { sanitizeResources: false, sanitizeOps: false };
Deno.test("desc", OPTS, async () => { /* ... */ });
```

Format-hook integration tests live in
`tests/bbs_formats_integration.test.ts` — they use real `dbojs` and the
plugin-handler registry. Required cases:

- no attrs / no handler → default rendering preserved
- `BBFORMAT` handler set → block override wins (single `u.send` call)
- `BBROWFORMAT` handler set → per-row override wraps every row
- `BBFORMAT` also applies to the per-board post listing
- two-tier: `#0` consulted before enactor

Close DB in the last test: `await DBO.close()`.

---

## Code style (non-negotiable)

- Early return over nested conditions.
- No function longer than 50 lines.
- No file longer than 200 lines.
- No bare `catch` — always `catch (e: unknown)`.
- Library-first.
- Max nesting depth 3.

---

## Audit checklist

- [ ] `u.util.stripSubs()` on user strings before DB ops or length checks
- [ ] DB writes use `$set` / `$inc` / `$unset`
- [ ] `u.util.target()` results null-checked
- [ ] All `%c*` codes closed with `%cn`
- [ ] Every `addCmd` has `help:` with syntax + ≥2 examples
- [ ] `gameHooks.on()` paired with matching `gameHooks.off()`
- [ ] DBO namespace prefixed (`bbs.*`)
- [ ] REST handlers return 401 before any work when `userId` is null
- [ ] `init()` returns `true`
- [ ] Format-hook calls use `resolveGlobalFormat` two-tier helper

---

## PRs and commits

- No Claude/AI attribution in PR titles, commit messages, or code comments.
- Squash-merge feature PRs.
- Tag versions after merge: `git tag v<version> && git push --tags`.
