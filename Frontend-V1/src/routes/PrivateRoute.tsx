import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

export interface PrivateRouteProps {
  /**
   * Roles autorizados. Si el usuario no tiene ninguno, se le envía a su panel
   * correspondiente (`/admin` si es ADMIN, `/dashboard` si no).
   */
  allowedRoles?: readonly string[];
}

const PrivateRoute = ({ allowedRoles }: PrivateRouteProps) => {
  const { auth } = useAuth();

  if (!auth?.token || !auth?.user || !auth?.user?.roles || auth.user.roles.length === 0) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles) {
    const hasRole = auth.user.roles.some(role => allowedRoles.includes(role));
    
    if (!hasRole) {
      if (auth.user.roles.includes("ADMIN")) {
        return <Navigate to="/admin" replace />;
      }
      return <Navigate to="/dashboard" replace />;
    }
  }

  return <Outlet />;
};

export default PrivateRoute;

