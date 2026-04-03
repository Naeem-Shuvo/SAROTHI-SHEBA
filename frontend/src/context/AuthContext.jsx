import { createContext, useContext, useState } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(() => {
        const saved = localStorage.getItem('user');
        //getItem string return kore. JSON.parse string ke object e convert kore
        //eta jate page refresh korleo user login thake
        return saved ? JSON.parse(saved) : null;
    });

    const [token, setToken] = useState(() => {
        return localStorage.getItem('token');
    });

    const login = (newToken, newUser) => {
        localStorage.setItem('token', newToken);
        //localstorage shudhu str store korte pare. tai stringify kora lagbe json ke
        //eta localstorage e value set korar code
        localStorage.setItem('user', JSON.stringify(newUser));
        //eta state update korar code
        setToken(newToken);
        setUser(newUser);
    };

    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setToken(null);
        setUser(null);
    };

    const isAuthenticated = !!token;

    return (
        //eta diye jake wrap kora hobe shei shob component er moddhe user, token, login, logout, isAuthenticated access pabe
        <AuthContext.Provider value={{ user, token, login, logout, isAuthenticated }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    return useContext(AuthContext);
}
