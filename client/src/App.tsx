import Layout from "./components/common/Layout";
import { CryptoAnalysis } from "./pages/CryptoAnalysis";
import { PreferencesProvider } from "./contexts/PreferencesContext";
import "./App.css";

function App() {
  return (
    <PreferencesProvider userId="guest">
      <Layout>
        <CryptoAnalysis />
      </Layout>
    </PreferencesProvider>
  );
}

export default App;
