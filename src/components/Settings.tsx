import { useState, useEffect } from "react";
import { Cloud, CloudOff, CheckCircle, AlertCircle } from "lucide-react";
import { setupWebDAV, disconnectWebDAV, loadWebDAVConfig, testWebDAV } from "../sync";
import Modal from "./Modal";

export default function Settings({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [url, setUrl] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [fileName, setFileName] = useState("labify-backup.json");
  const [status, setStatus] = useState<{ ok: boolean; message: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!open) return;
    const cfg = loadWebDAVConfig();
    if (cfg) {
      setUrl(cfg.url);
      setUsername(cfg.username);
      setPassword(cfg.password);
      setFileName(cfg.fileName);
      setConnected(true);
    }
    setStatus(null);
  }, [open]);

  const handleTest = async () => {
    setStatus(null);
    setSaving(true);
    const res = await testWebDAV({ url, username, password });
    setStatus(res);
    setSaving(false);
  };

  const handleSave = async () => {
    if (!url.trim() || !username.trim()) return;
    setStatus(null);
    setSaving(true);
    const res = await setupWebDAV({ url, username, password, fileName: fileName.trim() || "labify-backup.json" });
    setStatus(res);
    setSaving(false);
    if (res.ok) setConnected(true);
  };

  const handleDisconnect = () => {
    disconnectWebDAV();
    setConnected(false);
    setUrl("");
    setUsername("");
    setPassword("");
    setStatus({ ok: true, message: "Disconnected" });
  };

  return (
    <Modal open={open} onClose={onClose} title="Cloud Sync (WebDAV)">
      <div className="form">
        <div className="field">
          <label>Server URL</label>
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://my-cloud.example.com/remote.php/dav/files/user/"
          />
        </div>
        <div className="row">
          <div className="field">
            <label>Username</label>
            <input value={username} onChange={(e) => setUsername(e.target.value)} />
          </div>
          <div className="field">
            <label>Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
        </div>
        <div className="field">
          <label>Backup File Name</label>
          <input value={fileName} onChange={(e) => setFileName(e.target.value)} />
        </div>

        {status && (
          <div className={`sync-status ${status.ok ? "ok" : "err"}`}>
            {status.ok ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
            <span>{status.message}</span>
          </div>
        )}

        <div className="form-actions">
          {connected ? (
            <button className="btn-secondary" onClick={handleDisconnect}>
              <CloudOff size={14} /> Disconnect
            </button>
          ) : (
            <button className="btn-secondary" onClick={handleTest} disabled={saving}>
              <Cloud size={14} /> Test
            </button>
          )}
          <button className="btn-primary" onClick={handleSave} disabled={saving || !url.trim() || !username.trim()}>
            {connected ? "Update" : "Connect"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
