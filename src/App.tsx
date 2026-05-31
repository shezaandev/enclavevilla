import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DataProvider } from './context/DataContext';
import { ConfirmProvider } from './context/ConfirmContext';
import Home from './pages/Home';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';
import WelcomeBook from './pages/WelcomeBook';
import { Loader2 } from 'lucide-react';

function ProtectedAdminRoute({ children }: { children: React.ReactNode }) {
  const { user, loading, isAdmin } = useAuth();

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-brand-ivory text-brand-forest">
        <Loader2 className="w-10 h-10 animate-spin text-brand-gold" />
      </div>
    );
  }

  if (!user || !isAdmin) {
    return <Navigate to="/admin/login" replace />;
  }

  return <>{children}</>;
}

export default function App() {
  return (
    <AuthProvider>
      <DataProvider>
        <ConfirmProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/admin/login" element={<AdminLogin />} />
              <Route path="/welcome/:accessKey" element={<WelcomeBook />} />
              <Route 
                path="/admin/*" 
                element={
                  <ProtectedAdminRoute>
                    <AdminDashboard />
                  </ProtectedAdminRoute>
                } 
              />
            </Routes>
          </BrowserRouter>
        </ConfirmProvider>
      </DataProvider>
    </AuthProvider>
  );
}
