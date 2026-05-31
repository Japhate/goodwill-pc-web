export const NEWSLETTER_TEMPLATE_IDS = {
  welcome: "welcome",
  duplicate: "duplicate",
};

export const DEFAULT_EMAIL_TEMPLATES = [
  {
    id: NEWSLETTER_TEMPLATE_IDS.welcome,
    name: "Welcome Email",
    subject: "Welcome to Goodwill Presbyterian Church",
    heading: "Welcome to Goodwill Presbyterian Church",
    body: `Grace and peace to you.

Thank you for subscribing to updates from Goodwill Presbyterian Church. We are grateful to stay connected with you as we share worship opportunities, church news, ministry updates, and moments of encouragement for the journey of faith.

Our prayer is that every message you receive will help you feel welcomed, informed, and reminded that you are part of a community seeking to love God, serve others, and walk together in hope.

May the Lord bless you and keep you, and may God's peace be with you today.

With gratitude,
Goodwill Presbyterian Church`,
    footer: `This message was sent to [subscriber email] because you subscribed to updates from Goodwill Presbyterian Church.

If you no longer wish to receive updates, unsubscribe here:
[unsubscribe link]`,
    support_phone: "80345905432",
    support_email: "nebajaphate@gmail.com",
  },
  {
    id: NEWSLETTER_TEMPLATE_IDS.duplicate,
    name: "Already Subscribed Email",
    subject: "You are already on Goodwill Presbyterian Church's mailing list",
    heading: "You are already subscribed",
    body: `Grace and peace to you.

This email address is already in Goodwill Presbyterian Church's mailing list.

If for some reason you are not receiving notifications, please reach out to us at [support phone] or send an email to [support email].

Thank you for subscribing to updates from Goodwill Presbyterian Church. We are grateful to stay connected with you as we share worship opportunities, church news, ministry updates, and moments of encouragement for the journey of faith.

Our prayer is that every message you receive will help you feel welcomed, informed, and reminded that you are part of a community seeking to love God, serve others, and walk together in hope.

May the Lord bless you and keep you, and may God's peace be with you today.

With gratitude,
Goodwill Presbyterian Church`,
    footer: `This message was sent to [subscriber email] because you attempted to subscribe to updates from Goodwill Presbyterian Church.

If you no longer wish to receive updates, please use the unsubscribe link in any Goodwill newsletter notification or contact us at [support email].`,
    support_phone: "80345905432",
    support_email: "nebajaphate@gmail.com",
  },
];

export function getDefaultEmailTemplate(templateId) {
  return DEFAULT_EMAIL_TEMPLATES.find((template) => template.id === templateId) || null;
}

export function mergeEmailTemplate(template = {}, templateId) {
  const defaults = getDefaultEmailTemplate(templateId || template.id) || {};
  return {
    ...defaults,
    ...template,
    id: template.id || defaults.id || templateId,
  };
}

export function renderNewsletterTemplateText(value = "", variables = {}) {
  const subscriberName = [variables.firstName, variables.lastName].filter(Boolean).join(" ");
  return String(value || "")
    .replaceAll("[subscriber email]", variables.email || "")
    .replaceAll("[first name]", variables.firstName || "")
    .replaceAll("[last name]", variables.lastName || "")
    .replaceAll("[subscriber name]", subscriberName || variables.email || "")
    .replaceAll("[unsubscribe link]", variables.unsubscribeUrl || "")
    .replaceAll("[support phone]", variables.supportPhone || "")
    .replaceAll("[support email]", variables.supportEmail || "");
}
