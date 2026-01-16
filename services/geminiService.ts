
import { GoogleGenAI, Type } from "@google/genai";
import { SYSTEM_PROMPT } from "../constants";
import { Boleto } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const processCommand = async (command: string, currentBoletos: Boleto[]) => {
  const model = "gemini-3-flash-preview";
  
  const prompt = `
    ESTADO ATUAL DOS BOLETOS: ${JSON.stringify(currentBoletos)}
    COMANDO DO USUÁRIO: "${command}"

    Com base no comando, processe a alteração ou gere o relatório. 
    Se for uma nova previsão, gere um ID único.
    Se for uma baixa, localize o boleto pelo título aproximado.
    Retorne apenas o JSON.
  `;

  const response = await ai.models.generateContent({
    model,
    contents: prompt,
    config: {
      systemInstruction: SYSTEM_PROMPT,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          action: { type: Type.STRING },
          updatedBoletos: { 
            type: Type.ARRAY, 
            items: { 
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                titulo: { type: Type.STRING },
                categoria: { type: Type.STRING },
                valor: { type: Type.NUMBER },
                dataVencimento: { type: Type.STRING },
                dataPagamento: { type: Type.STRING },
                status: { type: Type.STRING },
                observacoes: { type: Type.STRING }
              }
            }
          },
          message: { type: Type.STRING },
          report: {
            type: Type.OBJECT,
            properties: {
              visaoPorCategorias: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    categoria: { type: Type.STRING },
                    total: { type: Type.NUMBER }
                  }
                }
              },
              totalProjetado: { type: Type.NUMBER },
              totalPago: { type: Type.NUMBER },
              percentualLiquidado: { type: Type.NUMBER }
            }
          }
        }
      }
    }
  });

  try {
    return JSON.parse(response.text);
  } catch (e) {
    console.error("Erro ao processar JSON do Gemini", e);
    return { action: "ERROR", message: "Não consegui processar seu comando. Tente novamente." };
  }
};
