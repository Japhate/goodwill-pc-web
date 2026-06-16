import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { CheckCircle2, Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import PageLoadingScreen from "@/components/PageLoadingScreen";

function passwordMeetsRules(password) {
  return password.length >= 6
    && /[a-z]/.test(password)
    && /[A-Z]/.test(password)
    && /\d/.test(password)
    && /[^A-Za-z0-9]/.test(password);
}

function FieldLabel({ children, required = false }) {
  return (
    <label className="mb-1 block text-sm font-semibold text-gray-700">
      {children}
      {required && <span className="ml-1 text-red-600">*</span>}
    </label>
  );
}

export default function AdminSetup() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = useMemo(() => String(searchParams.get("token") || "").trim(), [searchParams]);
  const [email, setEmail] = useState("");
  const [roleLabel, setRoleLabel] = useState("Site Admin");
  const [expiresAt, setExpiresAt] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState("");
  const [loadingInvite, setLoadingInvite] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const loadInvitation = async () => {
      if (!token) {
        setStatus("This setup link is missing an invitation token.");
        setLoadingInvite(false);
        return;
      }

      try {
        const response = await fetch(`/api/admin/setup-invitation?token=${encodeURIComponent(token)}`);
        const body = await response.json().catch(() => null);
        if (!response.ok) throw new Error(body?.error || "This invitation is invalid or has expired.");
        setEmail(body.email || "");
        setRoleLabel(body.roleLabel || (body.role === "site_developer" ? "Site Developer" : "Site Admin"));
        setExpiresAt(body.expiresAt || "");
      } catch (error) {
        setStatus(error.message || "This invitation is invalid or has expired.");
      } finally {
        setLoadingInvite(false);
      }
    };

    loadInvitation();
  }, [token]);

  const clearError = (field) => {
    setErrors((current) => ({ ...current, [field]: "" }));
    setStatus("");
  };

  const validate = () => {
    const nextErrors = {};
    if (!firstName.trim()) nextErrors.firstName = "Enter your first name.";
    if (!lastName.trim()) nextErrors.lastName = "Enter your last name.";
    if (!newPassword) nextErrors.newPassword = "Create your new password.";
    if (newPassword && !passwordMeetsRules(newPassword)) {
      nextErrors.newPassword = "Use at least 6 characters with uppercase, lowercase, a number, and a special character.";
    }
    if (!confirmPassword) nextErrors.confirmPassword = "Confirm your new password.";
    if (newPassword && confirmPassword && newPassword !== confirmPassword) {
      nextErrors.confirmPassword = "The new passwords do not match.";
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!validate()) {
      setStatus("Please complete the highlighted fields.");
      return;
    }

    setSubmitting(true);
    setStatus("");
    try {
      const response = await fetch("/api/admin/complete-invitation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          firstName: firstName.trim().replace(/\s+/g, " "),
          lastName: lastName.trim().replace(/\s+/g, " "),
          password: newPassword,
        }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(body?.error || "Unable to complete admin setup.");
      navigate("/Admin", { replace: true });
    } catch (error) {
      setStatus(error.message || "Unable to complete admin setup. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const formattedExpiry = expiresAt ? new Date(expiresAt).toLocaleString([], {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }) : "";

  return (
    <main className="min-h-screen bg-[#f8f3ea] px-4 py-10">
      <section className="mx-auto max-w-2xl overflow-hidden rounded-xl border border-amber-100 bg-white shadow-lg">
        <div className="bg-[#4b342a] px-6 py-6 text-white">
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-amber-200">
            <ShieldCheck className="h-4 w-4" />
            {roleLabel} Setup
          </p>
          <h1 className="mt-2 text-2xl font-bold">Create Your New Admin Password</h1>
          <p className="mt-2 text-sm text-amber-50">Enter your name and the password you want to use.</p>
        </div>

        {loadingInvite ? (
          <div className="flex items-center justify-center p-10">
            <PageLoadingScreen compact backgroundClassName="bg-transparent" className="py-2" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5 p-6" noValidate>
            {status && (
              <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
                {status}
              </p>
            )}

            <div>
              <FieldLabel>Email Address</FieldLabel>
              <Input type="email" value={email} readOnly className="bg-gray-50 font-semibold text-gray-700" />
              {formattedExpiry && <p className="mt-1 text-xs text-gray-500">Invitation expires {formattedExpiry}.</p>}
            </div>

            <div>
              <FieldLabel>Role</FieldLabel>
              <Input type="text" value={roleLabel} readOnly className="bg-gray-50 font-semibold text-gray-700" />
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <FieldLabel required>First Name</FieldLabel>
                <Input
                  value={firstName}
                  onChange={(event) => {
                    setFirstName(event.target.value);
                    clearError("firstName");
                  }}
                  className={errors.firstName ? "border-red-500 focus-visible:ring-red-500" : ""}
                  autoComplete="given-name"
                />
                {errors.firstName && <p className="mt-1 text-xs font-semibold text-red-600">{errors.firstName}</p>}
              </div>
              <div>
                <FieldLabel required>Last Name</FieldLabel>
                <Input
                  value={lastName}
                  onChange={(event) => {
                    setLastName(event.target.value);
                    clearError("lastName");
                  }}
                  className={errors.lastName ? "border-red-500 focus-visible:ring-red-500" : ""}
                  autoComplete="family-name"
                />
                {errors.lastName && <p className="mt-1 text-xs font-semibold text-red-600">{errors.lastName}</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <FieldLabel required>New Password</FieldLabel>
                <Input
                  type="password"
                  value={newPassword}
                  onChange={(event) => {
                    setNewPassword(event.target.value);
                    clearError("newPassword");
                  }}
                  className={errors.newPassword ? "border-red-500 focus-visible:ring-red-500" : ""}
                  autoComplete="new-password"
                />
                {errors.newPassword && <p className="mt-1 text-xs font-semibold text-red-600">{errors.newPassword}</p>}
              </div>
              <div>
                <FieldLabel required>Confirm New Password</FieldLabel>
                <Input
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => {
                    setConfirmPassword(event.target.value);
                    clearError("confirmPassword");
                  }}
                  className={errors.confirmPassword ? "border-red-500 focus-visible:ring-red-500" : ""}
                  autoComplete="new-password"
                />
                {errors.confirmPassword && <p className="mt-1 text-xs font-semibold text-red-600">{errors.confirmPassword}</p>}
              </div>
            </div>

            <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-xs text-amber-950">
              <p className="flex items-center gap-2 font-semibold">
                <CheckCircle2 className="h-4 w-4 text-amber-700" />
                Password must include uppercase and lowercase letters, at least one number, and a special character.
              </p>
            </div>

            <Button type="submit" className="w-full bg-amber-600 hover:bg-amber-700" disabled={submitting || !email}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create New Password
            </Button>
          </form>
        )}
      </section>
    </main>
  );
}
