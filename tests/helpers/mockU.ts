import type { IUrsamuSDK } from "@ursamu/ursamu";

/** Minimal stand-in for an engine DB object — avoids importing IDBObj which is not re-exported. */
export interface IPlayer {
  id: string;
  name: string;
  flags: Set<string>;
  state: Record<string, unknown>;
  location: string;
  contents: string[];
  [key: string]: unknown;
}

export function mockPlayer(overrides: Partial<IPlayer> = {}): IPlayer {
  return {
    id: "p1",
    name: "TestPlayer",
    flags: new Set(["player", "connected"]),
    state: {},
    location: "room1",
    contents: [],
    ...overrides,
  };
}

export function mockStaff(overrides: Partial<IPlayer> = {}): IPlayer {
  return mockPlayer({ id: "staff1", name: "Admin", flags: new Set(["player", "connected", "admin"]), ...overrides });
}

export interface MockUOpts {
  me?: Partial<IPlayer>;
  args?: string[];
  targetResult?: IPlayer | null;
  canEditResult?: boolean;
  dbModify?: (...a: unknown[]) => Promise<void>;
  dbSearch?: () => Promise<IPlayer[]>;
}

export interface MockU extends IUrsamuSDK {
  _sent: string[];
  _broadcast: string[];
  _dbCalls: unknown[][];
}

export function mockU(opts: MockUOpts = {}): MockU {
  const sent: string[] = [];
  const broadcast: string[] = [];
  const dbCalls: unknown[][] = [];

  const u = {
    me: mockPlayer(opts.me ?? {}),
    here: {
      ...mockPlayer({ id: "room1", name: "A Room", flags: new Set(["room"]) }),
      broadcast: (m: string) => broadcast.push(m),
    },
    cmd: {
      name: "",
      original: "",
      args: opts.args ?? [],
      switches: [],
    },
    send: (m: string, _target?: string) => sent.push(m),
    broadcast: (m: string) => broadcast.push(m),
    canEdit: async () => opts.canEditResult ?? true,
    db: {
      modify: async (...a: unknown[]) => {
        dbCalls.push(a);
        await opts.dbModify?.(...a);
      },
      search: opts.dbSearch ?? (async () => []),
      create: async (d: unknown) => ({
        ...(d as object),
        id: "99",
        flags: new Set(),
        contents: [],
      }),
      destroy: async () => {},
    },
    util: {
      target: async () => opts.targetResult ?? null,
      displayName: (o: IPlayer) => o.name ?? "Unknown",
      stripSubs: (s: string) =>
        s.replace(/%c[a-zA-Z]/g, "").replace(/%[rntbR]/g, ""),
      center: (s: string) => s,
      ljust: (s: string, w: number) => s.padEnd(w),
      rjust: (s: string, w: number) => s.padStart(w),
      sprintf: (f: string) => f,
    },
    _sent: sent,
    _broadcast: broadcast,
    _dbCalls: dbCalls,
  } as unknown as MockU;

  return u;
}
