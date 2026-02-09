import { useState, useEffect, useCallback, useRef } from 'react';
import { db } from '../firebase';
import { ref, onValue, set, push, child, get, onDisconnect } from 'firebase/database';
import { AppState } from '../types';

export const useMultiplayer = (
  currentState: AppState,
  onStateReceived: (state: AppState) => void
) => {
  const [sessionId, setSessionId] = useState<string>('');
  const [isConnected, setIsConnected] = useState(false);
  const [isHost, setIsHost] = useState(false);
  const [userCount, setUserCount] = useState<number>(0);
  
  // Flag to prevent echo loops (Local -> Firebase -> Local -> Firebase)
  const isRemoteUpdate = useRef(false);

  // 1. Create a Session (Host)
  const createSession = useCallback(async () => {
     try {
         // Create a new unique ID
         const newSessionRef = push(child(ref(db), 'sessions'));
         const id = newSessionRef.key;
         
         if (id) {
             // Upload initial state
             // Must sanitize initial state too, or creation fails if Routes have undefined props
             const cleanState = sanitizeForFirebase(currentState);
             await set(newSessionRef, cleanState);
             
             setSessionId(id);
             setIsHost(true);
             setIsConnected(true);
             return id;
         }
     } catch (err) {
         console.error("Firebase Create Error:", err);
         alert("Failed to create session in cloud.");
     }
     return null;
  }, [currentState]);

  // 2. Join a Session (Client)
  const joinSession = useCallback(async (id: string) => {
      try {
          const sessionRef = ref(db, `sessions/${id}`);
          const snapshot = await get(sessionRef);
          
          if (snapshot.exists()) {
             setSessionId(id);
             setIsHost(false);
             setIsConnected(true);
             // Initial load
             const val = snapshot.val();
             if (val && val.pokemon) { // Simple validation
                 isRemoteUpdate.current = true;
                 onStateReceived(val);
             }
          } else {
              alert("Session ID not found.");
          }
      } catch (err) {
           console.error("Firebase Join Error:", err);
           alert("Failed to join session.");
      }
  }, [onStateReceived]);

  // 3. Listen for Updates (Both)
  useEffect(() => {
     if (!sessionId) return;

     const sessionRef = ref(db, `sessions/${sessionId}`);
     const unsubscribe = onValue(sessionRef, (snapshot) => {
         const val = snapshot.val();
         if (val) {
             // We received data from cloud.
             // We must apply it, but ensure we don't trigger a push back to cloud immediately.
             console.log("Cloud Update Received");
             isRemoteUpdate.current = true;
             onStateReceived(val);
             
             // Reset flag after a tick, to allow future local changes to push
             // We use a slightly longer timeout to account for React render cycle
             setTimeout(() => {
                 isRemoteUpdate.current = false;
             }, 100); 
         }
     });

     return () => unsubscribe();
  }, [sessionId, onStateReceived]);

  // 4. Push Updates (Both)
  // Whenever the local AppState changes, we push to Firebase IF it wasn't a remote change.
  // We explicitly call this from App.tsx dispatch.

  // Helper to deep sanitize object for Firebase (replaces undefined with null)
  const sanitizeForFirebase = (obj: any): any => {
    if (obj === undefined) return null;
    if (obj === null) return null;
    if (typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) return obj.map(sanitizeForFirebase);
    
    const newObj: any = {};
    for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
            newObj[key] = sanitizeForFirebase(obj[key]);
        }
    }
    return newObj;
  };

  const syncState = useCallback((newState: AppState) => {
      // Only push if we are in a session AND the latest change wasn't from the cloud
      if (sessionId && !isRemoteUpdate.current) {
          const sessionRef = ref(db, `sessions/${sessionId}`);
          console.log("Pushing Local State to Cloud");
          
          // CRITICAL: Sanitize state to remove any 'undefined' values which crash Firebase
          const cleanState = sanitizeForFirebase(newState);
          
          set(sessionRef, cleanState).catch(err => console.error("Sync Failed:", err));
      }
  }, [sessionId]);

  // 5. Manage User Presence
  useEffect(() => {
    if (!sessionId) return;

    // Detect when we connect to Firebase
    const connectedRef = ref(db, '.info/connected');
    const usersRef = ref(db, `sessions/${sessionId}/activeUsers`);
    
    // Create a generic reference for this user
    const myUserRef = push(usersRef);

    const unsubConnected = onValue(connectedRef, (snap) => {
        if (snap.val() === true) {
            // We are connected, add ourselves to the list
            set(myUserRef, true);
            // If we disconnect (close tab), remove ourselves
            onDisconnect(myUserRef).remove();
        }
    });

    // Listen for count of users
    const unsubUsers = onValue(usersRef, (snap) => {
        if (snap.exists()) {
            setUserCount(Object.keys(snap.val()).length);
        } else {
            setUserCount(0);
        }
    });

    return () => {
        unsubConnected();
        unsubUsers();
        set(myUserRef, null); // Clean up immediately on unmount/leave
    };
  }, [sessionId]);

  const leaveSession = useCallback(() => {
      setSessionId('');
      setIsConnected(false);
      setIsHost(false);
      isRemoteUpdate.current = false;
      setUserCount(0);
  }, []);

  return {
      sessionId,
      isConnected,
      isHost,
      userCount,
      createSession,
      joinSession,
      leaveSession,
      syncState
  };
};
