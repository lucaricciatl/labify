import { useState } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
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
} from "lucide-react";
import { StoreProvider, useStore } from "./store";
import { ThemeProvider, useTheme } from "./theme";
import { AuthProvider, useAuth } from "./auth";
import Suppliers from "./components/Suppliers";
import Materials from "./components/Materials";
import Instruments from "./components/Instruments";
import Experiments from "./components/Experiments";
import Orders from "./components/Orders";
import Inventory from "./components/Inventory";
import SettingsModal from "./components/Settings";
import Login from "./components/Login";
import Register from "./components/Register";
import VerifyEmail from "./components/VerifyEmail";

type Tab = "experiments" | "materials" | "orders" | "instruments" | "suppliers" | "inventory";

function SidebarNav() {
  const [tab, setTab] = useState<Tab>("experiments");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { theme, toggle } = useTheme();
  const { state, syncStatus } = useStore();
  const { user, logout } = useAuth();

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: "experiments", label: "Experiments", icon: <FlaskConical size={18} /> },
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

        {user && (
          <div className="sidebar-user">
            <div className="user-row">
              <User size={14} />
              <span>{user.name || user.email}</span>
            </div>
            <button className="sidebar-tool-btn" onClick={logout}>
              <LogOut size={14} /> Log out
            </button>
          </div>
        )}

        <button className="theme-toggle" onClick={toggle}>
          {theme === "light" ? <Moon size={16} /> : <Sun size={16} />}
          <span>{theme === "light" ? "Dark mode" : "Light mode"}</span>
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
        {tab === "inventory" && <Inventory />}
      </main>

      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}

function AuthRouter() {
  const { user, loading } = useAuth();
  const [authView, setAuthView] = useState<"login" | "register">("login");

  if (loading) {
    return (
      <div className="auth-screen">
        <div className="auth-card">
          <Beaker size={32} className="spin" />
          <p>Loading…</p>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/verify" element={<VerifyEmail />} />
      <Route
        path="*"
        element={
          user ? (
            <SidebarNav />
          ) : authView === "login" ? (
            <Login onSwitch={setAuthView} />
          ) : (
            <Register onSwitch={setAuthView} />
          )
        }
      />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <StoreProvider>
            <AuthRouter />
          </StoreProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
