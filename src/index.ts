import type { IPlugin } from "jsr:@ursamu/ursamu";
import { registerPluginRoute, gameHooks, send } from "jsr:@ursamu/ursamu";
import type { SessionEvent } from "jsr:@ursamu/ursamu";
import { bboardsRouteHandler } from "./router.ts";
import { startCleanupInterval } from "./cleanup.ts";
import { getTotalUnreadCountForPlayer } from "./tracking.ts";
import "./commands/reading.ts";
import "./commands/posting.ts";
import "./commands/social.ts";
import "./commands/management.ts";
import "./commands/staff.ts";

const onBBSLogin = async (e: SessionEvent): Promise<void> => {
  const count = await getTotalUnreadCountForPlayer(e.actorId);
  if (count <= 0) return;
  send([e.actorId], `%ch%cy[BBS]%cn You have ${count} unread post(s). Type +bbread to read.`);
};

const plugin: IPlugin = {
  name: "bbs",
  version: "1.0.0",
  description:
    "Full-featured BBS — boards, threading, categories, IC/OOC tags, sticky posts, board moderators, post flagging, reply watching, Discord webhooks, scene linking, and archive boards.",

  init: () => {
    registerPluginRoute("/api/v1/boards", bboardsRouteHandler);
    startCleanupInterval();
    gameHooks.on("player:login", onBBSLogin);
    console.log("[bbs] Plugin initialized — +bb commands active, /api/v1/boards registered.");
    return true;
  },

  remove: () => {
    gameHooks.off("player:login", onBBSLogin);
    console.log("[bbs] Plugin removed.");
  },
};

export default plugin;
