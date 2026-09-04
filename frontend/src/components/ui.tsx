import {
  createContext,
  useEffect,
  useContext,
  useId,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
} from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, CircleDashed, Eye, EyeOff, X, type LucideIcon } from "lucide-react";
import { motionTokens } from "./motion";
import { formatCurrency } from "../utils/format";

const avatarInitials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "?";
export function UserAvatar({ src, name, className = "", alt }: { src?: string; name: string; className?: string; alt?: string }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);
  return src && !failed
    ? <img className={className} src={src} alt={alt ?? `Foto de ${name}`} onError={() => setFailed(true)} />
    : <span className={className} aria-label={alt ?? `Iniciais de ${name}`}>{avatarInitials(name)}</span>;
}

type ButtonProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  | "onAnimationStart"
  | "onAnimationEnd"
  | "onAnimationIteration"
  | "onDrag"
  | "onDragStart"
  | "onDragEnd"
> & {
  variant?: "primary" | "secondary" | "pink" | "ghost" | "danger";
  loading?: boolean;
  loadingLabel?: string;
};
export function Button({
  children,
  variant = "primary",
  className = "",
  loading = false,
  loadingLabel = "Salvando…",
  disabled,
  ...props
}: ButtonProps) {
  return (
    <motion.button
      whileHover={disabled || loading ? undefined : { y: -1 }}
      whileTap={disabled || loading ? undefined : { scale: 0.98 }}
      transition={{ duration: motionTokens.instant, ease: motionTokens.ease }}
      className={`button ${variant} ${className}`}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? loadingLabel : children}
    </motion.button>
  );
}
export function Card({
  children,
  className = "",
  as = "section",
  motionLayout = false,
}: {
  children: ReactNode;
  className?: string;
  as?: "section" | "article" | "div";
  motionLayout?: boolean | "position" | "size";
}) {
  if (!motionLayout) {
    const Element = as;
    return <Element className={`card ${className}`}>{children}</Element>;
  }
  const MotionElement = as === "article" ? motion.article : as === "div" ? motion.div : motion.section;
  return <MotionElement layout={motionLayout} className={`card ${className}`}>{children}</MotionElement>;
}
export function MoneyValue({
  amount,
  type,
  hidden = false,
  size = "normal",
}: {
  amount: number;
  type?: "income" | "expense";
  hidden?: boolean;
  size?: "normal" | "large" | "small";
}) {
  return (
    <span className={`money ${type ?? ""} ${size}`}>
      {type === "expense" && !hidden ? "−" : ""}
      <AnimatePresence initial={false} mode="wait">
        <motion.span
          key={`${amount}-${hidden}`}
          initial={{ opacity: 0.4, y: 3 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -3 }}
          transition={{ duration: motionTokens.fast, ease: motionTokens.ease }}
        >
          {formatCurrency(amount, hidden)}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}
export function Progress({
  value,
  color = "#22c55e",
}: {
  value: number;
  color?: string;
}) {
  return (
    <div className="progress" aria-label={`${Math.round(value)}% concluído`}>
      <motion.i
        initial={false}
        animate={{ scaleX: Math.max(0, Math.min(100, value)) / 100 }}
        transition={{ duration: 0.36, ease: motionTokens.ease }}
        style={{ background: color, transformOrigin: "left center" }}
      />
    </div>
  );
}
export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "green" | "red" | "pink" | "gold" | "neutral";
}) {
  return <span className={`badge ${tone}`}>{children}</span>;
}
export function PageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="page-header">
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action}
    </div>
  );
}
function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(() => typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia(query).matches);
  useEffect(() => {
    if (typeof window.matchMedia !== "function") return undefined;
    const media = window.matchMedia(query);
    const update = () => setMatches(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, [query]);
  return matches;
}

const DrawerLabelContext = createContext<{ titleId: string; descriptionId: string } | null>(null);
const focusable = 'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
export function Drawer({
  open,
  onClose,
  children,
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  const mobile = useMediaQuery("(max-width: 760px)");
  const panelRef = useRef<HTMLElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);
  const titleId = useId();
  const descriptionId = useId();
  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);
  useEffect(() => {
    if (!open) return;
    openerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusTimer = window.setTimeout(() => {
      const candidates = [...(panelRef.current?.querySelectorAll<HTMLElement>(focusable) ?? [])];
      (candidates.find((element) => !element.classList.contains("close")) ?? candidates[0] ?? panelRef.current)?.focus();
    }, 0);
    const keyboard = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onCloseRef.current();
        return;
      }
      if (event.key !== "Tab" || !panelRef.current) return;
      const candidates = [...panelRef.current.querySelectorAll<HTMLElement>(focusable)].filter((element) => element.offsetParent !== null);
      if (!candidates.length) { event.preventDefault(); panelRef.current.focus(); return; }
      const first = candidates[0];
      const last = candidates[candidates.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", keyboard);
    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener("keydown", keyboard);
      document.body.style.overflow = previousOverflow;
      window.setTimeout(() => openerRef.current?.focus(), 0);
    };
  }, [open]);
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="drawer-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onMouseDown={onClose}
        >
          <motion.aside
            ref={panelRef}
            className="drawer"
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={descriptionId}
            tabIndex={-1}
            initial={mobile ? { y: 16, opacity: 0.95 } : { x: 20, opacity: 0.95 }}
            animate={mobile ? { y: 0, opacity: 1 } : { x: 0, opacity: 1 }}
            exit={mobile ? { y: 16, opacity: 0.95 } : { x: 20, opacity: 0.95 }}
            transition={{ duration: motionTokens.normal, ease: motionTokens.ease }}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <DrawerLabelContext.Provider value={{ titleId, descriptionId }}>
              <button
                className="icon-button close"
                onClick={onClose}
                aria-label="Fechar painel"
              >
                <X size={20} />
              </button>
              {children}
            </DrawerLabelContext.Provider>
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
export function PrivacyButton({
  hidden,
  onClick,
}: {
  hidden: boolean;
  onClick: () => void;
}) {
  return (
    <button
      className="icon-button"
      onClick={onClick}
      aria-label={hidden ? "Mostrar valores" : "Ocultar valores"}
    >
      {hidden ? <EyeOff size={18} /> : <Eye size={18} />}
    </button>
  );
}
export function EmptyState({
  title,
  detail,
  icon: Icon = CircleDashed,
}: {
  title: string;
  detail: string;
  icon?: LucideIcon;
}) {
  return (
    <div className="empty">
      <div aria-hidden="true"><Icon size={22} strokeWidth={1.6} /></div>
      <strong>{title}</strong>
      <p>{detail}</p>
    </div>
  );
}
export function Skeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="skeleton" aria-label="Carregando">
      {Array.from({ length: lines }, (_, index) => (
        <i key={index} />
      ))}
    </div>
  );
}
export function Toast({ message }: { message: string }) {
  return (
    <motion.p
      className="toast"
      role="status"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -2 }}
      transition={{ duration: motionTokens.normal, ease: motionTokens.ease }}
    >
      {message}
    </motion.p>
  );
}
export function DrawerHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow?: string;
  title: string;
  description: string;
}) {
  const labels = useContext(DrawerLabelContext);
  return (
    <header className="drawer-header">
      {eyebrow && <span className="drawer-eyebrow">{eyebrow}</span>}
      <h2 id={labels?.titleId}>{title}</h2>
      <p id={labels?.descriptionId}>{description}</p>
    </header>
  );
}
export function FormSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="form-section">
      <h3>{title}</h3>
      {description && <p>{description}</p>}
      {children}
    </section>
  );
}
export function FormHint({ children }: { children: ReactNode }) {
  return <small className="form-hint">{children}</small>;
}
export function ChoiceCard({
  selected,
  onClick,
  title,
  description,
  icon,
}: {
  selected: boolean;
  onClick: () => void;
  title: string;
  description?: string;
  icon?: ReactNode;
}) {
  return (
    <button
      className={`choice-card ${selected ? "selected" : ""}`}
      type="button"
      aria-pressed={selected}
      onClick={onClick}
    >
      {icon && <span className="choice-icon">{icon}</span>}
      <span>
        <strong>{title}</strong>
        {description && <small>{description}</small>}
      </span>
      {selected && <Check size={15} aria-hidden="true" />}
    </button>
  );
}
export function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string; tone?: "green" | "red" | "gold" }[];
  onChange: (value: T) => void;
}) {
  return (
    <div className="segmented-control" role="group">
      {options.map((option) => (
        <button
          className={`${value === option.value ? "selected" : ""} ${option.tone ?? ""}`}
          type="button"
          aria-pressed={value === option.value}
          key={option.value}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
export function CurrencyInput({
  value,
  onChange,
  onCentsChange,
  onFocus,
  onBlur,
  ...props
}: Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange"> & {
  value: string;
  onChange: (value: string) => void;
  onCentsChange?: (cents: number) => void;
}) {
  const [focused, setFocused] = useState(false);
  const numeric = Number(value.replace(",", "."));
  const displayValue = !value
    ? ""
    : focused
      ? value.replace(".", ",")
      : Number.isFinite(numeric)
        ? new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(numeric)
        : value;
  return (
    <div className="currency-input">
      <span>R$</span>
      <input
        inputMode="decimal"
        value={displayValue}
        onFocus={(event) => { setFocused(true); onFocus?.(event); }}
        onBlur={(event) => { setFocused(false); onBlur?.(event); }}
        onChange={(event) => {
          const cleaned = event.target.value.replace(/\s|R\$/gi, "").replace(/\.(?=\d{3}(?:\D|$))/g, "").replace(",", ".").replace(/[^\d.]/g, "");
          const [whole = "", ...decimalParts] = cleaned.split(".");
          const decimal = decimalParts.join("").slice(0, 2);
          const normalized = decimalParts.length ? `${whole || "0"}.${decimal}` : whole;
          onChange(normalized);
          const amount = Number(normalized || 0);
          if (Number.isFinite(amount)) onCentsChange?.(Math.round((amount + Number.EPSILON) * 100));
        }}
        {...props}
      />
    </div>
  );
}
export function DrawerFooter({
  onCancel,
  submitLabel,
  loading = false,
  variant = "primary",
  disabled = false,
  onSubmit,
}: {
  onCancel: () => void;
  submitLabel: string;
  loading?: boolean;
  variant?: "primary" | "pink";
  disabled?: boolean;
  onSubmit?: () => void;
}) {
  return (
    <footer className="drawer-footer">
      <Button type="button" variant="secondary" onClick={onCancel}>
        Cancelar
      </Button>
      <Button type="submit" variant={variant} loading={loading} disabled={disabled} onClick={onSubmit}>
        {submitLabel}
      </Button>
    </footer>
  );
}
