export type Role = 'ADMIN' | 'CHEF_PROJET' | 'FORMATEUR' | 'OBSERVATEUR' | 'PRESTATAIRE';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  avatar?: string;
}

export type ModuleStatus = 'Non démarré' | 'En réflexion' | 'Devis en cours' | 'En validation' | 'Validé' | 'En travaux' | 'Opérationnel' | 'Reporté';
export type ModulePhase = '1' | '2' | '3' | 'À définir';
export type Priority = 'critique' | 'haute' | 'moyenne' | 'faible'; // Keeping for Task 
export type ModulePriority = 'Indispensable (Phase 1)' | 'Fortement recommandé' | 'Envisageable (Phase 2)' | 'Optionnel';
export type Risk = string;

export type ModuleType = 'ZONE' | 'SILO' | 'PAVILLON' | 'VOIE' | 'BUFFER';

export interface ModuleShape {
  type: ModuleType;
  width?: number;
  height?: number;
  r?: number;
  d?: string;
  points?: {x: number, y: number}[];
  scale?: number;
  rotation?: number;
}

export interface ArchitectureItem {
  niveaux: number;
  fondations: string;
  toiture: string;
  sousSol: boolean;
  structurePrincipale: string;
  isolationThermique: string;
  contraintesSpecifiques: string[];
  notesArchitecte: string;
}

export interface BudgetPoste {
  nom: string;
  coutUnitaireMin: number;
  coutUnitaireMax: number;
  unite: string;
  quantite: number;
  coutGlobalMin: number;
  coutGlobalMax: number;
  hypotheses: string;
}

export interface BudgetEstimation {
  postes: BudgetPoste[];
  totalMin: number;
  totalMax: number;
  indiceConfiance: number;
  alertes: string[];
  sources?: string[];
  referencesDePrix?: string;
}

export interface ModuleArchitectureSpecs {
  superficieRDC?: number;
  superficieEtages?: number;
  nombreEtages?: number;
  sousSol?: boolean;
  superficieSousSol?: number;
  typeConstruction?: 'Bois' | 'Parpaing' | 'Béton banché' | 'Métallique' | 'Mixte' | '';
  typeCharpente?: 'Traditionnelle' | 'Fermette (Américaine)' | 'Métallique' | 'Toit Plat' | '';
  toitureAccessible?: boolean;
  combles?: boolean;
  comblesAmenageables?: boolean;
  superficieCombles?: number;
  optionsPV?: boolean;
  surfacePV?: number;
  bornesIRVE?: number;
  
  // Champs spécifiques Silo
  volume?: number;
  hauteurSilo?: number;
  materiauSilo?: 'Acier' | 'Béton' | 'Inox' | 'Autre' | '';
  typeStockage?: 'Liquide' | 'Céréales' | 'Poudre' | 'Pellets' | 'Autre' | '';
  presenceEchelleCrinoline?: boolean;

  // Champs spécifiques Voie
  longueurVoie?: number;
  largeurVoie?: number;
  revetement?: 'Enrobé' | 'Béton' | 'Grave' | 'Terre' | 'Autre' | '';
  resistanceTonnage?: number;

  descriptionArchitecturale?: string;
}

export interface Module {
  id: string;
  name: string;
  description: string;
  status: ModuleStatus;
  phase: ModulePhase;
  priority: ModulePriority;
  budgetMin: number;
  budgetMax: number;
  surface: number;
  deadline: string;
  risks: Risk[];
  scenarios: string[];
  regulations: string[];
  formations?: string[];
  x: number;
  y: number;
  shape: ModuleShape;
  type: ModuleType;
  locked: boolean;
  layerId: number;
  createdAt: string;
  updatedAt: string;
  architectureSpecs?: ModuleArchitectureSpecs;
  architecture?: ArchitectureItem;
  budgetEstimation?: BudgetEstimation;
}

export type TaskStatus = 'À faire' | 'En cours' | 'En attente' | 'Terminé' | 'Annulé';

export interface Task {
  id: string;
  title: string;
  description: string;
  moduleId?: string;
  assigneeId?: string;
  startDate: string;
  dueDate: string;
  priority: Priority;
  status: TaskStatus;
}

export interface AppDocument {
  id: string;
  name: string;
  type: string;
  url: string;
  moduleId?: string;
  uploadDate: string;
  size: number;
  folderId?: string;
  storagePath?: string;
}

export interface AppMessage {
  id: string;
  channelId: string;
  authorId: string;
  authorName: string;
  content: string;
  timestamp: string;
}

export interface PollOption {
  id: string;
  text: string;
  voterIds: string[];
}

export interface Poll {
  id: string;
  question: string;
  options: PollOption[];
  authorId: string;
  authorName: string;
  createdAt: string;
  status: 'active' | 'closed';
}

export interface AppState {
  user: User | null;
  modules: Module[];
  tasks: Task[];
  documents: AppDocument[];
  messages: AppMessage[];
  polls: Poll[];
  lastRead: Record<string, string>;
  isDemoMode: boolean;
  geminiKey: string | null;
  firebaseConfig: string | null;
}

export type AppAction = 
  | { type: 'SET_USER'; payload: User | null }
  | { type: 'SET_MODULES'; payload: Module[] }
  | { type: 'ADD_MODULE'; payload: Module }
  | { type: 'DELETE_MODULE'; payload: string }
  | { type: 'SET_TASKS'; payload: Task[] }
  | { type: 'SET_DOCUMENTS'; payload: AppDocument[] }
  | { type: 'SET_MESSAGES'; payload: AppMessage[] }
  | { type: 'ADD_MESSAGE'; payload: AppMessage }
  | { type: 'MARK_CHANNEL_READ'; payload: { channelId: string; timestamp: string } }
  | { type: 'SET_POLLS'; payload: Poll[] }
  | { type: 'ADD_POLL'; payload: Poll }
  | { type: 'VOTE_POLL'; payload: { pollId: string; optionId: string; userId: string } }
  | { type: 'CLOSE_POLL'; payload: string }
  | { type: 'DELETE_POLL'; payload: string }
  | { type: 'UPDATE_MODULE'; payload: Module }
  | { type: 'UPDATE_TASK_STATUS'; payload: { taskId: string; status: TaskStatus } }
  | { type: 'ADD_TASK'; payload: Task }
  | { type: 'UPDATE_TASK'; payload: Task }
  | { type: 'DELETE_TASK'; payload: string }
  | { type: 'ADD_DOCUMENT'; payload: AppDocument }
  | { type: 'DELETE_DOCUMENT'; payload: string }
  | { type: 'SET_CONFIG'; payload: { isDemoMode: boolean; geminiKey: string | null; firebaseConfig: string | null } };

export type Page = 'dashboard' | 'plan' | 'kanban' | 'ged' | 'discussions' | 'polls' | 'planning' | 'settings' | 'budget';
