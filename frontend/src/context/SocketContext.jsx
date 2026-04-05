import { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import toast from 'react-hot-toast';

const SocketContext = createContext(null);

// custom hook to use socket anywhere in the app
export const useSocket = () => useContext(SocketContext);

export function SocketProvider({ children }) {
    const [socket, setSocket] = useState(null);
    const { user } = useAuth();

    useEffect(() => {
        // user logged in thaklei shudhu connect hobe . 
        if (user) {
            const newSocket = io('http://localhost:4000');

            // connected hole user er personal room e join korbe
            newSocket.on('connect', () => {
                newSocket.emit('join_room', user.userId || user.id);

                // user driver hole ride request er jonno drivers room e join korbe
                if (user.role === 'driver') {
                    newSocket.emit('join_drivers');
                }
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
