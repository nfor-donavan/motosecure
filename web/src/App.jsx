import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "./context/ThemeContext";
import { AuthProvider } from "./context/AuthContext";
import AppLayout from "./components/AppLayout";

import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Dashboard from "./pages/Dashboard";
import Syndicates from "./pages/Syndicates";
import Riders from "./pages/Riders";
import Bikes from "./pages/Bikes";
import Enforcement from "./pages/Enforcement";
import AuditLog from "./pages/AuditLog";

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />

            <Route path="/app" element={<AppLayout />}>
              <Route index element={<Dashboard />} />
              <Route path="syndicates" element={<Syndicates />} />
              <Route path="riders" element={<Riders />} />
              <Route path="bikes" element={<Bikes />} />
              <Route path="enforcement" element={<Enforcement />} />
              <Route path="audit-log" element={<AuditLog />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}
