import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "./password.js";

describe("password helpers", () => {
  it("hashes and verifies passwords", async () => {
    const hash = await hashPassword("senha-segura-123");

    expect(hash).not.toBe("senha-segura-123");
    await expect(verifyPassword(hash, "senha-segura-123")).resolves.toBe(true);
    await expect(verifyPassword(hash, "senha-errada")).resolves.toBe(false);
  });
});
