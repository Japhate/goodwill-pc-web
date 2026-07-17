import { expect, test } from "@playwright/test";
import { isVirtualJoinAvailable, isWeeklyVirtualJoinAvailable } from "../src/lib/virtualEventAccess.js";

const event = {
  date: "2026-07-17",
  time: "18:30",
  end_time: "19:30",
};

test("virtual join access opens exactly 30 minutes before the event", () => {
  expect(isVirtualJoinAvailable(event, new Date(2026, 6, 17, 17, 59, 59))).toBe(false);
  expect(isVirtualJoinAvailable(event, new Date(2026, 6, 17, 18, 0, 0))).toBe(true);
  expect(isVirtualJoinAvailable(event, new Date(2026, 6, 17, 19, 29, 59))).toBe(true);
  expect(isVirtualJoinAvailable(event, new Date(2026, 6, 17, 19, 30, 0))).toBe(false);
});

test("virtual join access follows recurring event occurrences", () => {
  const weeklyEvent = { ...event, date: "2026-07-10", frequency: "Weekly" };
  expect(isVirtualJoinAvailable(weeklyEvent, new Date(2026, 6, 17, 18, 0, 0))).toBe(true);
});

test("weekly gathering access uses the same 30-minute boundary", () => {
  const gathering = { day: "Wednesday", time: "6:30 PM", endTime: "7:00 PM" };
  expect(isWeeklyVirtualJoinAvailable(gathering, new Date(2026, 6, 15, 17, 59, 59))).toBe(false);
  expect(isWeeklyVirtualJoinAvailable(gathering, new Date(2026, 6, 15, 18, 0, 0))).toBe(true);
  expect(isWeeklyVirtualJoinAvailable(gathering, new Date(2026, 6, 15, 19, 0, 0))).toBe(false);
});
