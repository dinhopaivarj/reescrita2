import { type User, type InsertUser, type Config, type InsertConfig, type RewriteHistory } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getConfig(): Promise<Config | undefined>;
  saveConfig(config: InsertConfig): Promise<Config>;
  saveRewriteHistory(history: Omit<RewriteHistory, 'id' | 'createdAt'>): Promise<RewriteHistory>;
  getRewriteHistory(limit?: number): Promise<RewriteHistory[]>;
  getStats(): Promise<{
    totalRewrites: number;
    avgSeoScore: number;
    totalWordCount: number;
  }>;
}

// Configuração padrão das chaves de API - você pode alterar aqui
const DEFAULT_CONFIG: Config = {
  id: 1,
  aiProvider: "gemini", // ou "openai"
  apiKey: process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY || "", // Use variáveis de ambiente primeiro
  createdAt: new Date(),
  updatedAt: new Date(),
};

export class MemoryStorage implements IStorage {
  private users: Map<number, User> = new Map();
  private currentConfig: Config | undefined = DEFAULT_CONFIG.apiKey ? DEFAULT_CONFIG : undefined;
  private rewriteHistoryList: RewriteHistory[] = [];
  private userIdCounter = 1;
  private historyIdCounter = 1;

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.username === username);
  }

  // Métodos legados para compatibilidade com routes antigas
  async getRewrites(): Promise<any[]> {
    return this.rewriteHistoryList.slice(0, 20);
  }

  async getRewrite(id: string): Promise<any | undefined> {
    return this.rewriteHistoryList.find(item => item.id.toString() === id);
  }

  async createRewrite(data: any): Promise<any> {
    const item = {
      id: this.historyIdCounter++,
      ...data,
      createdAt: new Date(),
    };
    this.rewriteHistoryList.unshift(item);
    return item;
  }

  async deleteAllRewrites(): Promise<void> {
    this.rewriteHistoryList = [];
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const user: User = {
      id: this.userIdCounter++,
      ...insertUser,
    };
    this.users.set(user.id, user);
    return user;
  }

  async getConfig(): Promise<Config | undefined> {
    // Verifica se há configuração padrão ou configuração salva
    if (!this.currentConfig && DEFAULT_CONFIG.apiKey) {
      this.currentConfig = DEFAULT_CONFIG;
    }
    return this.currentConfig;
  }

  async saveConfig(configData: InsertConfig): Promise<Config> {
    const config: Config = {
      id: 1,
      ...configData,
      createdAt: this.currentConfig?.createdAt || new Date(),
      updatedAt: new Date(),
    };
    this.currentConfig = config;
    return config;
  }

  async saveRewriteHistory(historyData: Omit<RewriteHistory, 'id' | 'createdAt'>): Promise<RewriteHistory> {
    const history: RewriteHistory = {
      id: this.historyIdCounter++,
      ...historyData,
      createdAt: new Date(),
    };
    this.rewriteHistoryList.unshift(history); // Adiciona no início da lista
    
    // Mantém apenas os últimos 100 registros para não sobrecarregar a memória
    if (this.rewriteHistoryList.length > 100) {
      this.rewriteHistoryList = this.rewriteHistoryList.slice(0, 100);
    }
    
    return history;
  }

  async getRewriteHistory(limit: number = 10): Promise<RewriteHistory[]> {
    return this.rewriteHistoryList.slice(0, limit);
  }

  async getStats(): Promise<{
    totalRewrites: number;
    avgSeoScore: number;
    totalWordCount: number;
  }> {
    const totalRewrites = this.rewriteHistoryList.length;
    const avgSeoScore = totalRewrites > 0 
      ? Math.round(this.rewriteHistoryList.reduce((sum, item) => sum + (item.seoScore || 0), 0) / totalRewrites)
      : 0;
    const totalWordCount = this.rewriteHistoryList.reduce((sum, item) => sum + (item.wordCount || 0), 0);

    return {
      totalRewrites,
      avgSeoScore,
      totalWordCount,
    };
  }
}

export const storage = new MemoryStorage();
