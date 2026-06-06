import { useEffect, useMemo, useState } from "react";
import { CalendarDays, Check, Clock, X } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const HOURS = Array.from({ length: 12 }, (_, index) => String(index + 1));
const MINUTES = ["00", "15", "30", "45"];
const QUICK_TIMES = ["09:00", "10:00", "12:00", "17:30", "18:00", "19:00"];

function parseLocalDate(value) {
  if (!value) return undefined;
  const [year, month, day] = String(value).split("-").map(Number);
  if (!year || !month || !day) return undefined;
  return new Date(year, month - 1, day);
}

function formatDateValue(date) {
  if (!date) return "";
  return format(date, "yyyy-MM-dd");
}

function formatTimeLabel(value) {
  if (!value) return "";
  const [hourValue, minuteValue] = String(value).split(":").map(Number);
  if (Number.isNaN(hourValue) || Number.isNaN(minuteValue)) return value;
  const period = hourValue >= 12 ? "PM" : "AM";
  const hour = hourValue % 12 || 12;
  return `${hour}:${String(minuteValue).padStart(2, "0")} ${period}`;
}

function parseTimeParts(value) {
  if (!value) {
    return { hour: "", minute: "00", period: "AM" };
  }

  const [hourValue, minuteValue] = String(value).split(":").map(Number);
  if (Number.isNaN(hourValue) || Number.isNaN(minuteValue)) {
    return { hour: "", minute: "00", period: "AM" };
  }

  return {
    hour: String(hourValue % 12 || 12),
    minute: String(minuteValue).padStart(2, "0"),
    period: hourValue >= 12 ? "PM" : "AM",
  };
}

function buildTimeValue({ hour, minute, period }) {
  if (!hour) return "";
  let hourValue = Number(hour);
  if (period === "PM" && hourValue !== 12) hourValue += 12;
  if (period === "AM" && hourValue === 12) hourValue = 0;
  return `${String(hourValue).padStart(2, "0")}:${minute || "00"}`;
}

export default function ConfirmedDateTimePicker({
  id,
  label,
  type = "date",
  value = "",
  onChange,
  placeholder,
}) {
  const [open, setOpen] = useState(false);
  const [draftDate, setDraftDate] = useState(parseLocalDate(value));
  const [draftTime, setDraftTime] = useState(value || "");
  const isDate = type === "date";

  useEffect(() => {
    setDraftDate(parseLocalDate(value));
    setDraftTime(value || "");
  }, [value]);

  const displayValue = useMemo(() => {
    if (!value) return placeholder || (isDate ? "Choose date" : "Choose time");
    if (isDate) {
      const parsedDate = parseLocalDate(value);
      return parsedDate ? format(parsedDate, "MMM d, yyyy") : value;
    }
    return formatTimeLabel(value);
  }, [isDate, placeholder, value]);

  const handleOpenChange = (nextOpen) => {
    if (nextOpen) {
      setDraftDate(parseLocalDate(value));
      setDraftTime(value || "");
    }
    setOpen(nextOpen);
  };

  const handleConfirm = () => {
    onChange?.(isDate ? formatDateValue(draftDate) : draftTime);
    setOpen(false);
  };

  const handleClear = () => {
    onChange?.("");
    setDraftDate(undefined);
    setDraftTime("");
    setOpen(false);
  };

  const handleTimePartChange = (part, nextValue) => {
    const parts = parseTimeParts(draftTime);
    setDraftTime(buildTimeValue({ ...parts, [part]: nextValue }));
  };

  const timeParts = parseTimeParts(draftTime);

  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-xs font-semibold text-gray-700">{label}</label>
      <div className="flex gap-2">
        <Popover open={open} onOpenChange={handleOpenChange}>
          <PopoverTrigger asChild>
            <Button
              id={id}
              type="button"
              variant="outline"
              className={`h-10 min-w-0 flex-1 justify-start gap-2 px-3 text-left font-semibold ${value ? "text-gray-900" : "text-gray-500"}`}
            >
              {isDate ? <CalendarDays className="h-4 w-4 text-amber-700" /> : <Clock className="h-4 w-4 text-amber-700" />}
              <span className="truncate">{displayValue}</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <div className="space-y-3 p-3">
              {isDate ? (
                <Calendar
                  mode="single"
                  selected={draftDate}
                  onSelect={setDraftDate}
                  initialFocus
                />
              ) : (
                <div className="w-72 space-y-3">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{label}</p>
                    <p className="text-xs text-gray-500">Select the time, then click OK.</p>
                  </div>
                  <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-center text-lg font-bold text-amber-900">
                    {draftTime ? formatTimeLabel(draftTime) : "Choose time"}
                  </div>
                  <div className="grid grid-cols-[1fr_1fr_1fr] gap-2">
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-gray-600">Hour</label>
                      <Select value={timeParts.hour || undefined} onValueChange={(nextValue) => handleTimePartChange("hour", nextValue)}>
                        <SelectTrigger className="h-10 bg-white">
                          <SelectValue placeholder="Hour" />
                        </SelectTrigger>
                        <SelectContent>
                          {HOURS.map((hour) => (
                            <SelectItem key={hour} value={hour}>{hour}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-gray-600">Minute</label>
                      <Select value={timeParts.minute} onValueChange={(nextValue) => handleTimePartChange("minute", nextValue)}>
                        <SelectTrigger className="h-10 bg-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {MINUTES.map((minute) => (
                            <SelectItem key={minute} value={minute}>{minute}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-gray-600">AM/PM</label>
                      <Select value={timeParts.period} onValueChange={(nextValue) => handleTimePartChange("period", nextValue)}>
                        <SelectTrigger className="h-10 bg-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="AM">AM</SelectItem>
                          <SelectItem value="PM">PM</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <p className="mb-2 text-xs font-semibold text-gray-600">Quick times</p>
                    <div className="grid grid-cols-3 gap-2">
                      {QUICK_TIMES.map((time) => (
                        <Button
                          key={time}
                          type="button"
                          variant={draftTime === time ? "default" : "outline"}
                          size="sm"
                          onClick={() => setDraftTime(time)}
                          className={draftTime === time ? "bg-amber-600 hover:bg-amber-700" : "bg-white"}
                        >
                          {formatTimeLabel(time)}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              <div className="flex items-center justify-between gap-2 border-t pt-3">
                <Button type="button" variant="ghost" size="sm" onClick={handleClear} className="gap-1 text-gray-600">
                  <X className="h-4 w-4" /> Clear
                </Button>
                <Button type="button" size="sm" onClick={handleConfirm} className="gap-1 bg-amber-600 hover:bg-amber-700">
                  <Check className="h-4 w-4" /> OK
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}
