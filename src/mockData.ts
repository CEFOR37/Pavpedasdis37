import { Module, Task, AppDocument } from './types';

export const MOCK_MODULES: Module[] = [
  { id: 'm1', name: 'Maison principale', description: "Structure d'habitation classique pour feux urbains.", status: 'Validé', phase: '1', priority: 'Indispensable (Phase 1)', budgetMin: 50000, budgetMax: 80000, surface: 120, deadline: '2024-12-01', risks: ['incendie', 'thermique', 'chute'], scenarios: ['Feu de chambre', "Sauvetage par l'extérieur"], regulations: ['ERP type J'], x: 50, y: 50, shape: { type: 'ZONE', width: 150, height: 100 } } as any,
  { id: 'm2', name: 'Appartement pédagogique', description: "Simulation de feu d'appartement avec propagation.", status: 'En travaux', phase: '1', priority: 'Indispensable (Phase 1)', budgetMin: 100000, budgetMax: 150000, surface: 80, deadline: '2024-10-15', risks: ['incendie', 'toxicité', 'asphyxie'], scenarios: ['Feu de cuisine', 'Reconnaissance sous ARI'], regulations: ['Habitation 3ème famille'], x: 220, y: 50, shape: { type: 'ZONE', width: 150, height: 100 } } as any,
  { id: 'm3', name: 'Façade ITE', description: "Isolation Thermique par l'Extérieur.", status: 'En réflexion', phase: '2', priority: 'Envisageable (Phase 2)', budgetMin: 20000, budgetMax: 40000, surface: 50, deadline: '2025-03-01', risks: ['incendie', 'chute'], scenarios: ['Feu de façade', 'Dégarnissage'], regulations: ['IT 249'], x: 390, y: 50, shape: { type: 'ZONE', width: 50, height: 100 } } as any,
  { id: 'm4', name: 'Toiture PV et stockage', description: 'Panneaux photovoltaïques et batteries.', status: 'En validation', phase: '2', priority: 'Fortement recommandé', budgetMin: 60000, budgetMax: 90000, surface: 100, deadline: '2025-06-01', risks: ['électrique', 'incendie', 'chute'], scenarios: ['Feu de toiture PV', 'Mise en sécurité électrique'], regulations: ['NF C 15-100'], x: 50, y: 170, shape: { type: 'ZONE', width: 100, height: 100 } } as any,
  { id: 'm5', name: 'Garage VE', description: 'Véhicules électriques en charge.', status: 'Non démarré', phase: '3', priority: 'Indispensable (Phase 1)', budgetMin: 40000, budgetMax: 70000, surface: 40, deadline: '2025-09-01', risks: ['électrique', 'incendie', 'toxicité'], scenarios: ['Feu de VE en charge', 'Emballement thermique'], regulations: ['IRVE'], x: 170, y: 170, shape: { type: 'ZONE', width: 100, height: 100 } } as any,
  { id: 'm6', name: 'Silo et séchoir', description: 'Risques agricoles et poussières.', status: 'En réflexion', phase: 'À définir', priority: 'Envisageable (Phase 2)', budgetMin: 150000, budgetMax: 250000, surface: 200, deadline: '2026-01-01', risks: ['ATEX', 'explosion', 'ensevelissement', 'chute'], scenarios: ['Feu de silo', 'Sauvetage en milieu confiné'], regulations: ['ATEX', 'ICPE'], x: 460, y: 50, shape: { type: 'SILO', width: 100, height: 220, r: 50 } } as any,
  { id: 'm7', name: 'Méthanisation', description: 'Installation de biogaz.', status: 'Non démarré', phase: 'À définir', priority: 'Fortement recommandé', budgetMin: 200000, budgetMax: 350000, surface: 300, deadline: '2026-06-01', risks: ['explosion', 'ATEX', 'toxicité', 'asphyxie'], scenarios: ['Fuite de biogaz', 'Feu de torchère'], regulations: ['ICPE 2781'], x: 580, y: 50, shape: { type: 'ZONE', width: 150, height: 220 } } as any,
  { id: 'm8', name: 'Distillerie et chai viticole', description: "Risques liés à l'alcool.", status: 'En réflexion', phase: '3', priority: 'Envisageable (Phase 2)', budgetMin: 80000, budgetMax: 120000, surface: 150, deadline: '2025-11-01', risks: ['ATEX', 'incendie', 'toxicité'], scenarios: ["Feu d'alcool", 'Fuite de CO2'], regulations: ['ICPE'], x: 50, y: 290, shape: { type: 'ZONE', width: 150, height: 150 } } as any,
  { id: 'm9', name: 'Hangar agricole', description: 'Stockage fourrage et engrais.', status: 'Validé', phase: '1', priority: 'Fortement recommandé', budgetMin: 70000, budgetMax: 100000, surface: 400, deadline: '2024-09-01', risks: ['incendie', 'pollution', 'thermique'], scenarios: ['Feu de fourrage', "Protection de l'environnement"], regulations: ['ICPE'], x: 220, y: 290, shape: { type: 'ZONE', width: 220, height: 150 } } as any,
  { id: 'm10', name: 'Zone batteries Li-ion', description: "Stockage d'énergie stationnaire.", status: 'En validation', phase: '2', priority: 'Indispensable (Phase 1)', budgetMin: 120000, budgetMax: 180000, surface: 60, deadline: '2025-04-01', risks: ['incendie', 'électrique', 'toxicité', 'explosion'], scenarios: ['Feu de BESS', 'Refroidissement prolongé'], regulations: ['ICPE 2925'], x: 460, y: 290, shape: { type: 'ZONE', width: 270, height: 150 } } as any,
  { id: 'm11', name: 'Poste de commandement COS', description: 'Gestion opérationnelle.', status: 'En travaux', phase: '1', priority: 'Fortement recommandé', budgetMin: 30000, budgetMax: 50000, surface: 30, deadline: '2024-08-01', risks: [], scenarios: ['Gestion de crise', 'Coordination inter-services'], regulations: [], x: 290, y: 170, shape: { type: 'PAVILLON', width: 150, height: 100 } } as any,
];

export const TEAM_MEMBERS = [
  { id: 'user1', name: 'Capitaine Dubois', role: 'Chef de Projet', avatar: 'https://i.pravatar.cc/150?u=user1' },
  { id: 'user2', name: 'Lieutt. Martin', role: 'Resp. Opérationnel', avatar: 'https://i.pravatar.cc/150?u=user2' },
  { id: 'user3', name: 'Sgt. Chef Moreau', role: 'Expert Logistique', avatar: 'https://i.pravatar.cc/150?u=user3' },
  { id: 'user4', name: 'Alice Laurent', role: 'Architecte', avatar: 'https://i.pravatar.cc/150?u=user4' },
];

export const MOCK_TASKS: Task[] = [
  { id: 't1', title: 'Valider les plans architecte', description: 'Revue finale avec le SDIS', moduleId: 'm2', status: 'En cours', priority: 'critique', startDate: '2026-04-10', dueDate: '2026-04-30', assigneeId: 'user1' },
  { id: 't2', title: 'Devis matériaux ITE', description: 'Demander 3 devis', moduleId: 'm3', status: 'À faire', priority: 'moyenne', startDate: '2026-04-20', dueDate: '2026-05-15', assigneeId: 'user4' },
  { id: 't3', title: 'Étude de sol', description: 'Pour la zone agricole', moduleId: 'm9', status: 'Terminé', priority: 'haute', startDate: '2026-03-01', dueDate: '2026-04-10', assigneeId: 'user2' },
  { id: 't4', title: 'Installation des extincteurs', description: 'Sur le nouveau module', moduleId: 'm1', status: 'En attente', priority: 'haute', startDate: '2026-04-28', dueDate: '2026-05-05', assigneeId: 'user3' }
];

export const MOCK_DOCUMENTS: AppDocument[] = [
  { id: 'd1', name: 'Devis_Isolation_Façade.pdf', type: 'application/pdf', url: '#', moduleId: 'm3', uploadDate: '2024-04-10T10:00:00Z', size: 1024000 },
  { id: 'd2', name: 'Plan_Architecte_Maison.dwg', type: 'application/acad', url: '#', moduleId: 'm1', uploadDate: '2024-04-12T14:30:00Z', size: 5000000 },
  { id: 'd3', name: 'Notice_Sécurité_Batteries.pdf', type: 'application/pdf', url: '#', moduleId: 'm10', uploadDate: '2024-04-13T09:15:00Z', size: 2500000 },
];
