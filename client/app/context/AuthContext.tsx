import { createContext, useContext, useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

type User = {
  id: string;
  name: string;
  email: string;
  avatar: string;
};

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<boolean>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  signIn: async () => false,
  signOut: async () => {},
});

const MOCK_USERS: Record<string, { password: string; user: User }> = {
  "ok@ok.com": {
    password: "password",
    user: {
      id: "u1",
      name: "Alice Johnson",
      email: "ok@ok.com",
      avatar: "AJ",
    },
  },
  "bob@test.com": {
    password: "password",
    user: {
      id: "u2",
      name: "Bob Smith",
      email: "bob@test.com",
      avatar: "BS",
    },
  },
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem("user").then((stored) => {
      if (stored) setUser(JSON.parse(stored));
      setIsLoading(false);
    });
  }, []);

  const signIn = async (email: string, password: string) => {
    const entry = MOCK_USERS[email.toLowerCase()];
    if (entry && entry.password === password) {
      setUser(entry.user);
      await AsyncStorage.setItem("user", JSON.stringify(entry.user));
      return true;
    }
    return false;
  };

  const signOut = async () => {
    setUser(null);
    await AsyncStorage.removeItem("user");
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
