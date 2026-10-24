import { shortAddress } from "../lib/format";

function ThemeIcon({ theme }) {
  return theme === "dark" ? (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4l1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z" />
    </svg>
  );
}

export default function Header({ wallet, theme, onToggleTheme }) {
  const { hasWallet, account, roles, connecting, connect } = wallet;

  return (
    <header className="topbar">
      <div className="topbar__brand">
        <img src="/favicon.svg" alt="" width="28" height="28" />
        <span>LedgerSeal</span>
      </div>

      <div className="topbar__actions">
        {account ? (
          <div className="account">
            {roles.isAdmin && <span className="badge badge--admin">Admin</span>}
            {roles.isUploader && <span className="badge badge--uploader">Uploader</span>}
            {!roles.isAdmin && !roles.isUploader && <span className="badge">Viewer</span>}
            <code className="account__address" title={account}>
              {shortAddress(account)}
            </code>
          </div>
        ) : hasWallet ? (
          <button className="btn btn--primary" onClick={connect} disabled={connecting}>
            {connecting ? "Connecting…" : "Connect wallet"}
          </button>
        ) : (
          <a className="btn btn--ghost" href="https://metamask.io/download/" target="_blank" rel="noreferrer">
            Install MetaMask
          </a>
        )}

        <button
          className="icon-btn"
          onClick={onToggleTheme}
          aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
        >
          <ThemeIcon theme={theme} />
        </button>
      </div>
    </header>
  );
}
