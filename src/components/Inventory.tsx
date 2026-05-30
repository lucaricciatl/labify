import { useState } from "react";
import { Trash2, FileSpreadsheet, Search, PackageCheck } from "lucide-react";
import { useStore, useInventoryActions } from "../store";
import { downloadExcel } from "../export";

export default function Inventory() {
  const { state } = useStore();
  const actions = useInventoryActions();
  const [search, setSearch] = useState("");

  const q = search.toLowerCase();
  const filtered = state.inventory.filter((item) => {
    const mat = state.materials.find((m) => m.code === item.materialCode);
    const s = state.suppliers.find((x) => x.id === item.supplierId);
    const hay = [item.id, item.materialCode, mat?.name ?? "", item.batch, s?.name ?? ""].join(" ").toLowerCase();
    return hay.includes(q);
  });

  const totalValue = filtered.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);

  const exportXlsx = () => {
    downloadExcel(
      "inventory.xlsx",
      "Inventory",
      filtered.map((item) => {
        const mat = state.materials.find((m) => m.code === item.materialCode);
        const supplier = state.suppliers.find((s) => s.id === item.supplierId);
        return {
          "Item ID": item.id,
          "Material Code": item.materialCode,
          "Material Name": mat?.name ?? "",
          Supplier: supplier?.name ?? item.supplierId,
          Batch: item.batch,
          Quantity: item.quantity,
          "Unit Price": item.unitPrice,
          "Total Value": item.quantity * item.unitPrice,
          "Received Date": item.receivedDate,
        };
      })
    );
  };

  return (
    <div className="section">
      <div className="section-header">
        <h2>Inventory</h2>
        <div className="section-header-btns">
          <div className="search-bar">
            <Search size={14} />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search inventory..." />
          </div>
          <button className="btn-ghost" onClick={exportXlsx}><FileSpreadsheet size={16} /> Export</button>
        </div>
      </div>

      <div className="inventory-summary">
        <div className="inventory-stat">
          <PackageCheck size={18} />
          <div>
            <strong>{filtered.length}</strong>
            <span>Item(s) in stock</span>
          </div>
        </div>
        <div className="inventory-stat">
          <FileSpreadsheet size={18} />
          <div>
            <strong>${totalValue.toFixed(2)}</strong>
            <span>Total value</span>
          </div>
        </div>
      </div>

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Item ID</th>
              <th>Material</th>
              <th>Supplier</th>
              <th>Batch</th>
              <th>Qty</th>
              <th>Unit Price</th>
              <th>Total</th>
              <th>Received</th>
              <th style={{ width: 60 }}></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((item) => {
              const mat = state.materials.find((m) => m.code === item.materialCode);
              const supplier = state.suppliers.find((s) => s.id === item.supplierId);
              return (
                <tr key={item.id}>
                  <td><span className="mono-id">{item.id}</span></td>
                  <td>{mat?.name ?? item.materialCode}</td>
                  <td>{supplier?.name ?? item.supplierId}</td>
                  <td><span className="mono-id">{item.batch}</span></td>
                  <td>{item.quantity}</td>
                  <td>${item.unitPrice.toFixed(2)}</td>
                  <td><strong>${(item.quantity * item.unitPrice).toFixed(2)}</strong></td>
                  <td>{item.receivedDate}</td>
                  <td className="actions">
                    <button
                      className="icon-btn danger"
                      title="Delete (consumed / used up)"
                      onClick={async () => {
                        if (confirm(`Delete ${mat?.name ?? item.materialCode} from inventory?`)) {
                          await actions.remove(item.id);
                        }
                      }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr><td colSpan={9} className="empty">No items in inventory.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
