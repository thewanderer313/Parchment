import { buildImagePath, IMAGE_DIR } from "../image";

jest.mock("expo-file-system/legacy", () => ({
  documentDirectory: "file:///doc/",
  makeDirectoryAsync: jest.fn(),
  copyAsync: jest.fn(),
  deleteAsync: jest.fn(),
  getInfoAsync: jest.fn(async () => ({ exists: true })),
}));

describe("image utility", () => {
  it("composes the image directory under documentDirectory", () => {
    expect(IMAGE_DIR).toBe("file:///doc/images/");
  });

  it("buildImagePath creates a unique filename under IMAGE_DIR with .jpg extension", () => {
    const a = buildImagePath();
    const b = buildImagePath();
    expect(a).toMatch(/^file:\/\/\/doc\/images\/[0-9a-f-]+\.jpg$/);
    expect(a).not.toBe(b);
  });

  it("buildImagePath accepts an explicit prefix for cover vs card differentiation", () => {
    const cover = buildImagePath("cover");
    expect(cover).toMatch(/^file:\/\/\/doc\/images\/cover_[0-9a-f-]+\.jpg$/);
  });
});
