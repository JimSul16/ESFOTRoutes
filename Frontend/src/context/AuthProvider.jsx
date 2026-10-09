import { createContext, useState, useEffect } from "react";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [auth, setAuth] = useState({});

  useEffect(() => {
    const token = sessionStorage.getItem("token");
    let user = null;
    try {
      user = JSON.parse(sessionStorage.getItem("user"));
    } catch (error) {
      console.error("Invalid user data in sessionStorage:", error);
    }
    if (token && user) {
      setAuth({ token, user });
    }
  }, []);

  const loginAuth = (token, user) => {
    sessionStorage.setItem("token", token);
    sessionStorage.setItem("user", JSON.stringify(user));
    setAuth({ token, user });
  };

  const logoutAuth = () => {
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("user");
    setAuth({});
  };

  return (
    <AuthContext.Provider value={{ auth, loginAuth, logoutAuth }}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;