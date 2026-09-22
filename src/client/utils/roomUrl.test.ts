import { describe, expect, it } from "vitest";

import { buildRoomUrl } from "./roomUrl";

describe("buildRoomUrl", () => {
  it("builds the link a player shares", () => {
    expect(buildRoomUrl("https://games.example", "abcdefghij")).toBe(
      "https://games.example/r/abcdefghij",
    );
  });

  it("does not double the slash when the origin ends with one", () => {
    expect(buildRoomUrl("http://localhost:3000/", "abcdefghij")).toBe(
      "http://localhost:3000/r/abcdefghij",
    );
  });
});
