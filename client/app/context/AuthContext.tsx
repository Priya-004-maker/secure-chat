import { createContext, useContext, useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { auth, tokenStore, type User } from "../lib/api";

const USER_KEY = "auth-user";

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateUser: (next: User) => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  login: async () => {},
  signUp: async () => {},
  signOut: async () => {},
  updateUser: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [storedUser, token] = await Promise.all([
        AsyncStorage.getItem(USER_KEY),
        tokenStore.get(),
      ]);
      if (storedUser && token) {
        setUser(JSON.parse(storedUser) as User);
      }
      setIsLoading(false);
    })();
  }, []);

  const persist = async (nextUser: User, token: string) => {
    await Promise.all([
      tokenStore.set(token),
      AsyncStorage.setItem(USER_KEY, JSON.stringify(nextUser)),
    ]);
    setUser(nextUser);
  };

  const login = async (email: string, password: string) => {
    const { token, user: nextUser } = await auth.login({ email, password });
    await persist(nextUser, token);
  };

  const signUp = async (name: string, email: string, password: string) => {
    const { token, user: nextUser } = await auth.signup({
      name,
      email,
      password,
    });
    await persist(nextUser, token);
  };

  const signOut = async () => {
    await Promise.all([tokenStore.clear(), AsyncStorage.removeItem(USER_KEY)]);
    setUser(null);
  };

  const updateUser = async (next: User) => {
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(next));
    setUser(next);
  };

  return (
    <AuthContext.Provider
      value={{ user, isLoading, login, signUp, signOut, updateUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
