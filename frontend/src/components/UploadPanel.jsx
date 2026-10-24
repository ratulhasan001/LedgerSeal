import { useState } from "react";
import FileDrop from "./FileDrop";
import Notice from "./Notice";
import { IPFS_GATEWAY } from "../config";
import { describeError } from "../lib/errors";
import { formatBytes, formatDuration, shortHash } from "../lib/format";
import { sha256File } from "../lib/hash";
import { isPinataConfigured, uploadToPinata } from "../lib/pinata";

const PHASE_LABELS = {
  checking: "Checking registry…",
  uploading: "Uploading to IPFS…",
  signing: "Confirm the transaction in your wallet…",
  confirming: "Waiting for confirmation…",
};

export default function UploadPanel({ wallet }) {
  const { account, roles, readContract, writeContract } = wallet;

  const [file, setFile] = useState(null);
  const [hash, setHash] = useState("");
  const [hashing, setHashing] = useState(false);
  const [phase, setPhase] = useState("idle");
  const [progress, setProgress] = useState(null);
  const [notice, setNotice] = useState(null);
  const [result, setResult] = useState(null);

  const busy = phase !== "idle";
  const canUpload = Boolean(account && roles.isUploader && writeContract && file && hash && !hashing && !busy);

  const handleSelect = async (selected) => {
    setFile(selected);
    setHash("");
    setNotice(null);
    setResult(null);
    setHashing(true);
    try {
      setHash(await sha256File(selected));
    } catch (err) {
      setNotice({ tone: "error", text: `Could not read the file: ${describeError(err)}` });
    } finally {
      setHashing(false);
    }
  };

  const handleUpload = async () => {
    setNotice(null);
    setResult(null);
    setProgress(null);

    try {
      setPhase("checking");
      if (await readContract.isHashStored(hash)) {
        setNotice({ tone: "warning", text: "This file is already registered. Use Verify to see its record." });
        return;
      }

      setPhase("uploading");
      const cid = await uploadToPinata(file, setProgress);

      setPhase("signing");
      const tx = await writeContract.storeHash(hash, cid);
      setResult({ cid, txHash: tx.hash });

      setPhase("confirming");
      await tx.wait();
      setNotice({ tone: "success", text: "File registered on-chain." });
    } catch (err) {
      setNotice({ tone: "error", text: describeError(err) });
    } finally {
      setPhase("idle");
      setProgress(null);
    }
  };

  let hint = null;
  if (!isPinataConfigured()) hint = "Pinata credentials are not configured, so uploads are disabled.";
  else if (!account) hint = "Connect a wallet with the Uploader role to register files.";
  else if (!roles.isUploader) hint = "Your account does not have the Uploader role. Ask an admin to grant it.";

  const percent = progress?.total ? Math.round((progress.loaded / progress.total) * 100) : 0;

  return (
    <section className="card">
      <div className="card__header">
        <h2>Register a file</h2>
        <p>Pin the file to IPFS and record its SHA-256 fingerprint on-chain.</p>
      </div>

      <FileDrop
        id="upload-file"
        prompt="Choose a file to register"
        file={file}
        hash={hash}
        hashing={hashing}
        disabled={busy}
        onSelect={handleSelect}
      />

      <button className="btn btn--primary btn--block" onClick={handleUpload} disabled={!canUpload}>
        {busy ? PHASE_LABELS[phase] : "Upload & register"}
      </button>

      {phase === "uploading" && progress && (
        <div className="progress">
          <div className="progress__bar" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>
            <div className="progress__fill" style={{ width: `${percent}%` }} />
          </div>
          <div className="progress__stats">
            <span>{percent}%</span>
            <span>
              {formatBytes(progress.loaded)} / {formatBytes(progress.total)}
            </span>
            <span>{formatBytes(progress.rate)}/s</span>
            <span>ETA {formatDuration(progress.eta)}</span>
          </div>
        </div>
      )}

      {hint && !busy && <Notice tone="info">{hint}</Notice>}
      {notice && <Notice tone={notice.tone}>{notice.text}</Notice>}

      {result && (
        <dl className="details">
          <dt>IPFS CID</dt>
          <dd>
            <a href={`${IPFS_GATEWAY}/${result.cid}`} target="_blank" rel="noreferrer">
              {shortHash(result.cid, 12)}
            </a>
          </dd>
          <dt>Transaction</dt>
          <dd>
            <code title={result.txHash}>{shortHash(result.txHash)}</code>
          </dd>
        </dl>
      )}
    </section>
  );
}
