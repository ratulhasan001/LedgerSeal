import Header from "./components/Header";
import Notice from "./components/Notice";
import UploadPanel from "./components/UploadPanel";
import VerifyPanel from "./components/VerifyPanel";
import AdminPanel from "./components/AdminPanel";
import { CONTRACT_ADDRESS } from "./config";
import { useTheme } from "./hooks/useTheme";
import { useWallet } from "./hooks/useWallet";

export default function App() {
  const { theme, toggleTheme } = useTheme();
  const wallet = useWallet();

  return (
    <div className="app">
      <Header wallet={wallet} theme={theme} onToggleTheme={toggleTheme} />

      <main className="container">
        <section className="intro">
          <h1>Tamper-proof file verification</h1>
          <p>
            LedgerSeal stores a SHA-256 fingerprint of each file on-chain. Anyone can later prove a file is the exact
            one that was registered, and when.
          </p>
        </section>

        {!CONTRACT_ADDRESS && (
          <Notice tone="error">
            No contract configured. Set <code>VITE_CONTRACT_ADDRESS</code> in <code>frontend/.env</code> and restart the
            dev server.
          </Notice>
        )}
        {CONTRACT_ADDRESS && !wallet.hasWallet && (
          <Notice tone="info">No browser wallet detected. Verification works in read-only mode.</Notice>
        )}
        {wallet.error && <Notice tone="error">{wallet.error}</Notice>}

        <div className="grid">
          <UploadPanel wallet={wallet} />
          <VerifyPanel readContract={wallet.readContract} />
          {wallet.roles.isAdmin && <AdminPanel wallet={wallet} />}
        </div>
      </main>

      <footer className="footer">
        {CONTRACT_ADDRESS && (
          <span>
            Contract <code>{CONTRACT_ADDRESS}</code>
          </span>
        )}
      </footer>
    </div>
  );
}
