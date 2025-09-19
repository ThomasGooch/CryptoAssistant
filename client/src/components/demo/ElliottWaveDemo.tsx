import { useState } from "react";
import { CandlestickChart } from "../crypto/CandlestickChart";
import { Timeframe } from "../../types/domain";

export const ElliottWaveDemo: React.FC = () => {
  const [showElliottWaves, setShowElliottWaves] = useState(true);
  const [showWaveLabels, setShowWaveLabels] = useState(true);
  const [showFibonacci, setShowFibonacci] = useState(true);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-4">Elliott Wave Pattern Recognition Demo</h1>
        
        {/* Controls */}
        <div className="flex gap-4 mb-4">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={showElliottWaves}
              onChange={(e) => setShowElliottWaves(e.target.checked)}
              className="rounded"
            />
            <span className="text-sm">Show Elliott Waves</span>
          </label>
          
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={showWaveLabels}
              onChange={(e) => setShowWaveLabels(e.target.checked)}
              disabled={!showElliottWaves}
              className="rounded"
            />
            <span className="text-sm">Show Wave Labels</span>
          </label>
          
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={showFibonacci}
              onChange={(e) => setShowFibonacci(e.target.checked)}
              disabled={!showElliottWaves}
              className="rounded"
            />
            <span className="text-sm">Show Fibonacci Levels</span>
          </label>
        </div>

        <div className="bg-gray-100 p-4 rounded-lg mb-6">
          <h3 className="font-semibold mb-2">Elliott Wave Theory</h3>
          <p className="text-sm text-gray-600">
            Elliott Wave analysis identifies market patterns based on crowd psychology. 
            The theory suggests that markets move in predictable wave patterns:
          </p>
          <ul className="text-sm text-gray-600 mt-2 ml-4 list-disc">
            <li><strong className="text-green-600">Impulse Waves (1-2-3-4-5):</strong> Main trend direction with 5 waves</li>
            <li><strong className="text-amber-600">Corrective Waves (A-B-C):</strong> Counter-trend corrections with 3 waves</li>
            <li><strong className="text-blue-600">Fibonacci Levels:</strong> Key retracement and extension levels</li>
          </ul>
        </div>
      </div>

      {/* Chart */}
      <div className="bg-white rounded-lg shadow-lg p-4">
        <CandlestickChart
          symbol="BTC-USD"
          timeframe={Timeframe.Hour}
          showVolume={false}
          interactive={true}
          showElliottWaves={showElliottWaves}
          showWaveLabels={showWaveLabels}
          showFibonacci={showFibonacci}
        />
      </div>

      {/* Instructions */}
      <div className="mt-6 bg-blue-50 p-4 rounded-lg">
        <h3 className="font-semibold text-blue-800 mb-2">How to Use</h3>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• Enable "Show Elliott Waves" to see pattern recognition</li>
          <li>• Wave labels (1,2,3,4,5 for impulse; A,B,C for corrective) appear at wave peaks</li>
          <li>• Fibonacci retracement levels show key support/resistance areas</li>
          <li>• Hover over the chart to see pattern confidence scores</li>
          <li>• Patterns are automatically detected from real market data</li>
        </ul>
      </div>
    </div>
  );
};