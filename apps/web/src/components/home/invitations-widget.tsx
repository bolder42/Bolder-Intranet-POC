"use client";

import { useEffect, useState, useTransition } from "react";
import { getInviteStatus, type Invite } from "@bolder/shared";
import { manageInvites } from "@/app/app/invite-actions";

export function InvitationsWidget() {
  const [invites, setInvites] = useState<Invite[]>([]);
  const [role, setRole] = useState("dev");
  const [days, setDays] = useState("7");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [pending, startTransition] = useTransition();
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    let active = true;
    manageInvites("list")
      .then((result) => {
        if (!active) return;
        setInvites(result.invites ?? []);
        setError(result.error ?? "");
        setLoading(false);
      })
      .catch(() => {
        if (!active) return;
        setError("Unable to load invitations. Please try again.");
        setLoading(false);
      });
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, []);

  function run(operation: "list" | "create" | "revoke", id?: number) {
    setError("");
    setMessage("");
    startTransition(async () => {
      try {
        const result = await manageInvites(operation, {
          role,
          expiresInDays: Number(days),
          ...(id ? { id } : {}),
        });
        if (result.error) {
          setError(result.error);
          return;
        }
        if (result.invites) setInvites(result.invites);
        if (result.invite) {
          const invite = result.invite;
          setInvites((current) => [invite, ...current.filter((item) => item.id !== invite.id)]);
          setMessage(
            operation === "create"
              ? "Invitation generated. Copy the code to share it."
              : "Invitation revoked.",
          );
        }
        setNow(Date.now());
      } catch {
        setError("Unable to reach the server. Please try again.");
      }
    });
  }

  async function copy(code: string) {
    try {
      await navigator.clipboard.writeText(code);
      setError("");
      setMessage("Invitation code copied.");
    } catch {
      setError("Could not copy. Select the code and copy it manually.");
    }
  }

  return (
    <section className="leadership-panel" aria-labelledby="invites-title">
      <div className="leadership-heading">
        <div>
          <h2 id="invites-title" className="widget-title">
            Invitations
          </h2>
          <p className="dashboard-meta">
            Share a single-use code and the registration address with a new teammate.
          </p>
          <a href="/auth/register">Open registration</a>
        </div>
        <button type="button" disabled={loading || pending} onClick={() => run("list")}>
          Refresh invitations
        </button>
      </div>
      <form
        className="invite-form"
        onSubmit={(event) => {
          event.preventDefault();
          run("create");
        }}
      >
        <label>
          Account role
          <select value={role} onChange={(event) => setRole(event.target.value)}>
            <option value="dev">Dev</option>
            <option value="tech_lead">Tech Lead</option>
            <option value="admin">Admin</option>
          </select>
        </label>
        <label>
          Expires in (days)
          <input
            type="number"
            min="1"
            max="365"
            required
            value={days}
            onChange={(event) => setDays(event.target.value)}
          />
        </label>
        <button type="submit" disabled={loading || pending}>
          Generate invitation
        </button>
      </form>
      {message && <p role="status">{message}</p>}
      {error && (
        <p role="alert" className="settings-error">
          {error}
        </p>
      )}
      {loading ? (
        <p role="status">Loading invitations…</p>
      ) : !error && invites.length === 0 ? (
        <p className="dashboard-meta">No invitations yet.</p>
      ) : null}
      {invites.length > 0 && (
        <div className="leadership-table-scroll">
          <table className="leadership-table">
            <caption className="sr-only">Generated invitation codes</caption>
            <thead>
              <tr>
                <th>Code</th>
                <th>Role</th>
                <th>Status</th>
                <th>Expires</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {invites.map((invite) => {
                const status = getInviteStatus(invite, now);
                return (
                  <tr key={invite.id}>
                    <td>
                      <code>{invite.code}</code>
                    </td>
                    <td>
                      {invite.role === "tech_lead"
                        ? "Tech Lead"
                        : invite.role === "admin"
                          ? "Admin"
                          : "Dev"}
                    </td>
                    <td>{status}</td>
                    <td>{new Date(invite.expiresAt).toLocaleString()}</td>
                    <td>
                      {status === "active" && (
                        <div className="invite-actions">
                          <button
                            type="button"
                            onClick={() => copy(invite.code)}
                            aria-label={`Copy ${invite.code}`}
                          >
                            Copy code
                          </button>
                          <button
                            type="button"
                            disabled={pending}
                            onClick={() => run("revoke", invite.id)}
                            aria-label={`Revoke ${invite.code}`}
                          >
                            Revoke
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
