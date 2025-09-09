// Configuração simples das chaves de API
// Você pode editar as chaves diretamente aqui ou usar variáveis de ambiente

export const API_CONFIG = {
  // Configure sua chave preferida aqui:
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || "", // Cole sua chave do Gemini aqui se não usar env vars
  OPENAI_API_KEY: process.env.OPENAI_API_KEY || "", // Cole sua chave do OpenAI aqui se não usar env vars
  
  // Provedor preferido (pode ser "gemini" ou "openai")
  PREFERRED_PROVIDER: "gemini" as "gemini" | "openai",
};

// Função para obter a configuração ativa
export function getActiveConfig() {
  const geminiKey = API_CONFIG.GEMINI_API_KEY;
  const openaiKey = API_CONFIG.OPENAI_API_KEY;
  
  if (API_CONFIG.PREFERRED_PROVIDER === "gemini" && geminiKey) {
    return {
      provider: "gemini" as const,
      apiKey: geminiKey,
    };
  }
  
  if (API_CONFIG.PREFERRED_PROVIDER === "openai" && openaiKey) {
    return {
      provider: "openai" as const,
      apiKey: openaiKey,
    };
  }
  
  // Fallback para qualquer chave disponível
  if (geminiKey) {
    return {
      provider: "gemini" as const,
      apiKey: geminiKey,
    };
  }
  
  if (openaiKey) {
    return {
      provider: "openai" as const,
      apiKey: openaiKey,
    };
  }
  
  return null;
}

console.log('📋 Status das chaves de API:');
console.log('- Gemini:', API_CONFIG.GEMINI_API_KEY ? '✅' : '❌');
console.log('- OpenAI:', API_CONFIG.OPENAI_API_KEY ? '✅' : '❌');
console.log('- Provedor preferido:', API_CONFIG.PREFERRED_PROVIDER);

const activeConfig = getActiveConfig();
if (activeConfig) {
  console.log(`✅ Configuração ativa: ${activeConfig.provider}`);
} else {
  console.log('❌ Nenhuma chave de API configurada!');
  console.log('   Configure no arquivo server/simple-config.ts ou nas variáveis de ambiente.');
}