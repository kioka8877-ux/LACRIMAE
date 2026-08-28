import { beforeEach, describe, expect, it, vi } from "vitest";

const { getSeatroomProfile, upsertSeatroomProfile, claimInvitation } = vi.hoisted(() => ({
  getSeatroomProfile: vi.fn(),
  upsertSeatroomProfile: vi.fn(),
  claimInvitation: vi.fn(),
}));

vi.mock("./db", () => ({
  getSeatroomProfile,
  upsertSeatroomProfile,
  claimInvitation,
}));

import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function context(user: TrpcContext["user"]): TrpcContext {
  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

describe("seatroom roles", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getSeatroomProfile.mockResolvedValue(undefined);
    upsertSeatroomProfile.mockResolvedValue({
      id: 1,
      userId: 12,
      seatRoomRole: "agent",
      eventId: "event-grand-bal",
      displayName: "Agent Test",
    });
  });

  it("refuses profile access without an authenticated user", async () => {
    const caller = appRouter.createCaller(context(null));
    await expect(caller.seatroom.profile()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("accepts the agent role and assigns the event", async () => {
    const caller = appRouter.createCaller(context({
      id: 12,
      openId: "seatroom-user",
      name: "Agent Test",
      email: "agent@example.com",
      loginMethod: "manus",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    }));

    const result = await caller.seatroom.setRole({ role: "agent" });
    expect(upsertSeatroomProfile).toHaveBeenCalledWith(expect.objectContaining({
      userId: 12,
      seatRoomRole: "agent",
      eventId: "event-grand-bal",
    }));
    expect(result?.seatRoomRole).toBe("agent");
  });

  it("rejects roles outside the SeatRoom contract", async () => {
    const caller = appRouter.createCaller(context({
      id: 12,
      openId: "seatroom-user",
      name: "Agent Test",
      email: "agent@example.com",
      loginMethod: "manus",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    }));

    await expect(caller.seatroom.setRole({ role: "admin" as never })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(upsertSeatroomProfile).not.toHaveBeenCalled();
  });

  it("claims a pending invitation for the user's email", async () => {
    const user = {
      id: 12,
      openId: "invited-user",
      name: "Invited Agent",
      email: "agent@example.com",
      loginMethod: "manus",
      role: "user" as const,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    };
    const caller = appRouter.createCaller(context(user));
    claimInvitation.mockResolvedValue({ id: 1, userId: 12, seatRoomRole: "agent", eventId: "event-bal" });

    const result = await caller.seatroom.claimInvitation();
    expect(claimInvitation).toHaveBeenCalledWith(12, "agent@example.com");
    expect(result?.seatRoomRole).toBe("agent");
  });
});
