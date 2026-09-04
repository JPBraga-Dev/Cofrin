import { useState } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { CurrencyInput, Drawer, DrawerHeader } from "./ui";

describe("CurrencyInput", () => {
  it("normalizes BRL decimal input and reports integer cents", () => {
    let cents = 0;
    function Harness() { const [value, setValue] = useState(""); return <CurrencyInput aria-label="Valor" value={value} onChange={setValue} onCentsChange={(next) => { cents = next; }} />; }
    render(<Harness />);
    fireEvent.focus(screen.getByLabelText("Valor"));
    fireEvent.change(screen.getByLabelText("Valor"), { target: { value: "1.234,56" } });
    expect(screen.getByLabelText("Valor")).toHaveValue("1234,56");
    expect(cents).toBe(123456);
    fireEvent.blur(screen.getByLabelText("Valor"));
    expect(screen.getByLabelText("Valor")).toHaveValue("1.234,56");
  });
});

describe("Drawer", () => {
  it("locks scroll, focuses its content and restores the opener", async () => {
    function Harness() { const [open, setOpen] = useState(false); return <><button onClick={() => setOpen(true)}>Abrir</button><Drawer open={open} onClose={() => setOpen(false)}><DrawerHeader title="Editar" description="Altere os dados" /><input aria-label="Nome" /></Drawer></>; }
    render(<Harness />);
    const opener = screen.getByRole("button", { name: "Abrir" });
    await userEvent.click(opener);
    await waitFor(() => expect(screen.getByLabelText("Nome")).toHaveFocus());
    expect(document.body.style.overflow).toBe("hidden");
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(opener).toHaveFocus());
    expect(document.body.style.overflow).toBe("");
  });
});
