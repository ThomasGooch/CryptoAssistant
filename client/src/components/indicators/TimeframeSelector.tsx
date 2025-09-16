import React from "react";
import { Timeframe } from "../../types/domain";
import { multiTimeframeService } from "../../services/multiTimeframeService";

interface TimeframeSelectorProps {
  selectedTimeframes: Timeframe[];
  onChange: (timeframes: Timeframe[]) => void;
  disabled?: boolean;
}

/**
 * Component for selecting multiple timeframes for analysis
 */
const TimeframeSelector: React.FC<TimeframeSelectorProps> = ({
  selectedTimeframes,
  onChange,
  disabled = false,
}) => {
  const availableTimeframes = [
    Timeframe.FiveMinutes,
    Timeframe.FifteenMinutes,
    Timeframe.Hour,
    Timeframe.FourHours,
    Timeframe.Day,
    Timeframe.Week,
  ];

  const handleTimeframeToggle = (timeframe: Timeframe) => {
    if (disabled) return;

    const isSelected = selectedTimeframes.includes(timeframe);

    if (isSelected) {
      // Remove timeframe (but ensure at least one remains)
      if (selectedTimeframes.length > 1) {
        onChange(selectedTimeframes.filter((tf) => tf !== timeframe));
      }
    } else {
      // Add timeframe
      onChange([...selectedTimeframes, timeframe]);
    }
  };

  const handlePresetSelection = (preset: Timeframe[]) => {
    if (disabled) return;
    onChange(preset);
  };

  // Preset configurations
  const presets = [
    {
      name: "Short-term",
      timeframes: [
        Timeframe.FiveMinutes,
        Timeframe.FifteenMinutes,
        Timeframe.Hour,
      ],
    },
    {
      name: "Medium-term",
      timeframes: [Timeframe.Hour, Timeframe.FourHours, Timeframe.Day],
    },
    {
      name: "Long-term",
      timeframes: [Timeframe.Day, Timeframe.Week],
    },
    {
      name: "Full Spectrum",
      timeframes: [
        Timeframe.FiveMinutes,
        Timeframe.Hour,
        Timeframe.Day,
        Timeframe.Week,
      ],
    },
  ];

  return (
    <div className="space-y-4">
      {/* Preset Buttons */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Quick Select
        </label>
        <div className="flex flex-wrap gap-2">
          {presets.map((preset) => (
            <button
              key={preset.name}
              onClick={() => handlePresetSelection(preset.timeframes)}
              disabled={disabled}
              className={`px-3 py-1 text-sm rounded-full border transition-colors ${
                disabled
                  ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed"
                  : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50 hover:border-gray-400"
              }`}
            >
              {preset.name}
            </button>
          ))}
        </div>
      </div>

      {/* Individual Timeframe Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Select Timeframes ({selectedTimeframes.length} selected)
        </label>
        <div className="flex flex-wrap gap-2">
          {availableTimeframes.map((timeframe) => {
            const isSelected = selectedTimeframes.includes(timeframe);
            const displayName =
              multiTimeframeService.getTimeframeDisplayName(timeframe);

            return (
              <button
                key={timeframe}
                onClick={() => handleTimeframeToggle(timeframe)}
                disabled={
                  disabled || (isSelected && selectedTimeframes.length === 1)
                }
                className={`px-4 py-2 text-sm font-medium rounded-lg border-2 transition-all ${
                  isSelected
                    ? "bg-blue-600 text-white border-blue-600 hover:bg-blue-700"
                    : disabled
                      ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed"
                      : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50 hover:border-blue-300"
                }`}
              >
                {displayName}
              </button>
            );
          })}
        </div>

        {selectedTimeframes.length === 1 && (
          <p className="text-xs text-gray-500 mt-1">
            At least one timeframe must be selected
          </p>
        )}
      </div>

      {/* Selection Summary */}
      <div className="text-sm text-gray-600">
        <span className="font-medium">Selected:</span>{" "}
        {selectedTimeframes
          .map((tf) => multiTimeframeService.getTimeframeDisplayName(tf))
          .join(", ")}
      </div>
    </div>
  );
};

export default TimeframeSelector;
