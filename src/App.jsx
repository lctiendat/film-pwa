import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { ConfigProvider, theme } from 'antd';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { InstallPrompt } from './components/InstallPrompt';
import { UpdatePrompt } from './components/UpdatePrompt';
import { OfflineBanner } from './components/OfflineBanner';
import { Home } from './pages/Home';
import { Watch } from './pages/Watch';
import { Favorites } from './pages/Favorites';
import { Offline } from './pages/Offline';
import { Search } from './pages/Search';

export function App() {
  return (
    <ConfigProvider
      theme={{
        algorithm: theme.darkAlgorithm,
        token: {
          colorPrimary: '#e11d48', // Crimson/rose primary
          colorBgBase: '#090d16',
          colorBgContainer: '#0f172a',
          colorBorder: 'rgba(255, 255, 255, 0.1)',
          borderRadius: 12,
          fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
        },
        components: {
          Button: {
            borderRadius: 12,
            controlHeight: 40,
          },
          Input: {
            colorBgContainer: '#0f172a',
            borderRadius: 12,
          },
          Select: {
            colorBgContainer: '#0f172a',
            borderRadius: 12,
          },
          Modal: {
            contentBg: '#0f172a',
            headerBg: '#0f172a',
          },
        },
      }}
    >
      <div className="min-h-screen flex flex-col bg-[#090d16] text-slate-100 selection:bg-rose-500 selection:text-white">
        {/* Offline Banner when disconnected */}
        <OfflineBanner />

        {/* Top Navbar */}
        <Navbar />

        {/* PWA Install Banner */}
        <InstallPrompt />

        {/* Main Routed Content */}
        <main className="flex-1">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/search" element={<Search />} />
            <Route path="/watch/:bookId" element={<Watch />} />
            <Route path="/favorites" element={<Favorites />} />
            <Route path="/offline" element={<Offline />} />
            <Route path="*" element={<Home />} />
          </Routes>
        </main>

        {/* PWA New Version Update Prompt */}
        <UpdatePrompt />

        {/* Footer */}
        <Footer />
      </div>
    </ConfigProvider>
  );
}

export default App;
