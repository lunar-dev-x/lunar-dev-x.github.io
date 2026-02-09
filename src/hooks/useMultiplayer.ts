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
  
  // Refs for handlers to avoid stale closures in PeerJS listeners
  const onStateReceivedRef = useRef(onStateReceived);
  const onActionReceivedRef = useRef(onActionReceived);
  
  useEffect(() => { onStateReceivedRef.current = onStateReceived; }, [onStateReceived]);
  useEffect(() => { onActionReceivedRef.current = onActionReceived; }, [onActionReceived]);

  const stateRef = useRef(currentState);
  useEffect(() => { stateRef.current = currentState; }, [currentState]);

  const initializePeer = useCallback(() => {
    if (peerRef.current) return peerRef.current;

    const peer = new Peer({
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
          { urls: 'stun:stun2.l.google.com:19302' },
          { urls: 'stun:stun3.l.google.com:19302' },
          { urls: 'stun:stun4.l.google.com:19302' },
        ],
        iceCandidatePoolSize: 10,
      },
      debug: 1 // Reduces log spam, increase to 3 for debugging
    });

    peer.on('open', (id) => {
        setPeerId(id);
    });

    peer.on('connection', (conn) => {
        console.log('Incoming connection from', conn.peer);
        
        conn.on('open', () => {
             console.log('Peer connected (Host side):', conn.peer);
             setConnections(prev => {
                 if(prev.find(c => c.peer === conn.peer)) return prev;
                 return [...prev, conn];
             });
             // Send initial state using Ref
             conn.send({ type: 'SYNC_STATE', payload: stateRef.current });
        });

        conn.on('data', (data: any) => {
            if (data.type === 'ACTION') {
                onActionReceivedRef.current(data.payload);
            }
        });

        conn.on('close', () => {
            setConnections(prev => prev.filter(c => c.peer !== conn.peer));
        });
        
        conn.on('error', (err) => {
             console.error('Connection level error:', err);
        });
    });
    
    peer.on('error', (err) => {
        console.error('Peer error:', err);
    });

    peerRef.current = peer;
    return peer;
  }, []); // Removed dependencies, using refs

  const startHosting = useCallback(() => {
      setMode('host');
      initializePeer();
  }, [initializePeer]);

  const joinSession = useCallback((hostId: string) => {
      setMode('client');
      // Cleanup old peer if exists? Usually not needed if we are just switching modes
      
      const peer = new Peer({
          config: {
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' },
                { urls: 'stun:stun2.l.google.com:19302' }
            ]
          }
      });
      peerRef.current = peer;
      
      peer.on('open', () => {
          const conn = peer.connect(hostId, { reliable: true });
          
          conn.on('open', () => {
              console.log('Connected to host');
              connRef.current = conn;
              setPeerId(peer.id);
          });
          
          conn.on('data', (data: any) => {
              if (data.type === 'SYNC_STATE') {
                  // Validate payload before applying
                  if (data.payload && data.payload.routes && data.payload.pokemon) {
                     onStateReceivedRef.current(data.payload);
                  }
              }
          });

          conn.on('close', () => {
              alert('Disconnected from host');
              setMode('offline');
              setConnections([]);
          });
          
          conn.on('error', (err) => {
              console.error('Client Connection Error:', err);
          });
      });

      peer.on('error', (err) => {
          console.error(err);
          alert('Connection error: ' + err.type);
      });
  }, []); 

  const broadcastState = useCallback((state: AppState) => {
      if (mode === 'host') {
          connections.forEach(conn => {
              if (conn.open) {
                try {
                    conn.send({ type: 'SYNC_STATE', payload: state });
                } catch (e) {
                    console.error('Failed to broadcast to', conn.peer, e);
                }
              }
          });
      }
  }, [mode, connections]);

  const sendAction = useCallback((type: string, payload: any) => {
      if (mode === 'client' && connRef.current && connRef.current.open) {
          try {
             connRef.current.send({ type: 'ACTION', payload: { type, payload } });
          } catch (e) {
              console.error('Failed to send action', e);
              alert('Failed to send action to host. Connection might be unstable.');
          }
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
