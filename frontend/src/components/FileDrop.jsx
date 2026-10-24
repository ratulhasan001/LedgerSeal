import { useState } from "react";
import { formatBytes } from "../lib/format";

export default function FileDrop({ id, file, hash, hashing, disabled, onSelect, prompt }) {
  const [dragging, setDragging] = useState(false);

  const pick = (selected) => {
    if (selected && !disabled) onSelect(selected);
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setDragging(false);
    pick(event.dataTransfer.files?.[0]);
  };

  const handleDragOver = (event) => {
    event.preventDefault();
    if (!disabled) setDragging(true);
  };

  const classes = ["dropzone", dragging && "dropzone--active", disabled && "dropzone--disabled"]
    .filter(Boolean)
    .join(" ");

  return (
    <label
      htmlFor={id}
      className={classes}
      onDragOver={handleDragOver}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
    >
      <input
        id={id}
        type="file"
        className="visually-hidden"
        disabled={disabled}
        onChange={(event) => {
          pick(event.target.files?.[0]);
          event.target.value = "";
        }}
      />
      {file ? (
        <div className="dropzone__file">
          <span className="dropzone__name">{file.name}</span>
          <span className="dropzone__meta">{formatBytes(file.size)}</span>
          <code className="dropzone__hash">{hashing ? "Computing SHA-256…" : hash}</code>
        </div>
      ) : (
        <div className="dropzone__empty">
          <svg viewBox="0 0 24 24" aria-hidden="true" className="dropzone__icon">
            <path d="M12 16V4m0 0l-4 4m4-4l4 4M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2" />
          </svg>
          <span>{prompt}</span>
          <span className="dropzone__meta">Drop a file here or click to browse</span>
        </div>
      )}
    </label>
  );
}
