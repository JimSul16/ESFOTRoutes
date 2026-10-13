import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { AuthProvider } from "./context/AuthProvider";
import PublicRoute from "./routes/PublicRoute";
import PrivateRoute from "./routes/PrivateRoute";
import { Spinner } from "./components/ui";

const Login = lazy(() => import("./pages/auth/Login"));
const Register = lazy(() => import("./pages/auth/Register"));
const Confirm = lazy(() => import("./pages/auth/Confirm"));
const Forgot = lazy(() => import("./pages/auth/Forgot"));
const Reset = lazy(() => import("./pages/auth/Reset"));
const UnlockAccount = lazy(() => import("./pages/auth/UnlockAccount"));
const Landing = lazy(() => import("./pages/Landing"));
const StudentDashboard = lazy(() => import("./pages/StudentDashboard"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Unauthorized = lazy(() => import("./pages/Unauthorized"));

const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-surface-50 dark:bg-surface-900">
    <Spinner size="lg" className="text-primary-600" />
  </div>
);

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastContainer position="top-right" autoClose={3000} />
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/confirm/:token" element={<Confirm />} />
            {/* Enlace del correo de bloqueo. Va fuera de PublicRoute porque el
                usuario llega sin sesión y debe poder recuperar el acceso. */}
            <Route path="/desbloquear-cuenta/:token" element={<UnlockAccount />} />

            <Route element={<PublicRoute />}>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/forgot" element={<Forgot />} />
              <Route path="/reset-password/:token" element={<Reset />} />
            </Route>

            <Route element={<PrivateRoute allowedRoles={['STUDENT']} />}>
              <Route path="/dashboard" element={<StudentDashboard />} />
            </Route>

            <Route element={<PrivateRoute allowedRoles={['ADMIN']} />}>
              <Route path="/admin" element={<AdminDashboard />} />
            </Route>

            <Route path="/unauthorized" element={<Unauthorized />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
