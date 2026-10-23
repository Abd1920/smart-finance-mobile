import api from "@/services/api";
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import * as SecureStore from "expo-secure-store";
import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";

type User = {
  _id: string;
  fullName: string;
  email: string;
  currency: string;
  avatar?: string;
  createdAt?: string;
} | null;

type AuthContextType = {
  user: User;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  verifyEmail: (email: string, otp: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
};

GoogleSignin.configure({
  webClientId:
    "168647610837-tn3uh459d0s8586tqjbrbvf7lgumo3pc.apps.googleusercontent.com",
});

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User>(null);
  const [loading, setLoading] = useState(true);

  // On app start, check if a token is already stored and still valid
  useEffect(() => {
    (async () => {
      const token = await SecureStore.getItemAsync("token");
      if (token) {
        try {
          const res = await api.get("/auth/profile");
          setUser(res.data.user);
        } catch {
          await SecureStore.deleteItemAsync("token");
        }
      }
      setLoading(false);
    })();
  }, []);

  const login = async (email: string, password: string) => {
    const res = await api.post("/auth/login", { email, password });
    await SecureStore.setItemAsync("token", res.data.token);
    setUser(res.data.user);
  };

  const loginWithGoogle = async () => {
    await GoogleSignin.hasPlayServices();
    const result: any = await GoogleSignin.signIn();
    const idToken = result?.data?.idToken ?? result?.idToken;
    if (!idToken) {
      throw new Error("Google sign-in did not return a token.");
    }
    const res = await api.post("/auth/google", { credential: idToken });
    await SecureStore.setItemAsync("token", res.data.token);
    setUser(res.data.user);
  };

  const verifyEmail = async (email: string, otp: string) => {
    const res = await api.post("/auth/verify-email", { email, otp });
    await SecureStore.setItemAsync("token", res.data.token);
    setUser(res.data.user);
  };

  const logout = async () => {
    await SecureStore.deleteItemAsync("token");
    setUser(null);
  };

  const refreshUser = async () => {
    const res = await api.get("/auth/profile");
    setUser(res.data.user);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        refreshUser,
        loginWithGoogle,
        verifyEmail,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
