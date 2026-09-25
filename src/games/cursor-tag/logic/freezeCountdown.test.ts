import { describe, expect, it } from "vitest";

import { FREEZE_DURATION_S_DEFAULT } from "../shared/constants";
import { freezeSecondsShown } from "./freezeCountdown";

describe("freezeSecondsShown", () => {
  it("shows the whole freeze length the moment the freeze begins", () => {
    expect(freezeSecondsShown(FREEZE_DURATION_S_DEFAULT * 1000)).toBe(FREEZE_DURATION_S_DEFAULT);
  });

  it("rounds up, as a countdown does", () => {
    expect(freezeSecondsShown(2001)).toBe(3);
    expect(freezeSecondsShown(2000)).toBe(2);
    expect(freezeSecondsShown(1)).toBe(1);
  });

  it("shows nothing once the freeze is over", () => {
    expect(freezeSecondsShown(0)).toBeNull();
  });
});
