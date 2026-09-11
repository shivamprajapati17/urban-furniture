import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, CheckCircle2, ChevronRight, Info, Search, X, XCircle } from "lucide-react";
import { statusToneClass } from "../lib/constants";
import { initials } from "../lib/format";

/* ------------------------------- Button -------------------------------- */

const BTN_VARIANTS = {
  primary:
    "bg-walnut-600 text-white hover:bg-walnut-700 active:bg-walnut-800 shadow-card disabled:bg-walnut-300",
  secondary:
    "bg-transparent text-ink border border-line-strong hover:border-walnut-500 hover:text-walnut-700 active:bg-walnut-50",
  danger:
    "bg-transparent text-clay-600 border border-clay-200 hover:bg-clay-50 hover:border-clay-600 active:bg-clay-100",
  ghost: "bg-transparent text-ink-soft hover:bg-paper-deep hover:text-ink",
  subtle:
    "bg-leaf-600 text-white hover:bg-leaf-700 active:bg-leaf-800 shadow-card disabled:bg-leaf-200",
};

export function Button({ variant = "primary", size = "md", icon: Icon, children, className = "", loading, ...rest }) {
  const sizes = {
    sm: "h-8 px-3 text-[13px] gap-1.5",
    md: "h-9.5 px-4 text-sm gap-2",
  };
  return (
    <button
      className={`inline-flex items-center justify-center rounded-lg font-medium whitespace-nowrap transition-all duration-150 select-none
        active:scale-[0.985] disabled:cursor-not-allowed disabled:active:scale-100
        ${BTN_VARIANTS[variant]} ${sizes[size]} ${className}`}
      disabled={loading || rest.disabled}
      {...rest}
    >
      {loading ? (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent opacity-70" />
      ) : (
        Icon && <Icon className={size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4"} strokeWidth={1.8} aria-hidden />
      )}
      {children}
    </button>
  );
}

export function IconButton({ label, children, className = "", tone = "default", ...rest }) {
  const tones = {
    default: "text-ink-mute hover:text-ink hover:bg-paper-deep",
    danger: "text-ink-mute hover:text-clay-600 hover:bg-clay-50",
  };
  return (
    <button
      aria-label={label}
      title={label}
      className={`inline-flex h-7 w-7 items-center justify-center rounded-md transition-colors active:scale-95 ${tones[tone]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}

/* -------------------------------- Inputs ------------------------------- */

export function Field({ label, htmlFor, hint, error, children, className = "" }) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {label && (
        <label htmlFor={htmlFor} className="text-[13px] font-medium text-ink-soft">
          {label}
        </label>
      )}
      {children}
      {hint && !error && <p className="text-xs text-ink-mute">{hint}</p>}
      {error && (
        <p className="flex items-center gap-1 text-xs text-clay-600">
          <AlertTriangle className="h-3.5 w-3.5" strokeWidth={1.8} /> {error}
        </p>
      )}
    </div>
  );
}

const inputBase =
  "h-9.5 w-full rounded-lg border border-line-strong bg-surface px-3 text-sm text-ink placeholder:text-ink-faint " +
  "transition-shadow hover:border-walnut-300 focus:border-walnut-600 focus:outline-none focus:ring-2 focus:ring-walnut-600/20 " +
  "disabled:bg-paper disabled:text-ink-faint";

export const Input = ({ invalid, className = "", ...rest }) => (
  <input className={`${inputBase} ${invalid ? "border-clay-600 focus:border-clay-600 focus:ring-clay-600/20" : ""} ${className}`} {...rest} />
);

export const Textarea = ({ className = "", ...rest }) => (
  <textarea className={`${inputBase} h-auto min-h-20 py-2 ${className}`} {...rest} />
);

export const Select = ({ children, invalid, className = "", ...rest }) => (
  <select
    className={`${inputBase} appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2216%22%20height%3D%2216%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%236e7b72%22%20stroke-width%3D%222%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E')] bg-[position:right_0.6rem_center] bg-no-repeat pr-8 ${invalid ? "border-clay-600" : ""} ${className}`}
    {...rest}
  >
    {children}
  </select>
);

export function SearchInput({ value, onChange, placeholder = "Search…", className = "" }) {
  return (
    <div className={`relative ${className}`}>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" strokeWidth={1.8} aria-hidden />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`${inputBase} pl-9`}
      />
    </div>
  );
}

export function Segmented({ options, value, onChange, size = "md" }) {
  return (
    <div className="inline-flex items-center gap-1 rounded-lg border border-line bg-paper-deep/60 p-1">
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`rounded-md font-medium transition-all ${
              size === "sm" ? "px-2.5 py-1 text-xs" : "px-3 py-1.5 text-[13px]"
            } ${active ? "bg-surface text-walnut-700 shadow-card" : "text-ink-mute hover:text-ink"}`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

/* -------------------------------- Badge -------------------------------- */

export function Badge({ tone = "neutral", children, className = "" }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap ${statusToneClass(tone)} ${className}`}
    >
      {children}
    </span>
  );
}

export function StatusBadge({ status }) {
  const meta = {
    draft: { tone: "neutral", label: "Draft" },
    posted: { tone: "azure", label: "Posted" },
    confirmed: { tone: "azure", label: "Confirmed" },
    billed: { tone: "azure", label: "Billed" },
    invoiced: { tone: "azure", label: "Invoiced" },
    paid: { tone: "leaf", label: "Paid" },
    overdue: { tone: "clay", label: "Overdue" },
  }[status] || { tone: "neutral", label: status };
  return <Badge tone={meta.tone}>{meta.label}</Badge>;
}

/* -------------------------------- Avatar ------------------------------- */

const AVATAR_HUES = ["#8B5E34", "#2F6F4E", "#3B6E9E", "#9e3024", "#b07f1c", "#6e4f91"];
export function Avatar({ name, size = 30, src, className = "" }) {
  const hue = useMemo(() => {
    let h = 0;
    for (const c of String(name)) h = (h * 31 + c.charCodeAt(0)) % 997;
    return AVATAR_HUES[h % AVATAR_HUES.length];
  }, [name]);
  if (src) {
    return (
      <img
        src={src}
        alt=""
        className={`inline-flex shrink-0 select-none rounded-full object-cover ${className}`}
        style={{ width: size, height: size }}
        aria-hidden
      />
    );
  }
  return (
    <span
      className={`inline-flex shrink-0 select-none items-center justify-center rounded-full font-semibold text-white ${className}`}
      style={{ backgroundColor: hue, width: size, height: size, fontSize: Math.max(9, size * 0.34) }}
      aria-hidden
    >
      {initials(name)}
    </span>
  );
}

/* -------------------------------- Modal -------------------------------- */

export function Modal({ open, onClose, title, subtitle, children, footer, width = "max-w-lg", labelledBy }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === "Escape" && onClose?.();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 sm:p-8" role="dialog" aria-modal="true">
      <div className="fixed inset-0 bg-ink/45 backdrop-blur-[2px]" onClick={onClose} aria-hidden />
      <div
        className={`relative mt-4 w-full ${width} rounded-xl border border-line bg-surface shadow-pop page-enter`}
        aria-labelledby={labelledBy}
      >
        <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
          <div>
            <h2 id={labelledBy} className="text-lg font-semibold tracking-tight text-ink">
              {title}
            </h2>
            {subtitle && <p className="mt-0.5 text-[13px] text-ink-mute">{subtitle}</p>}
          </div>
          <IconButton label="Close" onClick={onClose}>
            <X className="h-4 w-4" strokeWidth={2} />
          </IconButton>
        </div>
        <div className="px-5 py-4">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-line bg-paper/60 px-5 py-3.5 rounded-b-xl">{footer}</div>}
      </div>
    </div>,
    document.body
  );
}

/* ------------------------------- Toasts -------------------------------- */

const ToastContext = createContext({ push: () => {} });
export const useToast = () => useContext(ToastContext);

const TOAST_META = {
  success: { icon: CheckCircle2, classes: "text-leaf-700" },
  error: { icon: XCircle, classes: "text-clay-600" },
  info: { icon: Info, classes: "text-azure-600" },
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const push = useCallback(({ title, detail, tone = "success" }) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((t) => [...t, { id, title, detail, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 5000);
  }, []);
  const dismiss = (id) => setToasts((t) => t.filter((x) => x.id !== id));

  return (
    <ToastContext.Provider value={{ push }}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[70] flex w-80 flex-col gap-2">
        {toasts.map((t) => {
          const meta = TOAST_META[t.tone];
          const Icon = meta.icon;
          return (
            <div key={t.id} className="pointer-events-auto flex items-start gap-2.5 rounded-lg border border-line bg-surface px-3.5 py-3 shadow-pop page-enter">
              <Icon className={`mt-0.5 h-4.5 w-4.5 shrink-0 ${meta.classes}`} strokeWidth={1.8} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-ink">{t.title}</p>
                {t.detail && <p className="mt-0.5 text-xs text-ink-mute">{t.detail}</p>}
              </div>
              <button onClick={() => dismiss(t.id)} className="text-ink-faint hover:text-ink" aria-label="Dismiss">
                <X className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export const useNotify = () => useContext(ToastContext).push;

/* ---------------------------- Empty / loading --------------------------- */

export function EmptyState({ icon: Icon, title, hint, action, className = "" }) {
  return (
    <div className={`flex flex-col items-center justify-center px-6 py-14 text-center ${className}`}>
      {Icon && (
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl border border-line bg-paper text-ink-mute">
          <Icon className="h-6 w-6" strokeWidth={1.5} />
        </div>
      )}
      <p className="text-[15px] font-medium text-ink">{title}</p>
      {hint && <p className="mt-1 max-w-sm text-[13px] text-ink-mute">{hint}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function RowSkeleton({ rows = 5, cols = 4 }) {
  return (
    <div className="divide-y divide-line">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex items-center gap-6 px-4 py-3.5">
          {Array.from({ length: cols }).map((_, c) => (
            <div
              key={c}
              className="h-3.5 animate-pulse rounded bg-paper-deep"
              style={{ width: `${28 + ((r * 7 + c * 19) % 60)}%`, flex: c === 0 ? 2 : 1 }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

/* ------------------------------ Data table ------------------------------ */

export function DataTable({ columns, rows, rowKey, onRowClick, dense = false }) {
  if (!rows || rows.length === 0) return null;
  const alignClass = (a) =>
    a === "right" ? "text-right tabular-nums" : a === "center" ? "text-center" : "text-left";
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-line-strong bg-paper/70">
            {columns.map((c) => (
              <th
                key={c.key}
                className={`${alignClass(c.align)} sticky top-0 px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-ink-mute ${dense ? "" : "first:pl-5 last:pr-5"}`}
                style={{ whiteSpace: "nowrap" }}
              >
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line bg-surface">
          {rows.map((row, i) => (
            <tr
              key={rowKey(row, i)}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={`${onRowClick ? "cursor-pointer transition-colors hover:bg-walnut-50/60" : ""} ${dense ? "" : ""}`}
            >
              {columns.map((c) => (
                <td key={c.key} className={`${alignClass(c.align)} px-4 py-3 align-middle text-ink ${dense ? "py-2" : ""} ${c.key !== "actions" ? "first:pl-5 last:pr-5" : ""}`}>
                  {c.render ? c.render(row) : row[c.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ------------------------------ Page header ----------------------------- */

export function PageHeader({ eyebrow, title, description, actions, crumbs }) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {crumbs && crumbs.length > 0 && (
          <nav className="mb-1.5 flex items-center gap-1 text-xs text-ink-mute" aria-label="Breadcrumb">
            {crumbs.map((c, i) => (
              <span key={i} className="flex items-center gap-1">
                {c.to ? (
                  <a href={c.to} className="hover:text-walnut-700">
                    {c.label}
                  </a>
                ) : (
                  <span className={i === crumbs.length - 1 ? "text-ink-soft font-medium" : ""}>{c.label}</span>
                )}
                {i < crumbs.length - 1 && <ChevronRight className="h-3 w-3" strokeWidth={2} />}
              </span>
            ))}
          </nav>
        )}
        <h1 className="text-[22px] font-semibold tracking-tight text-ink">{title}</h1>
        {description && <p className="mt-1 max-w-2xl text-[13px] text-ink-mute">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

/* ------------------------------- helpers -------------------------------- */

export function Panel({ children, className = "", pad = true }) {
  return (
    <div className={`rounded-xl border border-line bg-surface shadow-card ${pad ? "" : ""} ${className}`}>
      {children}
    </div>
  );
}

export function useEsc(cb) {
  const ref = useRef(cb);
  ref.current = cb;
  useEffect(() => {
    const h = (e) => e.key === "Escape" && ref.current?.();
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);
}

export function SectionTitle({ children, right }) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <h3 className="text-[15px] font-semibold tracking-tight text-ink">{children}</h3>
      {right}
    </div>
  );
}

export function formatError(err) {
  return err?.message || "Something went wrong. Please try again.";
}