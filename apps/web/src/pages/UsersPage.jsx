import { useState } from "react";
import { ArrowLeft, BadgeCheck, Fingerprint, ShieldCheck, UserPlus, Users } from "lucide-react";
import { api } from "../lib/api";
import { useFetch } from "../lib/useData";
import { useAuth } from "../context/AuthContext";
import { ROLE_LABELS } from "../lib/constants";
import {
  Avatar,
  Badge,
  Button,
  DataTable,
  EmptyState,
  Field,
  Input,
  Modal,
  PageHeader,
  Panel,
  RowSkeleton,
  Select,
  formatError,
  useNotify,
} from "../components/ui";
import FaceVerify from "../components/FaceVerify";

const EMPTY = { name: "", email: "", password: "", role: "accountant", contactId: "" };

const ROLE_TONE = { admin: "neutral", accountant: "azure", contact: "leaf" };

export default function UsersPage() {
  const { user } = useAuth();
  const notify = useNotify();
  const { data, loading, reload } = useFetch("/users");
  const { data: contacts } = useFetch("/contacts");
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState("details"); // details | face
  const [form, setForm] = useState(EMPTY);
  const [face, setFace] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  if (user.role !== "admin") {
    return (
      <div className="page-enter">
        <Panel>
          <EmptyState
            icon={ShieldCheck}
            title="Admin access required"
            hint="Only an admin can create users and manage access."
          />
        </Panel>
      </div>
    );
  }

  const contactOptions = (contacts || []).filter((c) => !c.isArchived);

  const reset = () => {
    setForm(EMPTY);
    setFace("");
    setStep("details");
    setError("");
  };

  const canContinue =
    form.name.trim() !== "" &&
    /^\S+@\S+\.\S+$/.test(form.email) &&
    form.password.length >= 6 &&
    (form.role !== "contact" || form.contactId !== "");

  const create = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await api.post("/users", {
        name: form.name,
        email: form.email,
        password: form.password,
        role: form.role,
        contactId: form.role === "contact" ? Number(form.contactId) : null,
        faceImageUrl: face || null,
      });
      notify({
        title: "User created",
        detail: `${form.email} can now sign in as ${ROLE_LABELS[form.role]}.`,
      });
      setOpen(false);
      reset();
      reload();
    } catch (err) {
      setError(formatError(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page-enter">
      <PageHeader
        title="Users & access"
        description="Login accounts for staff and contacts. Every new user is verified with a face photo before the account is created."
        crumbs={[{ label: "Administration" }, { label: "Users & access" }]}
        actions={
          <Button icon={UserPlus} onClick={() => { reset(); setOpen(true); }}>
            New user
          </Button>
        }
      />

      <Panel>
        {loading ? (
          <RowSkeleton rows={5} cols={5} />
        ) : !data || data.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No users yet"
            hint="Create login accounts for your staff and contacts."
          />
        ) : (
          <DataTable
            columns={[
              {
                key: "user",
                header: "User",
                render: (u) => (
                  <div className="flex items-center gap-2.5">
                    <Avatar name={u.name} size={30} src={u.faceImageUrl} />
                    <div className="min-w-0 leading-tight">
                      <p className="truncate text-[13.5px] font-medium text-ink">{u.name}</p>
                      <p className="text-xs text-ink-mute">{u.email}</p>
                    </div>
                  </div>
                ),
              },
              {
                key: "role",
                header: "Role",
                render: (u) => <Badge tone={ROLE_TONE[u.role]}>{ROLE_LABELS[u.role]}</Badge>,
              },
              {
                key: "contact",
                header: "Linked contact",
                render: (u) =>
                  u.contact ? (
                    <span className="text-[13px] text-ink-soft">{u.contact.name}</span>
                  ) : (
                    <span className="text-ink-faint">—</span>
                  ),
              },
              {
                key: "verified",
                header: "Face verification",
                render: (u) =>
                  u.verified ? (
                    <Badge tone="leaf">
                      <BadgeCheck className="h-3 w-3" /> Verified
                    </Badge>
                  ) : u.hasFace ? (
                    <Badge tone="gold">Pending live check</Badge>
                  ) : (
                    <Badge tone="neutral">Not set</Badge>
                  ),
              },
            ]}
            rows={data || []}
            rowKey={(u) => u.id}
          />
        )}
      </Panel>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        labelledBy="new-user-title"
        title={step === "details" ? "New user" : "Face verification"}
        subtitle={
          step === "details"
            ? "Create a login for a staff member or a contact."
            : `Verify the identity for ${form.email}.`
        }
        width="max-w-md"
        footer={
          step === "details" ? (
            <>
              <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="button" icon={Fingerprint} disabled={!canContinue} onClick={() => setStep("face")}>
                Continue to face verification
              </Button>
            </>
          ) : (
            <>
              <Button variant="secondary" icon={ArrowLeft} onClick={() => setStep("details")}>
                Back
              </Button>
              <Button type="submit" form="new-user-form" loading={saving} disabled={!face}>
                {face ? "Create user" : "Capture a face first"}
              </Button>
            </>
          )
        }
      >
        {step === "details" ? (
          <form id="user-details-form" className="space-y-4" onSubmit={(e) => e.preventDefault()}>
            {error && <p className="rounded-lg border border-clay-100 bg-clay-50 px-3 py-2 text-[13px] text-clay-700">{error}</p>}
            <Field label="Full name">
              <Input
                required
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Anjali Verma"
                autoFocus
              />
            </Field>
            <Field label="Email (used to sign in)">
              <Input
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="name@urbanfurniture.com"
              />
            </Field>
            <Field label="Password" hint="At least 6 characters.">
              <Input
                type="password"
                required
                minLength={6}
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                placeholder="••••••••"
              />
            </Field>
            <Field label="Role">
              <Select value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value, contactId: "" }))}>
                <option value="accountant">Accountant — full books access</option>
                <option value="contact">Contact — portal access only</option>
                <option value="admin">Admin — full access</option>
              </Select>
            </Field>
            {form.role === "contact" && (
              <Field label="Linked contact" hint="This contact will sign in to see their own invoices and bills.">
                <Select required value={form.contactId} onChange={(e) => setForm((f) => ({ ...f, contactId: e.target.value }))}>
                  <option value="">Select a contact…</option>
                  {contactOptions.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.email ? `· ${c.email}` : ""}
                    </option>
                  ))}
                </Select>
              </Field>
            )}
          </form>
        ) : (
          <form id="new-user-form" onSubmit={create} className="space-y-4">
            {error && <p className="rounded-lg border border-clay-100 bg-clay-50 px-3 py-2 text-[13px] text-clay-700">{error}</p>}
            <FaceVerify captured={face} onCapture={setFace} />
          </form>
        )}
      </Modal>
    </div>
  );
}