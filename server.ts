import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { GoogleGenAI, Type } from "@google/genai";
import bodyParser from "body-parser";

const REGIONAL_COST_REFERENCES = [
  { categorie: "Terrassement / préparation", unite: "m²", min: 25, moyen: 45, max: 80, source: "Ratio interne travaux publics 2026 - Centre-Val de Loire" },
  { categorie: "Voirie engins lourds", unite: "m²", min: 120, moyen: 180, max: 280, source: "Ratio VRD voirie lourde SDIS 2026" },
  { categorie: "Dalle béton technique", unite: "m²", min: 95, moyen: 145, max: 220, source: "Ratio gros œuvre bâtiment technique 2026" },
  { categorie: "Bâtiment technique simple", unite: "m²", min: 1200, moyen: 1800, max: 2800, source: "Ratio construction publique technique 2026" },
  { categorie: "Clôture / sécurisation", unite: "ml", min: 80, moyen: 130, max: 220, source: "Ratio sécurisation site technique 2026" },
  { categorie: "Réseaux secs/humides", unite: "forfait", min: 8000, moyen: 18000, max: 45000, source: "Ratio VRD réseaux site isolé 2026" },
  { categorie: "Signalétique et sécurité pédagogique", unite: "forfait", min: 1500, moyen: 4500, max: 12000, source: "Ratio équipement pédagogique SDIS 2026" }
];

type RawBudgetPoste = {
  nom: string;
  coutUnitaireMin: number;
  coutUnitaireMax: number;
  unite: string;
  quantite: number;
  coutGlobalMin?: number;
  coutGlobalMax?: number;
  hypotheses?: string;
};

function roundEuro(value: number) {
  if (!Number.isFinite(value) || value < 0) return 0;
  return Math.round(value);
}

function clampConfidence(value: number, alertsCount: number, hasSources: boolean) {
  const base = Number.isFinite(value) ? Math.min(5, Math.max(1, Math.round(value))) : 2;
  const penalty = (alertsCount >= 3 ? 1 : 0) + (hasSources ? 0 : 1);
  return Math.max(1, base - penalty);
}

function sanitizeBudgetEstimation(raw: any) {
  const alertes: string[] = Array.isArray(raw?.alertes) ? [...raw.alertes] : [];
  const postes = Array.isArray(raw?.postes) ? raw.postes.map((poste: RawBudgetPoste) => {
    const quantite = Math.max(0, Number(poste.quantite || 0));
    let coutUnitaireMin = Math.max(0, Number(poste.coutUnitaireMin || 0));
    let coutUnitaireMax = Math.max(0, Number(poste.coutUnitaireMax || 0));
    if (coutUnitaireMin > coutUnitaireMax) {
      [coutUnitaireMin, coutUnitaireMax] = [coutUnitaireMax, coutUnitaireMin];
      alertes.push(`Correction automatique: PU min/max inversés sur le poste ${poste.nom}.`);
    }
    const coutGlobalMin = roundEuro(quantite * coutUnitaireMin);
    const coutGlobalMax = roundEuro(quantite * coutUnitaireMax);
    const declaredMin = Number(poste.coutGlobalMin);
    const declaredMax = Number(poste.coutGlobalMax);
    if (Number.isFinite(declaredMin) && Math.abs(declaredMin - coutGlobalMin) > 2) {
      alertes.push(`Correction automatique: total min recalculé pour ${poste.nom}.`);
    }
    if (Number.isFinite(declaredMax) && Math.abs(declaredMax - coutGlobalMax) > 2) {
      alertes.push(`Correction automatique: total max recalculé pour ${poste.nom}.`);
    }
    return {
      nom: String(poste.nom || 'Poste non nommé'),
      coutUnitaireMin: roundEuro(coutUnitaireMin),
      coutUnitaireMax: roundEuro(coutUnitaireMax),
      unite: String(poste.unite || 'forfait'),
      quantite,
      coutGlobalMin,
      coutGlobalMax,
      hypotheses: String(poste.hypotheses || 'Hypothèse non renseignée par l’IA.')
    };
  }) : [];

  const totalMin = postes.reduce((sum: number, p: any) => sum + p.coutGlobalMin, 0);
  const totalMax = postes.reduce((sum: number, p: any) => sum + p.coutGlobalMax, 0);
  const sources = Array.isArray(raw?.sources) && raw.sources.length ? raw.sources : REGIONAL_COST_REFERENCES.map(r => r.source);
  if (postes.length === 0) alertes.push('Aucun poste budgétaire structuré généré. Estimation inexploitable sans reprise humaine.');
  if (!raw?.sources || raw.sources.length === 0) alertes.push('Sources absentes côté IA : références régionales internes ajoutées automatiquement.');

  return {
    postes,
    totalMin: roundEuro(totalMin),
    totalMax: roundEuro(totalMax),
    indiceConfiance: clampConfidence(Number(raw?.indiceConfiance), alertes.length, sources.length > 0),
    alertes: Array.from(new Set(alertes)),
    sources,
    referencesDePrix: String(raw?.referencesDePrix || 'Estimation contrôlée automatiquement : totaux recalculés depuis quantités × prix unitaires, avec ratios de cohérence Centre-Val de Loire.')
  };
}


async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(bodyParser.json({ limit: '10mb' }));

  // API Routes
  app.post("/api/ai/architect", async (req, res) => {
    try {
      const { module, apiKey } = req.body;
      let genAIKey = apiKey;
      if (!genAIKey || genAIKey === "null" || genAIKey === "undefined" || genAIKey.trim() === "") {
        genAIKey = process.env.GEMINI_API_KEY;
      }
      if (!genAIKey) throw new Error("API key non configurée.");
      const ai = new GoogleGenAI({ apiKey: genAIKey });
      const schema = {
        type: Type.OBJECT,
        properties: {
          niveaux: { type: Type.NUMBER },
          fondations: { type: Type.STRING },
          toiture: { type: Type.STRING },
          sousSol: { type: Type.BOOLEAN },
          structurePrincipale: { type: Type.STRING },
          isolationThermique: { type: Type.STRING },
          contraintesSpecifiques: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          },
          notesArchitecte: { type: Type.STRING }
        },
        required: ["niveaux", "fondations", "toiture", "sousSol", "structurePrincipale", "isolationThermique", "contraintesSpecifiques", "notesArchitecte"],
      };

      const response = await ai.models.generateContent({
        model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
        contents: [{
          role: 'user',
          parts: [{ text: `Module à analyser: ${JSON.stringify(module)}` }]
        }],
        config: {
          systemInstruction: `Tu es un Architecte et Dessinateur expert en construction de bâtiments techniques spécialisés professionnels, notamment pour les services d'incendie et de secours (SDIS) ou les plateaux techniques ambitieux.
Tu t'adresses souvent à des novices et dois sécuriser/affiner leurs choix (par exemple, choix de charpente, options PV).
À partir des informations et spécifications saisies par l'utilisateur, génère une constitution architecturale d'ingénierie détaillée, solide et très réaliste. Elle doit guider les arbitrages futurs.
Réponds UNIQUEMENT en JSON valide, sans markdown, sans commentaires.`,
          temperature: 0.2,
          responseMimeType: "application/json",
          responseSchema: schema,
        }
      });

      if (!response.text) throw new Error("No response text from Gemini");
      res.json(JSON.parse(response.text));
    } catch (error: any) {
      console.error(error);
      const msg = error.status === 429 ? "Le serveur IA est surchargé. Réessayez." : error.message;
      res.status(500).json({ error: msg });
    }
  });

  app.post("/api/ai/budget", async (req, res) => {
    try {
      const { module, apiKey } = req.body;
      let genAIKey = apiKey;
      if (!genAIKey || genAIKey === "null" || genAIKey === "undefined" || genAIKey.trim() === "") {
        genAIKey = process.env.GEMINI_API_KEY;
      }
      if (!genAIKey) throw new Error("API key non configurée.");
      const ai = new GoogleGenAI({ apiKey: genAIKey });
      const schema = {
        type: Type.OBJECT,
        properties: {
          postes: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                nom: { type: Type.STRING },
                coutUnitaireMin: { type: Type.NUMBER },
                coutUnitaireMax: { type: Type.NUMBER },
                unite: { type: Type.STRING },
                quantite: { type: Type.NUMBER },
                coutGlobalMin: { type: Type.NUMBER },
                coutGlobalMax: { type: Type.NUMBER },
                hypotheses: { type: Type.STRING }
              },
              required: ["nom", "coutUnitaireMin", "coutUnitaireMax", "unite", "quantite", "coutGlobalMin", "coutGlobalMax", "hypotheses"]
            }
          },
          totalMin: { type: Type.NUMBER },
          totalMax: { type: Type.NUMBER },
          indiceConfiance: { type: Type.NUMBER }, // 1-5
          alertes: { type: Type.ARRAY, items: { type: Type.STRING } },
          sources: { type: Type.ARRAY, items: { type: Type.STRING } },
          referencesDePrix: { type: Type.STRING }
        },
        required: ["postes", "totalMin", "totalMax", "indiceConfiance", "alertes", "sources", "referencesDePrix"],
      };

      const response = await ai.models.generateContent({
        model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
        contents: [{
          role: 'user',
          parts: [{ text: `Module à estimer: ${JSON.stringify(module)}\nRéférences régionales internes à utiliser comme garde-fous: ${JSON.stringify(REGIONAL_COST_REFERENCES)}` }]
        }],
        config: {
          systemInstruction: `Tu es un Économiste de la construction certifié spécialisé dans les bâtiments techniques publics en France (marchés publics, cadre SDIS).
L'estimation servira de base fiable et véridique de chiffrage. 
RÈGLES:
1. Fournir les prix sous forme de "Prix Unitaire" (coutUnitaireMin, coutUnitaireMax) et l'unité.
2. Fournir la "Quantité".
3. Le coût global (coutGlobalMin, coutGlobalMax) DOIT être exactement Quantité × Prix Unitaire.
4. Ventile avec un niveau de détail professionnel (Terrassement, Fondations, Menuiseries, etc).
5. Le Total DOIT être la somme exacte.
6. Ne génère aucune incohérence de prix. Les coûts doivent être pertinents.
Réponds UNIQUEMENT en JSON valide.`,
          temperature: 0.1,
          responseMimeType: "application/json",
          responseSchema: schema,
        }
      });

      if (!response.text) throw new Error("No response text");
      const rawBudget = JSON.parse(response.text);
      res.json(sanitizeBudgetEstimation(rawBudget));
    } catch (error: any) {
      console.error(error);
      const msg = error.status === 429 ? "Le serveur IA est surchargé. Réessayez." : error.message;
      res.status(500).json({ error: msg });
    }
  });


  app.post("/api/ai/chat", async (req, res) => {
    try {
      const { prompt, history, context, apiKey } = req.body;
      let genAIKey = apiKey;
      if (!genAIKey || genAIKey === "null" || genAIKey === "undefined" || genAIKey.trim() === "") {
        genAIKey = process.env.GEMINI_API_KEY;
      }
      if (!genAIKey) throw new Error("API key non configurée.");
      const ai = new GoogleGenAI({ apiKey: genAIKey });
      const response = await ai.models.generateContent({
        model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
        contents: [{
          role: 'user',
          parts: [{ text: `Question utilisateur: ${prompt}\nHistorique récent: ${JSON.stringify(history || [])}\nContexte projet: ${JSON.stringify(context || {})}` }]
        }],
        config: {
          systemInstruction: `Tu es l'assistant métier d'un projet SDIS. Réponds en français, avec un ton opérationnel. Tes estimations de coût doivent toujours préciser hypothèses, limites et nécessité de validation par devis. Ne donne pas de chiffres inventés comme certitudes.`,
          temperature: 0.25,
        }
      });
      res.json({ content: response.text || '' });
    } catch (error: any) {
      console.error(error);
      const msg = error.status === 429 ? "Le serveur IA est surchargé. Réessayez." : error.message;
      res.status(500).json({ error: msg });
    }
  });

  app.post("/api/ai/report", async (req, res) => {
    try {
      const { poll, apiKey } = req.body;
      let genAIKey = apiKey;
      if (!genAIKey || genAIKey === "null" || genAIKey === "undefined" || genAIKey.trim() === "") {
        genAIKey = process.env.GEMINI_API_KEY;
      }
      if (!genAIKey) throw new Error("API key non configurée.");
      const ai = new GoogleGenAI({ apiKey: genAIKey });
      const schema = {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          content: { type: Type.STRING },
        },
        required: ["title", "content"],
      };

      const response = await ai.models.generateContent({
        model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
        contents: [{
          role: 'user',
          parts: [{ text: `Data: ${JSON.stringify(poll)}` }]
        }],
        config: {
          systemInstruction: `Tu es un Chef de Projet SDIS (Services d'incendie et de secours).
À partir des résultats d'un arbitrage / vote, génère un compte-rendu professionnel détaillé qui synthétise la décision, analyse les choix, et liste les prochaines étapes. 
- "title": Titre officiel du document (ex: "Compte-Rendu d'Arbitrage: Choix de la Charpente")
- "content": Le contenu du compte rendu en format Markdown détaillé.
Réponds UNIQUEMENT en JSON.`,
          temperature: 0.3,
          responseMimeType: "application/json",
          responseSchema: schema,
        }
      });

      if (!response.text) throw new Error("No response text");
      res.json(JSON.parse(response.text));
    } catch (error: any) {
      console.error(error);
      const msg = error.status === 429 ? "Le serveur IA est surchargé. Réessayez." : error.message;
      res.status(500).json({ error: msg });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
