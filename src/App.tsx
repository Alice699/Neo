import { useUploadBlobs } from "@shelby-protocol/react";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { useEffect, useMemo, useState } from "react";
import { bundledApiKey, getEffectiveApiKey, networkConfig } from "./config";
import { Providers } from "./providers";
import { createShelbyClient } from "./shelby";
import { formatBytes, loadFiles, loadSettings, makeId, saveFiles, saveSettings, shortAddress } from "./storage";
import type { AccessMode, NeoNetwork, NeoSettings, ThemeMode, UploadStatus, VaultFile } from "./types";

type View = "vault" | "upload" | "share" | "settings";

const viewLabels: Record<View, string> = {
  vault: "Vault",
  upload: "Upload",
  share: "Share",
  settings: "Settings",
};

function getAccountAddress(account: unknown): string {
  const candidate = account as { address?: unknown; accountAddress?: unknown };
  const value = candidate?.accountAddress ?? candidate?.address;
  return typeof value === "string" ? value : value?.toString?.() ?? "";
}

function getUploadErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : String(error || "Upload failed.");

  if (message.includes("Unauthorized") || message.includes("401")) {
    return "Shelby rejected this request because Neo does not have an API key. Open Settings, paste your Aptos or Shelby API key, then try the upload again.";
  }

  return message;
}

export function App() {
  const [settings, setSettings] = useState<NeoSettings>(() => loadSettings());
  const effectiveApiKey = getEffectiveApiKey(settings);

  useEffect(() => {
    document.documentElement.dataset.theme = settings.theme;
    saveSettings(settings);
  }, [settings]);

  return (
    <Providers key={settings.network} network={settings.network} apiKey={effectiveApiKey}>
      <NeoApp settings={settings} setSettings={setSettings} />
    </Providers>
  );
}

function NeoApp({
  settings,
  setSettings,
}: {
  settings: NeoSettings;
  setSettings: React.Dispatch<React.SetStateAction<NeoSettings>>;
}) {
  const [view, setView] = useState<View>("vault");
  const [files, setFiles] = useState<VaultFile[]>(() => loadFiles());
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const selectedFile = files.find((file) => file.id === selectedFileId) ?? files[0];

  useEffect(() => {
    saveFiles(files);
  }, [files]);

  function updateSettings(patch: Partial<NeoSettings>) {
    setSettings((current) => ({ ...current, ...patch }));
  }

  function upsertFile(file: VaultFile) {
    setFiles((current) => {
      const exists = current.some((item) => item.id === file.id);
      return exists ? current.map((item) => (item.id === file.id ? file : item)) : [file, ...current];
    });
  }

  function removeFile(id: string) {
    setFiles((current) => current.filter((file) => file.id !== id));
    if (selectedFileId === id) setSelectedFileId(null);
  }

  return (
    <div className="app-shell">
      <div className="mesh-bg" aria-hidden="true" />
      <div className="noise-layer" aria-hidden="true" />
      <Header settings={settings} updateSettings={updateSettings} view={view} setView={setView} />
      <main>
        {view === "vault" && (
          <VaultView
            files={files}
            selectedFile={selectedFile}
            setView={setView}
            setSelectedFileId={setSelectedFileId}
            removeFile={removeFile}
            settings={settings}
          />
        )}
        {view === "upload" && <UploadView settings={settings} upsertFile={upsertFile} setView={setView} />}
        {view === "share" && <ShareView file={selectedFile} settings={settings} />}
        {view === "settings" && <SettingsView settings={settings} updateSettings={updateSettings} />}
      </main>
      <footer className="protocol-footer">
        <span>Neo / Shelby media vault</span>
        <span>Built for creator storage, community drops, and Aptos wallet workflows.</span>
      </footer>
    </div>
  );
}

function Header({
  settings,
  updateSettings,
  view,
  setView,
}: {
  settings: NeoSettings;
  updateSettings: (patch: Partial<NeoSettings>) => void;
  view: View;
  setView: (view: View) => void;
}) {
  const { account, connected, connect, disconnect, wallets } = useWallet();
  const [walletMessage, setWalletMessage] = useState("");
  const address = getAccountAddress(account);

  async function connectFirstWallet() {
    const readyWallet = wallets.find((wallet) => wallet.readyState === "Installed") ?? wallets[0];
    if (!readyWallet) {
      setWalletMessage("Install an Aptos wallet to connect.");
      return;
    }

    try {
      setWalletMessage("");
      await connect(readyWallet.name as never);
    } catch (error) {
      setWalletMessage(error instanceof Error ? error.message : "Wallet connection was cancelled.");
    }
  }

  return (
    <header className="topbar">
      <button className="brand" type="button" onClick={() => setView("vault")}>
        <span className="brand-mark" aria-hidden="true">
          <svg viewBox="0 0 64 64" role="img">
            <path className="logo-ring" d="M32 7.5c13.5 0 24.5 11 24.5 24.5S45.5 56.5 32 56.5 7.5 45.5 7.5 32 18.5 7.5 32 7.5Z" />
            <path className="logo-orbit" d="M17.5 41.5c7.7 5.4 21.7 5.4 29.4 0M17.5 22.5c7.7-5.4 21.7-5.4 29.4 0" />
            <path className="logo-core" d="M24 43V21h4.9l10.2 13.2V21H44v22h-4.9L28.9 29.8V43H24Z" />
            <circle className="logo-node" cx="49" cy="18" r="3" />
          </svg>
        </span>
        <span className="brand-copy">
          <strong>Neo</strong>
          <small>Media vault</small>
        </span>
      </button>

      <nav className="nav-tabs" aria-label="Neo navigation">
        {(["vault", "upload", "share", "settings"] as View[]).map((item) => (
          <button className={view === item ? "is-active" : ""} type="button" key={item} onClick={() => setView(item)}>
            {viewLabels[item]}
          </button>
        ))}
      </nav>

      <div className="topbar-actions">
        <span className="route-badge">{networkConfig[settings.network].label}</span>
        <ThemeSwitch theme={settings.theme} setTheme={(theme) => updateSettings({ theme })} />
        <NetworkSwitch network={settings.network} setNetwork={(network) => updateSettings({ network })} />
        <button
          className={`wallet-button ${connected ? "is-connected" : ""}`}
          type="button"
          onClick={connected ? disconnect : connectFirstWallet}
          title={walletMessage || (connected ? "Disconnect wallet" : "Connect Aptos wallet")}
        >
          {connected ? shortAddress(address) : wallets.length === 0 ? "Install wallet" : "Connect wallet"}
        </button>
      </div>
    </header>
  );
}

function ThemeSwitch({ theme, setTheme }: { theme: ThemeMode; setTheme: (theme: ThemeMode) => void }) {
  return (
    <div className="switch-control" aria-label="Theme selector">
      {(["dark", "light"] as ThemeMode[]).map((item) => (
        <button
          className={theme === item ? "is-active" : ""}
          type="button"
          key={item}
          onClick={() => setTheme(item)}
          aria-pressed={theme === item}
        >
          {item === "dark" ? "Dark" : "Light"}
        </button>
      ))}
    </div>
  );
}

function NetworkSwitch({ network, setNetwork }: { network: NeoNetwork; setNetwork: (network: NeoNetwork) => void }) {
  return (
    <div className="switch-control network-switch" aria-label="Shelby network selector">
      {(["shelbynet", "testnet"] as NeoNetwork[]).map((item) => (
        <button
          className={network === item ? "is-active" : ""}
          type="button"
          key={item}
          onClick={() => setNetwork(item)}
          aria-pressed={network === item}
        >
          {networkConfig[item].label}
        </button>
      ))}
    </div>
  );
}

function VaultView({
  files,
  selectedFile,
  setView,
  setSelectedFileId,
  removeFile,
  settings,
}: {
  files: VaultFile[];
  selectedFile?: VaultFile;
  setView: (view: View) => void;
  setSelectedFileId: (id: string) => void;
  removeFile: (id: string) => void;
  settings: NeoSettings;
}) {
  const activeNetwork = networkConfig[settings.network];
  const uploaded = files.filter((file) => file.status === "uploaded").length;
  const totalSize = files.reduce((sum, file) => sum + file.size, 0);

  return (
    <section className="dashboard-grid">
      <div className="hero-panel">
        <div className="portal-orbit" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
        <p className="eyebrow">Shelby media protocol</p>
        <h1>Media vault for Shelby communities.</h1>
        <p>
          Neo turns large creator files into Shelby blob records with wallet ownership, clear routing, and share pages
          ready for drops, archives, and protocol demos.
        </p>
        <div className="hero-actions">
          <button className="primary-action" type="button" onClick={() => setView("upload")}>
            Enter Vault
          </button>
          <button className="secondary-action" type="button" onClick={() => setView("settings")}>
            Network settings
          </button>
        </div>
        <div className="protocol-strip" aria-label="Neo protocol status">
          <span>Shelby blob storage</span>
          <span>Aptos wallet ownership</span>
          <span>Community share pages</span>
        </div>
      </div>

      <aside className="network-panel">
        <div className="panel-stack">
          <span className="panel-label">Shelby route</span>
          <strong>{activeNetwork.label}</strong>
          <p>{activeNetwork.description}</p>
        </div>
        <div className="route-visual" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
        <dl className="route-list">
          <div>
            <dt>Status</dt>
            <dd>Ready</dd>
          </div>
          <div>
            <dt>RPC</dt>
            <dd>{activeNetwork.rpc.replace("https://", "")}</dd>
          </div>
          <div>
            <dt>Wallet</dt>
            <dd>Aptos testnet</dd>
          </div>
        </dl>
      </aside>

      <div className="stat-grid">
        <Stat label="Vault records" value={files.length.toString()} />
        <Stat label="Shelby uploads" value={uploaded.toString()} />
        <Stat label="Media stored" value={formatBytes(totalSize)} />
      </div>

      <section className="file-table" aria-labelledby="vault-files">
        <div className="section-header">
          <div>
            <p className="eyebrow">Community vault</p>
            <h2 id="vault-files">Media records</h2>
          </div>
          <button className="secondary-action" type="button" onClick={() => setView("upload")}>
            Add media
          </button>
        </div>

        {files.length === 0 ? (
          <div className="empty-state">
            <strong>Your vault is ready.</strong>
            <span>Add a media file to create the first Shelby-backed record for your community.</span>
            <button className="primary-action" type="button" onClick={() => setView("upload")}>
              Add first file
            </button>
          </div>
        ) : (
          <div className="file-list">
            {files.map((file) => (
              <article className="file-row" key={file.id}>
                <span className="file-type">{file.name.split(".").pop()?.slice(0, 3).toUpperCase() || "FILE"}</span>
                <div>
                  <strong>{file.name}</strong>
                  <span>
                    {formatBytes(file.size)} / {accessLabel(file.access)} / {networkConfig[file.network].label}
                  </span>
                </div>
                <span className={`status-pill ${file.status}`}>{statusLabel(file.status)}</span>
                <div className="row-actions">
                  <button
                    className="ghost-action"
                    type="button"
                    onClick={() => {
                      setSelectedFileId(file.id);
                      setView("share");
                    }}
                  >
                    Open
                  </button>
                  <button className="ghost-action danger" type="button" onClick={() => removeFile(file.id)}>
                    Delete
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <SharePreview file={selectedFile} setView={setView} />
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <article className="stat-card">
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

function UploadView({
  settings,
  upsertFile,
  setView,
}: {
  settings: NeoSettings;
  upsertFile: (file: VaultFile) => void;
  setView: (view: View) => void;
}) {
  const { account, connected, signAndSubmitTransaction } = useWallet();
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [access, setAccess] = useState<AccessMode>("private");
  const [days, setDays] = useState(7);
  const [message, setMessage] = useState("Choose one or more files to prepare a Shelby upload.");
  const effectiveApiKey = getEffectiveApiKey(settings);
  const shelbyClient = useMemo(() => createShelbyClient(settings.network, effectiveApiKey), [settings.network, effectiveApiKey]);

  const uploadBlobs = useUploadBlobs({
    client: shelbyClient,
    onError: (error) => setMessage(getUploadErrorMessage(error)),
  });

  async function uploadSelectedFiles() {
    const owner = getAccountAddress(account);

    if (!connected || !owner || !signAndSubmitTransaction) {
      setMessage("Connect an Aptos wallet before uploading to Shelby.");
      return;
    }

    if (selectedFiles.length === 0) {
      setMessage("Choose at least one file.");
      return;
    }

    if (!effectiveApiKey) {
      setMessage("Shelby uploads require an API key. Open Settings, paste your Aptos or Shelby API key, then return here to upload.");
      return;
    }

    const expiresAt = Date.now() + days * 24 * 60 * 60 * 1000;
    const pendingRecords = selectedFiles.map((file) => createVaultRecord(file, owner, settings.network, access, expiresAt, "uploading"));
    pendingRecords.forEach(upsertFile);
    setMessage("Preparing blob data and submitting the Shelby upload...");

    try {
      const blobs = await Promise.all(
        selectedFiles.map(async (file) => ({
          blobName: `${owner}-${Date.now()}-${file.name}`,
          blobData: new Uint8Array(await file.arrayBuffer()),
        })),
      );

      await uploadBlobs.mutateAsync({
        signer: { account: owner, signAndSubmitTransaction },
        blobs,
        expirationMicros: expiresAt * 1000,
      });

      pendingRecords.forEach((record, index) =>
        upsertFile({
          ...record,
          blobName: blobs[index].blobName,
          status: "uploaded",
        }),
      );
      setSelectedFiles([]);
      setMessage("Upload complete. Neo saved the vault record in this browser.");
      setView("vault");
    } catch (error) {
      const failure = getUploadErrorMessage(error);
      pendingRecords.forEach((record) => upsertFile({ ...record, status: "failed", error: failure }));
      setMessage(failure);
    }
  }

  function saveLocalDrafts() {
    const owner = getAccountAddress(account) || "local-preview";
    const expiresAt = Date.now() + days * 24 * 60 * 60 * 1000;
    selectedFiles.forEach((file) => upsertFile(createVaultRecord(file, owner, settings.network, access, expiresAt, "local")));
    setSelectedFiles([]);
    setMessage("Draft saved. Connect a wallet when you are ready to upload to Shelby.");
    setView("vault");
  }

  return (
    <section className="upload-layout">
      <div className="section-header">
        <div>
          <p className="eyebrow">Upload flow</p>
          <h1>Prepare media for Shelby storage.</h1>
        </div>
      </div>

      <div className="upload-grid">
        <div className="upload-console">
          <label className="dropzone">
            <input
              type="file"
              multiple
              onChange={(event) => setSelectedFiles(Array.from(event.target.files ?? []))}
            />
            <span className="drop-icon" />
            <strong>
              {selectedFiles.length
                ? `${selectedFiles.length} ${selectedFiles.length === 1 ? "file" : "files"} selected`
                : "Choose media files"}
            </strong>
            <span>Neo prepares blob payloads, expiration, and wallet-owned metadata before upload.</span>
          </label>

          <div className="upload-options">
            <label>
              Visibility
              <select value={access} onChange={(event) => setAccess(event.target.value as AccessMode)}>
                <option value="private">Private vault</option>
                <option value="public">Public share</option>
                <option value="token-gated">Token gated</option>
              </select>
            </label>
            <label>
              Storage window
              <input min="1" max="90" type="number" value={days} onChange={(event) => setDays(Number(event.target.value))} />
            </label>
          </div>

          <div className="selected-list">
            {selectedFiles.length === 0 ? (
              <div className="selected-empty">Selected files will appear here before upload.</div>
            ) : (
              selectedFiles.map((file) => (
                <div className="selected-file" key={`${file.name}-${file.lastModified}`}>
                  <span>{file.name}</span>
                  <strong>{formatBytes(file.size)}</strong>
                </div>
              ))
            )}
          </div>

          <div className="upload-actions">
            <button className="primary-action" type="button" onClick={uploadSelectedFiles} disabled={uploadBlobs.isPending}>
              {uploadBlobs.isPending ? "Uploading to Shelby..." : "Upload to Shelby"}
            </button>
            {!effectiveApiKey && (
              <button className="secondary-action" type="button" onClick={() => setView("settings")}>
                Add API key
              </button>
            )}
            <button className="secondary-action" type="button" onClick={saveLocalDrafts} disabled={selectedFiles.length === 0}>
              Save draft only
            </button>
          </div>

          <p className="form-note" aria-live="polite">{message}</p>
        </div>

        <aside className="upload-guide">
          <p className="eyebrow">Upload checklist</p>
          <h2>Before you send a blob</h2>
          <ul>
            <li>Connect the wallet that should own the media record.</li>
            <li>Use shelbynet for fast experiments and testnet for steadier demos.</li>
            <li>Save a draft when you only want to shape the vault experience.</li>
          </ul>
        </aside>
      </div>
    </section>
  );
}

function createVaultRecord(
  file: File,
  owner: string,
  network: NeoNetwork,
  access: AccessMode,
  expiresAt: number,
  status: UploadStatus,
): VaultFile {
  const id = makeId();
  return {
    id,
    name: file.name,
    size: file.size,
    type: file.type || "application/octet-stream",
    owner,
    network,
    access,
    status,
    createdAt: Date.now(),
    expiresAt,
    shareSlug: id.slice(0, 8),
    blobName: `${owner}-${id}-${file.name}`,
  };
}

function SharePreview({ file, setView }: { file?: VaultFile; setView: (view: View) => void }) {
  return (
    <aside className="share-preview">
      <p className="eyebrow">Share preview</p>
      {file ? (
        <>
          <h2>{file.name}</h2>
          <p>{file.access === "public" ? "Public media page" : "Owner-gated preview"} on {networkConfig[file.network].label}.</p>
          <code>{`${location.origin}/share/${file.shareSlug}`}</code>
          <button className="secondary-action" type="button" onClick={() => setView("share")}>
            Preview share page
          </button>
        </>
      ) : (
        <>
          <h2>No media selected</h2>
          <p>Add media to preview the page your community will open.</p>
        </>
      )}
    </aside>
  );
}

function ShareView({ file, settings }: { file?: VaultFile; settings: NeoSettings }) {
  const { account, connected } = useWallet();
  const address = getAccountAddress(account);
  const canView = file?.access === "public" || (connected && address === file?.owner);

  if (!file) {
    return (
      <section className="center-panel">
        <p className="eyebrow">Share</p>
        <h1>No media selected.</h1>
        <p>Choose a record from the vault to preview its community share page.</p>
      </section>
    );
  }

  return (
    <section className="share-page">
      <div className="media-frame">
        <span className="media-orbit" />
        <strong>{canView ? file.name : "Access required"}</strong>
        <p>{canView ? "This area will stream or render the Shelby blob." : "Connect the owner wallet or switch this record to public access."}</p>
      </div>
      <aside className="share-details">
        <p className="eyebrow">Community share</p>
        <h1>{file.name}</h1>
        <dl>
          <div>
            <dt>Owner</dt>
            <dd>{shortAddress(file.owner)}</dd>
          </div>
          <div>
            <dt>Access</dt>
            <dd>{accessLabel(file.access)}</dd>
          </div>
          <div>
            <dt>Network</dt>
            <dd>{networkConfig[file.network].label}</dd>
          </div>
          <div>
            <dt>Status</dt>
            <dd>{statusLabel(file.status)}</dd>
          </div>
          <div>
            <dt>Size</dt>
            <dd>{formatBytes(file.size)}</dd>
          </div>
          <div>
            <dt>Expires</dt>
            <dd>{formatDate(file.expiresAt)}</dd>
          </div>
        </dl>
        <code>{networkConfig[settings.network].rpc}</code>
      </aside>
    </section>
  );
}

function SettingsView({
  settings,
  updateSettings,
}: {
  settings: NeoSettings;
  updateSettings: (patch: Partial<NeoSettings>) => void;
}) {
  const activeNetwork = networkConfig[settings.network];
  const hasBundledApiKey = Boolean(bundledApiKey);

  return (
    <section className="settings-layout">
      <div className="section-header">
        <div>
          <p className="eyebrow">Protocol settings</p>
          <h1>Choose how Neo connects to Shelby.</h1>
        </div>
      </div>

      <div className="settings-grid">
        <article>
          <h2>Interface theme</h2>
          <ThemeSwitch theme={settings.theme} setTheme={(theme) => updateSettings({ theme })} />
        </article>
        <article>
          <h2>Shelby network</h2>
          <NetworkSwitch network={settings.network} setNetwork={(network) => updateSettings({ network })} />
          <p>{activeNetwork.description}</p>
        </article>
        <article>
          <h2>API key</h2>
          <input
            value={settings.apiKey}
            onChange={(event) => updateSettings({ apiKey: event.target.value })}
            placeholder={hasBundledApiKey ? "Deployment key is active" : "aptoslabs_..."}
            aria-label="Aptos or Shelby API key"
          />
          <p>
            {hasBundledApiKey
              ? "A deployment API key is already configured. Paste a personal key here only if you want to override it in this browser."
              : "Stored only in this browser. Use it for development access and sponsored API routing."}
          </p>
        </article>
      </div>

      <div className="endpoint-grid">
        <Endpoint label="Shelby RPC" value={activeNetwork.rpc} />
        <Endpoint label="Indexer" value={activeNetwork.indexer} />
        <Endpoint label="Aptos fullnode" value={activeNetwork.fullnode} />
      </div>
    </section>
  );
}

function Endpoint({ label, value }: { label: string; value: string }) {
  return (
    <article className="endpoint-card">
      <span>{label}</span>
      <code>{value}</code>
    </article>
  );
}

function accessLabel(access: AccessMode) {
  if (access === "token-gated") return "Token gated";
  return access === "public" ? "Public" : "Private";
}

function statusLabel(status: UploadStatus) {
  const labels: Record<UploadStatus, string> = {
    local: "Draft",
    uploading: "Uploading",
    uploaded: "Uploaded",
    failed: "Failed",
  };

  return labels[status];
}

function formatDate(timestamp: number) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(timestamp);
}
