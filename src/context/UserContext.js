import React, { createContext, useState, useEffect } from "react";

export const UserContext = createContext();

export function UserProvider({ children }) {
  const [user, setUser] = useState(() => {
    const token = localStorage.getItem("token");
    const email = localStorage.getItem("userEmail");
    return token && email ? { email } : null;
  });

  useEffect(() => {
    if (user) {
      localStorage.setItem("userEmail", user.email);
    } else {
      localStorage.removeItem("userEmail");
      localStorage.removeItem("token");
    }
  }, [user]);

  return (
    <UserContext.Provider value={{ user, setUser }}>
      {children}
    </UserContext.Provider>
  );
}