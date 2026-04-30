import { describe, expect, it } from "vitest";
import { getConfirmPasswordMessage, validateRegister } from "./validation";

describe("auth validation", () => {
  it("validates register fields", () => {
    const errors = validateRegister({
      firstName: "",
      lastName: "",
      birthDate: "2024-02-31",
      email: "email-ruim",
      password: "123",
      confirmPassword: "456"
    });

    expect(errors.firstName).toBeTruthy();
    expect(errors.lastName).toBeTruthy();
    expect(errors.birthDate).toBeTruthy();
    expect(errors.email).toBeTruthy();
    expect(errors.password).toBeTruthy();
    expect(errors.confirmPassword).toBeTruthy();
  });

  it("reports confirm password match and mismatch", () => {
    expect(getConfirmPasswordMessage("senha-segura", "senha-errada")).toEqual({
      type: "error",
      message: "As senhas precisam ser iguais."
    });
    expect(getConfirmPasswordMessage("senha-segura", "senha-segura")).toEqual({
      type: "success",
      message: "Senhas iguais."
    });
  });
});
