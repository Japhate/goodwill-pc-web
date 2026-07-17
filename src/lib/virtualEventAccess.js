export const VIRTUAL_JOIN_LEAD_MINUTES = 30;

function createLocalDateTime(dateValue, timeValue = "00:00") {
  const [year, month, day] = String(dateValue || "").split("-").map(Number);
  if (!year || !month || !day) return null;

  const timeMatch = String(timeValue || "00:00").trim().match(/^(\d{1,2})(?::(\d{1,2}))?\s*(am|pm)?$/i);
  if (!timeMatch) return null;

  let hour = Number(timeMatch[1]);
  const minute = Number(timeMatch[2] || 0);
  const meridiem = String(timeMatch[3] || "").toLowerCase();
  if (meridiem === "am" && hour === 12) hour = 0;
  if (meridiem === "pm" && hour < 12) hour += 12;
  if (hour > 23 || minute > 59) return null;

  const date = new Date(year, month - 1, day, hour, minute, 0);
  return Number.isNaN(date.getTime()) ? null : date;
}

function getRecurringStep(frequency = "") {
  const normalized = String(frequency).toLowerCase();
  if (normalized.includes("daily") || normalized.includes("every day") || normalized.includes("evening")) return "daily";
  if (normalized.includes("weekday")) return "weekday";
  if (normalized.includes("weekly") || normalized.includes("every week")) return "weekly";
  if (normalized.includes("monthly") || normalized.includes("every month")) return "monthly";
  if (normalized.includes("yearly") || normalized.includes("annually") || normalized.includes("annual")) return "yearly";
  return null;
}

function advanceRecurringDate(date, step) {
  const next = new Date(date);
  if (step === "daily") next.setDate(next.getDate() + 1);
  if (step === "weekday") {
    next.setDate(next.getDate() + 1);
    while (next.getDay() === 0 || next.getDay() === 6) next.setDate(next.getDate() + 1);
  }
  if (step === "weekly") next.setDate(next.getDate() + 7);
  if (step === "monthly") next.setMonth(next.getMonth() + 1);
  if (step === "yearly") next.setFullYear(next.getFullYear() + 1);
  return next;
}

export function getVirtualEventWindow(event, now = new Date()) {
  if (!event?.date || !event?.time) return null;

  let start = createLocalDateTime(event.date, event.time);
  if (!start) return null;

  const recurringStep = getRecurringStep(event.frequency);
  const endDateValue = recurringStep ? event.date : (event.end_date || event.date);
  let end = event.end_time
    ? createLocalDateTime(endDateValue, event.end_time)
    : new Date(start.getTime() + 2 * 60 * 60 * 1000);
  if (!end) return null;
  if (end <= start) end = new Date(end.getTime() + 24 * 60 * 60 * 1000);

  if (recurringStep) {
    let guard = 0;
    while (end <= now && guard < 370) {
      start = advanceRecurringDate(start, recurringStep);
      end = advanceRecurringDate(end, recurringStep);
      guard += 1;
    }

    if (event.end_date) {
      const recurringUntil = createLocalDateTime(event.end_date, event.end_time || "23:59");
      if (recurringUntil && start > recurringUntil) return null;
    }
  }

  return { start, end };
}

export function isVirtualJoinAvailable(event, now = new Date(), leadMinutes = VIRTUAL_JOIN_LEAD_MINUTES) {
  const window = getVirtualEventWindow(event, now);
  if (!window) return false;

  const opensAt = new Date(window.start.getTime() - leadMinutes * 60 * 1000);
  return now >= opensAt && now < window.end;
}

export function isWeeklyVirtualJoinAvailable({ day, time, endTime }, now = new Date(), leadMinutes = VIRTUAL_JOIN_LEAD_MINUTES) {
  const weekday = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"]
    .indexOf(String(day || "").trim().toLowerCase());
  if (weekday < 0 || !time) return false;

  const dateValue = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const start = createLocalDateTime(dateValue, time);
  if (!start || now.getDay() !== weekday) return false;

  let end = endTime ? createLocalDateTime(dateValue, endTime) : new Date(start.getTime() + 2 * 60 * 60 * 1000);
  if (!end) return false;
  if (end <= start) end = new Date(end.getTime() + 24 * 60 * 60 * 1000);

  return now >= new Date(start.getTime() - leadMinutes * 60 * 1000) && now < end;
}
