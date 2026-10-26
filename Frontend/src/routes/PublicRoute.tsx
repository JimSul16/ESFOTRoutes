import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

const PublicRoute = () => {
  const { auth } = useAuth();

  return !auth.token ? <Outlet /> : <Navigate to="/dashboard" replace />;
};

export default PublicRoute;
