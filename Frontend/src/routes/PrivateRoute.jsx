import { useContext } from "react";
import { Navigate, Outlet } from "react-router-dom";
import AuthContext from "../context/AuthProvider";

const PrivateRoute = ({ allowedRoles }) => {
  const { auth } = useContext(AuthContext);

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

