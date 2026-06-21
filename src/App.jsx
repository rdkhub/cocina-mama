import React, { useState, useEffect, useCallback } from "react";
import { ChefHat, Clock, CheckCircle2, Circle, Phone, MapPin, Store, Plus, Minus, Trash2, Lock, ArrowLeft, Wallet, AlertCircle, Loader2 } from "lucide-react";
import { todayKey, todayLabel, defaultMenu, loadMenu, saveMenu, loadOrders, createOrder, updateOrder, deleteOrder } from "./data";
import { supabase } from "./supabaseClient";


const PAY_LABELS = {
  yape: "Yape",
  efectivo: "Efectivo",
  fiado: "Fiado / Debe",
};

const PAY_COLORS = {
  yape: "#5C7A4F",
  efectivo: "#9C7A3C",
  fiado: "#C1452D",
};

// ---------- Small UI atoms ----------
function Tag({ children, color }) {
  return (
    <span
      style={{
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: "0.7rem",
        letterSpacing: "0.04em",
        padding: "0.2rem 0.55rem",
        borderRadius: "999px",
        border: `1px solid ${color}`,
        color: color,
        textTransform: "uppercase",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </span>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="block text-sm mb-1.5 text-[#6b5f52] font-medium">{label}</span>
      {children}
    </label>
  );
}

const inputStyle =
  "w-full rounded-lg border border-[#dccdb4] bg-[#FFFDF8] px-3.5 py-2.5 text-[15px] text-[#2B2622] placeholder-[#a89a86] outline-none focus:border-[#C1452D] focus:ring-2 focus:ring-[#C1452D]/15 transition";

// =====================================================================
// CLIENT VIEW
// =====================================================================
function ClientView({ menu, onSubmit, submitting, justSubmitted, onReset }) {
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  // cantidades[i] = cantidad pedida del fondo i / entrada i
  const [fondoQty, setFondoQty] = useState(menu.fondos.map(() => 0));
  const [entradaQty, setEntradaQty] = useState(menu.entradas.map(() => 0));
  const [bebidaQty, setBebidaQty] = useState(0);
  const [modo, setModo] = useState("recojo"); // recojo | delivery
  const [direccion, setDireccion] = useState("");
  const [pago, setPago] = useState("fiado"); // yape | efectivo | fiado
  const [notas, setNotas] = useState("");
  const [error, setError] = useState("");

  const totalFondos = fondoQty.reduce((a, b) => a + b, 0);
  const totalEntradas = entradaQty.reduce((a, b) => a + b, 0);

  const bump = (arr, setArr, i, delta) => {
    const copy = [...arr];
    copy[i] = Math.max(0, copy[i] + delta);
    setArr(copy);
  };

  const handleSubmit = () => {
    if (!nombre.trim()) return setError("Falta tu nombre.");
    if (!telefono.trim()) return setError("Falta tu n\u00famero de tel\u00e9fono.");
    if (totalFondos === 0) return setError("Elige al menos un plato de fondo.");
    if (modo === "delivery" && !direccion.trim()) return setError("Falta la direcci\u00f3n de entrega.");
    setError("");

    const fondos = menu.fondos
      .map((nombrePlato, i) => (fondoQty[i] > 0 ? { nombre: nombrePlato, cantidad: fondoQty[i] } : null))
      .filter(Boolean);
    const entradas = menu.entradas
      .map((nombrePlato, i) => (entradaQty[i] > 0 ? { nombre: nombrePlato, cantidad: entradaQty[i] } : null))
      .filter(Boolean);

    onSubmit({
      nombre: nombre.trim(),
      telefono: telefono.trim(),
      fondos,
      entradas,
      bebida: bebidaQty > 0 ? { nombre: menu.bebida, cantidad: bebidaQty } : null,
      modo,
      direccion: modo === "delivery" ? direccion.trim() : "",
      pago,
      notas: notas.trim(),
    });
  };

  if (justSubmitted) {
    return (
      <div className="min-h-screen bg-[#FBF6EC] flex items-center justify-center px-5">
        <div className="max-w-sm w-full text-center">
          <div className="w-16 h-16 rounded-full bg-[#5C7A4F]/10 flex items-center justify-center mx-auto mb-5">
            <CheckCircle2 size={32} color="#5C7A4F" strokeWidth={1.75} />
          </div>
          <h2 className="font-display text-2xl text-[#2B2622] mb-2">Pedido recibido</h2>
          <p className="text-[#6b5f52] text-[15px] leading-relaxed mb-7">
            Tu pedido ya está en la cocina. Te avisamos por WhatsApp cuando esté listo
            {justSubmitted.modo === "delivery" ? " para salir." : " para recoger."}
          </p>
          <div className="text-left bg-white rounded-2xl border border-[#e8ddc8] p-4 mb-7 text-sm">
            {justSubmitted.fondos.map((f, i) => (
              <Row key={"f" + i} label={f.cantidad > 1 ? `Plato (x${f.cantidad})` : "Plato"} value={f.nombre} />
            ))}
            {justSubmitted.entradas.map((e, i) => (
              <Row key={"e" + i} label={e.cantidad > 1 ? `Entrada (x${e.cantidad})` : "Entrada"} value={e.nombre} />
            ))}
            {justSubmitted.bebida && (
              <Row label={justSubmitted.bebida.cantidad > 1 ? `Bebida (x${justSubmitted.bebida.cantidad})` : "Bebida"} value={justSubmitted.bebida.nombre} />
            )}
            <Row label="Pago" value={PAY_LABELS[justSubmitted.pago]} />
          </div>
          <button
            onClick={onReset}
            className="text-[#C1452D] text-sm font-medium underline-offset-4 hover:underline"
          >
            Hacer otro pedido
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FBF6EC] pb-32">
      {/* Hero: la pizarra del menú */}
      <div className="relative bg-[#2B2622] text-[#FBF6EC] px-5 pt-9 pb-12 overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 20%, #fff 0%, transparent 1%), radial-gradient(circle at 80% 60%, #fff 0%, transparent 1%)",
            backgroundSize: "22px 22px",
          }}
        />
        <div className="relative max-w-md mx-auto">
          <div className="flex items-center gap-2 mb-5">
            <ChefHat size={20} strokeWidth={1.75} color="#E0A95C" />
            <span className="font-display text-lg tracking-wide">Cocina de Mam\u00e1</span>
          </div>
          <div
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: "0.72rem",
              letterSpacing: "0.06em",
            }}
            className="text-[#E0A95C] uppercase mb-1"
          >
            Men\u00fa de hoy &middot; {todayLabel()}
          </div>
          <h1 className="font-display text-[2rem] leading-[1.1] mb-1">{menu.fondos[0]}</h1>
          <p className="text-[#cfc3ad] text-[15px]">o {menu.fondos[1]}</p>
        </div>
      </div>

      <div className="max-w-md mx-auto px-5 -mt-7 relative z-10">
        <div className="bg-white rounded-2xl shadow-[0_8px_24px_rgba(43,38,34,0.08)] border border-[#eee2cb] p-5 mb-7">
          <div className="flex gap-2 flex-wrap">
            <Tag color="#9C7A3C">Bebida: {menu.bebida}</Tag>
            <Tag color="#5C7A4F">Puedes pedir varios platos y cantidades</Tag>
          </div>
        </div>

        <h2 className="font-display text-xl text-[#2B2622] mb-3.5">Armar mi pedido</h2>

        <div className="space-y-5">
          <Field label="Platos de fondo (elige cantidad de cada uno)">
            <div className="space-y-2">
              {menu.fondos.map((f, i) => (
                <QtyCard key={i} text={f} qty={fondoQty[i]} onChange={(d) => bump(fondoQty, setFondoQty, i, d)} />
              ))}
            </div>
          </Field>

          <Field label="Entradas (elige cantidad de cada una)">
            <div className="space-y-2">
              {menu.entradas.map((e, i) => (
                <QtyCard key={i} text={e} qty={entradaQty[i]} onChange={(d) => bump(entradaQty, setEntradaQty, i, d)} />
              ))}
            </div>
          </Field>

          <Field label={`Bebida del d\u00eda: ${menu.bebida}`}>
            <QtyCard text={menu.bebida} qty={bebidaQty} onChange={(d) => setBebidaQty(Math.max(0, bebidaQty + d))} />
          </Field>

          <Field label="Recojo o delivery">
            <div className="grid grid-cols-2 gap-2">
              <SelectCard active={modo === "recojo"} onClick={() => setModo("recojo")} text="Recojo en local" compact icon={<Store size={15} />} />
              <SelectCard active={modo === "delivery"} onClick={() => setModo("delivery")} text="Delivery" compact icon={<MapPin size={15} />} />
            </div>
          </Field>

          {modo === "delivery" && (
            <Field label="Direcci\u00f3n de entrega">
              <input className={inputStyle} value={direccion} onChange={(e) => setDireccion(e.target.value)} placeholder="Jr. Las Flores 123, dpto 4" />
            </Field>
          )}

          <Field label="¿C\u00f3mo vas a pagar?">
            <div className="grid grid-cols-3 gap-2">
              {Object.entries(PAY_LABELS).map(([key, label]) => (
                <SelectCard key={key} active={pago === key} onClick={() => setPago(key)} text={label} compact />
              ))}
            </div>
          </Field>

          <Field label="Tu nombre">
            <input className={inputStyle} value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Nombre y apellido" />
          </Field>

          <Field label="Tu WhatsApp">
            <input className={inputStyle} value={telefono} onChange={(e) => setTelefono(e.target.value)} placeholder="999 999 999" inputMode="tel" />
          </Field>

          <Field label="Notas (opcional)">
            <input className={inputStyle} value={notas} onChange={(e) => setNotas(e.target.value)} placeholder="Sin cebolla, poca sal, etc." />
          </Field>

          {(totalFondos > 0 || totalEntradas > 0 || bebidaQty > 0) && (
            <div className="bg-[#2B2622] rounded-2xl p-4 text-[#FBF6EC]">
              <div className="text-[#E0A95C] text-xs uppercase tracking-wide mb-2" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                Tu pedido
              </div>
              <div className="space-y-1 text-[14px]">
                {menu.fondos.map((f, i) =>
                  fondoQty[i] > 0 ? (
                    <div key={"sf" + i} className="flex justify-between">
                      <span>{f}</span>
                      <span className="text-[#E0A95C] font-medium ml-3 shrink-0">x{fondoQty[i]}</span>
                    </div>
                  ) : null
                )}
                {menu.entradas.map((e, i) =>
                  entradaQty[i] > 0 ? (
                    <div key={"se" + i} className="flex justify-between text-[#cfc3ad]">
                      <span>{e}</span>
                      <span className="text-[#E0A95C] font-medium ml-3 shrink-0">x{entradaQty[i]}</span>
                    </div>
                  ) : null
                )}
                {bebidaQty > 0 && (
                  <div className="flex justify-between text-[#cfc3ad]">
                    <span>{menu.bebida}</span>
                    <span className="text-[#E0A95C] font-medium ml-3 shrink-0">x{bebidaQty}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 text-[#C1452D] text-sm bg-[#C1452D]/8 rounded-lg px-3 py-2.5">
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full bg-[#C1452D] hover:bg-[#a93a25] disabled:opacity-60 text-white font-medium rounded-xl py-3.5 text-[15px] transition flex items-center justify-center gap-2"
          >
            {submitting ? <Loader2 size={18} className="animate-spin" /> : null}
            {submitting ? "Enviando pedido\u2026" : "Enviar mi pedido"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between py-1.5 border-b border-[#f0e8d6] last:border-0">
      <span className="text-[#8a7d6b]">{label}</span>
      <span className="text-[#2B2622] font-medium text-right max-w-[60%]">{value}</span>
    </div>
  );
}

// Tarjeta de cantidad: botones - y + para elegir cu\u00e1ntas unidades de un plato.
// Cuando qty > 0, queda resaltada en BLANCO con borde rojo (no gris) para que se note claro que est\u00e1 elegida.
function QtyCard({ text, qty, onChange }) {
  const active = qty > 0;
  return (
    <div
      className={`w-full rounded-xl border-2 flex items-center justify-between gap-3 px-3.5 py-2.5 transition ${
        active ? "border-[#C1452D] bg-white shadow-[0_2px_8px_rgba(193,69,45,0.12)]" : "border-[#e8ddc8] bg-white"
      }`}
    >
      <span className={`text-[14px] ${active ? "font-semibold text-[#2B2622]" : "text-[#5c5246]"}`}>{text}</span>
      <div className="flex items-center gap-2.5 shrink-0">
        <button
          onClick={() => onChange(-1)}
          disabled={qty === 0}
          className="w-7 h-7 rounded-full border border-[#dccdb4] text-[#8a7d6b] flex items-center justify-center disabled:opacity-30 active:bg-[#f0e8d6]"
        >
          <Minus size={14} />
        </button>
        <span className={`w-5 text-center text-[15px] font-semibold ${active ? "text-[#C1452D]" : "text-[#c7b89a]"}`}>{qty}</span>
        <button
          onClick={() => onChange(1)}
          className="w-7 h-7 rounded-full bg-[#C1452D] text-white flex items-center justify-center active:bg-[#a93a25]"
        >
          <Plus size={14} />
        </button>
      </div>
    </div>
  );
}

function SelectCard({ active, onClick, text, compact, icon }) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left rounded-xl border-2 transition flex items-center gap-2 ${
        compact ? "px-3 py-2.5 justify-center text-center" : "px-3.5 py-3"
      } ${
        active
          ? "border-[#C1452D] bg-white text-[#2B2622] font-semibold shadow-[0_2px_8px_rgba(193,69,45,0.12)]"
          : "border-[#e8ddc8] bg-white text-[#5c5246] hover:border-[#d8c8a6]"
      }`}
    >
      {icon}
      <span className={`text-[14px] ${active ? "font-medium" : ""}`}>{text}</span>
      {!compact && (
        <span className="ml-auto">
          {active ? <CheckCircle2 size={18} color="#C1452D" /> : <Circle size={18} color="#d8c8a6" />}
        </span>
      )}
    </button>
  );
}

// =====================================================================
// PIN LOCK
// =====================================================================
const ADMIN_PIN = "1234"; // c\u00e1mbialo aqu\u00ed por el PIN que quieras usar en el local

function PinScreen({ onUnlock, onBack }) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);

  const tryUnlock = (value) => {
    if (value === ADMIN_PIN) {
      onUnlock();
    } else if (value.length >= ADMIN_PIN.length) {
      setError(true);
      setTimeout(() => setError(false), 600);
      setPin("");
    }
  };

  const press = (d) => {
    const next = (pin + d).slice(0, ADMIN_PIN.length);
    setPin(next);
    if (next.length === ADMIN_PIN.length) tryUnlock(next);
  };

  return (
    <div className="min-h-screen bg-[#2B2622] flex items-center justify-center px-5">
      <div className="max-w-xs w-full text-center">
        <Lock size={28} color="#E0A95C" className="mx-auto mb-4" />
        <h2 className="font-display text-xl text-[#FBF6EC] mb-1">Panel de mam\u00e1</h2>
        <p className="text-[#9c9082] text-sm mb-7">Ingresa el PIN para entrar</p>

        <div className={`flex justify-center gap-3 mb-8 ${error ? "animate-pulse" : ""}`}>
          {Array.from({ length: ADMIN_PIN.length }).map((_, i) => (
            <div
              key={i}
              className="w-3.5 h-3.5 rounded-full border-2"
              style={{
                borderColor: error ? "#C1452D" : "#E0A95C",
                backgroundColor: i < pin.length ? (error ? "#C1452D" : "#E0A95C") : "transparent",
              }}
            />
          ))}
        </div>

        <div className="grid grid-cols-3 gap-3 mb-6">
          {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
            <button
              key={d}
              onClick={() => press(d)}
              className="aspect-square rounded-2xl bg-[#3a342c] text-[#FBF6EC] text-xl font-medium hover:bg-[#464036] transition"
            >
              {d}
            </button>
          ))}
          <div />
          <button
            onClick={() => press("0")}
            className="aspect-square rounded-2xl bg-[#3a342c] text-[#FBF6EC] text-xl font-medium hover:bg-[#464036] transition"
          >
            0
          </button>
          <button
            onClick={() => setPin(pin.slice(0, -1))}
            className="aspect-square rounded-2xl text-[#9c9082] text-sm font-medium hover:bg-[#3a342c] transition"
          >
            Borrar
          </button>
        </div>

        <button onClick={onBack} className="text-[#9c9082] text-sm hover:text-[#FBF6EC] inline-flex items-center gap-1.5">
          <ArrowLeft size={14} /> Volver al men\u00fa de clientes
        </button>
      </div>
    </div>
  );
}

// =====================================================================
// ADMIN VIEW
// =====================================================================
function AdminView({ menu, orders, onMenuSave, onOrderUpdate, onOrderDelete, onBack }) {
  const [tab, setTab] = useState("pedidos"); // pedidos | menu | deudas
  const [draft, setDraft] = useState(menu);
  const [savedFlash, setSavedFlash] = useState(false);

  useEffect(() => setDraft(menu), [menu]);

  const todaysOrders = orders.filter((o) => o.fecha === todayKey());

  const updateList = (field, idx, value) => {
    const copy = { ...draft, [field]: [...draft[field]] };
    copy[field][idx] = value;
    setDraft(copy);
  };

  const saveMenuDraft = async () => {
    await onMenuSave({ ...draft, fecha: todayKey() });
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 1800);
  };

  // Deudas: agrupar por cliente (nombre + telefono) sumando pedidos con pago === fiado y no pagados
  const deudas = {};
  orders.forEach((o) => {
    if (o.pago === "fiado" && !o.pagado) {
      const key = `${o.nombre}|${o.telefono}`;
      if (!deudas[key]) deudas[key] = { nombre: o.nombre, telefono: o.telefono, pedidos: [], total: 0 };
      deudas[key].pedidos.push(o);
      deudas[key].total += 1;
    }
  });
  const deudaList = Object.values(deudas).sort((a, b) => b.total - a.total);

  return (
    <div className="min-h-screen bg-[#FBF6EC]">
      <div className="bg-[#2B2622] text-[#FBF6EC] px-5 pt-6 pb-5">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <button onClick={onBack} className="flex items-center gap-1.5 text-[#cfc3ad] text-sm hover:text-white">
            <ArrowLeft size={16} /> Ver como cliente
          </button>
          <div className="flex items-center gap-2">
            <Lock size={15} color="#E0A95C" />
            <span className="text-sm text-[#E0A95C]">Panel de mam\u00e1</span>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-5">
        <div className="flex gap-1 -mt-px bg-white rounded-xl border border-[#eee2cb] p-1 mt-4 mb-5">
          {[
            { id: "pedidos", label: `Pedidos de hoy (${todaysOrders.length})` },
            { id: "menu", label: "Editar men\u00fa" },
            { id: "deudas", label: `Deben (${deudaList.length})` },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 text-[13px] py-2 rounded-lg font-medium transition ${
                tab === t.id ? "bg-[#2B2622] text-white" : "text-[#8a7d6b]"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === "pedidos" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-10">
            {todaysOrders.length === 0 && (
              <div className="sm:col-span-2">
                <EmptyState text="A\u00fan no han llegado pedidos hoy. En cuanto alguien pida desde la p\u00e1gina, aparece aqu\u00ed al instante." />
              </div>
            )}
            {todaysOrders
              .slice()
              .reverse()
              .map((o) => (
                <OrderCard key={o.id} order={o} onUpdate={onOrderUpdate} onDelete={onOrderDelete} />
              ))}
          </div>
        )}

        {tab === "menu" && (
          <div className="space-y-5 pb-10">
            <Field label="Plato de fondo 1">
              <input className={inputStyle} value={draft.fondos[0]} onChange={(e) => updateList("fondos", 0, e.target.value)} />
            </Field>
            <Field label="Plato de fondo 2">
              <input className={inputStyle} value={draft.fondos[1]} onChange={(e) => updateList("fondos", 1, e.target.value)} />
            </Field>
            <Field label="Entrada 1">
              <input className={inputStyle} value={draft.entradas[0]} onChange={(e) => updateList("entradas", 0, e.target.value)} />
            </Field>
            <Field label="Entrada 2">
              <input className={inputStyle} value={draft.entradas[1]} onChange={(e) => updateList("entradas", 1, e.target.value)} />
            </Field>
            <Field label="Entrada 3">
              <input className={inputStyle} value={draft.entradas[2]} onChange={(e) => updateList("entradas", 2, e.target.value)} />
            </Field>
            <Field label="Bebida del d\u00eda">
              <input className={inputStyle} value={draft.bebida} onChange={(e) => setDraft({ ...draft, bebida: e.target.value })} />
            </Field>
            <button
              onClick={saveMenuDraft}
              className="w-full bg-[#5C7A4F] hover:bg-[#4d6841] text-white font-medium rounded-xl py-3.5 text-[15px] transition"
            >
              {savedFlash ? "\u2713 Men\u00fa actualizado" : "Guardar men\u00fa de hoy"}
            </button>
            <p className="text-[#8a7d6b] text-[13px] text-center">
              En cuanto guardas, todos los que abran la p\u00e1gina ven este men\u00fa al instante. No hace falta volver a mandar nada por WhatsApp.
            </p>
          </div>
        )}

        {tab === "deudas" && (
          <div className="space-y-3 pb-10">
            {deudaList.length === 0 && <EmptyState text="Nadie debe nada registrado por ahora." />}
            {deudaList.map((d) => (
              <div key={d.nombre + d.telefono} className="bg-white rounded-2xl border border-[#eee2cb] p-4">
                <div className="flex items-center justify-between mb-2.5">
                  <div>
                    <div className="font-medium text-[#2B2622]">{d.nombre}</div>
                    <div className="text-[13px] text-[#8a7d6b] flex items-center gap-1">
                      <Phone size={12} /> {d.telefono}
                    </div>
                  </div>
                  <Tag color="#C1452D">{d.total} pedido{d.total > 1 ? "s" : ""} sin pagar</Tag>
                </div>
                <div className="space-y-1.5">
                {d.pedidos.map((p) => {
                    const resumen = p.fondos.map((f) => (f.cantidad > 1 ? `${f.nombre} x${f.cantidad}` : f.nombre)).join(", ");
                    return (
                    <div key={p.id} className="flex items-center justify-between bg-[#FBF6EC] rounded-lg px-3 py-2 text-[13px]">
                      <span className="text-[#5c5246]">
                        {p.fecha} &middot; {resumen.length > 28 ? resumen.slice(0, 28) + "\u2026" : resumen}
                      </span>
                      <button
                        onClick={() => onOrderUpdate(p.id, { pagado: true })}
                        className="text-[#5C7A4F] font-medium hover:underline whitespace-nowrap ml-2"
                      >
                        Marcar pagado
                      </button>
                    </div>
                  );})}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function EmptyState({ text }) {
  return (
    <div className="text-center py-12 px-6 bg-white rounded-2xl border border-dashed border-[#e0d3b8]">
      <p className="text-[#8a7d6b] text-sm leading-relaxed">{text}</p>
    </div>
  );
}

function OrderCard({ order, onUpdate, onDelete }) {
  return (
    <div className="bg-white rounded-2xl border border-[#eee2cb] p-4">
      <div className="flex items-start justify-between mb-2.5">
        <div>
          <div className="font-medium text-[#2B2622]">{order.nombre}</div>
          <div className="text-[13px] text-[#8a7d6b] flex items-center gap-1">
            <Phone size={12} /> {order.telefono}
            <Clock size={12} className="ml-1.5" />{" "}
            {new Date(order.creadoEn).toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" })}
          </div>
        </div>
        <button onClick={() => onDelete(order.id)} className="text-[#c7b89a] hover:text-[#C1452D] p-1">
          <Trash2 size={16} />
        </button>
      </div>

      <div className="text-[14px] text-[#3a332b] space-y-0.5 mb-3">
        {order.fondos.map((f, i) => (
          <div key={"f" + i}>
            {f.nombre} {f.cantidad > 1 && <span className="text-[#C1452D] font-semibold">x{f.cantidad}</span>}
          </div>
        ))}
        {order.entradas.map((e, i) => (
          <div key={"e" + i} className="text-[#8a7d6b]">
            + {e.nombre} {e.cantidad > 1 && <span className="text-[#C1452D] font-semibold">x{e.cantidad}</span>}
          </div>
        ))}
        {order.bebida && (
          <div className="text-[#8a7d6b]">
            {order.bebida.nombre} {order.bebida.cantidad > 1 && <span className="text-[#C1452D] font-semibold">x{order.bebida.cantidad}</span>}
          </div>
        )}
        {order.notas && <div className="text-[#9C7A3C] italic">"{order.notas}"</div>}
      </div>

      <div className="flex flex-wrap gap-1.5 mb-3">
        <Tag color={order.modo === "delivery" ? "#9C7A3C" : "#5C7A4F"}>
          {order.modo === "delivery" ? `Delivery: ${order.direccion}` : "Recojo en local"}
        </Tag>
        <Tag color={PAY_COLORS[order.pago]}>{PAY_LABELS[order.pago]}</Tag>
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-[#f0e8d6]">
        <button
          onClick={() => onUpdate(order.id, { listo: !order.listo })}
          className={`text-[13px] font-medium flex items-center gap-1.5 ${order.listo ? "text-[#5C7A4F]" : "text-[#8a7d6b]"}`}
        >
          {order.listo ? <CheckCircle2 size={16} /> : <Circle size={16} />}
          {order.listo ? "Listo" : "Marcar listo"}
        </button>
        <button
          onClick={() => onUpdate(order.id, { pagado: !order.pagado })}
          className={`text-[13px] font-medium flex items-center gap-1.5 ${order.pagado ? "text-[#5C7A4F]" : "text-[#C1452D]"}`}
        >
          <Wallet size={15} />
          {order.pagado ? "Pagado" : "Debe \u2014 marcar pagado"}
        </button>
      </div>
    </div>
  );
}

// =====================================================================
// ROOT APP
// =====================================================================
export default function App() {
  const [menu, setMenu] = useState(null);
  const [orders, setOrders] = useState([]);
  const [view, setView] = useState("cliente"); // cliente | pin | admin
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [justSubmitted, setJustSubmitted] = useState(null);

  const refresh = useCallback(async () => {
    const [m, o] = await Promise.all([loadMenu(), loadOrders()]);
    setMenu(m);
    setOrders(o);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();

    // Realtime: cuando alguien hace un pedido o se actualiza el menú,
    // todos los que tengan la página abierta (ej. la tablet del local) lo ven al instante.
    const ordersChannel = supabase
      .channel("orders-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => {
        refresh();
      })
      .subscribe();

    const menuChannel = supabase
      .channel("menu-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "menu" }, () => {
        refresh();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(ordersChannel);
      supabase.removeChannel(menuChannel);
    };
  }, [refresh]);

  const handleOrderSubmit = async (data) => {
    setSubmitting(true);
    try {
      const order = {
        ...data,
        fecha: todayKey(),
        creadoEn: new Date().toISOString(),
        listo: false,
        pagado: data.pago !== "fiado",
      };
      const saved = await createOrder(order);
      setOrders((prev) => [...prev, saved]);
      setJustSubmitted(saved);
    } catch (e) {
      console.error("Error al crear pedido:", e);
      alert("No se pudo enviar el pedido. Revisa tu conexión e intenta de nuevo.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleMenuSave = async (newMenu) => {
    await saveMenu(newMenu);
    setMenu(newMenu);
  };

  const handleOrderUpdate = async (id, patch) => {
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, ...patch } : o)));
    await updateOrder(id, patch);
  };

  const handleOrderDelete = async (id) => {
    setOrders((prev) => prev.filter((o) => o.id !== id));
    await deleteOrder(id);
  };

  if (loading || !menu) {
    return (
      <div className="min-h-screen bg-[#FBF6EC] flex items-center justify-center">
        <Loader2 className="animate-spin" color="#C1452D" size={28} />
      </div>
    );
  }

  return (
    <div>
      {view === "cliente" ? (
        <>
          <ClientView
            menu={menu}
            onSubmit={handleOrderSubmit}
            submitting={submitting}
            justSubmitted={justSubmitted}
            onReset={() => setJustSubmitted(null)}
          />
          <button
            onClick={() => setView("pin")}
            className="fixed bottom-4 right-4 bg-[#2B2622] text-[#E0A95C] rounded-full p-3 shadow-lg opacity-70 hover:opacity-100"
            title="Panel de administraci\u00f3n"
          >
            <Lock size={18} />
          </button>
        </>
      ) : view === "pin" ? (
        <PinScreen onUnlock={() => setView("admin")} onBack={() => setView("cliente")} />
      ) : (
        <AdminView
          menu={menu}
          orders={orders}
          onMenuSave={handleMenuSave}
          onOrderUpdate={handleOrderUpdate}
          onOrderDelete={handleOrderDelete}
          onBack={() => setView("cliente")}
        />
      )}
    </div>
  );
}
