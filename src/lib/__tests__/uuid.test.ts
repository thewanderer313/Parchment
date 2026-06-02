import { newUuid } from "../uuid";

describe("newUuid", () => {
  it("returns an RFC4122 v4 string", () => {
    const id = newUuid();
    expect(id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    );
  });

  it("returns different ids on successive calls", () => {
    const a = newUuid();
    const b = newUuid();
    expect(a).not.toBe(b);
  });
});
