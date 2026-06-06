import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Activity, Mail, RefreshCw, ShieldCheck, Trash2, UserPlus, Users } from "lucide-react";

function formatDate(value) {
  if (!value) return "Not recorded";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString([], {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatDetails(details = {}) {
  const entries = Object.entries(details || {}).filter(([, value]) => value !== undefined && value !== null && value !== "");
  if (entries.length === 0) return "No extra details";

  return entries
    .map(([key, value]) => `${key.replaceAll("_", " ")}: ${Array.isArray(value) ? value.join(", ") : String(value)}`)
    .join(" | ");
}

function FieldLabel({ children, required = false }) {
  return (
    <label className="mb-1 block text-sm font-semibold text-gray-700">
      {children}
      {required && <span className="ml-1 text-red-600">*</span>}
    </label>
  );
}

export default function DeveloperPanel({
  logs = [],
  admins = [],
  adminLoadError = "",
  loading = false,
  onRefresh,
  onCreateAdmin,
  onDeleteAdmin,
  canManageAdmins = false,
  currentAdminEmail = "",
}) {
  const [email, setEmail] = useState("");
  const [errors, setErrors] = useState({});
  const [inviteStatus, setInviteStatus] = useState("");
  const [adminStatus, setAdminStatus] = useState("");
  const [sendingInvite, setSendingInvite] = useState(false);
  const [deletingAdminUid, setDeletingAdminUid] = useState("");
  const latestLog = logs[0];
  const loginCount = logs.filter((log) => log.action === "signed_in").length;
  const contentCount = logs.filter((log) => ["created", "updated", "deleted", "duplicated"].includes(log.action)).length;
  const newsletterCount = logs.filter((log) => log.section === "Newsletter").length;

  const clearError = (field) => {
    setErrors((current) => ({ ...current, [field]: "" }));
    setInviteStatus("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();
    const nextErrors = {};
    if (!normalizedEmail) nextErrors.email = "Enter the email address.";
    if (normalizedEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) nextErrors.email = "Enter a valid email address.";

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      setInviteStatus("Please complete the highlighted required fields before sending the admin invite.");
      return;
    }

    setSendingInvite(true);
    setInviteStatus("");
    try {
      await onCreateAdmin({
        email: normalizedEmail,
      });
      setInviteStatus(`Admin invitation sent to ${normalizedEmail}.`);
      setEmail("");
      setErrors({});
    } catch (error) {
      setInviteStatus(error.message || "Unable to send the admin invitation.");
    } finally {
      setSendingInvite(false);
    }
  };

  const handleDeleteAdmin = async (admin) => {
    const adminEmail = admin.email || "this administrator";
    if (!window.confirm(`Remove ${adminEmail} from the site administrators list? This deletes their Firestore admin record and revokes admin panel access. Their past activity logs will remain.`)) return;

    setDeletingAdminUid(admin.uid);
    setAdminStatus("");
    try {
      await onDeleteAdmin(admin);
      setAdminStatus(`${adminEmail} was removed from the Firestore site administrators list.`);
    } catch (error) {
      setAdminStatus(error.message || "Unable to delete the site administrator.");
    } finally {
      setDeletingAdminUid("");
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-lg bg-white p-4 shadow-md">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-amber-700">
              <ShieldCheck className="h-4 w-4" />
              Developer Access
            </p>
            <h2 className="mt-1 text-2xl font-bold text-gray-950">Developer Panel</h2>
            <p className="mt-1 text-sm text-gray-600">
              Review administrator sign-ins, sign-outs, content edits, uploads, newsletter work, and other activity.
            </p>
          </div>
          <Button type="button" variant="outline" onClick={onRefresh} disabled={loading} className="gap-2">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh Logs
          </Button>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-4">
          <div className="rounded-md border bg-gray-50 p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Total Logs</p>
            <p className="mt-1 text-2xl font-bold text-gray-950">{logs.length}</p>
          </div>
          <div className="rounded-md border bg-gray-50 p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Sign Ins</p>
            <p className="mt-1 text-2xl font-bold text-gray-950">{loginCount}</p>
          </div>
          <div className="rounded-md border bg-gray-50 p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Content Actions</p>
            <p className="mt-1 text-2xl font-bold text-gray-950">{contentCount}</p>
          </div>
          <div className="rounded-md border bg-gray-50 p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Newsletter Actions</p>
            <p className="mt-1 text-2xl font-bold text-gray-950">{newsletterCount}</p>
          </div>
        </div>

        {latestLog && (
          <div className="mt-5 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
            Most recent activity: <span className="font-semibold">{latestLog.actor_name || latestLog.actor_email || "Unknown admin"}</span>{" "}
            {latestLog.action?.replaceAll("_", " ")} in {latestLog.section || "Admin Panel"} on {formatDate(latestLog.created_date)}.
          </div>
        )}
      </div>

      <div className="rounded-lg bg-white p-4 shadow-md">
        <div className="mb-5 flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-700">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-950">Site Administrators</h3>
          </div>
        </div>

        <div className="overflow-x-auto rounded-md border">
          {adminLoadError && (
            <p className="border-b border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900">
              {adminLoadError} Showing the current developer account while the full administrator list is unavailable.
            </p>
          )}
          {adminStatus && (
            <p className={`border-b px-4 py-3 text-sm font-semibold ${
              adminStatus.includes("Unable") ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"
            }`}>
              {adminStatus}
            </p>
          )}
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-600">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Profile Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {admins.length === 0 ? (
                <tr>
                    <td colSpan={4} className="px-4 py-5 text-center text-gray-500">No admin profiles found.</td>
                </tr>
              ) : admins.map((admin) => {
                const fullName = [admin.first_name, admin.last_name].filter(Boolean).join(" ");
                const hasName = Boolean(admin.first_name && admin.last_name);
                const adminEmail = admin.email || "";
                const isCurrentDeveloper = adminEmail.toLowerCase() === currentAdminEmail.toLowerCase();
                const roleLabel = admin.role_label || (isCurrentDeveloper ? "Site Developer" : "Site Administrator");
                return (
                  <tr key={admin.uid || admin.email} className="border-t hover:bg-gray-50">
                    <td className="px-4 py-4 font-semibold text-gray-900">{fullName || "Name not entered yet"}</td>
                    <td className="px-4 py-4">
                      <p className="font-medium text-gray-900">{adminEmail || "No email recorded"}</p>
                      <p className="text-xs text-gray-500">{admin.uid || "No UID recorded"}</p>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge className={roleLabel === "Site Developer" ? "bg-amber-600" : "bg-blue-600"}>
                          {roleLabel}
                        </Badge>
                        <Badge className={hasName ? "bg-green-600" : "bg-orange-600"}>
                          {hasName ? "Profile complete" : "Name pending"}
                        </Badge>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteAdmin(admin)}
                        disabled={!canManageAdmins || isCurrentDeveloper || deletingAdminUid === admin.uid}
                        title={isCurrentDeveloper ? "The site developer cannot delete their own admin record" : "Remove admin access"}
                        className="gap-2 border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800"
                      >
                        <Trash2 className="h-4 w-4 text-red-600" />
                        {deletingAdminUid === admin.uid ? "Removing..." : "Remove Admin"}
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {canManageAdmins && (
      <div className="rounded-lg bg-white p-4 shadow-md">
        <div className="mb-5 flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 text-amber-800">
            <UserPlus className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-950">Add Site Administrator</h3>
            <p className="mt-1 text-sm text-gray-600">Add the admin email and send a one-time setup link.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {inviteStatus && (
            <p className={`rounded-md border px-3 py-2 text-sm font-semibold ${
              Object.values(errors).some(Boolean) || inviteStatus.includes("Unable")
                ? "border-red-200 bg-red-50 text-red-700"
                : "border-green-200 bg-green-50 text-green-700"
            }`}>
              {inviteStatus}
            </p>
          )}

          <div className="max-w-xl">
            <div>
              <FieldLabel required>Email Address</FieldLabel>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  type="email"
                  value={email}
                  onChange={(event) => {
                    setEmail(event.target.value);
                    clearError("email");
                  }}
                  className={`pl-9 ${errors.email ? "border-red-500 focus-visible:ring-red-500" : ""}`}
                  autoComplete="email"
                />
              </div>
              {errors.email && <p className="mt-1 text-xs font-semibold text-red-600">{errors.email}</p>}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-amber-200 bg-amber-50 px-4 py-3">
            <p className="text-xs text-amber-950">
              The new admin will receive a secure setup link. They will enter their name and create their own password before admin access is granted.
            </p>
            <Button type="submit" className="bg-amber-600 hover:bg-amber-700" disabled={sendingInvite}>
              {sendingInvite ? "Sending Invite..." : "Create Admin and Send Email"}
            </Button>
          </div>
        </form>
      </div>
      )}

      <div className="rounded-lg bg-white p-4 shadow-md">
        <div className="mb-4 flex items-center gap-2">
          <Activity className="h-5 w-5 text-amber-600" />
          <h3 className="text-xl font-bold text-gray-950">Activity Log</h3>
        </div>

        <div className="overflow-x-auto rounded-md border">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-600">
              <tr>
                <th className="px-4 py-3">When</th>
                <th className="px-4 py-3">Admin</th>
                <th className="px-4 py-3">Action</th>
                <th className="px-4 py-3">Section</th>
                <th className="px-4 py-3">Item</th>
                <th className="px-4 py-3">Details</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 ? (
                <tr>
                      <td colSpan={6} className="px-4 py-5 text-center text-gray-500">
                    {loading ? "Loading developer logs..." : "No admin activity has been recorded yet."}
                  </td>
                </tr>
              ) : logs.map((log) => (
                <tr key={log.id} className="border-t hover:bg-gray-50">
                  <td className="whitespace-nowrap px-4 py-4 text-xs text-gray-600">{formatDate(log.created_date)}</td>
                  <td className="px-4 py-4">
                    <p className="font-semibold text-gray-900">{log.actor_name || "Unknown admin"}</p>
                    <p className="text-xs text-gray-600">{log.actor_email || "No email recorded"}</p>
                  </td>
                  <td className="px-4 py-4">
                    <Badge className="bg-amber-600">{String(log.action || "activity").replaceAll("_", " ")}</Badge>
                  </td>
                  <td className="px-4 py-4 font-medium text-gray-800">{log.section || "Admin Panel"}</td>
                  <td className="px-4 py-4">
                    <p className="font-medium text-gray-900">{log.item_label || log.item_type || "General"}</p>
                    {log.item_id && <p className="text-xs text-gray-500">{log.item_id}</p>}
                  </td>
                  <td className="max-w-md px-4 py-4 text-xs text-gray-600">{formatDetails(log.details)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
