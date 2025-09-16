import React from "react";

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

interface DateRangeSelectorProps {
  selectedRange: string;
  onChange: (range: string, days: number) => void;
  disabled?: boolean;
}

const DateRangeSelector: React.FC<DateRangeSelectorProps> = ({
  selectedRange,
  onChange,
  disabled = false,
}) => {
  return (
    <div className="flex flex-wrap gap-2">
      <span className="text-sm font-medium text-gray-600 mr-2 flex items-center">
        Date Range:
      </span>
      {DATE_RANGE_PRESETS.map((preset) => (
        <button
          key={preset.value}
          onClick={() => onChange(preset.value, preset.days)}
          disabled={disabled}
          className={`px-3 py-1 text-sm rounded-md border transition-colors ${
            selectedRange === preset.value
              ? "bg-blue-600 text-white border-blue-600"
              : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
          } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
        >
          {preset.label}
        </button>
      ))}
    </div>
  );
};

export default DateRangeSelector;