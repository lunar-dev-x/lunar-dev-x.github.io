import { useState, useEffect, useRef, useCallback } from 'react';
import Peer, { DataConnection } from 'peerjs';
import { AppState } from '../types';

type SyncMode = 'offline' | 'host' | 'client';

export const useMultiplayer = (
  currentState: AppState,
  onStateReceived: (state: AppState) => void,
  onActionReceived: (action: { type: string; payload: any }) => void
) => {
  const [peerId, setPeerId] = useState<string>('');
  const [mode, setMode] = useState<SyncMode>('offline');
  const [connections, setConnections] = useState<DataConnection[]>([]);
  const peerRef = useRef<Peer | null>(null);
  const connRef = useRef<DataConnection | null>(null); // For client

  const stateRef = useRef(currentState);
  useEffect(() => { stateRef.current = currentState; }, [currentState]);

  const initializePeer = useCallback(() => {
    if (peerRef.current) return peerRef.current;

    const peer = new Peer();
    peer.on('open', (id) => {
        setPeerId(id);
    });

    peer.on('connection', (conn) => {
        // Only Host receives connections
        console.log('Incoming connection from', conn.peer);
        
        conn.on('open', () => {
             console.log('Peer connected (Host side):', conn.peer);
             setConnections(prev => [...prev, conn]);
             // Send initial state using Ref to avoid stale closure
             conn.send({ type: 'SYNC_STATE', payload: stateRef.current });
        });

        conn.on('data', (data: any) => {
            if (data.type === 'ACTION') {
                onActionReceived(data.payload);
            }
        });

        conn.on('close', () => {
            setConnections(prev => prev.filter(c => c.peer !== conn.peer));
        });
    });
    
    peerRef.current = peer;
    return peer;
  }, [onActionReceived]);

  const startHosting = useCallback(() => {
      setMode('host');
      initializePeer();
  }, [initializePeer]);

  const joinSession = useCallback((hostId: string) => {
      setMode('client');
      const peer = new Peer(); // Client also needs a peer ID to connect
      peerRef.current = peer;
      
      peer.on('open', () => {
          const conn = peer.connect(hostId);
          conn.on('open', () => {
              console.log('Connected to host');
              connRef.current = conn;
              setPeerId(peer.id);
          });
          conn.on('data', (data: any) => {
              if (data.type === 'SYNC_STATE') {
                  onStateReceived(data.payload);
              }
          });
          conn.on('close', () => {
              alert('Disconnected from host');
              setMode('offline');
              setConnections([]);
          });
      });

      peer.on('error', (err) => {
          console.error(err);
          alert('Connection error: ' + err.type);
      });
  }, [onStateReceived]);

  const broadcastState = useCallback((state: AppState) => {
      if (mode === 'host') {
          connections.forEach(conn => {
              if (conn.open) {
                conn.send({ type: 'SYNC_STATE', payload: state });
              }
          });
      }
  }, [mode, connections]);

  const sendAction = useCallback((type: string, payload: any) => {
      if (mode === 'client' && connRef.current && connRef.current.open) {
          connRef.current.send({ type: 'ACTION', payload: { type, payload } });
      } else {
          console.warn('Cannot send action, not connected');
      }
  }, [mode]);
  
  // Broadcast when state changes
  useEffect(() => {
     if (mode === 'host') {
         broadcastState(currentState);
     }
  }, [currentState, mode, broadcastState]);

  return {
    peerId,
    mode,
    connectionCount: connections.length,
    startHosting,
    joinSession,
    sendAction
  };
};
