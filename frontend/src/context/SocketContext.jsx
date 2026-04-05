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
        // only connect if user is logged in
        if (user) {
            const newSocket = io('http://localhost:4000');

            // when connected, join the user's personal room
            newSocket.on('connect', () => {
                newSocket.emit('join_room', user.userId || user.id);

                // if user is a driver, also join the drivers room for ride requests
                if (user.role === 'driver') {
                    newSocket.emit('join_drivers');
                }
            });

            // Global listener for passengers when their ride completes
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
