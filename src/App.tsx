import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { useEffect } from 'react';
import { Navbar, BottomNav, Footer } from './components/Navigation';
import { ThemeProvider } from './context/ThemeContext';
import { ConfigProvider } from './context/ConfigContext';
import { BackgroundSyncProvider } from './context/BackgroundSyncContext';
import { BackgroundSyncWidget } from './components/BackgroundSyncWidget';
import Home from './screens/Home';
import DrugProfile from './screens/DrugProfile';
import InteractionChecker from './screens/InteractionChecker';
import History from './screens/History';
import Settings from './screens/Settings';
import { clearHistory } from './services/historyService';

export default function App() {
  useEffect(() => {
    if (!localStorage.getItem('cache_cleared')) {
      clearHistory();
      localStorage.setItem('cache_cleared', 'true');
    }
  }, []);

  return (
    <ThemeProvider>
      <ConfigProvider>
        <BackgroundSyncProvider>
          <Router>
            <div className="min-h-screen flex flex-col bg-surface transition-colors duration-300">
              <Navbar />
              <main className="flex-grow max-w-7xl mx-auto w-full px-6 py-8">
                <Routes>
                  <Route path="/" element={<Home />} />
                  <Route path="/drug/:id" element={<DrugProfile />} />
                  <Route path="/interactions" element={<InteractionChecker />} />
                  <Route path="/history" element={<History />} />
                  <Route path="/settings" element={<Settings />} />
                </Routes>
              </main>
              <Footer />
              <BottomNav />
              <BackgroundSyncWidget />
            </div>
          </Router>
        </BackgroundSyncProvider>
      </ConfigProvider>
    </ThemeProvider>
  );
}
