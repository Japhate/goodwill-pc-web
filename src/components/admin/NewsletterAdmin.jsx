import { useEffect, useMemo, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Mail, Paperclip, PlusCircle, Save, Search, Send, Trash2, Users, X } from "lucide-react";
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

function FieldLabel({ children, required = false }) {
  return (
    <label className="mb-1 block text-sm font-semibold text-gray-700">
      {children}
      {required && <span className="ml-1 text-red-600">*</span>}
    </label>
  );
}

function TemplateEditor({ template, onSave, onSendTestEmail, testEmail }) {
  const [formData, setFormData] = useState(template);
  const [saving, setSaving] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);
  const [templateErrors, setTemplateErrors] = useState({});

  useEffect(() => {
    setFormData(template);
    setTemplateErrors({});
  }, [template]);

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setTemplateErrors((errors) => ({ ...errors, [field]: "" }));
  };

  const validateTemplate = () => {
    const nextErrors = {};
    if (!String(formData.subject || "").trim()) nextErrors.subject = "Enter a subject.";
    if (!String(formData.heading || "").trim()) nextErrors.heading = "Enter a heading.";
    if (!String(formData.body || "").trim()) nextErrors.body = "Enter the email body.";
    setTemplateErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
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
    if (!validateTemplate()) return;
    setSaving(true);
    try {
      await onSave(formData.id, formData);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border bg-white p-5 shadow-sm" noValidate>
      <div>
        <h3 className="text-lg font-bold text-gray-900">{formData.name}</h3>
        <p className="text-xs text-gray-500">
          Available placeholders: [subscriber name], [first name], [last name], [subscriber email], [unsubscribe link], [support phone], [support email]
        </p>
      </div>
      {Object.values(templateErrors).some(Boolean) && (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
          Please complete the highlighted required fields before saving this template.
        </p>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <FieldLabel required>Subject</FieldLabel>
          <Input
            value={formData.subject || ""}
            onChange={(event) => handleChange("subject", event.target.value)}
            className={templateErrors.subject ? "border-red-500 focus-visible:ring-red-500" : ""}
          />
          {templateErrors.subject && <p className="mt-1 text-xs font-semibold text-red-600">{templateErrors.subject}</p>}
        </div>
        <div>
          <FieldLabel required>Heading</FieldLabel>
          <Input
            value={formData.heading || ""}
            onChange={(event) => handleChange("heading", event.target.value)}
            className={templateErrors.heading ? "border-red-500 focus-visible:ring-red-500" : ""}
          />
          {templateErrors.heading && <p className="mt-1 text-xs font-semibold text-red-600">{templateErrors.heading}</p>}
        </div>
      </div>

      <div>
        <FieldLabel required>Email Body</FieldLabel>
        <Textarea
          value={formData.body || ""}
          onChange={(event) => handleChange("body", event.target.value)}
          rows={9}
          className={templateErrors.body ? "border-red-500 focus-visible:ring-red-500" : ""}
        />
        {templateErrors.body && <p className="mt-1 text-xs font-semibold text-red-600">{templateErrors.body}</p>}
      </div>

      <div>
        <FieldLabel>Footer / Unsubscribe Text</FieldLabel>
        <Textarea value={formData.footer || ""} onChange={(event) => handleChange("footer", event.target.value)} rows={4} />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <FieldLabel>Support Phone</FieldLabel>
          <Input value={formData.support_phone || ""} onChange={(event) => handleChange("support_phone", event.target.value)} />
        </div>
        <div>
          <FieldLabel>Support Email</FieldLabel>
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

function readAttachmentFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || "");
      resolve({
        filename: file.name,
        contentType: file.type || "application/octet-stream",
        size: file.size,
        file,
        content: result.includes(",") ? result.split(",").pop() : result,
      });
    };
    reader.onerror = () => reject(reader.error || new Error("Unable to read attachment."));
    reader.readAsDataURL(file);
  });
}

function getSubscriberKey(subscriber) {
  return String(subscriber?.id || subscriber?.email_key || subscriber?.email || "");
}

function getBroadcastStatusClass(status) {
  if (status === "sent") return "bg-green-600";
  if (status === "scheduled") return "bg-blue-600";
  if (status === "partial") return "bg-orange-600";
  return "bg-gray-600";
}

export default function NewsletterAdmin({
  subscribers,
  templates,
  broadcasts = [],
  onAddSubscriber,
  onDeleteSubscriber,
  onSaveTemplate,
  onSendTestEmail,
  onSendBroadcast,
  onSaveBroadcastDraft,
  onScheduleBroadcast,
  onMarkBroadcastSent,
}) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [search, setSearch] = useState("");
  const [testEmail, setTestEmail] = useState("");
  const [adding, setAdding] = useState(false);
  const [broadcastSubject, setBroadcastSubject] = useState("");
  const [broadcastMessage, setBroadcastMessage] = useState("");
  const [broadcastAttachments, setBroadcastAttachments] = useState([]);
  const [broadcastStatus, setBroadcastStatus] = useState("");
  const [sendingBroadcast, setSendingBroadcast] = useState(false);
  const [selectedRecipientIds, setSelectedRecipientIds] = useState([]);
  const [editingBroadcastId, setEditingBroadcastId] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [savingBroadcast, setSavingBroadcast] = useState(false);
  const [broadcastFilter, setBroadcastFilter] = useState("all");
  const [broadcastErrors, setBroadcastErrors] = useState({});
  const [subscriberErrors, setSubscriberErrors] = useState({});
  const processingScheduledIds = useRef(new Set());

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
  const totalAttachmentSize = broadcastAttachments.reduce((sum, attachment) => sum + attachment.size, 0);
  const activeSubscribers = useMemo(() => {
    return subscribers
      .filter((subscriber) => (subscriber.status || "active") === "active")
      .sort((a, b) => String(a.email || "").localeCompare(String(b.email || "")));
  }, [subscribers]);
  const activeRecipientIds = useMemo(() => activeSubscribers.map(getSubscriberKey).filter(Boolean), [activeSubscribers]);
  const selectedActiveRecipientIds = selectedRecipientIds.filter((id) => activeRecipientIds.includes(id));
  const selectedRecipientCount = selectedActiveRecipientIds.length;
  const allActiveSelected = activeRecipientIds.length > 0 && selectedRecipientCount === activeRecipientIds.length;
  const visibleBroadcasts = useMemo(() => {
    const sortedBroadcasts = [...broadcasts].sort((a, b) => String(b.updated_date || b.created_date || "").localeCompare(String(a.updated_date || a.created_date || "")));
    if (broadcastFilter === "all") return sortedBroadcasts;
    return sortedBroadcasts.filter((broadcast) => (broadcast.status || "draft") === broadcastFilter);
  }, [broadcastFilter, broadcasts]);

  useEffect(() => {
    setSelectedRecipientIds((currentIds) => {
      if (currentIds.length === 0) return activeRecipientIds;
      return currentIds.filter((id) => activeRecipientIds.includes(id));
    });
  }, [activeRecipientIds]);

  useEffect(() => {
    const processDueBroadcasts = async () => {
      const now = new Date();
      const dueBroadcasts = broadcasts.filter((broadcast) => {
        if ((broadcast.status || "draft") !== "scheduled" || !broadcast.scheduled_at) return false;
        if (processingScheduledIds.current.has(broadcast.id)) return false;
        const scheduledDate = new Date(broadcast.scheduled_at);
        return !Number.isNaN(scheduledDate.getTime()) && scheduledDate <= now;
      });

      for (const broadcast of dueBroadcasts) {
        processingScheduledIds.current.add(broadcast.id);
        try {
          const result = await onSendBroadcast({
            subject: broadcast.subject || "",
            message: broadcast.message || "",
            attachments: broadcast.attachments || [],
            recipientIds: broadcast.recipient_ids || [],
            notifyAdmins: true,
          });
          await onMarkBroadcastSent(broadcast.id, result, broadcast);
        } catch (error) {
          setBroadcastStatus(`Scheduled broadcast "${broadcast.subject || "Untitled broadcast"}" was not sent: ${error.message}`);
        } finally {
          processingScheduledIds.current.delete(broadcast.id);
        }
      }
    };

    processDueBroadcasts();
    const interval = window.setInterval(processDueBroadcasts, 60000);
    return () => window.clearInterval(interval);
  }, [broadcasts, onMarkBroadcastSent, onSendBroadcast]);

  const handleAdd = async (event) => {
    event.preventDefault();
    const normalizedFirstName = firstName.trim().replace(/\s+/g, " ");
    const normalizedLastName = lastName.trim().replace(/\s+/g, " ");
    const normalizedEmail = email.trim().toLowerCase();
    const nextErrors = {};
    if (!normalizedFirstName) nextErrors.firstName = "Enter the first name.";
    if (!normalizedLastName) nextErrors.lastName = "Enter the last name.";
    if (!normalizedEmail) nextErrors.email = "Enter the email address.";
    if (normalizedEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) nextErrors.email = "Enter a valid email address.";
    setSubscriberErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

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
      setSubscriberErrors({});
    } finally {
      setAdding(false);
    }
  };

  const handleAttachmentChange = async (event) => {
    const files = Array.from(event.target.files || []);
    event.target.value = "";
    if (files.length === 0) return;

    const existingSize = broadcastAttachments.reduce((sum, attachment) => sum + attachment.size, 0);
    const newSize = files.reduce((sum, file) => sum + file.size, 0);
    if (broadcastAttachments.length + files.length > 5) {
      window.alert("Please attach no more than 5 files.");
      return;
    }
    if (existingSize + newSize > 8 * 1024 * 1024) {
      window.alert("Attachments must be 8 MB or less combined.");
      return;
    }

    const preparedFiles = await Promise.all(files.map(readAttachmentFile));
    setBroadcastAttachments((prev) => [...prev, ...preparedFiles]);
  };

  const handleRemoveAttachment = (indexToRemove) => {
    setBroadcastAttachments((prev) => prev.filter((_, index) => index !== indexToRemove));
  };

  const handleToggleAllRecipients = (checked) => {
    setSelectedRecipientIds(checked ? activeRecipientIds : []);
  };

  const handleToggleRecipient = (subscriberId, checked) => {
    setSelectedRecipientIds((prev) => {
      if (checked) return Array.from(new Set([...prev, subscriberId]));
      return prev.filter((id) => id !== subscriberId);
    });
  };

  const resetBroadcastComposer = () => {
    setEditingBroadcastId("");
    setBroadcastSubject("");
    setBroadcastMessage("");
    setBroadcastAttachments([]);
    setScheduledAt("");
    setSelectedRecipientIds(activeRecipientIds);
    setBroadcastErrors({});
  };

  const handleLoadBroadcast = (broadcast) => {
    setEditingBroadcastId(broadcast.id || "");
    setBroadcastSubject(broadcast.subject || "");
    setBroadcastMessage(broadcast.message || "");
    setBroadcastAttachments((broadcast.attachments || []).map((attachment) => ({
      filename: attachment.filename,
      contentType: attachment.contentType || attachment.content_type || "",
      size: attachment.size || 0,
      file_url: attachment.file_url || "",
    })));
    setScheduledAt(broadcast.scheduled_at || "");
    const storedRecipients = broadcast.recipient_ids || [];
    setSelectedRecipientIds(storedRecipients.length > 0 ? storedRecipients.filter((id) => activeRecipientIds.includes(id)) : activeRecipientIds);
    setBroadcastStatus(`Loaded "${broadcast.subject || "Untitled broadcast"}" for editing.`);
    setBroadcastErrors({});
  };

  const getBroadcastPayload = () => ({
    id: editingBroadcastId,
    subject: broadcastSubject.trim(),
    message: broadcastMessage.trim(),
    attachments: broadcastAttachments,
    recipientIds: selectedActiveRecipientIds,
    scheduledAt,
  });

  const validateBroadcast = ({ requireSchedule = false } = {}) => {
    const nextErrors = {};
    if (!broadcastSubject.trim()) nextErrors.subject = "Enter a subject.";
    if (!broadcastMessage.trim()) nextErrors.message = "Enter the message.";
    if (selectedRecipientCount === 0) nextErrors.recipients = "Select at least one recipient.";
    if (requireSchedule && !scheduledAt) nextErrors.scheduledAt = "Choose a schedule date and time.";
    setBroadcastErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      setBroadcastStatus(`Please complete the highlighted required fields before ${requireSchedule ? "scheduling" : "sending"}.`);
      return false;
    }

    return true;
  };

  const handleSaveDraft = async () => {
    const payload = getBroadcastPayload();
    if (!payload.subject && !payload.message) {
      setBroadcastStatus("Add a subject or message before saving a draft.");
      return;
    }
    setSavingBroadcast(true);
    setBroadcastStatus("");
    try {
      await onSaveBroadcastDraft(payload);
      setBroadcastStatus("Draft saved.");
    } catch (error) {
      setBroadcastStatus(`Draft was not saved: ${error.message}`);
    } finally {
      setSavingBroadcast(false);
    }
  };

  const handleSchedule = async () => {
    const payload = getBroadcastPayload();
    if (!validateBroadcast({ requireSchedule: true })) return;
    setSavingBroadcast(true);
    setBroadcastStatus("");
    try {
      await onScheduleBroadcast(payload);
      setBroadcastStatus("Broadcast scheduled.");
    } catch (error) {
      setBroadcastStatus(`Broadcast was not scheduled: ${error.message}`);
    } finally {
      setSavingBroadcast(false);
    }
  };

  const handleBroadcastSubmit = async (event) => {
    event.preventDefault();
    const subject = broadcastSubject.trim();
    const message = broadcastMessage.trim();
    if (!validateBroadcast()) return;

    if (!window.confirm(`Send this broadcast to ${selectedRecipientCount} selected subscriber${selectedRecipientCount === 1 ? "" : "s"}?`)) return;

    setSendingBroadcast(true);
    setBroadcastStatus("");
    try {
      const result = await onSendBroadcast({
        subject,
        message,
        attachments: broadcastAttachments,
        recipientIds: selectedActiveRecipientIds,
      });
      await onMarkBroadcastSent(editingBroadcastId, result, {
        subject,
        message,
        attachments: broadcastAttachments,
        recipientIds: selectedActiveRecipientIds,
      });
      setBroadcastStatus(`Broadcast sent to ${result.sent} subscriber${result.sent === 1 ? "" : "s"}${result.failed ? `; ${result.failed} failed.` : "."}`);
      if (!result.failed) {
        resetBroadcastComposer();
      }
    } catch (error) {
      setBroadcastStatus(`Broadcast was not sent: ${error.message}`);
    } finally {
      setSendingBroadcast(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="rounded-lg bg-white p-4 shadow-md">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
              <Send className="h-6 w-6 text-amber-600" />
              Broadcast Newsletter Email
            </h2>
            <p className="mt-1 text-sm text-gray-600">Compose, save, schedule, and send messages to newsletter subscribers.</p>
          </div>
          <Badge className="bg-amber-600">{activeCount} active recipients</Badge>
        </div>

        <form onSubmit={handleBroadcastSubmit} className="space-y-4" noValidate>
          {editingBroadcastId && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-amber-200 bg-amber-50 px-4 py-3">
              <p className="text-sm font-semibold text-amber-900">Editing a saved broadcast.</p>
              <Button type="button" variant="outline" size="sm" onClick={resetBroadcastComposer} disabled={sendingBroadcast || savingBroadcast}>
                Start New
              </Button>
            </div>
          )}
          <div>
            <FieldLabel required>Subject</FieldLabel>
            <Input
              value={broadcastSubject}
              onChange={(event) => {
                setBroadcastSubject(event.target.value);
                setBroadcastErrors((errors) => ({ ...errors, subject: "" }));
              }}
              placeholder="Email subject"
              disabled={sendingBroadcast}
              className={broadcastErrors.subject ? "border-red-500 focus-visible:ring-red-500" : ""}
            />
            {broadcastErrors.subject && <p className="mt-1 text-xs font-semibold text-red-600">{broadcastErrors.subject}</p>}
          </div>

          <div>
            <FieldLabel>Schedule Date and Time</FieldLabel>
            <Input
              type="datetime-local"
              value={scheduledAt}
              onChange={(event) => {
                setScheduledAt(event.target.value);
                setBroadcastErrors((errors) => ({ ...errors, scheduledAt: "" }));
              }}
              disabled={sendingBroadcast || savingBroadcast}
              className={broadcastErrors.scheduledAt ? "border-red-500 focus-visible:ring-red-500" : ""}
            />
            <p className="mt-1 text-xs text-gray-500">Save as scheduled when this message should be sent later.</p>
            {broadcastErrors.scheduledAt && <p className="mt-1 text-xs font-semibold text-red-600">{broadcastErrors.scheduledAt}</p>}
          </div>
          <div>
            <FieldLabel required>Message</FieldLabel>
            <Textarea
              value={broadcastMessage}
              onChange={(event) => {
                setBroadcastMessage(event.target.value);
                setBroadcastErrors((errors) => ({ ...errors, message: "" }));
              }}
              placeholder="Write the full message for subscribers..."
              rows={10}
              disabled={sendingBroadcast}
              className={broadcastErrors.message ? "border-red-500 focus-visible:ring-red-500" : ""}
            />
            {broadcastErrors.message && <p className="mt-1 text-xs font-semibold text-red-600">{broadcastErrors.message}</p>}
            <p className="mt-1 text-xs text-gray-500">
              Available placeholders: [subscriber name], [first name], [last name], [subscriber email], [unsubscribe link]
            </p>
          </div>

          <div className={`rounded-md border bg-white p-4 ${broadcastErrors.recipients ? "border-red-500" : ""}`}>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-gray-800">Recipients<span className="ml-1 text-red-600">*</span></p>
                <p className="text-xs text-gray-600">
                  {selectedRecipientCount} of {activeCount} active subscriber{activeCount === 1 ? "" : "s"} selected
                </p>
              </div>
              <label className="inline-flex items-center gap-2 text-sm font-semibold text-gray-800">
                <input
                  type="checkbox"
                  checked={allActiveSelected}
                  onChange={(event) => {
                    handleToggleAllRecipients(event.target.checked);
                    setBroadcastErrors((errors) => ({ ...errors, recipients: "" }));
                  }}
                  disabled={sendingBroadcast || activeRecipientIds.length === 0}
                  className="h-4 w-4 rounded border-gray-300 text-amber-600 focus:ring-amber-600"
                />
                Select all active subscribers
              </label>
            </div>

            <div className="max-h-56 overflow-y-auto rounded-md border">
              {activeSubscribers.length === 0 ? (
                <p className="px-4 py-4 text-center text-sm text-gray-500">No active newsletter subscribers.</p>
              ) : (
                activeSubscribers.map((subscriber) => {
                  const subscriberId = getSubscriberKey(subscriber);
                  const subscriberName = [subscriber.first_name, subscriber.last_name].filter(Boolean).join(" ") || "Name not provided";
                  return (
                    <label key={subscriberId} className="flex cursor-pointer items-center gap-3 border-b px-4 py-3 text-sm last:border-b-0 hover:bg-amber-50">
                      <input
                        type="checkbox"
                        checked={selectedActiveRecipientIds.includes(subscriberId)}
                        onChange={(event) => {
                          handleToggleRecipient(subscriberId, event.target.checked);
                          setBroadcastErrors((errors) => ({ ...errors, recipients: "" }));
                        }}
                        disabled={sendingBroadcast}
                        className="h-4 w-4 rounded border-gray-300 text-amber-600 focus:ring-amber-600"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-semibold text-gray-900">{subscriberName}</span>
                        <span className="block truncate text-xs text-gray-600">{subscriber.email}</span>
                      </span>
                    </label>
                  );
                })
              )}
            </div>
            {broadcastErrors.recipients && <p className="mt-2 text-xs font-semibold text-red-600">{broadcastErrors.recipients}</p>}
          </div>

          <div className="rounded-md border border-dashed border-amber-300 bg-amber-50/50 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-gray-800">Attachments</p>
                <p className="text-xs text-gray-600">Optional. Up to 5 files, 8 MB combined.</p>
              </div>
              <label className="inline-flex cursor-pointer items-center rounded-md border border-amber-300 bg-white px-3 py-2 text-sm font-semibold text-amber-800 shadow-sm hover:bg-amber-100">
                <Paperclip className="mr-2 h-4 w-4" />
                Add Files
                <input type="file" multiple className="hidden" onChange={handleAttachmentChange} disabled={sendingBroadcast} />
              </label>
            </div>

            {broadcastAttachments.length > 0 && (
              <div className="mt-3 space-y-2">
                {broadcastAttachments.map((attachment, index) => (
                  <div key={`${attachment.filename}-${index}`} className="flex items-center justify-between gap-3 rounded-md bg-white px-3 py-2 text-sm">
                    <span className="truncate font-medium text-gray-800">{attachment.filename}</span>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <span>{(attachment.size / 1024).toFixed(1)} KB</span>
                      <Button type="button" variant="ghost" size="icon" onClick={() => handleRemoveAttachment(index)} disabled={sendingBroadcast} title="Remove attachment">
                        <X className="h-4 w-4 text-red-600" />
                      </Button>
                    </div>
                  </div>
                ))}
                <p className="text-xs text-gray-600">Total: {(totalAttachmentSize / 1024).toFixed(1)} KB</p>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" className="bg-amber-600 hover:bg-amber-700" disabled={sendingBroadcast}>
              <Send className="mr-2 h-4 w-4" />
              {sendingBroadcast ? "Sending..." : `Send to ${selectedRecipientCount}`}
            </Button>
            <Button type="button" variant="outline" onClick={handleSaveDraft} disabled={savingBroadcast || sendingBroadcast}>
              <Save className="mr-2 h-4 w-4" />
              {savingBroadcast ? "Saving..." : "Save Draft"}
            </Button>
            <Button type="button" variant="outline" onClick={handleSchedule} disabled={savingBroadcast || sendingBroadcast}>
              {savingBroadcast ? "Scheduling..." : "Schedule"}
            </Button>
            {broadcastStatus && (
              <p className={`text-sm font-semibold ${Object.values(broadcastErrors).some(Boolean) || broadcastStatus.includes("not sent") || broadcastStatus.includes("failed") || broadcastStatus.includes("not scheduled") ? "text-red-700" : "text-green-700"}`}>
                {broadcastStatus}
              </p>
            )}
          </div>
        </form>
      </div>

      <div className="rounded-lg bg-white p-4 shadow-md">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
              <Mail className="h-6 w-6 text-amber-600" />
              Broadcast Drafts and History
            </h2>
            <p className="mt-1 text-sm text-gray-600">Review sent messages, continue drafts, or reuse a previous broadcast.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {["all", "draft", "scheduled", "sent", "partial"].map((status) => (
              <Button
                key={status}
                type="button"
                variant={broadcastFilter === status ? "default" : "outline"}
                size="sm"
                className={broadcastFilter === status ? "bg-amber-600 hover:bg-amber-700" : ""}
                onClick={() => setBroadcastFilter(status)}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </Button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-600">
              <tr>
                <th className="px-4 py-3">Subject</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Recipients</th>
                <th className="px-4 py-3">When</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {visibleBroadcasts.length === 0 ? (
                <tr>
                <td colSpan={5} className="px-4 py-5 text-center text-gray-500">No broadcast messages yet.</td>
                </tr>
              ) : visibleBroadcasts.map((broadcast) => {
                const status = broadcast.status || "draft";
                const when = status === "sent" || status === "partial"
                  ? formatDate(broadcast.sent_at || broadcast.updated_date)
                  : status === "scheduled"
                    ? formatDate(broadcast.scheduled_at)
                    : formatDate(broadcast.updated_date || broadcast.created_date);
                return (
                  <tr key={broadcast.id} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-4">
                      <p className="font-semibold text-gray-900">{broadcast.subject || "Untitled broadcast"}</p>
                      <p className="max-w-md truncate text-xs text-gray-600">{broadcast.message}</p>
                    </td>
                    <td className="px-4 py-4">
                      <Badge className={getBroadcastStatusClass(status)}>{status}</Badge>
                    </td>
                    <td className="px-4 py-4 text-gray-700">
                      {broadcast.recipient_count || broadcast.recipient_ids?.length || broadcast.sent_count || 0}
                    </td>
                    <td className="px-4 py-4 text-xs text-gray-600">{when}</td>
                    <td className="px-4 py-4 text-right">
                      <Button type="button" variant="outline" size="sm" onClick={() => handleLoadBroadcast(broadcast)} disabled={sendingBroadcast || savingBroadcast}>
                        Load/Edit
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-lg bg-white p-4 shadow-md">
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

        <form onSubmit={handleAdd} className="mb-5 grid grid-cols-1 items-end gap-3 md:grid-cols-[1fr_1fr_1.4fr_auto]" noValidate>
          <div>
            <FieldLabel required>First Name</FieldLabel>
            <Input
              type="text"
              value={firstName}
              onChange={(event) => {
                setFirstName(event.target.value);
                setSubscriberErrors((errors) => ({ ...errors, firstName: "" }));
              }}
              placeholder="First name"
              autoComplete="given-name"
              className={subscriberErrors.firstName ? "border-red-500 focus-visible:ring-red-500" : ""}
            />
            {subscriberErrors.firstName && <p className="mt-1 text-xs font-semibold text-red-600">{subscriberErrors.firstName}</p>}
          </div>
          <div>
            <FieldLabel required>Last Name</FieldLabel>
            <Input
              type="text"
              value={lastName}
              onChange={(event) => {
                setLastName(event.target.value);
                setSubscriberErrors((errors) => ({ ...errors, lastName: "" }));
              }}
              placeholder="Last name"
              autoComplete="family-name"
              className={subscriberErrors.lastName ? "border-red-500 focus-visible:ring-red-500" : ""}
            />
            {subscriberErrors.lastName && <p className="mt-1 text-xs font-semibold text-red-600">{subscriberErrors.lastName}</p>}
          </div>
          <div>
            <FieldLabel required>Email Address</FieldLabel>
            <Input
              type="email"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                setSubscriberErrors((errors) => ({ ...errors, email: "" }));
              }}
              placeholder="Add email address"
              autoComplete="email"
              className={subscriberErrors.email ? "border-red-500 focus-visible:ring-red-500" : ""}
            />
            {subscriberErrors.email && <p className="mt-1 text-xs font-semibold text-red-600">{subscriberErrors.email}</p>}
          </div>
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
                <td colSpan={5} className="px-4 py-5 text-center text-gray-500">No newsletter subscribers found.</td>
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

      <div className="rounded-lg bg-white p-4 shadow-md">
        <div className="mb-6">
          <h2 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
            <Mail className="h-6 w-6 text-amber-600" />
            Newsletter Email Messages
          </h2>
          <p className="mt-1 text-sm text-gray-600">Edit the welcome email and the message sent when someone tries to subscribe again.</p>
        </div>
        <div className="mb-5 max-w-md">
          <FieldLabel>Test Email Address</FieldLabel>
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
