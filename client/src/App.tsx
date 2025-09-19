import { Routes, Route } from "react-router-dom";
import Layout from "./components/common/Layout";
import { TradingDashboard } from "./pages/TradingDashboard";
import { CryptoAnalysis } from "./pages/CryptoAnalysis";
import { EnhancedCryptoAnalysis } from "./pages/EnhancedCryptoAnalysis";
import { LiveCryptoAnalysis } from "./pages/LiveCryptoAnalysis";
import { ComparisonDashboard } from "./pages/ComparisonDashboard";
import { ElliottWaveAnalysis } from "./pages/ElliottWaveAnalysis";
import { PreferencesProvider } from "./contexts/PreferencesContext";
import "./App.css";

function App() {
  return (
    <PreferencesProvider userId="guest">
      <Layout>
        <Routes>
          <Route path="/" element={<TradingDashboard />} />
          <Route path="/live" element={<LiveCryptoAnalysis />} />
          <Route path="/enhanced" element={<EnhancedCryptoAnalysis />} />
          <Route path="/elliott-wave" element={<ElliottWaveAnalysis />} />
          <Route path="/comparison" element={<ComparisonDashboard />} />
          <Route path="/basic" element={<CryptoAnalysis />} />
        </Routes>
      </Layout>
    </PreferencesProvider>
  );
}

export default App;
