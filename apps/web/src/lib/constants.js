export const DOC_STATUS = {
  draft: { label: "Draft", tone: "neutral" },
  posted: { label: "Posted", tone: "azure" },
  confirmed: { label: "Confirmed", tone: "azure" },
  billed: { label: "Billed", tone: "azure" },
  invoiced: { label: "Invoiced", tone: "azure" },
  paid: { label: "Paid", tone: "leaf" },
  overdue: { label: "Overdue", tone: "clay" },
};

export const CONTACT_TYPES = {
  customer: { label: "Customer", desc: "Buys from you" },
  vendor: { label: "Vendor", desc: "Sells to you" },
  both: { label: "Customer & vendor", desc: "Buys and sells" },
};

export const PRODUCT_TYPES = {
  goods: { label: "Goods", desc: "Physical item" },
  service: { label: "Service", desc: "Labour / service" },
  combo: { label: "Combo", desc: "Bundled offer" },
};

export const ACCOUNT_TYPES = {
  asset: { label: "Asset", desc: "What the business owns" },
  liability: { label: "Liability", desc: "What the business owes" },
  income: { label: "Income", desc: "Revenue accounts" },
  expense: { label: "Expense", desc: "Cost accounts" },
  capital: { label: "Capital", desc: "Owner equity" },
};

export const JOURNAL_TYPES = {
  sales: { label: "Sales" },
  purchase: { label: "Purchase" },
  bank: { label: "Bank" },
  cash: { label: "Cash" },
};

export const ANALYTIC_TYPES = {
  income: { label: "Income" },
  expense: { label: "Expense" },
};

export const PAYMENT_METHODS = {
  cash: { label: "Cash" },
  bank: { label: "Bank" },
};

export const PAYMENT_DIRECTIONS = {
  in: { label: "Received", tone: "leaf" },
  out: { label: "Paid", tone: "clay" },
};

export const ROLE_LABELS = {
  admin: "Admin",
  accountant: "Accountant",
  contact: "Contact",
};

const TONE_CLASSES = {
  neutral: "bg-paper-deep text-ink-soft border-line",
  azure: "bg-azure-50 text-azure-700 border-azure-100",
  leaf: "bg-leaf-50 text-leaf-700 border-leaf-100",
  clay: "bg-clay-50 text-clay-700 border-clay-100",
  gold: "bg-gold-50 text-gold-700 border-gold-100",
};

export function statusToneClass(tone) {
  return TONE_CLASSES[tone] || TONE_CLASSES.neutral;
}