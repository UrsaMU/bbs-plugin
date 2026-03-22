# @ursamu/bbs-plugin

> Full-featured Myrddin-style BBS for UrsaMU — boards with categories, IC/OOC tagging, sticky posts, per-board moderators, post flagging, reply-watch subscriptions, Discord webhook notifications, scene linking, and archive boards.

## Install

```bash
ursamu plugin install https://raw.githubusercontent.com/UrsaMU/bbs-plugin/v1.0.0/mod.ts
```

Or pin to a specific tag in your game's plugin list and restart.

## Seed boards on startup

```typescript
import { seedBoards } from "@ursamu/bbs-plugin";

// In your game's init:
await seedBoards([
  "OOC",
  "Announcements",
  { name: "Staff", readLock: "faction", writeLock: "faction", category: "Staff" },
  { name: "IC Events", category: "Roleplay" },
]);
```

---

## Player Commands

| Command | Syntax | Description |
|---------|--------|-------------|
| `+bbread` | `+bbread [<#>[/<posts>]]` | Show board index, list posts, or read messages |
| `+bbnext` | `+bbnext [<#>]` | Read your next unread message |
| `+bbcatchup` | `+bbcatchup [<#>\|all]` | Mark board(s) as fully read |
| `+bblist` | `+bblist` | Show all boards grouped by category |
| `+bbjoin` | `+bbjoin <#>` | Subscribe to a board |
| `+bbleave` | `+bbleave <#>` | Unsubscribe from a board |
| `+bbnotify` | `+bbnotify <#>=<on\|off>` | Toggle new-post notifications |
| `+bbwatch` | `+bbwatch <#>/<post>` | Toggle reply-watch on a specific post |
| `+bbpost` | `+bbpost[/ic\|/ooc] <#>/<subject>[=<body>]` | Post to a board (quick or draft mode) |
| `+bb` | `+bb <text>` | Append text to your current draft |
| `+bbproof` | `+bbproof` | Preview your draft |
| `+bbtoss` | `+bbtoss` | Discard your draft |
| `+bbreply` | `+bbreply[/ic\|/ooc] <#>/<post>[=<text>]` | Reply to a post |
| `+bbtag` | `+bbtag [<tag1>,<tag2>...]` | Set tags on your current draft |
| `+bblink` | `+bblink <#>/<post>[=<sceneId>]` | Link/unlink a scene to a post |
| `+bbremove` | `+bbremove <#>/<post[,...]>` | Delete your own post(s) |
| `+bbmove` | `+bbmove <#>/<post> to <#>` | Move post to another board (mods) |
| `+bbedit` | `+bbedit <#>/<post>[.<reply>][=<old>/<new>]` | Inline edit a post or reply |
| `+bbsticky` | `+bbsticky <#>/<post>` | Toggle sticky on a post (mods) |
| `+bbflag` | `+bbflag <#>/<post>[=<reason>]` | Flag a post for moderator review |
| `+bbsig` | `+bbsig [<text>]` | Set or clear your BBS signature |
| `+bbsearch` | `+bbsearch <#>/<query\|tag:<name>>` | Search posts by author or tag |

## Staff Commands

| Command | Syntax | Lock | Description |
|---------|--------|------|-------------|
| `+bbnewgroup` | `+bbnewgroup <title>[=<category>]` | admin+ | Create a board |
| `+bbcleargroup` | `+bbcleargroup <#>` | admin+ | Mark board for deletion |
| `+bbconfirm` | `+bbconfirm <#>` | admin+ | Confirm board deletion |
| `+bblock` | `+bblock <#>=<lock>` | admin+ | Set read lock |
| `+bbwritelock` | `+bbwritelock <#>=<lock>` | admin+ | Set write lock |
| `+bbtimeout` | `+bbtimeout <#>/<post>=<days>` | admin+ | Set post expiry |
| `+bbconfig` | `+bbconfig [<setting>=<value>]` | admin+ | View/set global config |
| `+bbmod` | `+bbmod <#>=<player>` | admin+ | Add/remove board moderator |
| `+bbcategory` | `+bbcategory <#>=<name>` | admin+ | Set board display category |
| `+bbwebhook` | `+bbwebhook <#>=<url>` | admin+ | Set Discord webhook URL |
| `+bbarchive` | `+bbarchive <#>` | admin+ | Toggle archive mode |
| `+bbreview` | `+bbreview [<#>]` | mod/staff | List flagged posts |
| `+bbunflag` | `+bbunflag <#>/<post>` | mod/staff | Clear post flags |

---

## Features

### Board Categories
Boards are grouped under a category string in `+bblist`. Assign with `+bbcategory <#>=<name>` or at creation with `+bbnewgroup <title>=<category>`.

### IC/OOC Tagging
Posts and replies can be tagged `/ic` or `/ooc`. The tag appears in the subject line: `[IC] Scene Recap`. Useful for separating in-character and out-of-character content on shared boards.

### Sticky Posts
Sticky posts are always listed first on a board. Toggle with `+bbsticky <#>/<post>`. Board moderators and staff may sticky any post on their boards.

### Board Moderators
Staff can assign a non-staff player as a board moderator with `+bbmod`. Board mods can delete, move, sticky, review, and unflag posts on their assigned board(s).

### Post Flagging
Any player can flag a post for moderator review with `+bbflag`. Flagged posts remain visible — flagging is a signal only. Mods clear flags with `+bbunflag` and review the queue with `+bbreview`.

### Reply Watch Subscriptions
`+bbwatch <#>/<post>` subscribes to a post. When someone replies, all watchers (except the reply author) receive a notification. Maximum 50 watchers per post.

### Discord Webhooks
Staff can set a Discord-compatible webhook URL per board with `+bbwebhook`. New posts fire the webhook as an embed (fire-and-forget; failures are silent). Only `https://` URLs accepted.

### Scene Linking
Players can link an RP scene ID to any post they own with `+bblink <#>/<post>=<sceneId>`. The linked scene ID displays in the post header for cross-reference.

### Archive Boards
Toggle a board to archive mode with `+bbarchive`. Archive boards are read-only. When a board has `archiveTo` set to an archive board's ID, expired posts migrate there instead of being deleted. Manage via `+bbconfig archiveto=<board-id>` on the source board (or PATCH via REST).

### Faction-Scoped Boards
Set a board's `readLock` or `writeLock` to `"faction"` and set `ownerId` to a faction object's DB ID. Players must be in that object's `contents` to access the board.

---

## REST Routes

All routes require a Bearer auth token.

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/v1/boards` | List accessible boards with unread counts |
| `POST` | `/api/v1/boards` | Create a board (staff) |
| `GET` | `/api/v1/boards/categories` | List distinct category names |
| `GET` | `/api/v1/boards/:id` | Get board details |
| `PATCH` | `/api/v1/boards/:id` | Update board (staff) |
| `DELETE` | `/api/v1/boards/:id` | Delete board and posts (staff) |
| `GET` | `/api/v1/boards/:id/posts` | List posts (paginated: `?limit=20&offset=0`) |
| `POST` | `/api/v1/boards/:id/posts` | Create post |
| `GET` | `/api/v1/boards/:id/posts/:num` | Get single post |
| `PATCH` | `/api/v1/boards/:id/posts/:num` | Edit post (own or mod/staff) |
| `DELETE` | `/api/v1/boards/:id/posts/:num` | Delete post (own or mod/staff) |
| `GET` | `/api/v1/boards/:id/posts/:num/flags` | List post flags (mod/staff) |
| `DELETE` | `/api/v1/boards/:id/posts/:num/flags` | Clear post flags (mod/staff) |
| `POST` | `/api/v1/boards/:id/posts/:num/watch` | Toggle reply-watch subscription |
| `POST` | `/api/v1/boards/:id/read` | Mark board as read |

---

## Storage

| Collection | Schema | Purpose |
|------------|--------|---------|
| `server.bboards` | `IBoard` | Board metadata |
| `server.bboard_posts` | `IPost` | Posts and threaded replies |

### Player state fields (stored on player object)

| Key | Type | Purpose |
|-----|------|---------|
| `bb_read` | `Record<boardNum, string[]>` | Per-board read tracking |
| `bb_membership` | `Record<boardNum, boolean>` | Board subscription |
| `bb_notify` | `Record<boardNum, boolean>` | New-post notification toggle |
| `bb_draft` | `IDraft` | Active draft being composed |
| `bb_sig` | `string` | BBS signature |

---

## Configuration

| `+bbconfig` key | Default | Description |
|-----------------|---------|-------------|
| `timeout` | `0` | Global post expiry in days (0 = no expiry) |
| `autotimeout` | `off` | Enable automatic expiry cleanup |

---

## Requirements

- UrsaMU `>=1.9.0`
- Deno 2.x
