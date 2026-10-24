import { useRef, useState } from "react";
import FileDrop from "./FileDrop";
import Notice from "./Notice";
import { IPFS_GATEWAY } from "../config";
import { describeError } from "../lib/errors";
import { formatTimestamp, shortAddress, shortHash } from "../lib/format";
import { sha256File } from "../lib/hash";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

export default function VerifyPanel({ readContract }) {
  const [file, setFile] = useState(null);
  const [hash, setHash] = useState("");
  const [status, setStatus] = useState("idle");
  const [record, setRecord] = useState(null);
  const [error, setError] = useState("");
  const requestId = useRef(0);

  const handleSelect = async (selected) => {
    const id = ++requestId.current;
    const isCurrent = () => id === requestId.current;

    setFile(selected);
    setHash("");
    setRecord(null);
    setError("");
    setStatus("hashing");

    try {
      const fileHash = await sha256File(selected);
      if (!isCurrent()) return;
      setHash(fileHash);
      setStatus("checking");

      const stored = await readContract.getRecord(fileHash);
      if (!isCurrent()) return;

      if (stored.uploader === ZERO_ADDRESS) {
        setStatus("missing");
      } else {
        setRecord({ uploader: stored.uploader, timestamp: stored.timestamp, cid: stored.cid });
        setStatus("found");
      }
    } catch (err) {
      if (!isCurrent()) return;
      setError(describeError(err));
      setStatus("error");
    }
  };

  return (
    <section className="card">
      <div className="card__header">
        <h2>Verify a file</h2>
        <p>Check whether a file matches a fingerprint in the registry. Nothing is uploaded.</p>
      </div>

      <FileDrop
        id="verify-file"
        prompt="Choose a file to verify"
        file={file}
        hash={hash}
        hashing={status === "hashing"}
        disabled={!readContract || status === "checking"}
        onSelect={handleSelect}
      />

      {status === "checking" && <Notice tone="info">Looking up fingerprint…</Notice>}
      {status === "missing" && (
        <Notice tone="warning">No match. This file has not been registered, or it has been modified.</Notice>
      )}
      {status === "error" && <Notice tone="error">{error}</Notice>}

      {status === "found" && record && (
        <>
          <Notice tone="success">Verified. This exact file is registered on-chain.</Notice>
          <dl className="details">
            <dt>Registered by</dt>
            <dd>
              <code title={record.uploader}>{shortAddress(record.uploader)}</code>
            </dd>
            <dt>Registered at</dt>
            <dd>{formatTimestamp(record.timestamp)}</dd>
            {record.cid && (
              <>
                <dt>IPFS CID</dt>
                <dd>
                  <a href={`${IPFS_GATEWAY}/${record.cid}`} target="_blank" rel="noreferrer">
                    {shortHash(record.cid, 12)}
                  </a>
                </dd>
              </>
            )}
          </dl>
        </>
      )}
    </section>
  );
}
