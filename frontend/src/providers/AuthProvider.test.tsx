import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider, useAuth } from "./AuthProvider";

const mocks = vi.hoisted(() => {
  class MockApiError extends Error {
    constructor(public status: number, public code: string, message: string) { super(message); }
  }
  return { MockApiError, authMe: vi.fn() };
});
vi.mock("../services/api", () => ({
  ApiError: mocks.MockApiError,
  api: { authMe: mocks.authMe, login: vi.fn(), register: vi.fn(), logout: vi.fn(), forgotPassword: vi.fn(), resetPassword: vi.fn(), changePassword: vi.fn(), listSessions: vi.fn(), revokeOtherSessions: vi.fn() },
}));

function Probe() { const { status, user, error } = useAuth(); return <div><span>{status}</span><span>{user?.displayName}</span><span>{error}</span></div>; }

describe("AuthProvider", () => {
  beforeEach(() => mocks.authMe.mockReset());
  it("does not turn a server failure into an unauthenticated session", async () => {
    mocks.authMe.mockRejectedValueOnce(new mocks.MockApiError(500, "INTERNAL_ERROR", "Servidor indisponível"));
    render(<AuthProvider><Probe /></AuthProvider>);
    await waitFor(() => expect(screen.getByText("ERROR")).toBeInTheDocument());
    expect(screen.queryByText("UNAUTHENTICATED")).not.toBeInTheDocument();
    expect(screen.getByText("Servidor indisponível")).toBeInTheDocument();
  });

  it("clears identity only after a real 401", async () => {
    mocks.authMe.mockRejectedValueOnce(new mocks.MockApiError(401, "SESSION_EXPIRED", "Sessão expirada"));
    render(<AuthProvider><Probe /></AuthProvider>);
    await waitFor(() => expect(screen.getByText("UNAUTHENTICATED")).toBeInTheDocument());
  });
});
