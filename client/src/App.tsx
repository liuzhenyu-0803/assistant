import { useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ToastContainer } from './components/common/Toast';
import { ConfirmDialogContainer } from './components/common/ConfirmDialog';
import { Header } from './components/layout/Header';
import { Sidebar } from './components/layout/Sidebar';
import { ChatPage } from './pages/ChatPage';
import { SettingsPage } from './pages/SettingsPage';
import styles from './App.module.css';

function MainLayout() {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  return (
    <div className={styles.layout}>
      <Header onOpenSettings={() => setIsSettingsOpen(true)} />
      <div className={styles.body}>
        <Sidebar />
        <main className={styles.main}>
          <Routes>
            <Route path="/" element={<ChatPage />} />
            <Route path="/chat/:id" element={<ChatPage />} />
          </Routes>
        </main>
      </div>
      {isSettingsOpen && <SettingsPage onClose={() => setIsSettingsOpen(false)} />}
    </div>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/*" element={<MainLayout />} />
      </Routes>
      <ToastContainer />
      <ConfirmDialogContainer />
    </BrowserRouter>
  );
}
