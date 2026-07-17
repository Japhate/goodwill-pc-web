import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { CheckCircle2, Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import PageLoadingScreen from "@/components/PageLoadingScreen";
import { CHURCH_CONTACT } from "@/lib/churchIdentity";

const INVITATION_STATE_BY_CODE = {
  invitation_used: "used",
  invitation_approved: "approved",
  invitation_expired: "expired",
  invitation_replaced: "replaced",
  invitation_invalid: "invalid",
  invitation_awaiting_approval: "awaiting_approval",
  invitation_processing: "processing",
  invitation_declined: "declined",
  invitation_revoked: "revoked",
  invitation_rate_limited: "rate_limited",
};

function passwordMeetsRules(password) {
  return password.length >= 12
    && /[a-z]/.test(password)
    && /[A-Z]/.test(password)
    && /\d/.test(password)
    && /[^A-Za-z0-9]/.test(password);
}

function FieldLabel({ children, required = false, htmlFor }) {
  return (
    <label htmlFor={htmlFor} className="mb-1 block text-sm font-semibold text-gray-700">
      {children}
      {required && <span className="ml-1 text-red-600">*</span>}
    </label>
  );
}

export default function AdminSetup() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = useMemo(() => String(searchParams.get("token") || "").trim(), [searchParams]);
  const requestedAction = useMemo(() => String(searchParams.get("action") || "").trim().toLowerCase(), [searchParams]);
  const [email, setEmail] = useState("");
  const [roleLabel, setRoleLabel] = useState("Site Admin");
  const [expiresAt, setExpiresAt] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState("");
  const [invitationState, setInvitationState] = useState("loading");
  const [contactEmail, setContactEmail] = useState(CHURCH_CONTACT.email);
  const [retryCount, setRetryCount] = useState(0);
  const [loadingInvite, setLoadingInvite] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [declining, setDeclining] = useState(false);

  useEffect(() => {
    if (!token || typeof window === "undefined") return;
    window.history.replaceState(window.history.state, "", window.location.pathname);
  }, [token]);

  useEffect(() => {
    const loadInvitation = async () => {
      if (!token) {
        setStatus("This setup link is incomplete. Open the original invitation email and use its full Create New Password link, or request a new invitation.");
        setInvitationState("missing");
        setLoadingInvite(false);
        return;
      }

      setLoadingInvite(true);
      setInvitationState("loading");
      setStatus("");
      try {
        const response = await fetch(`/api/admin/setup-invitation?token=${encodeURIComponent(token)}`);
        const body = await response.json().catch(() => null);
        if (!response.ok) {
          setInvitationState(INVITATION_STATE_BY_CODE[body?.code] || "error");
          setStatus(body?.error || "This invitation cannot be used.");
          setEmail(body?.email || "");
          setContactEmail(body?.contactEmail || CHURCH_CONTACT.email);
          return;
        }
        setEmail(body.email || "");
        setRoleLabel(body.roleLabel || (body.role === "site_developer" ? "Site Developer" : "Site Admin"));
        setExpiresAt(body.expiresAt || "");
        setInvitationState("ready");
      } catch {
        setInvitationState("error");
        setStatus("We could not verify this invitation because of a temporary connection problem. Check your connection and try again.");
      } finally {
        setLoadingInvite(false);
      }
    };

    loadInvitation();
  }, [retryCount, token]);

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
      nextErrors.newPassword = "Use at least 12 characters with uppercase, lowercase, a number, and a special character.";
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
      if (!response.ok) {
        if (String(body?.code || "").startsWith("invitation_")) {
          setInvitationState(INVITATION_STATE_BY_CODE[body.code] || "invalid");
          setStatus(body.error || "This invitation link is no longer available.");
          setEmail(body.email || email);
          setContactEmail(body.contactEmail || CHURCH_CONTACT.email);
          return;
        }
        throw new Error(body?.error || "Unable to complete admin setup.");
      }
      if (body?.requiresApproval) {
        setInvitationState("awaiting_approval");
        setStatus("Your password was created and the one-time invitation is now consumed. The Site Developer has been notified and must approve your account before you can sign in.");
        return;
      }
      navigate("/Admin", { replace: true });
    } catch (error) {
      setStatus(error.message || "Unable to complete admin setup. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeclineInvitation = async () => {
    if (!token) return;
    setDeclining(true);
    setStatus("");
    try {
      const response = await fetch("/api/admin/decline-invitation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(body?.error || "Unable to decline this invitation.");
      setInvitationState("declined");
      setStatus("This invitation has been declined and permanently disabled. The Site Developer has been notified that it may have been sent to the wrong address.");
    } catch (error) {
      setStatus(error.message || "Unable to decline this invitation. Contact the Site Developer for help.");
    } finally {
      setDeclining(false);
    }
  };

  const formattedExpiry = expiresAt ? new Date(expiresAt).toLocaleString([], {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }) : "";
  const invitationReady = invitationState === "ready";
  const invitationUsed = invitationState === "used";
  const invitationApproved = invitationState === "approved";
  const invitationExpired = invitationState === "expired";
  const invitationReplaced = invitationState === "replaced";
  const invitationInvalid = invitationState === "invalid";
  const invitationMissing = invitationState === "missing";
  const invitationAwaitingApproval = invitationState === "awaiting_approval";
  const invitationProcessing = invitationState === "processing";
  const invitationDeclined = invitationState === "declined";
  const invitationRevoked = invitationState === "revoked";
  const invitationRateLimited = invitationState === "rate_limited";
  const verificationError = invitationState === "error";
  const declineMode = requestedAction === "decline" && (invitationReady || invitationAwaitingApproval);
  const requestInvitationHref = `mailto:${contactEmail}?subject=${encodeURIComponent("New Goodwill website administrator invitation")}&body=${encodeURIComponent(`Please send me a new administrator invitation for ${email || "my email address"}.`)}`;

  const heading = declineMode
    ? "Decline This Invitation?"
    : invitationAwaitingApproval
      ? "Waiting for Developer Approval"
      : invitationApproved
        ? "Administrator Setup Complete"
        : invitationProcessing
          ? "Setup Is Being Processed"
          : invitationDeclined
            ? "Invitation Declined"
            : invitationRevoked
              ? "Invitation Revoked"
              : invitationRateLimited
                ? "Please Wait Before Trying Again"
                : invitationUsed
                  ? "Invitation Already Used"
                  : invitationExpired
                    ? "Invitation Expired"
                    : invitationReplaced
                      ? "Use Your Newest Invitation"
                      : invitationInvalid || invitationMissing
                        ? "Invitation Link Unavailable"
                        : verificationError
                          ? "Unable to Verify Invitation"
                          : invitationReady
                            ? "Create Your New Admin Password"
                            : "Checking Your Invitation";

  const introduction = declineMode
    ? "Use this option if the email was unexpected or sent to the wrong person."
    : invitationAwaitingApproval
      ? "Your password setup is complete, but Admin access has not been granted yet."
      : invitationApproved
        ? "Your account has been reviewed and approved."
        : invitationProcessing
          ? "Another completion request is already securing this one-time invitation."
          : invitationDeclined || invitationRevoked
            ? "This one-time setup link has been permanently disabled."
            : invitationRateLimited
              ? "Too many requests were made from this connection."
              : invitationUsed
                ? "This one-time administrator setup has already been completed."
                : invitationExpired
                  ? "The setup window closed before this invitation was completed."
                  : invitationReplaced
                    ? "This link was replaced when a newer invitation was issued."
                    : invitationInvalid || invitationMissing
                      ? "This one-time administrator setup cannot be completed from this link."
                      : verificationError
                        ? "The invitation could not be checked right now."
                        : invitationReady
                          ? "Enter your name and the password you want to use."
                          : "Please wait while we verify this one-time setup link.";

  const showRetry = verificationError || invitationProcessing || invitationRateLimited;
  const showSignIn = invitationState !== "loading" && !invitationReady;
  const showRequestInvitation = invitationExpired || invitationReplaced || invitationInvalid || invitationMissing;
  const showContactDeveloper = !showRequestInvitation;

  return (
    <main className="min-h-screen bg-[#f8f3ea] px-4 py-10">
      <section className="mx-auto max-w-2xl overflow-hidden rounded-xl border border-amber-100 bg-white shadow-lg">
        <div className="bg-[#4b342a] px-6 py-6 text-white">
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-amber-200">
            <ShieldCheck className="h-4 w-4" />
            {invitationReady ? `${roleLabel} Setup` : "Administrator Setup"}
          </p>
          <h1 className="mt-2 text-2xl font-bold">{heading}</h1>
          <p className="mt-2 text-sm text-amber-50">{introduction}</p>
        </div>

        {loadingInvite ? (
          <div className="flex items-center justify-center p-10">
            <PageLoadingScreen compact backgroundClassName="bg-transparent" className="py-2" />
          </div>
        ) : declineMode ? (
          <div className="space-y-5 p-6 text-center">
            <p className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800" role="status">
              Declining permanently disables this one-time link and alerts the Site Developer. No administrator access will be granted from this invitation.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <Button type="button" variant="destructive" disabled={declining} onClick={handleDeclineInvitation}>
                {declining && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Decline and Report Wrong Recipient
              </Button>
              <Button type="button" variant="outline" onClick={() => navigate("/")}>Cancel and Return Home</Button>
            </div>
          </div>
        ) : !invitationReady ? (
          <div className="space-y-5 p-6 text-center">
            {(invitationUsed || invitationApproved) && (
              <CheckCircle2 className="mx-auto h-12 w-12 text-green-600" aria-hidden="true" />
            )}
            <p
              className={`rounded-md border px-4 py-3 text-sm font-semibold ${
                invitationUsed || invitationApproved || invitationAwaitingApproval
                  ? "border-green-200 bg-green-50 text-green-800"
                  : "border-red-200 bg-red-50 text-red-700"
              }`}
              role="status"
            >
              {status}
            </p>
            {(invitationUsed || invitationApproved) && (
              <p className="text-sm text-gray-600">Sign in with the password you created. If you no longer remember it, use the password-reset option on the sign-in page.</p>
            )}
            {invitationAwaitingApproval && (
              <p className="text-sm text-gray-600">The Site Developer received an approval notice. You will receive another email after access is approved.</p>
            )}
            {invitationReplaced && (
              <p className="text-sm text-gray-600">Check your inbox and spam folder for the most recent invitation before requesting another one.</p>
            )}
            {invitationProcessing && (
              <p className="text-sm text-gray-600">Wait a moment and use Try Again. The server automatically recovers an interrupted setup claim.</p>
            )}
            <div className="grid gap-3 sm:grid-cols-2">
              {showRetry && (
                <Button type="button" className="bg-amber-600 hover:bg-amber-700" onClick={() => setRetryCount((count) => count + 1)}>Try Again</Button>
              )}
              {showRequestInvitation && (
                <Button asChild className="bg-amber-600 hover:bg-amber-700"><a href={requestInvitationHref}>Request a New Invitation</a></Button>
              )}
              {showContactDeveloper && (
                <Button asChild variant="outline"><a href={requestInvitationHref}>Contact the Site Developer</a></Button>
              )}
              {showSignIn && (
                <Button type="button" variant={invitationUsed || invitationApproved ? "default" : "outline"} className={invitationUsed || invitationApproved ? "bg-amber-600 hover:bg-amber-700" : ""} onClick={() => navigate("/Admin")}>Go to Admin Sign In</Button>
              )}
            </div>
            <Button type="button" variant="ghost" className="w-full" onClick={() => navigate("/")}>Return to Church Website</Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5 p-6" noValidate>
            {status && <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{status}</p>}

            <div>
              <FieldLabel htmlFor="admin-setup-email">Email Address</FieldLabel>
              <Input id="admin-setup-email" type="email" value={email} readOnly className="bg-gray-50 font-semibold text-gray-700" />
              {formattedExpiry && <p className="mt-1 text-xs text-gray-500">Invitation expires {formattedExpiry}.</p>}
            </div>

            <div>
              <FieldLabel htmlFor="admin-setup-role">Role</FieldLabel>
              <Input id="admin-setup-role" type="text" value={roleLabel} readOnly className="bg-gray-50 font-semibold text-gray-700" />
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <FieldLabel htmlFor="admin-setup-first-name" required>First Name</FieldLabel>
                <Input id="admin-setup-first-name" value={firstName} onChange={(event) => { setFirstName(event.target.value); clearError("firstName"); }} className={errors.firstName ? "border-red-500 focus-visible:ring-red-500" : ""} autoComplete="given-name" />
                {errors.firstName && <p className="mt-1 text-xs font-semibold text-red-600">{errors.firstName}</p>}
              </div>
              <div>
                <FieldLabel htmlFor="admin-setup-last-name" required>Last Name</FieldLabel>
                <Input id="admin-setup-last-name" value={lastName} onChange={(event) => { setLastName(event.target.value); clearError("lastName"); }} className={errors.lastName ? "border-red-500 focus-visible:ring-red-500" : ""} autoComplete="family-name" />
                {errors.lastName && <p className="mt-1 text-xs font-semibold text-red-600">{errors.lastName}</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <FieldLabel htmlFor="admin-setup-password" required>New Password</FieldLabel>
                <Input id="admin-setup-password" type="password" value={newPassword} onChange={(event) => { setNewPassword(event.target.value); clearError("newPassword"); }} className={errors.newPassword ? "border-red-500 focus-visible:ring-red-500" : ""} autoComplete="new-password" />
                {errors.newPassword && <p className="mt-1 text-xs font-semibold text-red-600">{errors.newPassword}</p>}
              </div>
              <div>
                <FieldLabel htmlFor="admin-setup-confirm-password" required>Confirm New Password</FieldLabel>
                <Input id="admin-setup-confirm-password" type="password" value={confirmPassword} onChange={(event) => { setConfirmPassword(event.target.value); clearError("confirmPassword"); }} className={errors.confirmPassword ? "border-red-500 focus-visible:ring-red-500" : ""} autoComplete="new-password" />
                {errors.confirmPassword && <p className="mt-1 text-xs font-semibold text-red-600">{errors.confirmPassword}</p>}
              </div>
            </div>

            <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-xs text-amber-950">
              <p className="flex items-center gap-2 font-semibold">
                <CheckCircle2 className="h-4 w-4 text-amber-700" />
                Use at least 12 characters with uppercase and lowercase letters, at least one number, and a special character.
              </p>
            </div>

            <div className="rounded-md border border-blue-200 bg-blue-50 p-4 text-xs text-blue-950">
              This link can complete password setup only once. After submission, the Site Developer must verify the email address and approve the account before Admin access is granted.
            </div>

            <Button type="submit" className="w-full bg-amber-600 hover:bg-amber-700" disabled={submitting || !email}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Password and Request Approval
            </Button>
          </form>
        )}
      </section>
    </main>
  );
}
