import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import { PWAInstallPrompt } from "@/components/pwa/PWAInstallPrompt";
import { PWAUpdatePrompt } from "@/components/pwa/PWAUpdatePrompt";
import Login from "./pages/Login";
import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import NovoChamado from "./pages/NovoChamado";
import Historico from "./pages/Historico";
import Usuarios from "./pages/Usuarios";
import Kanban from "./pages/Kanban";
import Configuracoes from "./pages/Configuracoes";
import TicketsExcluidos from "./pages/TicketsExcluidos";
import MeuPerfil from "./pages/MeuPerfil";
import NotFound from "./pages/NotFound";
import ResetPassword from "./pages/ResetPassword";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <PWAInstallPrompt />
      <PWAUpdatePrompt />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/novo-chamado" element={<ProtectedRoute><NovoChamado /></ProtectedRoute>} />
            <Route path="/historico" element={<ProtectedRoute><Historico /></ProtectedRoute>} />
            <Route path="/usuarios" element={<ProtectedRoute allowedRoles={['admin', 'gestor']}><Usuarios /></ProtectedRoute>} />
            <Route path="/kanban" element={<ProtectedRoute allowedRoles={['admin', 'gestor', 'supervisor']}><Kanban /></ProtectedRoute>} />
            <Route path="/import-clientes" element={<Navigate to="/configuracoes?tab=import" replace />} />
            <Route path="/configuracoes" element={<ProtectedRoute allowedRoles={['admin', 'gestor']}><Configuracoes /></ProtectedRoute>} />
            <Route path="/tickets-excluidos" element={<ProtectedRoute allowedRoles={['admin']}><TicketsExcluidos /></ProtectedRoute>} />
            <Route path="/meu-perfil" element={<ProtectedRoute><MeuPerfil /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
