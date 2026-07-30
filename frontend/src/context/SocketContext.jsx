import { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import toast from 'react-hot-toast';

const SocketContext = createContext(null);

// custom hook to use socket anywhere in the app
export const useSocket = () => useContext(SocketContext);

export function SocketProvider({ children }) {
    const [socket, setSocket] = useState(null);
    const { user, token } = useAuth();

    useEffect(() => {
        // user logged in thaklei shudhu connect hobe
        if (user && token) {
            // Backend now requires a verified JWT in the handshake (Phase 5,
            // fixes P1-2 — previously any client could join any room just by
            // emitting join_room with someone else's id). Rooms are derived
            // server-side from this token; there's no join_room/join_drivers
            // handler to emit to anymore, so those calls are gone too.
            const newSocket = io('http://localhost:4000', {
                auth: { token }
            });

            newSocket.on('connect', () => {
                // Room membership already happened server-side on connect.
            });

            // passenger der jonno global listener jekhon ride complete hobe
            if (user.role !== 'driver') {
                newSocket.on('ride_status_update', (data) => {
                    if (data && data.ride_status === 'completed') {
                        toast((t) => (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <span style={{ fontWeight: 600 }}>🚕 Your ride has completed!</span>
                                <span style={{ fontSize: '0.85rem' }}>Please pay the driver.</span>
                                <button
                                    onClick={() => { toast.dismiss(t.id); window.location.href = '/active-ride'; }}
                                    style={{ padding: '6px 12px', background: 'var(--accent-primary)', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', marginTop: '4px' }}
                                >
                                    View & Pay
                                </button>
                            </div>
                        ), { duration: 10000 });
                    }
                });
            }

            setSocket(newSocket);

            // cleanup: close socket when user logs out or component unmounts
            return () => newSocket.close();
        }
    }, [user]);

    return (
        <SocketContext.Provider value={{ socket }}>
            {children}
        </SocketContext.Provider>
    );
}
