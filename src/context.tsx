import React, { createContext, useReducer, useContext, ReactNode, useEffect, useCallback } from 'react';
import { AppState, AppAction, User, Module, Task, AppDocument, Poll, AppMessage } from './types';
import { MOCK_MODULES, MOCK_TASKS, MOCK_DOCUMENTS } from './mockData';
import { auth, db, signInWithGoogle, signOut } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, onSnapshot, doc, setDoc, getDoc } from 'firebase/firestore';
import { executeFirebaseAction, handleFirestoreError, OperationType } from './db';
import { canExecuteAction } from './permissions';

const initialState: AppState = {
  user: null,
  modules: [],
  tasks: [],
  documents: [],
  messages: [],
  polls: [],
  lastRead: {},
  isDemoMode: false,
  geminiKey: null,
  firebaseConfig: null,
};

function appReducer(state: AppState, action: AppAction | { type: '_DB_SYNC'; payload: Partial<AppState> }): AppState {
  if (action.type === '_DB_SYNC') {
    return { ...state, ...action.payload };
  }
  switch (action.type) {
    case 'SET_USER':
      return { ...state, user: action.payload };
    case 'SET_MODULES':
      return { ...state, modules: action.payload };
    case 'ADD_MODULE':
      return { ...state, modules: [...state.modules, action.payload] };
    case 'DELETE_MODULE':
      return { ...state, modules: state.modules.filter(m => m.id !== action.payload) };
    case 'UPDATE_MODULE':
      return {
        ...state,
        modules: state.modules.map(m => m.id === action.payload.id ? action.payload : m)
      };
    case 'SET_TASKS':
      return { ...state, tasks: action.payload };
    case 'SET_DOCUMENTS':
      return { ...state, documents: action.payload };
    case 'SET_MESSAGES':
      return { ...state, messages: action.payload };
    case 'ADD_MESSAGE':
      return { ...state, messages: [...state.messages, action.payload] };
    case 'MARK_CHANNEL_READ':
      return { 
        ...state, 
        lastRead: { ...state.lastRead, [action.payload.channelId]: action.payload.timestamp } 
      };
    case 'SET_POLLS':
      return { ...state, polls: action.payload };
    case 'ADD_POLL':
      return { ...state, polls: [action.payload, ...state.polls] };
    case 'CLOSE_POLL':
      return {
        ...state,
        polls: state.polls.map(p => p.id === action.payload ? { ...p, status: 'closed' } : p)
      };
    case 'DELETE_POLL':
      return {
        ...state,
        polls: state.polls.filter(p => p.id !== action.payload)
      };
    case 'VOTE_POLL':
      return {
        ...state,
        polls: state.polls.map(poll => {
          if (poll.id !== action.payload.pollId) return poll;
          const newOptions = poll.options.map(opt => {
            const filteredVoters = opt.voterIds.filter(id => id !== action.payload.userId);
            if (opt.id === action.payload.optionId) {
              filteredVoters.push(action.payload.userId);
            }
            return { ...opt, voterIds: filteredVoters };
          });
          return { ...poll, options: newOptions };
        })
      };
    case 'UPDATE_TASK_STATUS':
      return {
        ...state,
        tasks: state.tasks.map(t => t.id === action.payload.taskId ? { ...t, status: action.payload.status } : t)
      };
    case 'ADD_TASK':
      return { ...state, tasks: [...state.tasks, action.payload] };
    case 'UPDATE_TASK':
      return {
        ...state,
        tasks: state.tasks.map(t => t.id === action.payload.id ? action.payload : t)
      };
    case 'DELETE_TASK':
      return {
        ...state,
        tasks: state.tasks.filter(t => t.id !== action.payload)
      };
    case 'ADD_DOCUMENT':
      return { ...state, documents: [...state.documents, action.payload] };
    case 'DELETE_DOCUMENT':
      return { ...state, documents: state.documents.filter(d => d.id !== action.payload) };
    case 'SET_CONFIG':
      return { ...state, ...action.payload };
    default:
      return state;
  }
}

const AppContext = createContext<{ 
  state: AppState; 
  dispatch: React.Dispatch<AppAction>; 
  login: () => Promise<void>; 
  loginWithEmail: (email: string, pass: string) => Promise<void>;
  logout: () => Promise<void> 
} | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, baseDispatch] = useReducer(appReducer, initialState);

  const dispatch = useCallback((action: AppAction) => {
    if (!canExecuteAction(state.user, action)) {
      console.warn(`Action refusée pour le rôle ${state.user?.role || 'ANONYME'}: ${action.type}`);
      return;
    }

    if (state.isDemoMode) {
      baseDispatch(action as any);
    } else {
      if (['SET_CONFIG', 'SET_USER', 'MARK_CHANNEL_READ'].includes(action.type)) {
        baseDispatch(action as any);
      } else {
        baseDispatch(action as any);
        executeFirebaseAction(action).catch(err => console.error("Firebase err", err));
      }
    }
  }, [state.isDemoMode, state.user]);

  const login = async () => {
    try {
      const gUser = await signInWithGoogle();
      let userObj: User;
      try {
        const userRef = doc(db, 'users', gUser.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          userObj = userSnap.data() as User;
        } else {
          userObj = {
            id: gUser.uid,
            name: gUser.displayName || 'Utilisateur',
            email: gUser.email || '',
            role: 'OBSERVATEUR', 
            avatar: gUser.photoURL || undefined
          };
          await setDoc(userRef, userObj);
        }
      } catch (err) {
        console.error("Firestore user fetch error:", err);
        userObj = {
          id: gUser.uid,
          name: gUser.displayName || 'Utilisateur (Hors ligne)',
          email: gUser.email || '',
          role: 'OBSERVATEUR',
          avatar: gUser.photoURL || undefined
        };
      }
      baseDispatch({ type: 'SET_USER', payload: userObj });
    } catch (e) {
      console.error(e);
      throw e;
    }
  };

  const loginWithEmail = async (email: string, pass: string) => {
    try {
      const { signInWithEmail } = await import('./firebase');
      const authUser = await signInWithEmail(email, pass);
      let userObj: User;
      try {
        const userRef = doc(db, 'users', authUser.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          userObj = userSnap.data() as User;
        } else {
          userObj = {
            id: authUser.uid,
            name: authUser.displayName || email.split('@')[0],
            email: authUser.email || '',
            role: 'OBSERVATEUR',
          };
          await setDoc(userRef, userObj);
        }
      } catch (err) {
        console.error("Firestore user fetch error:", err);
        userObj = {
          id: authUser.uid,
          name: authUser.displayName || email.split('@')[0] + ' (Hors ligne)',
          email: authUser.email || '',
          role: 'OBSERVATEUR',
        };
      }
      baseDispatch({ type: 'SET_USER', payload: userObj });
    } catch (e) {
      console.error(e);
      throw e;
    }
  };

  const logout = async () => {
    await signOut();
    baseDispatch({ type: 'SET_USER', payload: null });
  };

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, async (gUser) => {
      if (gUser && !state.isDemoMode) {
        try {
          const userRef = doc(db, 'users', gUser.uid);
          const userSnap = await getDoc(userRef);
          let userObj: User;
          if (userSnap.exists()) {
            userObj = userSnap.data() as User;
          } else {
            userObj = {
              id: gUser.uid,
              name: gUser.displayName || 'Utilisateur',
              email: gUser.email || '',
              role: 'OBSERVATEUR',
              avatar: gUser.photoURL || undefined
            };
            await setDoc(userRef, userObj);
          }
          baseDispatch({ type: 'SET_USER', payload: userObj });
        } catch (error) {
          console.error("Firestore user fetch error:", error);
          // Fallback minimal object so the app doesn't break
          baseDispatch({ 
            type: 'SET_USER', 
            payload: {
              id: gUser.uid,
              name: gUser.displayName || 'Utilisateur (Hors ligne)',
              email: gUser.email || '',
              role: 'OBSERVATEUR',
              avatar: gUser.photoURL || undefined
            }
          });
        }
      } else {
        baseDispatch({ type: 'SET_USER', payload: null });
      }
    });
    return () => unsubAuth();
  }, [state.isDemoMode]);

  useEffect(() => {
    if (state.isDemoMode || !state.user) return;

    let unsubs: Function[] = [];

    const subscribeToCol = (colName: string, stateKey: keyof AppState) => {
      return onSnapshot(collection(db, colName), (snap) => {
        const data = snap.docs.map(d => d.data() as any);
        baseDispatch({ type: '_DB_SYNC', payload: { [stateKey]: data } });
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, colName);
      });
    };

    unsubs.push(subscribeToCol('modules', 'modules'));
    unsubs.push(subscribeToCol('tasks', 'tasks'));
    unsubs.push(subscribeToCol('documents', 'documents'));
    unsubs.push(subscribeToCol('messages', 'messages'));
    unsubs.push(subscribeToCol('polls', 'polls'));

    return () => {
      unsubs.forEach(u => u());
    }
  }, [state.user, state.isDemoMode]);

  useEffect(() => {
    try {
      const savedDemoMode = localStorage.getItem('sdis_isDemoMode');
      const savedGeminiKey = localStorage.getItem('sdis_geminiKey');
      
      const isDemoMode = savedDemoMode === 'true'; // Set default to false now that firebase is integrated

      baseDispatch({
        type: '_DB_SYNC',
        payload: {
          isDemoMode,
          geminiKey: savedGeminiKey,
          firebaseConfig: null, // Temporary placeholder until UI allows modifying
        }
      });

      if (isDemoMode) {
        baseDispatch({ type: '_DB_SYNC', payload: { modules: MOCK_MODULES, tasks: MOCK_TASKS, documents: MOCK_DOCUMENTS } });
        
        const MOCK_MESSAGES = [
          { id: 'm1', channelId: 'general', authorId: 'u2', authorName: 'Sophie (Architecte)', content: 'Bonjour à tous, les plans du RDC sont à jour sur la GED.', timestamp: new Date(Date.now() - 86400000).toISOString() },
          { id: 'm2', channelId: 'general', authorId: 'u1', authorName: 'Admin SDIS', content: 'Super, merci Sophie. On valide ça vendredi.', timestamp: new Date(Date.now() - 82400000).toISOString() },
          { id: 'm3', channelId: MOCK_MODULES[0].id, authorId: 'u3', authorName: 'Marc (Électricien)', content: 'Il y a un conflit sur le passage de câbles au 2ème.', timestamp: new Date().toISOString() }
        ];
        baseDispatch({ type: '_DB_SYNC', payload: { messages: MOCK_MESSAGES } });
        
        const MOCK_POLLS = [
          {
            id: 'p1', question: 'Quel composant pour le bardage extérieur (Module Façade) ?', authorId: 'u2', authorName: 'Sophie (Architecte)', createdAt: new Date(Date.now() - 172800000).toISOString(), status: 'active' as const,
            options: [ { id: 'o1', text: 'Bois composite', voterIds: ['u1', 'u3'] }, { id: 'o2', text: 'Aluminium brossé', voterIds: ['u2'] }, { id: 'o3', text: 'Fibrociment', voterIds: [] } ]
          }
        ];
        baseDispatch({ type: '_DB_SYNC', payload: { polls: MOCK_POLLS as any } });

        const savedUser = localStorage.getItem('sdis_user');
        if (savedUser) {
          baseDispatch({ type: 'SET_USER', payload: JSON.parse(savedUser) });
        } else {
          const demoUser: User = { id: 'u1', name: 'Admin SDIS', email: 'admin@sdis.fr', role: 'ADMIN' };
          localStorage.setItem('sdis_user', JSON.stringify(demoUser));
          baseDispatch({ type: 'SET_USER', payload: demoUser });
        }
      }
    } catch (error) {
      console.error(error);
    }
  }, []);

  return (
    <AppContext.Provider value={{ state, dispatch, login, loginWithEmail, logout }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
}

