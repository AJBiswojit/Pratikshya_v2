import { useMemo, useState } from "react";
import AdminPage from "../../components/admin/AdminPage";
import AdminPanel from "../../components/admin/AdminPanel";
import { AtelierButton, AtelierBadge } from "../../design-system";
import { getSettings, resetSection, updateSection } from "../../services/settingsRepository";
import { ACTIVITY_ACTIONS, recordActivity, loadActivity } from "../../services/employees/activityService";

/* Employee-account policy is administered from the Employee Portal — the
   Admin settings desk carries business configuration only. */
const labels = { business:"Business Profile", store:"Store & Locations", locations:"Warehouse", hours:"Working Hours", attendance:"Attendance", holidays:"Holidays", tax:"Tax & GST", shipping:"Shipping", orders:"Orders", returns:"Returns", inventory:"Inventory", notifications:"Notifications", customer:"Customer Experience", offers:"Offers", media:"Media", payments:"Payments" };
const fieldLabel = (key) => key.replace(/([A-Z])/g, " $1").replace(/^./, c => c.toUpperCase());
const valid = (section, data) => {
  if (section === "business" && data.email && !/^\S+@\S+\.\S+$/.test(data.email)) return "Enter a valid business email.";
  if (section === "tax" && data.enabled && data.gstin && !/^\d{2}[A-Z]{5}\d{4}[A-Z]\d[A-Z\d]Z[A-Z\d]$/.test(data.gstin)) return "Enter a valid GSTIN.";
  if (section === "tax" && Number(data.defaultRate) !== Number(data.cgst) + Number(data.sgst) && Number(data.igst) !== Number(data.defaultRate)) return "CGST + SGST must equal the default GST rate (or set matching IGST).";
  if (["shipping", "attendance", "returns", "inventory"].includes(section) && Object.values(data).some(v => typeof v === "number" && v < 0)) return "Values cannot be negative.";
  return "";
};
export default function AdminSettings() {
  const [section, setSection] = useState("business"); const [settings, setSettings] = useState(getSettings); const [notice, setNotice] = useState("");
  const data = settings[section];
  const scalar = useMemo(() => Object.entries(data).filter(([,v]) => !Array.isArray(v) && (typeof v !== "object" || v === null)), [data]);
  const change = (key, value) => setSettings(prev => ({...prev, [section]: {...prev[section], [key]: value}}));
  const save = () => { const error = valid(section, data); if (error) return setNotice(error); updateSection(section, data); try { recordActivity(loadActivity(), { action: ACTIVITY_ACTIONS.SETTINGS_UPDATED, summary: `Updated ${labels[section]}; changed fields: ${Object.keys(data).join(", ")}` }); } catch {} setNotice(`${labels[section]} settings saved.`); };
  const reset = () => { if (!window.confirm(`Reset ${labels[section]} to defaults?`)) return; const next = resetSection(section); setSettings(prev=>({...prev,[section]:next})); try { recordActivity(loadActivity(), { action: ACTIVITY_ACTIONS.SETTINGS_RESET, summary: `Reset ${labels[section]} settings` }); } catch {} setNotice(`${labels[section]} reset to defaults.`); };
  return <AdminPage eyebrow="Configuration" title="Business Settings" description="One source of truth for future-facing operating rules. Historical orders, returns and attendance are never rewritten.">
    <div className="grid gap-5 xl:grid-cols-[240px_minmax(0,1fr)]"><nav aria-label="Settings sections" className="flex gap-2 overflow-x-auto xl:block xl:space-y-1">{Object.entries(labels).map(([id,label])=><button key={id} onClick={()=>{setSection(id);setNotice("")}} className={`whitespace-nowrap rounded px-3 py-2 text-left text-sm ${section===id?"bg-ink text-white":"hover:bg-mist"}`}>{label}</button>)}</nav>
    <div className="space-y-5"><AdminPanel><div className="flex items-center justify-between gap-3"><div><h2 className="font-display text-2xl">{labels[section]}</h2><p className="mt-1 text-sm text-taupe">Save changes explicitly. Configuration affects future activity only.</p></div><AtelierBadge>{section === "tax" && !data.enabled ? "GST is not configured" : "Configured"}</AtelierBadge></div></AdminPanel>
    <AdminPanel><div className="grid gap-4 sm:grid-cols-2">{scalar.map(([key,value])=><label key={key} className="block font-ui text-sm text-ink">{fieldLabel(key)}{typeof value === "boolean" ? <input aria-label={fieldLabel(key)} className="ml-3 h-4 w-4" type="checkbox" checked={value} onChange={e=>change(key,e.target.checked)} /> : <input className="mt-1 w-full rounded border border-mist bg-white px-3 py-2" type={typeof value === "number" ? "number" : key.includes("Time") ? "time" : "text"} value={value ?? ""} onChange={e=>change(key, typeof value === "number" ? Number(e.target.value) : e.target.value)} />}</label>)}</div>
    {section === "hours" && <p className="mt-4 text-sm text-taupe">Per-day operating hours are retained in this section and available for location-aware backend migration.</p>}
    {section === "holidays" && <p className="mt-4 text-sm text-taupe">Holiday items are managed as dated, active records through the centralized holidays section; attendance reads active records.</p>}
    <div className="mt-6 flex flex-wrap gap-3"><AtelierButton onClick={save}>Save Changes</AtelierButton><AtelierButton variant="secondary" onClick={()=>{setSettings(getSettings());setNotice("Changes cancelled.")}}>Cancel</AtelierButton><button className="text-sm underline" onClick={reset}>Reset section to defaults</button></div>{notice && <p className="mt-4 text-sm" role="status" aria-live="polite">{notice}</p>}</AdminPanel></div></div>
  </AdminPage>;
}
