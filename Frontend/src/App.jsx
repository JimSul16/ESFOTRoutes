import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { AuthProvider } from "./context/AuthProvider";
import PublicRoute from "./routes/PublicRoute";
import PrivateRoute from "./routes/PrivateRoute";

// Páginas de Autenticación actualizadas
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import Confirm from "./pages/auth/Confirm";
import Forgot from "./pages/auth/Forgot";
import Reset from "./pages/auth/Reset";

// Páginas Principales
import Landing from "./pages/Landing";
import StudentDashboard from "./pages/StudentDashboard";
import AdminDashboard from "./pages/AdminDashboard";

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastContainer position="top-right" autoClose={3000} />
        <Routes>
          { /* Rutas Públicas de libre acceso */ }
          <Route path="/" element={<Landing />} />
          <Route path="/confirm/:token" element={<Confirm />} />
          
          { /* Rutas para usuarios NO autenticados */ }
          <Route element={<PublicRoute />}>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot" element={<Forgot />} />
            <Route path="/reset-password/:token" element={<Reset />} />
          </Route>

          { /* Rutas Privadas por Rol */ }
          <Route element={<PrivateRoute allowedRoles={['STUDENT']} />}>
            <Route path="/dashboard" element={<StudentDashboard />} />
          </Route>

          <Route element={<PrivateRoute allowedRoles={['ADMIN']} />}>
            <Route path="/admin" element={<AdminDashboard />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App; 
