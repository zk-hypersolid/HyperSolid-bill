import { fundingCountdown } from "./fundingClock";

describe("fundingCountdown", () => {
  it("counts down to the next hourly settlement", () => {
    // exactly on the hour → a full hour remains
    expect(fundingCountdown(0)).toBe("01:00:00");
    // 59m59s past the hour → 1s remains
    expect(fundingCountdown((59 * 60 + 59) * 1000)).toBe("00:00:01");
    // 30m past the hour → 30m remains
    expect(fundingCountdown(30 * 60 * 1000)).toBe("00:30:00");
  });
});
