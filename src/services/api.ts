import axios from "axios";
import * as SecureStore from "expo-secure-store";

const API_BASE_URL = "https://smart-finance-tracker-api-sxy3.onrender.com/api";

const api = axios.create({
  baseURL: API_BASE_URL,
});

// Attach the stored JWT to every request automatically
api.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
