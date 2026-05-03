# bbs — UrsaMU Plugin

## Setup (do this first)

```bash
# Pin to a specific version to avoid unexpected changes, e.g.:
#   npx @lhi/ursamu-dev@1.0.0
npx @lhi/ursamu-dev         # install the dev skill (pin version in production)
ursamu-dev --install-hooks  # block commits that fail the audit
```

Activate in Claude Code: `/ursamu-dev`

The skill enforces a six-stage pipeline (Design → Generate → Audit → Refine → Test → Docs)
and knows every import path, SDK method, lock level, and security pattern.
Use it for every feature — no exceptions.

---

## Commands

```bash
deno task test                   # full suite — must stay green
deno lint                        # must be clean
```

## Pre-commit checklist

```bash
deno lint                        # lint
deno task test --no-check        # tests
```

---

## Structure

```
src/
├── index.ts          IPlugin — init(), remove(), imports command modules
├── db.ts             DBO collections (boards, posts), types, seedBoards()
├── query.ts          findBoard, getPost, getBoardPosts, parseBoardPost, etc.
├── permissions.ts    canRead, canWrite, isStaff, isBoardMod
├── tracking.ts       Per-player state: read-tracking, drafts, membership,
│                     notifications, signatures, config
├── display.ts        formatPost, bbDate, EQ_LINE, DASH_LINE, WIDTH
├── cleanup.ts        startCleanupInterval — post expiry / archive migration
├── router.ts         bboardsRouteHandler — /api/v1/boards REST endpoint
├── webhook.ts        fireWebhook — Discord webhook notifications
├── url-safety.ts     isWebhookUrlSafe — SSRF / private-IP guard
└── commands/
    ├── reading.ts    +bbread, +bbnext, +bbcatchup
    ├── posting.ts    +bbpost, +bb, +bbproof, +bbtoss, +bbreply, +bbtag, +bblink
    ├── social.ts     +bblist, +bbjoin, +bbleave, +bbnotify, +bbwatch, +bbsig, +bbsearch
    ├── management.ts +bbremove, +bbmove, +bbedit, +bbsticky, +bbflag
    └── staff.ts      +bbnewgroup, +bbcleargroup, +bbconfirm, +bblock, +bbwritelock,
                      +bbtimeout, +bbconfig, +bbmod, +bbcategory, +bbwebhook,
                      +bbarchive, +bbreview, +bbunflag
tests/                Deno test files
```

---

## Import paths

```typescript
import { addCmd, DBO, gameHooks, registerPluginRoute } from "@ursamu/ursamu";
import type { IPlugin, IUrsamuSDK, IDBObj, SessionEvent } from "@ursamu/ursamu";
```

---

## addCmd skeleton

```typescript
addCmd({
  name: "+bbpost",
  pattern: /^\+?bbpost(?:\/(ic|ooc))?\s*(.*)/i,  // args[0]=switch, args[1]=rest
  lock: "connected",
  category: "BBS",
  help: `+bbpost[/switch] <arg>  — Description.

Switches:
  /switch   What this switch does.

Examples:
  +bbpost foo    Does the thing.
  +bbpost bar    Does the other thing.`,
  exec: async (u: IUrsamuSDK) => {
    const sw  = (u.cmd.args[0] ?? "").toLowerCase().trim();
    const arg = u.util.stripSubs(u.cmd.args[1] ?? "").trim();  // strip codes FIRST
  },
});
```

### Pattern cheat-sheet

| Intent | Pattern | args |
|--------|---------|------|
| No args | `/^inventory$/i` | — |
| One arg | `/^look\s+(.*)/i` | `[0]` |
| Switch + arg | `/^\+cmd(?:\/(\S+))?\s*(.*)/i` | `[0]`=sw, `[1]`=rest |
| Two parts (=) | `/^@name\s+(.+)=(.+)/i` | `[0]`, `[1]` |

### Lock levels

| String | Who can use it |
|--------|----------------|
| `""` | Login screen (unauthenticated) |
| `"connected"` | Any logged-in player |
| `"connected builder+"` | Builder flag or higher |
| `"connected admin+"` | Admin flag or higher |
| `"connected wizard"` | Wizard only |

---

## Plugin lifecycle (index.ts)

```typescript
import "./commands/reading.ts";  // Phase 1 — addCmd() fires here, NOT in init()

const onLogin = (e: SessionEvent) => { /* named ref — required for remove() */ };

export const plugin: IPlugin = {
  name: "bbs",
  version: "1.0.0",
  description: "One sentence.",
  init:   () => { gameHooks.on("player:login", onLogin); return true; },
  remove: () => { gameHooks.off("player:login", onLogin); },  // same ref
};
```

Rules: `addCmd()` never inside `init()` · `init()` must return `true` · every `.on()` needs a matching `.off()` using the same named function.

**DBO namespace rule**: always prefix with `bbs.`:

```typescript
const records = new DBO<IRecord>("bbs.records");  // correct
const records = new DBO<IRecord>("records");       // wrong — collides
```

Note: the existing collections in `db.ts` use the legacy `server.bboards` / `server.bboard_posts` namespace. New collections introduced by this plugin must use `bbs.<collection>`.

---

## Key SDK calls

```typescript
const target = await u.util.target(u.me, arg, true);  // true = global search
if (!target) { u.send("Not found."); return; }

if (!(await u.canEdit(u.me, target))) { u.send("Permission denied."); return; }

await u.db.modify(target.id, "$set",  { "data.field": value });
await u.db.modify(target.id, "$inc",  { "data.score": 1 });
await u.db.modify(target.id, "$unset",{ "data.tmp": "" });

u.send("Message.", target.id);  // optional second arg = recipient socket id

const isStaff = u.me.flags.has("admin") || u.me.flags.has("wizard") || u.me.flags.has("superuser");
```

## MUSH color codes

| Code | Effect | Code | Effect |
|------|--------|------|--------|
| `%ch` | Bold | `%cn` | Reset (always close with this) |
| `%cr` | Red | `%cg` | Green |
| `%cb` | Blue | `%cy` | Yellow |
| `%cw` | White | `%cc` | Cyan |
| `%r`  | Newline | `%t` | Tab |

---

## Player-inline state pattern

```typescript
// Reading (always default)
const ps = (u.me.state.bbs ?? {}) as IBBSPlayerState;

// Writing (always spread to preserve other fields)
await u.db.modify(u.me.id, "$set", { "state.bbs": { ...ps, field: value } });
```

Use `state.bbs` for per-player state (read tracking, draft, membership, notifications, signature). Use `new DBO("bbs.collection")` for records with their own lifecycle.

---

## Test boilerplate

```typescript
const OPTS = { sanitizeResources: false, sanitizeOps: false };
Deno.test("happy path", OPTS, async () => { /* ... */ });
```

### Required test cases for every command

- Happy path — correct output and DB call
- Null target — graceful not-found message, no DB write
- Permission denied — `canEdit` false, no DB write
- DB op is `$set`/`$inc`/`$unset` (assert exact args)
- Admin guard — non-admin rejected (if admin command)
- `stripSubs` called before DB (MUSH codes stripped)

Add a `tests/security/` directory for exploit→fix tests; one file per bug found.

---

## Code style (non-negotiable)

- **Early return** over nested conditions
- **No function longer than 50 lines** — decompose
- **No file longer than 200 lines** — split
- **No bare `catch`** — always `catch (e: unknown)`
- **Library-first** — if the SDK does it, use the SDK
- **No deep nesting** — max 3 levels
- **No comments** unless the WHY is non-obvious

---

## Audit checklist

- [ ] `u.util.stripSubs()` on all user strings before DB ops or length checks
- [ ] `await u.canEdit()` before modifying any object not owned by `u.me`
- [ ] DB writes use `"$set"` / `"$inc"` / `"$unset"` — never raw overwrite
- [ ] `u.util.target()` null-checked before use
- [ ] All `%c*` color codes closed with `%cn`
- [ ] `gameHooks.on()` in `init()` paired with matching `gameHooks.off()` in `remove()` (same ref)
- [ ] DBO collection prefixed: `"bbs.<collection>"` (new collections only — see namespace note above)
- [ ] REST route returns 401 before any work when `userId` is null
- [ ] `init()` returns `true`
- [ ] Every `addCmd` has `help:` with syntax line + examples
- [ ] Webhook URLs validated with `isWebhookUrlSafe()` before storing or firing
- [ ] Board moderator checks use `isBoardMod(u, board)` — not a raw flag check
- [ ] Watcher list capped at 50 at write time (slice before includes check)
- [ ] Help files organised into subdirectories (not a flat list) when there are more than ~6 commands

### Help directory organisation

The BBS plugin has 30+ commands — help files **must** use subdirectories. The current structure is:

```
help/
├── bbs.md              ← top-level index (TOPICS + QUICK START)
├── reading/            ← +bbread, +bbnext, +bbcatchup, +bbunread
├── posting/            ← +bbpost, +bb, +bbproof, +bbtoss, +bbreply, +bbtag, +bblink
├── social/             ← +bblist, +bbjoin, +bbleave, +bbnotify, +bbwatch, +bbsig, +bbsearch
├── management/         ← +bbremove, +bbmove, +bbedit, +bbsticky, +bbflag
└── staff/              ← board/moderation admin commands
```

Each subdirectory has an `index.md` that lists its commands and links back to `+help bbs`. Per-command files link back to their group index in `SEE ALSO`. When adding a new command, place its help file in the appropriate subdirectory and add it to that group's `index.md`.

---

## PRs and commits

- No AI attribution in commit messages or code comments.
- Use squash-merge for feature PRs.
- Tag versions after squash-merge: `git tag v<version> && git push --tags`.

---

## Full API reference

`~/.claude/skills/ursamu-dev/references/api-reference.md` — every type, SDK method, event payload, and lock expression. Read it before writing any code.

Activate the full dev skill with: `/ursamu-dev`
