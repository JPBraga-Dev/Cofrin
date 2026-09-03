import {
  useEffect,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
} from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Eye, EyeOff, X } from "lucide-react";
import { formatCurrency } from "../utils/format";

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
};
export function Button({
  children,
  variant = "primary",
  className = "",
  loading = false,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <motion.button
      whileTap={disabled || loading ? undefined : { scale: 0.98 }}
      className={`button ${variant} ${className}`}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? "Salvando…" : children}
    </motion.button>
  );
}
export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <motion.section layout className={`card ${className}`}>
      {children}
    </motion.section>
  );
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
      {formatCurrency(amount, hidden)}
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
        initial={{ width: 0 }}
        animate={{ width: `${Math.max(0, Math.min(100, value))}%` }}
        transition={{ duration: 0.36, ease: [0.22, 1, 0.36, 1] }}
        style={{ background: color }}
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
function useEscape(active: boolean, onClose: () => void) {
  useEffect(() => {
    if (!active) return;
    const listener = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, [active, onClose]);
}
export function Drawer({
  open,
  onClose,
  children,
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  useEscape(open, onClose);
  const mobile = typeof window !== "undefined" && window.innerWidth <= 760;
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
            className="drawer"
            role="dialog"
            aria-modal="true"
            initial={mobile ? { y: 16, opacity: 0.95 } : { x: 20, opacity: 0.95 }}
            animate={mobile ? { y: 0, opacity: 1 } : { x: 0, opacity: 1 }}
            exit={mobile ? { y: 16, opacity: 0.95 } : { x: 20, opacity: 0.95 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <button
              className="icon-button close"
              onClick={onClose}
              aria-label="Fechar painel"
            >
              <X size={20} />
            </button>
            {children}
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
}: {
  title: string;
  detail: string;
}) {
  return (
    <div className="empty">
      <div>◌</div>
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
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
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
  return (
    <header className="drawer-header">
      {eyebrow && <span className="drawer-eyebrow">{eyebrow}</span>}
      <h2>{title}</h2>
      <p>{description}</p>
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
  ...props
}: Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange"> & {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="currency-input">
      <span>R$</span>
      <input
        inputMode="decimal"
        value={value}
        onChange={(event) =>
          onChange(event.target.value.replace(/[^\d,.-]/g, ""))
        }
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
