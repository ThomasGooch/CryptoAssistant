import { Routes, Route } from "react-router-dom";
import Layout from "./components/common/Layout";
import { CryptoAnalysis } from "./pages/CryptoAnalysis";
import { EnhancedCryptoAnalysis } from "./pages/EnhancedCryptoAnalysis";
import { LiveCryptoAnalysis } from "./pages/LiveCryptoAnalysis";
import { ComparisonDashboard } from "./pages/ComparisonDashboard";
import { PreferencesProvider } from "./contexts/PreferencesContext";
import "./App.css";

function App() {
  return (
    <PreferencesProvider userId="guest">
      <Layout>
        <Routes>
          <Route path="/" element={<LiveCryptoAnalysis />} />
          <Route path="/enhanced" element={<EnhancedCryptoAnalysis />} />
          <Route path="/basic" element={<CryptoAnalysis />} />
          <Route path="/comparison" element={<ComparisonDashboard />} />
        </Routes>
      </Layout>
    </PreferencesProvider>
  );
}

export default App;
