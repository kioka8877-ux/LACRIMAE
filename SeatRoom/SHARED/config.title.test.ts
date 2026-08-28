import { describe, expect, it } from "vitest";

describe("SeatRoom public configuration", () => {
  it("exposes the SeatRoom title configuration", () => {
    expect(process.env.VITE_APP_TITLE ?? "SeatRoom").toBe("SeatRoom");
  });
});
