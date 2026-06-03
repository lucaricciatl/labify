import { useState } from "react";
import {
  FlaskConical,
  Package,
  Truck,
  Beaker,
  Sun,
  Moon,
  Settings,
  Cloud,
  CloudOff,
  RefreshCw,
  Wrench,
  ClipboardList,
  ShoppingCart,
  LogOut,
  User,
  FileText,
} from "lucide-react";
import { StoreProvider, useStore } from "./store";
import { ThemeProvider, useTheme } from "./theme";
import { useAuth } from "./auth";
import Suppliers from "./components/Suppliers";
import Materials from "./components/Materials";
import Instruments from "./components/Instruments";
import Experiments from "./components/Experiments";
import Orders from "./components/Orders";
import Inventory from "./components/Inventory";
import ExperimentDesigns from "./components/ExperimentDesigns";
import SettingsModal from "./components/Settings";

type Tab = "experiments" | "materials" | "orders" | "instruments" | "suppliers" | "inventory" | "designs";

function SidebarNav() {
  const [tab, setTab] = useState<Tab>("experiments");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { theme, toggle } = useTheme();
  const { state, syncStatus } = useStore();
  const { user, logout } = useAuth();

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: "experiments", label: "Experiments", icon: <FlaskConical size={18} /> },
    { key: "designs", label: "Designs", icon: <FileText size={18} /> },
    { key: "materials", label: "Materials", icon: <Package size={18} /> },
    { key: "orders", label: "Orders", icon: <ShoppingCart size={18} /> },
    { key: "instruments", label: "Tools", icon: <Wrench size={18} /> },
    { key: "suppliers", label: "Suppliers", icon: <Truck size={18} /> },
    { key: "inventory", label: "Inventory", icon: <ClipboardList size={18} /> },
  ];

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <Beaker size={24} />
          <span>Labify</span>
        </div>
        <nav className="sidebar-nav">
          {tabs.map((t) => (
            <button
              key={t.key}
              className={tab === t.key ? "nav-active" : ""}
              onClick={() => setTab(t.key)}
            >
              {t.icon}
              <span>{t.label}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-tools">
          <div className="sync-pill">
            {syncStatus.connected ? (
              <>
                {syncStatus.syncing ? (
                  <>
                    <RefreshCw size={12} className="spin" />
                    <span>Syncing...</span>
                  </>
                ) : (
                  <>
                    <Cloud size={12} />
                    <span title={syncStatus.lastMessage}>Connected</span>
                  </>
                )}
              </>
            ) : (
              <>
                <CloudOff size={12} />
                <span>Local only</span>
              </>
            )}
          </div>

          <button className="sidebar-tool-btn" onClick={() => setSettingsOpen(true)}>
            <Settings size={15} /> Cloud Sync
          </button>
        </div>

        <button className="theme-toggle" onClick={toggle}>
          {theme === "light" ? <Moon size={16} /> : <Sun size={16} />}
          <span>{theme === "light" ? "Dark mode" : "Light mode"}</span>
        </button>

        {user && (
          <div style={{ padding: "0.5rem 1rem", borderTop: "1px solid var(--border)", display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.8rem", opacity: 0.8 }}>
            <User size={14} />
            <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis" }}>{user.name || user.email}</span>
          </div>
        )}

        <button className="theme-toggle" onClick={logout} style={{ color: "var(--danger)" }}>
          <LogOut size={16} />
          <span>Log out</span>
        </button>

        <div className="sidebar-footer">
          <div className="stat-row"><Truck size={15} /><span>{state.suppliers.length} Suppliers</span></div>
          <div className="stat-row"><Package size={15} /><span>{state.materials.length} Materials</span></div>
          <div className="stat-row"><ShoppingCart size={15} /><span>{state.orders.length} Orders</span></div>
          <div className="stat-row"><ClipboardList size={15} /><span>{state.inventory.length} Inventory</span></div>
        </div>
      </aside>

      <main className="main">
        {tab === "suppliers" && <Suppliers />}
        {tab === "materials" && <Materials />}
        {tab === "orders" && <Orders />}
        {tab === "instruments" && <Instruments />}
        {tab === "experiments" && <Experiments />}
        {tab === "designs" && <ExperimentDesigns />}
        {tab === "inventory" && <Inventory />}
      </main>

      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <StoreProvider>
        <SidebarNav />
      </StoreProvider>
    </ThemeProvider>
  );
}
