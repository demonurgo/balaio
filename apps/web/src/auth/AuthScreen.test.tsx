import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { AuthScreen } from "./AuthScreen";

describe("AuthScreen", () => {
  it("switches between login and register modes without oauth or forgot password", async () => {
    const user = userEvent.setup();
    render(<AuthScreen />);

    expect(screen.getAllByRole("button", { name: "Entrar" })[0]).toBeInTheDocument();
    expect(screen.queryByText(/google/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/esqueci/i)).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Criar conta" }));

    expect(screen.getByLabelText("Nome")).toBeInTheDocument();
    expect(screen.getByLabelText("Sobrenome")).toBeInTheDocument();
    expect(screen.getByLabelText("Data de nascimento")).toBeInTheDocument();
    expect(screen.getByLabelText("Confirmar senha")).toBeInTheDocument();
    expect(screen.queryByText(/google/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/esqueci/i)).not.toBeInTheDocument();
  });

  it("toggles password visibility", async () => {
    const user = userEvent.setup();
    render(<AuthScreen />);

    const password = screen.getByLabelText("Senha");
    expect(password).toHaveAttribute("type", "password");

    await user.click(screen.getByRole("button", { name: "Mostrar senha" }));
    expect(password).toHaveAttribute("type", "text");
  });

  it("updates confirm password message while typing", async () => {
    const user = userEvent.setup();
    render(<AuthScreen />);

    await user.click(screen.getByRole("button", { name: "Criar conta" }));
    await user.type(screen.getByLabelText("Senha"), "senha-segura");
    await user.type(screen.getByLabelText("Confirmar senha"), "senha-errada");

    expect(screen.getByText("As senhas precisam ser iguais.")).toBeInTheDocument();

    await user.clear(screen.getByLabelText("Confirmar senha"));
    await user.type(screen.getByLabelText("Confirmar senha"), "senha-segura");

    expect(screen.getByText("Senhas iguais.")).toBeInTheDocument();
  });
});
