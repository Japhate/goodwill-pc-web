import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { signInWithEmailAndPassword, signOut, updatePassword } from "firebase/auth";
import { doc, updateDoc } from "firebase/firestore";
import { CheckCircle2, KeyRound, Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { firebaseAuth, firebaseEnabled, firestore } from "@/lib/firebase";

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
  const initialEmail = useMemo(() => String(searchParams.get("email") || "").trim().toLowerCase(), [searchParams]);
  const [email, setEmail] = useState(initialEmail);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [temporaryPassword, setTemporaryPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const clearError = (field) => {
    setErrors((current) => ({ ...current, [field]: "" }));
    setStatus("");
  };

  const validate = () => {
    const nextErrors = {};
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) nextErrors.email = "Enter your admin email address.";
    if (normalizedEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) nextErrors.email = "Enter a valid email address.";
    if (!firstName.trim()) nextErrors.firstName = "Enter your first name.";
    if (!lastName.trim()) nextErrors.lastName = "Enter your last name.";
    if (!temporaryPassword.trim()) nextErrors.temporaryPassword = "Enter or paste your temporary password.";
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

    if (!firebaseEnabled || !firebaseAuth || !firestore) {
      setStatus("Admin setup is not available because Firebase is not configured.");
      return;
    }

    setSubmitting(true);
    setStatus("");
    try {
      const normalizedEmail = email.trim().toLowerCase();
      const credential = await signInWithEmailAndPassword(firebaseAuth, normalizedEmail, temporaryPassword.trim());
      await updateDoc(doc(firestore, "admins", credential.user.uid), {
        first_name: firstName.trim().replace(/\s+/g, " "),
        last_name: lastName.trim().replace(/\s+/g, " "),
        email: normalizedEmail,
        photo_url: "",
        updated_date: new Date().toISOString(),
      });
      await updatePassword(credential.user, newPassword);
      await signOut(firebaseAuth);
      navigate("/Admin", { replace: true });
    } catch (error) {
      const message = String(error?.code || error?.message || "").toLowerCase();
      if (message.includes("auth/invalid-credential") || message.includes("auth/wrong-password")) {
        setErrors((current) => ({ ...current, temporaryPassword: "The temporary password is not correct." }));
        setStatus("The temporary password is not correct. Please check it and try again.");
      } else if (message.includes("auth/weak-password")) {
        setErrors((current) => ({ ...current, newPassword: "The new password is too weak." }));
        setStatus("Please choose a stronger new password.");
      } else {
        setStatus(error?.message || "Unable to complete admin setup. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#f8f3ea] px-4 py-10">
      <section className="mx-auto max-w-2xl overflow-hidden rounded-xl border border-amber-100 bg-white shadow-lg">
        <div className="bg-[#4b342a] px-6 py-6 text-white">
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-amber-200">
            <ShieldCheck className="h-4 w-4" />
            Site Administrator Setup
          </p>
          <h1 className="mt-2 text-2xl font-bold">Create Your Admin Password</h1>
          <p className="mt-2 text-sm text-amber-50">Enter your name, temporary password, and the password you want to use.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 p-6" noValidate>
          {status && (
            <p className={`rounded-md border px-3 py-2 text-sm font-semibold ${
              status.includes("not correct") || status.includes("Unable") || status.includes("Please")
                ? "border-red-200 bg-red-50 text-red-700"
                : "border-green-200 bg-green-50 text-green-700"
            }`}>
              {status}
            </p>
          )}

          <div>
            <FieldLabel required>Email Address</FieldLabel>
            <Input
              type="email"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                clearError("email");
              }}
              className={errors.email ? "border-red-500 focus-visible:ring-red-500" : ""}
              autoComplete="email"
            />
            {errors.email && <p className="mt-1 text-xs font-semibold text-red-600">{errors.email}</p>}
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

          <div>
            <FieldLabel required>Temporary Password</FieldLabel>
            <div className="relative">
              <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                value={temporaryPassword}
                onChange={(event) => {
                  setTemporaryPassword(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8));
                  clearError("temporaryPassword");
                }}
                className={`pl-9 ${errors.temporaryPassword ? "border-red-500 focus-visible:ring-red-500" : ""}`}
                autoComplete="current-password"
              />
            </div>
            {errors.temporaryPassword && <p className="mt-1 text-xs font-semibold text-red-600">{errors.temporaryPassword}</p>}
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

          <Button type="submit" className="w-full bg-amber-600 hover:bg-amber-700" disabled={submitting}>
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Change Password
          </Button>
        </form>
      </section>
    </main>
  );
}
