/**
 * Integration test: @bbformat / @bbrowformat hooks on the +bbread board
 * listing and the per-board post listing.
 *
 * Uses real `dbojs` from @ursamu/ursamu and the plugin-handler registry
 * (registerFormatHandler). The softcode-attribute path is not exercised
 * here — `softcodeService` is not publicly exported from @ursamu/ursamu,
 * so we use plugin handlers + a mocked `u.attr.get` to validate two-tier
 * ordering. The same `resolveGlobalFormat` helper consults #0 first, then
 * the enactor, then the plugin handler registry.
 *
 * %0 is the default rendered string (block or row).
 */
import { assertEquals, assertStringIncludes } from "@std/assert";
import {
  dbojs,
  DBO,
  registerFormatHandler,
  unregisterFormatHandler,
  type FormatHandler,
  type FormatSlot,
  type IDBObj,
  type IUrsamuSDK,
} from "@ursamu/ursamu";
import { boards, posts, type IBoard, type IPost } from "../src/db.ts";
import { doBBList, doListPosts } from "../src/commands/reading.ts";

const OPTS = { sanitizeResources: false, sanitizeOps: false };
const SLOW = { timeout: 15000 };

const ROOT  = "0";
const ACTOR = "920001";

async function cleanup() {
  for (const id of [ROOT, ACTOR]) {
    await dbojs.delete({ id }).catch(() => {});
  }
  const allBoards = await boards.find({});
  for (const b of allBoards) {
    if (b.title.startsWith("FmtTest")) await boards.delete({ id: b.id }).catch(() => {});
  }
  const allPosts = await posts.find({});
  for (const p of allPosts) {
    if (p.subject.startsWith("FmtPost")) await posts.delete({ id: p.id }).catch(() => {});
  }
}

async function seed(): Promise<{ boardNum: number }> {
  await cleanup();
  await dbojs.create({ id: ROOT,  flags: "room",              data: { name: "Root" } });
  await dbojs.create({ id: ACTOR, flags: "player connected",  data: { name: "Alice" } });

  const boardNum = 9001;
  await boards.create({
    id: `fmt-board-${boardNum}`,
    num: boardNum,
    title: "FmtTest Board",
    timeout: 0,
    category: "General",
    anonymous: false,
    readPerm: "",
    postPerm: "",
    moderators: [],
    archived: false,
  } as IBoard);

  for (let i = 0; i < 2; i++) {
    await posts.create({
      id: `fmt-post-${i}`,
      boardId: boardNum,
      num: i + 1,
      subject: `FmtPost ${i}`,
      body: `Body ${i}`,
      authorId: ACTOR,
      authorName: "Alice",
      createdAt: 1700000000000 + i,
      timeout: 0,
      editCount: 0,
      replies: [],
      sticky: false,
      tags: [],
      flags: [],
      watchers: [],
    } as IPost);
  }
  return { boardNum };
}

function mockU(): IUrsamuSDK & { _sent: string[] } {
  const sent: string[] = [];
  const me = {
    id: ACTOR,
    name: "Alice",
    flags: new Set(["player", "connected"]),
    state: { name: "Alice" },
    location: "",
    contents: [],
  } as unknown as IDBObj;

  const u = {
    me,
    socketId: "bbs-fmt-sock",
    send: (m: string) => { sent.push(m); },
    util: {
      target: async (_me: IDBObj, ref: string) => {
        const obj = await dbojs.queryOne({ id: ref.replace("#", "") }).catch(() => null);
        if (!obj) return null;
        return { ...obj, name: (obj as { data?: { name?: string } }).data?.name ?? "Unknown" } as unknown as IDBObj;
      },
      stripSubs: (s: string) => s,
      displayName: (o: IDBObj) => o.name ?? "Unknown",
      center: (s: string) => s,
      ljust: (s: string, w: number) => s.padEnd(w),
      rjust: (s: string, w: number) => s.padStart(w),
    },
  } as unknown as IUrsamuSDK & { _sent: string[] };

  (u as unknown as { _sent: string[] })._sent = sent;
  return u;
}

Deno.test("bbs: no attrs, no handler — default board listing", { ...OPTS, ...SLOW }, async () => {
  await seed();
  const u = mockU();
  await doBBList(u);
  const out = u._sent.join("\n");
  assertStringIncludes(out, "FmtTest Board");
  assertStringIncludes(out, "General");
  await cleanup();
});

Deno.test("bbs: BBFORMAT handler replaces the whole board listing block", { ...OPTS, ...SLOW }, async () => {
  await seed();
  const handler: FormatHandler = (_u, _t, defaultBlock) => `<<BLOCK>>\n${defaultBlock}\n<</BLOCK>>`;
  registerFormatHandler("BBFORMAT" as FormatSlot, handler);
  try {
    const u = mockU();
    await doBBList(u);
    const out = u._sent.join("\n");
    assertStringIncludes(out, "<<BLOCK>>");
    assertStringIncludes(out, "<</BLOCK>>");
    assertEquals(u._sent.length, 1);
  } finally {
    unregisterFormatHandler("BBFORMAT" as FormatSlot, handler);
    await cleanup();
  }
});

Deno.test("bbs: BBROWFORMAT handler wraps each row in the listing", { ...OPTS, ...SLOW }, async () => {
  await seed();
  const handler: FormatHandler = (_u, _t, row) => `ROW>${row}<ROW`;
  registerFormatHandler("BBROWFORMAT" as FormatSlot, handler);
  try {
    const u = mockU();
    await doBBList(u);
    const out = u._sent.join("\n");
    assertStringIncludes(out, "ROW>");
    assertStringIncludes(out, "FmtTest Board");
  } finally {
    unregisterFormatHandler("BBROWFORMAT" as FormatSlot, handler);
    await cleanup();
  }
});

Deno.test("bbs: BBFORMAT also applies to per-board post listing", { ...OPTS, ...SLOW }, async () => {
  const { boardNum } = await seed();
  const handler: FormatHandler = (_u, _t, defaultBlock) => `<<POSTS>>\n${defaultBlock}\n<</POSTS>>`;
  registerFormatHandler("BBFORMAT" as FormatSlot, handler);
  try {
    const u = mockU();
    await doListPosts(u, String(boardNum));
    const out = u._sent.join("\n");
    assertStringIncludes(out, "<<POSTS>>");
    assertStringIncludes(out, "FmtPost 0");
  } finally {
    unregisterFormatHandler("BBFORMAT" as FormatSlot, handler);
    await cleanup();
  }
});

Deno.test("bbs: two-tier — #0 is consulted before the enactor", { ...OPTS, ...SLOW }, async () => {
  await seed();
  const seen: string[] = [];
  const handler: FormatHandler = (_u, target, _arg) => { seen.push(target.id); return null; };
  registerFormatHandler("BBFORMAT" as FormatSlot, handler);
  try {
    const u = mockU();
    await doBBList(u);
    assertEquals(seen[0], ROOT, "should consult #0 first");
    assertEquals(seen[1], ACTOR, "then fall through to enactor");
  } finally {
    unregisterFormatHandler("BBFORMAT" as FormatSlot, handler);
    await cleanup();
    await DBO.close();
  }
});
