import { useEffect, useState } from "react";
import { isAddress } from "ethers";
import Notice from "./Notice";
import { UPLOADER_ROLE } from "../lib/contract";
import { describeError } from "../lib/errors";
import { shortAddress } from "../lib/format";

export default function AdminPanel({ wallet }) {
  const { account, readContract, writeContract, refreshRoles } = wallet;

  const [address, setAddress] = useState("");
  const [hasRole, setHasRole] = useState(null);
  const [pending, setPending] = useState(null);
  const [notice, setNotice] = useState(null);
  const [revision, setRevision] = useState(0);

  const target = address.trim();
  const valid = isAddress(target);

  useEffect(() => {
    if (!valid || !readContract) {
      setHasRole(null);
      return;
    }
    let cancelled = false;
    readContract
      .hasRole(UPLOADER_ROLE, target)
      .then((result) => !cancelled && setHasRole(result))
      .catch(() => !cancelled && setHasRole(null));
    return () => {
      cancelled = true;
    };
  }, [target, valid, readContract, revision]);

  const run = async (action) => {
    setPending(action);
    setNotice(null);
    try {
      const tx =
        action === "grant"
          ? await writeContract.grantUploaderRole(target)
          : await writeContract.revokeUploaderRole(target);
      await tx.wait();

      const verb = action === "grant" ? "granted to" : "revoked from";
      setNotice({ tone: "success", text: `Uploader role ${verb} ${shortAddress(target)}.` });
      setRevision((value) => value + 1);
      if (target.toLowerCase() === account?.toLowerCase()) await refreshRoles();
    } catch (err) {
      setNotice({ tone: "error", text: describeError(err) });
    } finally {
      setPending(null);
    }
  };

  return (
    <section className="card card--wide">
      <div className="card__header">
        <h2>Manage uploaders</h2>
        <p>Grant or revoke the Uploader role. Only admins can change roles.</p>
      </div>

      <div className="field">
        <label htmlFor="role-address">Wallet address</label>
        <div className="field__row">
          <input
            id="role-address"
            type="text"
            placeholder="0x…"
            spellCheck={false}
            autoComplete="off"
            value={address}
            onChange={(event) => setAddress(event.target.value)}
            aria-invalid={Boolean(target) && !valid}
          />
          <button className="btn btn--primary" onClick={() => run("grant")} disabled={!valid || Boolean(pending) || hasRole === true}>
            {pending === "grant" ? "Granting…" : "Grant"}
          </button>
          <button className="btn btn--danger" onClick={() => run("revoke")} disabled={!valid || Boolean(pending) || hasRole === false}>
            {pending === "revoke" ? "Revoking…" : "Revoke"}
          </button>
        </div>
        {target && !valid && <span className="field__hint field__hint--error">Enter a valid address.</span>}
        {valid && hasRole !== null && (
          <span className="field__hint">
            {hasRole ? "This address currently has the Uploader role." : "This address does not have the Uploader role."}
          </span>
        )}
      </div>

      {notice && <Notice tone={notice.tone}>{notice.text}</Notice>}
    </section>
  );
}
