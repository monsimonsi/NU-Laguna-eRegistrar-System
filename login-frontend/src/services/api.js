const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || "http://localhost:5000";

const parseJsonResponse = async (response) => {
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message = data.message || "Request failed";
    throw new Error(message);
  }

  return data;
};

const postJson = async (path, body, token) => {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: JSON.stringify(body)
  });

  return parseJsonResponse(response);
};

export const login = (payload) => postJson("/api/auth/login", payload);

export const registerAlumni = (payload) => postJson("/api/alumni/register", payload);

export const apiConfig = {
  API_BASE_URL
};
