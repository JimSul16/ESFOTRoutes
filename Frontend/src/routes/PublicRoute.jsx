import { useContext } from "react";
import { Navigate, Outlet } from "react-router-dom";
import AuthContext from "../context/AuthProvider";

const PublicRoute = () => {
  const { auth } = useContext(AuthContext);

  return !auth.token ? <Outlet /> : <Navigate to="/dashboard" replace />;
};

export default PublicRoute;
