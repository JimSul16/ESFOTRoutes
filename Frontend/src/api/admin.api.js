const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000/api";

export const getUsers = async (token) => {
  const response = await fetch(`${API_URL}/admin/users`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
  if (!response.ok) throw new Error("Error al obtener usuarios");
  return response.json();
};

export const createUser = async (userData, token) => {
  const response = await fetch(`${API_URL}/admin/users`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(userData)
  });
  if (!response.ok) throw new Error("Error al crear usuario");
  return response.json();
};

export const updateUser = async (id, userData, token) => {
  const response = await fetch(`${API_URL}/admin/users/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(userData)
  });
  if (!response.ok) throw new Error("Error al actualizar usuario");
  return response.json();
};

export const toggleUserStatus = async (id, token) => {
  const response = await fetch(`${API_URL}/admin/users/${id}/status`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
  if (!response.ok) throw new Error("Error al cambiar estado");
  return response.json();
};

export const unlockUser = async (id, token) => {
  const response = await fetch(`${API_URL}/admin/unlock/${id}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
  if (!response.ok) throw new Error("Error al desbloquear usuario");
  return response.json();
};