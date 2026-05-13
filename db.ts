import { db } from './firebase';
import { collection, doc, setDoc, updateDoc, deleteDoc, getDoc, onSnapshot, query, where, getDocs } from 'firebase/firestore';
import { AppAction } from './types';

// Generic error handler
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export const executeFirebaseAction = async (action: AppAction) => {
  try {
    switch (action.type) {
      case 'ADD_MODULE':
        await setDoc(doc(db, 'modules', action.payload.id), action.payload);
        break;
      case 'UPDATE_MODULE':
        await updateDoc(doc(db, 'modules', action.payload.id), action.payload as any);
        break;
      case 'DELETE_MODULE':
        await deleteDoc(doc(db, 'modules', action.payload));
        break;
      case 'ADD_TASK':
        await setDoc(doc(db, 'tasks', action.payload.id), action.payload);
        break;
      case 'UPDATE_TASK':
        await updateDoc(doc(db, 'tasks', action.payload.id), action.payload as any);
        break;
      case 'UPDATE_TASK_STATUS':
        await updateDoc(doc(db, 'tasks', action.payload.taskId), { status: action.payload.status });
        break;
      case 'DELETE_TASK':
        await deleteDoc(doc(db, 'tasks', action.payload));
        break;
      case 'ADD_DOCUMENT':
        await setDoc(doc(db, 'documents', action.payload.id), action.payload);
        break;
      case 'DELETE_DOCUMENT':
        await deleteDoc(doc(db, 'documents', action.payload));
        break;
      case 'ADD_MESSAGE':
        await setDoc(doc(db, 'messages', action.payload.id), action.payload);
        break;
      case 'ADD_POLL':
        await setDoc(doc(db, 'polls', action.payload.id), action.payload);
        break;
      case 'CLOSE_POLL':
        await updateDoc(doc(db, 'polls', action.payload), { status: 'closed' });
        break;
      case 'DELETE_POLL':
        await deleteDoc(doc(db, 'polls', action.payload));
        break;
      case 'VOTE_POLL':
        const pollDoc = await getDoc(doc(db, 'polls', action.payload.pollId));
        if (pollDoc.exists()) {
          const poll = pollDoc.data();
          const newOptions = poll.options.map((opt: any) => {
            const filteredVoters = opt.voterIds.filter((id: string) => id !== action.payload.userId);
            if (opt.id === action.payload.optionId) {
              filteredVoters.push(action.payload.userId);
            }
            return { ...opt, voterIds: filteredVoters };
          });
          await updateDoc(doc(db, 'polls', action.payload.pollId), { options: newOptions });
        }
        break;
      case 'MARK_CHANNEL_READ':
        // Ignored for shared DB, keep local if wanted or sync custom user doc
        break;
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, 'mixed');
  }
};
