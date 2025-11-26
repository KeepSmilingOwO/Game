import { GoogleGenAI, Type } from "@google/genai";
import { DefectType } from "../types";

// Fallback data in case of API failure or empty key
const FALLBACK_DEFECTS: DefectType[] = [
  {
    id: "vacancy",
    name: "Vacancy Defect",
    description: "An atom is missing from its regular lattice site.",
    scientificDetails: "Vacancies are point defects where an atom is missing. In Silicon, these can trap electrons and alter conductivity. They are often created during crystal growth or by radiation.",
    color: "#ff0055",
    scoreValue: 100
  },
  {
    id: "interstitial",
    name: "Interstitial Defect",
    description: "An extra atom is squeezed into the lattice space.",
    scientificDetails: "Self-interstitials occur when a silicon atom occupies a site that is not a regular lattice point. They cause significant lattice strain and can diffuse rapidly even at low temperatures.",
    color: "#00ff88",
    scoreValue: 150
  },
  {
    id: "impurity",
    name: "Substitutional Impurity",
    description: "A different element replaces a silicon atom.",
    scientificDetails: "This is the basis of 'doping'. If Phosphorus (Group V) replaces Silicon, it adds an electron (N-type). If Boron (Group III) replaces Silicon, it creates a hole (P-type).",
    color: "#ffff00",
    scoreValue: 200
  }
];

export const fetchDefectData = async (): Promise<DefectType[]> => {
  // 1. Check if the key exists and is not an empty string
  const apiKey = process.env.API_KEY;
  
  if (!apiKey || apiKey.length === 0 || apiKey === 'undefined') {
    console.warn("Gemini Service: API_KEY is missing or empty. Using fallback data. Check Netlify Environment Variables.");
    return FALLBACK_DEFECTS;
  }

  try {
    // 2. Only initialize if we have a valid key
    const ai = new GoogleGenAI({ apiKey: apiKey });
    
    const model = "gemini-2.5-flash";
    const prompt = `
      Generate a JSON list of 3 distinct types of crystal defects found in Silicon semiconductor materials. 
      Include 'Vacancy', 'Interstitial', and 'Substitutional Impurity'.
      For each, provide:
      - id (unique string, e.g., 'vacancy')
      - name (display name)
      - description (short, simple summary for a game)
      - scientificDetails (2-3 sentences explaining the physics/chemistry impact on the silicon lattice)
      - color (hex code suggestion: Red for bad/vacancy, Green for extra, Yellow for foreign)
      - scoreValue (integer between 50 and 500 based on complexity)
    `;

    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              name: { type: Type.STRING },
              description: { type: Type.STRING },
              scientificDetails: { type: Type.STRING },
              color: { type: Type.STRING },
              scoreValue: { type: Type.INTEGER }
            }
          }
        }
      }
    });

    if (response.text) {
      const data = JSON.parse(response.text) as DefectType[];
      return data;
    }
    return FALLBACK_DEFECTS;

  } catch (error) {
    console.error("Gemini API Error:", error);
    // If quota exceeded or other API error, fallback gracefully
    return FALLBACK_DEFECTS;
  }
};