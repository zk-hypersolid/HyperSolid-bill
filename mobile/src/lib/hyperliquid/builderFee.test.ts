import {
  BUILDER_FEE_CAP_TENTH_BPS,
  isBuilderFeeWithinCap,
  tenthBpsToPercent,
  buildApproveBuilderFee,
} from "./builderFee";

const BUILDER = ("0x" + "b".repeat(40)) as `0x${string}`;

describe("builder fee caps (spec §7: perps 0.1% / spot 1%)", () => {
  it("exposes caps in tenth-bps (100 perp / 1000 spot)", () => {
    expect(BUILDER_FEE_CAP_TENTH_BPS.perp).toBe(100);
    expect(BUILDER_FEE_CAP_TENTH_BPS.spot).toBe(1000);
  });

  it("accepts fees within cap, rejects above", () => {
    expect(isBuilderFeeWithinCap(10, "perp")).toBe(true);
    expect(isBuilderFeeWithinCap(100, "perp")).toBe(true);
    expect(isBuilderFeeWithinCap(101, "perp")).toBe(false);
    expect(isBuilderFeeWithinCap(1000, "spot")).toBe(true);
    expect(isBuilderFeeWithinCap(1001, "spot")).toBe(false);
  });

  it("rejects negative or non-integer fees", () => {
    expect(isBuilderFeeWithinCap(-1, "perp")).toBe(false);
    expect(isBuilderFeeWithinCap(10.5, "perp")).toBe(false);
  });
});

describe("tenthBpsToPercent (f=10 -> 0.01%)", () => {
  it("converts tenth-bps to a stripped percent string", () => {
    expect(tenthBpsToPercent(10)).toBe("0.01%");
    expect(tenthBpsToPercent(1)).toBe("0.001%");
    expect(tenthBpsToPercent(100)).toBe("0.1%");
    expect(tenthBpsToPercent(1000)).toBe("1%");
    expect(tenthBpsToPercent(0)).toBe("0%");
  });
});

describe("buildApproveBuilderFee (user-signed payload, spec §7)", () => {
  it("converts a tenth-bps number to a percent maxFeeRate", () => {
    expect(buildApproveBuilderFee(BUILDER, 10)).toEqual({
      maxFeeRate: "0.01%",
      builder: BUILDER,
    });
  });

  it("passes through an already-formatted percent string", () => {
    expect(buildApproveBuilderFee(BUILDER, "0.05%")).toEqual({
      maxFeeRate: "0.05%",
      builder: BUILDER,
    });
  });
});
