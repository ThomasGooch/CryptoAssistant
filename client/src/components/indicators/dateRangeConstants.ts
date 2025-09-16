export interface DateRangePreset {
  label: string;
  days: number;
  value: string;
}

export const DATE_RANGE_PRESETS: DateRangePreset[] = [
  { label: "7 Days", days: 7, value: "7d" },
  { label: "30 Days", days: 30, value: "30d" },
  { label: "90 Days", days: 90, value: "90d" },
  { label: "Max Range", days: 90, value: "max" },
];
