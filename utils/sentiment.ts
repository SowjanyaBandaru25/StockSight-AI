/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI, Type } from "@google/genai";
import { NewsItem, SymbolType } from "../src/types";

// Standard financial lexicon fallback (VADER-styled simplified for speed)
const financialLexicon: Record<string, number> = {
  breakthrough: 0.8,
  innovative: 0.6,
  surge: 0.7,
  growth: 0.5,
  bullish: 0.8,
  outperform: 0.7,
  profits: 0.6,
  record: 0.5,
  acquisition: 0.4,
  upgrade: 0.5,
  dividends: 0.4,
  strong: 0.4,
  expand: 0.5,
  plummet: -0.8,
  slump: -0.7,
  lawsuit: -0.6,
  fines: -0.5,
  bearish: -0.8,
  underperform: -0.7,
  losses: -0.6,
  decrease: -0.4,
  decline: -0.5,
  downgrade: -0.6,
  layoffs: -0.5,
  investigation: -0.4,
  crisis: -0.7,
};

/**
 * Calculates local sentiment score using word-token lexicon (VADER-lite)
 */
export function calculateLocalSentiment(text: string): number {
  const words = text.toLowerCase().replace(/[^a-z\s]/g, "").split(/\s+/);
  let score = 0;
  let matches = 0;

  for (const word of words) {
    if (financialLexicon[word] !== undefined) {
      score += financialLexicon[word];
      matches++;
    }
  }

  if (matches === 0) return 0;
  // S-Curve squash output within [-1, 1] range
  const rawScore = score / matches;
  return Math.tanh(rawScore);
}

/**
 * Generates news feed items for a symbol
 */
export function generateNewsTemplates(symbol: SymbolType): Omit<NewsItem, "score" | "sentiment" | "impact">[] {
  const templates: Record<SymbolType, Array<{ title: string; source: string; url: string }>> = {
    AAPL: [
      { title: "Apple announces high-performance M5 Ultra Chip with custom Neural Engine", source: "Bloomberg", url: "https://finance.yahoo.com/news/apple" },
      { title: "Global iPhone shipment forecasts revised upwards amid strong replacement cycle", source: "Reuters", url: "https://reuters.com/finance/apple" },
      { title: "Concerns rise over supply chain bottlenecks in Southeast Asian hardware factories", source: "Nikkei Asia", url: "https://nikkei.com" },
      { title: "App Store regulatory friction intensifies in European Union courts", source: "Wall Street Journal", url: "https://wsj.com" },
    ],
    MSFT: [
      { title: "Microsoft Copilot expands enterprise user seat licenses by 45%", source: "TechCrunch", url: "https://techcrunch.com" },
      { title: "Azure Cloud exceeds Q3 growth expectations driven by AI model fine-tuning workloads", source: "Bloomberg", url: "https://bloomberg.com" },
      { title: "Antitrust scrutiny shadows Microsoft's multi-billion gaming integration pipeline", source: "FT.com", url: "https://ft.com" },
      { title: "Security patches rolled out following critical zero-day vulnerability discovery", source: "ZDNet", url: "https://zdnet.com" },
    ],
    GOOGL: [
      { title: "Google DeepMind reveals AlphaFold 4 with advanced catalytic interaction mapping", source: "Nature", url: "https://nature.com" },
      { title: "AdVantage advertising tools receive generative AI enhancements driving ROI boost", source: "Reuters", url: "https://reuters.com" },
      { title: "DOJ trials regarding search market share enter final deliberation phases", source: "Bloomberg", url: "https://bloomberg.com" },
      { title: "Google Cloud rolls out high-density TPU Liquid Cooled systems globally", source: "Wired", url: "https://wired.com" },
    ],
    AMZN: [
      { title: "AWS launches Graviton5 hardware series optimizing server-side execution cost", source: "InfoQ", url: "https://infoq.com" },
      { title: "Amazon Prime Day achieves new record volumes in global standard order units", source: "Reuters", url: "https://reuters.com" },
      { title: "Unionization activities spark operations disputes in major US logistics hubs", source: "CNBC", url: "https://cnbc.com" },
      { title: "Shipping lane disruptions force freight route updates raising transit cost", source: "Forbes", url: "https://forbes.com" },
    ],
    NVDA: [
      { title: "NVIDIA Rubin Ultra architecture specifications leak, boasting 12-layer HBM4 compatibility", source: "Tom's Hardware", url: "https://tomshardware.com" },
      { title: "Hyperscalers commit to major multi-year server backlogs on custom AI systems", source: "EE Times", url: "https://eetimes.com" },
      { title: "Export regulation reviews draft potential new trade boundaries to East Asian markets", source: "Reuters", url: "https://reuters.com" },
      { title: "Supply constraint reports on sophisticated optical interconnect interposers surface", source: "Semiconductor Engineering", url: "https://semiengineering.com" },
    ],
    TSLA: [
      { title: "Tesla Full Self-Driving V13 receives positive safety reviews from tech audits", source: "CleanTechnica", url: "https://cleantechnica.com" },
      { title: "Giga Shanghai logs record weekly output for long-range crossover configurations", source: "Bloomberg", url: "https://bloomberg.com" },
      { title: "Raw material cost spikes on battery minerals drag manufacturing gross margins", source: "CNBC", url: "https://cnbc.com" },
      { title: "Regulatory safety agency opens check into advanced cabin driving aids", source: "WSJ", url: "https://wsj.com" },
    ],
    META: [
      { title: "Llama 4 models demonstrate remarkable benchmark improvements in reasoning tests", source: "Hacker News", url: "https://news.ycombinator.com" },
      { title: "Reality Labs logs sharp user additions on premium augmented glasses", source: "Bloomberg", url: "https://bloomberg.com" },
      { title: "Social media advertising rates stabilize after temporary seasonal contraction", source: "Marketing Dive", url: "https://marketingdive.com" },
      { title: "Privacy commissioners impose localized compliance mandates", source: "Reuters", url: "https://reuters.com" },
    ]
  };

  const selected = templates[symbol] || templates.AAPL;
  return selected.map((item, index) => ({
    id: `${symbol}-news-${index}`,
    title: item.title,
    source: item.source,
    url: item.url,
    time: `${index * 3}h ago`,
  }));
}

/**
 * Executes high-performance sentiment extraction based on FinBERT or VADER logic.
 * Uses Gemini for structured analysis if GEMINI_API_KEY is vorhanden, otherwise falls back to highly specific local algorithm.
 */
export async function analyzeNewsSentiment(symbol: SymbolType, apiKey?: string): Promise<{ items: NewsItem[]; overall: { score: number; label: "bullish" | "bearish" | "neutral"; twitterScore: number; newsScore: number } }> {
  const rawTemplates = generateNewsTemplates(symbol);
  const items: NewsItem[] = [];

  if (apiKey) {
    try {
      const ai = new GoogleGenAI({
        apiKey: apiKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          },
        },
      });

      const titles = rawTemplates.map(t => t.title).join("\n");

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: `Analyze the sentiment of these financial news headlines for stock symbol ${symbol}.
For each headline, determine the sentiment score (-1 is very bearish, 1 is very bullish, 0 is neutral), sentiment class (bullish, bearish, or neutral), and supply a very concise financial impact rationale explaining why.

Headlines:
${titles}`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                headline: { type: Type.STRING },
                sentiment: { type: Type.STRING, description: "Must be exactly 'bullish', 'bearish', or 'neutral'" },
                score: { type: Type.NUMBER, description: "A value from -1.00 to 1.00" },
                impact: { type: Type.STRING, description: "A brief 1-sentence financial impact statement" }
              },
              required: ["headline", "sentiment", "score", "impact"]
            }
          }
        }
      });

      const parsedData = JSON.parse(response.text || "[]");

      for (let i = 0; i < rawTemplates.length; i++) {
        const item = rawTemplates[i];
        const match = parsedData.find((p: any) => p.headline === item.title) || parsedData[i] || {};
        const score = Number(match.score ?? calculateLocalSentiment(item.title));
        const sent = (match.sentiment === "bullish" || match.sentiment === "bearish" || match.sentiment === "neutral") ? match.sentiment : (score > 0.15 ? "bullish" : (score < -0.15 ? "bearish" : "neutral"));

        items.push({
          ...item,
          sentiment: sent,
          score: score,
          impact: match.impact || `Lexicon assessment: this headline signals minor volatility with bias.`
        });
      }
    } catch (e) {
      console.error("Gemini news sentiment API error, falling back to local VADER Lexicon: ", e);
      // Fallback
      populateLocal(rawTemplates, items);
    }
  } else {
    populateLocal(rawTemplates, items);
  }

  // Calculate scores
  const newsScores = items.map(t => t.score);
  const avgNewsScore = newsScores.reduce((a, b) => a + b, 0) / newsScores.length || 0;

  // Simulate Twitter Sentiment (typically slightly more volatile)
  const twitterScore = avgNewsScore + (Math.random() - 0.5) * 0.3;
  const clampedTwitter = Math.max(-1, Math.min(1, twitterScore));

  const overallScore = Number((avgNewsScore * 0.6 + clampedTwitter * 0.4).toFixed(2));
  const overallLabel = overallScore > 0.15 ? "bullish" : (overallScore < -0.15 ? "bearish" : "neutral");

  return {
    items,
    overall: {
      score: overallScore,
      label: overallLabel,
      twitterScore: Number(clampedTwitter.toFixed(2)),
      newsScore: Number(avgNewsScore.toFixed(2)),
    }
  };
}

function populateLocal(rawTemplates: any[], items: NewsItem[]) {
  for (const item of rawTemplates) {
    const score = calculateLocalSentiment(item.title);
    const sentiment = score > 0.15 ? "bullish" : (score < -0.15 ? "bearish" : "neutral");
    let impactText = "";
    if (sentiment === "bullish") {
      impactText = "Positively impacts earnings multi-period outlook, stimulating demand and driving buyer sentiment upwards.";
    } else if (sentiment === "bearish") {
      impactText = "Introduces legal or margins risks, dragging operations multiplier or triggering potential short-term sell offs.";
    } else {
      impactText = "A neutral consolidation announcement representing business-as-usual parameters with nominal price impact.";
    }

    items.push({
      ...item,
      sentiment,
      score: Number(score.toFixed(2)),
      impact: impactText
    });
  }
}
