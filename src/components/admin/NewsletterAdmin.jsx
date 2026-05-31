import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Mail, PlusCircle, Save, Search, Trash2, Users } from "lucide-react";
import { DEFAULT_EMAIL_TEMPLATES, mergeEmailTemplate } from "@/lib/newsletterTemplates";

function formatDate(value) {
  if (!value) return "Not set";
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

function TemplateEditor({ template, onSave, onSendTestEmail, testEmail }) {
  const [formData, setFormData] = useState(template);
  const [saving, setSaving] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);

  useEffect(() => {
    setFormData(template);
  }, [template]);

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSendTest = async () => {
    if (!testEmail) {
      window.alert("Enter a test email address first.");
      return;
    }

    setSendingTest(true);
    try {
      await onSendTestEmail(formData.id, testEmail);
    } finally {
      setSendingTest(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      await onSave(formData.id, formData);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border bg-white p-5 shadow-sm">
      <div>
        <h3 className="text-lg font-bold text-gray-900">{formData.name}</h3>
        <p className="text-xs text-gray-500">
          Available placeholders: [subscriber name], [first name], [last name], [subscriber email], [unsubscribe link], [support phone], [support email]
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-semibold text-gray-700">Subject</label>
          <Input value={formData.subject || ""} onChange={(event) => handleChange("subject", event.target.value)} required />
        </div>
        <div>
          <label className="mb-1 block text-sm font-semibold text-gray-700">Heading</label>
          <Input value={formData.heading || ""} onChange={(event) => handleChange("heading", event.target.value)} required />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-semibold text-gray-700">Email Body</label>
        <Textarea value={formData.body || ""} onChange={(event) => handleChange("body", event.target.value)} rows={9} required />
      </div>

      <div>
        <label className="mb-1 block text-sm font-semibold text-gray-700">Footer / Unsubscribe Text</label>
        <Textarea value={formData.footer || ""} onChange={(event) => handleChange("footer", event.target.value)} rows={4} />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-semibold text-gray-700">Support Phone</label>
          <Input value={formData.support_phone || ""} onChange={(event) => handleChange("support_phone", event.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-sm font-semibold text-gray-700">Support Email</label>
          <Input type="email" value={formData.support_email || ""} onChange={(event) => handleChange("support_email", event.target.value)} />
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <Button type="submit" className="bg-amber-600 hover:bg-amber-700" disabled={saving}>
          <Save className="mr-2 h-4 w-4" />
          {saving ? "Saving..." : "Save Template"}
        </Button>
        <Button type="button" variant="outline" onClick={handleSendTest} disabled={sendingTest}>
          <Mail className="mr-2 h-4 w-4" />
          {sendingTest ? "Sending..." : "Send Test"}
        </Button>
      </div>
    </form>
  );
}

export default function NewsletterAdmin({ subscribers, templates, onAddSubscriber, onDeleteSubscriber, onSaveTemplate, onSendTestEmail }) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [search, setSearch] = useState("");
  const [testEmail, setTestEmail] = useState("");
  const [adding, setAdding] = useState(false);

  const normalizedTemplates = useMemo(() => {
    return DEFAULT_EMAIL_TEMPLATES.map((defaultTemplate) => {
      const managedTemplate = templates.find((template) => template.id === defaultTemplate.id);
      return mergeEmailTemplate(managedTemplate || defaultTemplate, defaultTemplate.id);
    });
  }, [templates]);

  const filteredSubscribers = useMemo(() => {
    const term = search.trim().toLowerCase();
    const sortedSubscribers = [...subscribers].sort((a, b) => String(a.email || "").localeCompare(String(b.email || "")));
    if (!term) return sortedSubscribers;
    return sortedSubscribers.filter((subscriber) => {
      const searchable = [
        subscriber.first_name,
        subscriber.last_name,
        `${subscriber.first_name || ""} ${subscriber.last_name || ""}`,
        subscriber.email,
      ].join(" ").toLowerCase();
      return searchable.includes(term);
    });
  }, [search, subscribers]);

  const activeCount = subscribers.filter((subscriber) => subscriber.status === "active").length;
  const unsubscribedCount = subscribers.filter((subscriber) => subscriber.status === "unsubscribed").length;

  const handleAdd = async (event) => {
    event.preventDefault();
    const normalizedFirstName = firstName.trim().replace(/\s+/g, " ");
    const normalizedLastName = lastName.trim().replace(/\s+/g, " ");
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedFirstName || !normalizedLastName || !normalizedEmail) return;

    setAdding(true);
    try {
      await onAddSubscriber({
        firstName: normalizedFirstName,
        lastName: normalizedLastName,
        email: normalizedEmail,
      });
      setFirstName("");
      setLastName("");
      setEmail("");
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="rounded-lg bg-white p-8 shadow-md">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
              <Users className="h-6 w-6 text-amber-600" />
              Newsletter Subscribers
            </h2>
            <p className="mt-1 text-sm text-gray-600">Add, search, and remove mailing list addresses.</p>
          </div>
          <div className="flex gap-2 text-sm">
            <Badge className="bg-green-600">{activeCount} active</Badge>
            <Badge className="bg-gray-500">{unsubscribedCount} unsubscribed</Badge>
          </div>
        </div>

        <form onSubmit={handleAdd} className="mb-5 grid grid-cols-1 gap-3 md:grid-cols-[1fr_1fr_1.4fr_auto]">
          <Input
            type="text"
            value={firstName}
            onChange={(event) => setFirstName(event.target.value)}
            placeholder="First name"
            autoComplete="given-name"
            required
          />
          <Input
            type="text"
            value={lastName}
            onChange={(event) => setLastName(event.target.value)}
            placeholder="Last name"
            autoComplete="family-name"
            required
          />
          <Input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Add email address"
            autoComplete="email"
            required
          />
          <Button type="submit" className="bg-amber-600 hover:bg-amber-700" disabled={adding}>
            <PlusCircle className="mr-2 h-4 w-4" />
            {adding ? "Adding..." : "Add Subscriber"}
          </Button>
        </form>

        <div className="relative mb-4 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search subscribers" className="pl-9" />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-600">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredSubscribers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-500">No newsletter subscribers found.</td>
                </tr>
              ) : filteredSubscribers.map((subscriber) => (
                <tr key={subscriber.id} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-4 font-semibold text-gray-900">
                    {[subscriber.first_name, subscriber.last_name].filter(Boolean).join(" ") || "Name not provided"}
                  </td>
                  <td className="px-4 py-4 font-semibold text-gray-900">{subscriber.email}</td>
                  <td className="px-4 py-4">
                    <Badge className={subscriber.status === "active" ? "bg-green-600" : "bg-gray-500"}>
                      {subscriber.status || "active"}
                    </Badge>
                  </td>
                  <td className="px-4 py-4 text-xs text-gray-600">{formatDate(subscriber.created_date)}</td>
                  <td className="px-4 py-4 text-right">
                    <Button variant="ghost" size="icon" onClick={() => onDeleteSubscriber(subscriber.id)} title="Remove subscriber">
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-lg bg-white p-8 shadow-md">
        <div className="mb-6">
          <h2 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
            <Mail className="h-6 w-6 text-amber-600" />
            Newsletter Email Messages
          </h2>
          <p className="mt-1 text-sm text-gray-600">Edit the welcome email and the message sent when someone tries to subscribe again.</p>
        </div>
        <div className="mb-5 max-w-md">
          <label className="mb-1 block text-sm font-semibold text-gray-700">Test Email Address</label>
          <Input type="email" value={testEmail} onChange={(event) => setTestEmail(event.target.value)} placeholder="Send a test to..." />
        </div>
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          {normalizedTemplates.map((template) => (
            <TemplateEditor
              key={template.id}
              template={template}
              testEmail={testEmail.trim().toLowerCase()}
              onSave={onSaveTemplate}
              onSendTestEmail={onSendTestEmail}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
