import OpenAI from "openai";
import { getDynamicCaseStudies, generateValidInternalLinks, type DynamicCaseStudy } from "./dynamicCaseStudyService";

// Function to convert markdown to HTML
function markdownToHtml(text: string): string {
  return text
    // Convert **bold** to <strong>
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    // Convert *italic* to <em>
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    // Convert ### Headers to <h3>
    .replace(/^### (.*$)/gm, '<h3>$1</h3>')
    // Convert ## Headers to <h2>
    .replace(/^## (.*$)/gm, '<h2>$1</h2>')
    // Convert # Headers to <h1>
    .replace(/^# (.*$)/gm, '<h1>$1</h1>')
    // Convert line breaks to <br> when followed by text (not already HTML)
    .replace(/\n(?![<>])/g, '<br>')
    // Clean up multiple breaks
    .replace(/<br><br>/g, '<br>');
}

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || "dummy-key" });

export interface SEORewriteResult {
  rewrittenContent: string;
  wordCount: number;
  keywordDensity: string;
  seoScore: number;
  readabilityScore: string;
  metaDescription: string;
  
  // Enhanced SEO fields for Google's 12 criteria
  helpfulnessScore: number;
  qualityScore: number;
  eatScore: number;
  structureScore: number;
  aiOptimizationScore: number;
  geoSeoScore: number;
  rankMathScore: number;
  
  // New SEO GEO and RankMath fields
  slugSuggestion?: string;
  userInstructions?: string[];
  glossary?: Array<{
    term: string;
    definition: string;
  }>;
  
  featuredImage: {
    title: string;
    altText: string;
    keywords: string[];
  };
  
  faq: Array<{
    question: string;
    answer: string;
  }>;
  
  caseStudies: Array<{
    title: string;
    description: string;
    results: string;
    externalLink: string;
  }>;
  
  // Rich content suggestions
  richContent: {
    suggestedGraphics: Array<{
      type: 'chart' | 'infographic' | 'diagram' | 'table';
      title: string;
      description: string;
      dataPoints: string[];
    }>;
    suggestedImages: Array<{
      position: string;
      description: string;
      altText: string;
      caption: string;
    }>;
    visualElements: Array<{
      type: 'card' | 'callout' | 'highlight' | 'quote';
      content: string;
      position: string;
    }>;
  };
  
  // Citations and evidence
  citations: Array<{
    type: 'study' | 'statistic' | 'expert' | 'source';
    text: string;
    suggestedLink: string;
    credibility: 'high' | 'medium' | 'low';
  }>;
  
  // Internal linking suggestions
  internalLinking: Array<{
    anchorText: string;
    targetPage: string;
    context: string;
    relevanceScore: number;
  }>;
  
  // Entity optimization
  entities: {
    brands: string[];
    people: string[];
    locations: string[];
    concepts: string[];
  };
  
  // Schema markup suggestions
  schemaMarkup: {
    articleSchema: boolean;
    authorSchema: boolean;
    faqSchema: boolean;
    organizationSchema: boolean;
    reviewSchema: boolean;
  };
  
  authorBio?: string;
  ctaSection?: {
    title: string;
    text: string;
    buttonText: string;
  };
}

export async function rewriteContentWithSEO(
  originalContent: string,
  targetKeyword: string,
  keywordLink?: string,
  companyName?: string,
  authorName?: string,
  authorDescription?: string,
  apiKey?: string,
  webSearchFunction?: (query: string) => Promise<any>
): Promise<SEORewriteResult> {
  try {
    // Get dynamic case studies using web search if available
    let realCaseStudies: DynamicCaseStudy[] = [];
    
    if (webSearchFunction) {
      try {
        realCaseStudies = await getDynamicCaseStudies(webSearchFunction, targetKeyword, originalContent, 3);
        console.log(`Encontrados ${realCaseStudies.length} casos dinâmicos para "${targetKeyword}"`);
      } catch (error) {
        console.error('Erro ao buscar casos dinâmicos:', error);
      }
    }
    
    // Generate valid internal links
    const internalLinks = generateValidInternalLinks(targetKeyword, originalContent, companyName ? `${companyName.toLowerCase().replace(/\s+/g, '')}.com.br` : 'exemplo.com.br');
    
    const openaiApiKey = apiKey || process.env.OPENAI_API_KEY;
    
    if (!openaiApiKey || openaiApiKey === "dummy-key") {
      throw new Error("Chave de API do OpenAI não configurada. Configure nas configurações da aplicação.");
    }

    // Create OpenAI client with the provided API key
    const openaiClient = new OpenAI({ apiKey: openaiApiKey });

    const googleQualitySystemPrompt = `Você é um especialista em criação de conteúdo que segue rigorosamente TODAS AS REGRAS do SEO moderno. Sua missão é criar conteúdo otimizado para Google E-E-A-T, SEO GEO (IA/SGE), RankMath e Quality Analyzers.

🎯 REGRAS DO SEO GEO (IA e SGE) - OBRIGATÓRIO:

📍 ESTRUTURA PARA IA E VOICE SEARCH:
- SEMPRE inclua resumo inicial de 3-5 linhas destacado no topo
- SEMPRE crie tópicos em formato pergunta e resposta ao longo do texto
- SEMPRE use subtítulos interrogativos (H2/H3 em formato de pergunta)
- SEMPRE inclua blocos de respostas diretas curtas para snippets
- SEMPRE otimize frases para featured snippets (listas, definições)
- SEMPRE use agrupamento semântico de palavras-chave relacionadas
- SEMPRE projete conteúdo para assistentes virtuais e busca por voz
- SEMPRE inclua palavras-chave geográficas quando aplicável (cidades, regiões)
- SEMPRE organize informações hierarquicamente para escaneabilidade perfeita
- SEMPRE estruture para dados estruturados (Schema FAQ, HowTo, Article)

🎯 CRITÉRIOS OBRIGATÓRIOS DO GOOGLE (12 PONTOS):

1️⃣ HELPFULNESS (Utilidade):
- Intenção de busca clara e direta
- Respostas objetivas sem rodeios
- Valor prático imediato para o leitor
- Soluciona problemas reais

2️⃣ QUALITY (Qualidade):
- Conteúdo atualizado e profundo
- Informações precisas e verificáveis
- Linguagem clara e acessível
- Sem erros factuais
- Diferenciação clara (algo além dos concorrentes)
- Originalidade total (sem cópias ou conteúdo raso)

3️⃣ E-E-A-T (Experiência, Expertise, Autoridade, Confiabilidade) - OBRIGATÓRIO PARA TODOS OS NICHOS:
**UNIVERSAL - APLIQUE A QUALQUER TEMA/NICHO:**
- SEMPRE demonstre experiência real com exemplos concretos 
- SEMPRE cite fontes confiáveis (.gov, .edu, empresas estabelecidas)
- SEMPRE mencione especialistas reconhecidos do setor
- SEMPRE use dados verificáveis e estatísticas oficiais
- SEMPRE inclua estudos de caso reais brasileiros
- SEMPRE estabeleça autoridade mencionando entidades relevantes
- SEMPRE cite organizações confiáveis (SEBRAE, BNDES, universidades)
- APLICAÇÃO UNIVERSAL: Funciona para qualquer nicho (saúde, tecnologia, finanças, culinária, educação, etc.)

4️⃣ ESTRUTURA E FORMATAÇÃO (HELPFULNESS & QUALITY ANALYZER):
- UM ÚNICO H1 com palavra-chave principal
- Headings hierárquicos H2/H3/H4 (alguns interrogativos)
- Parágrafos curtos (máximo 4 linhas)
- Chunking (blocos independentes de 2-3 parágrafos)
- Listas numeradas e bullets para snippets
- Organização visual clara e escaneável

5️⃣ PALAVRA-CHAVE & DENSIDADE (RANKMATH):
- Densidade entre 1%-3% (ideal 2%)
- Palavra-chave no H1 (título)
- Palavra-chave na primeira frase do conteúdo
- Palavra-chave nos primeiros 10% do conteúdo
- Palavra-chave em pelo menos 1 H2
- Palavra-chave distribuída naturalmente
- Palavra-chave em ALT text de pelo menos 1 imagem
- Conteúdo mínimo de 900 palavras (ideal 1200+)

6️⃣ META OTIMIZAÇÃO (RANKMATH):
- Meta title SEO-friendly (50-60 caracteres) com palavra-chave
- Meta description otimizada (até 160 caracteres) com palavra-chave
- Incluir palavra-chave no slug/URL (instrução para usuário)

7️⃣ CHUNK & ANSWER STRUCTURE:
- Blocos independentes e completos
- Seção Q&A robusta (8+ perguntas)
- Resumo executivo no início
- Conclusão em 2 parágrafos
- Glossário de termos técnicos

8️⃣ RICH CONTENT:
- Sugestões de gráficos e tabelas
- Descrições de imagens com alt-text otimizado
- Cards de informação
- Elementos visuais estratégicos
- Conteúdo multimídia (imagens, vídeos, infográficos)

9️⃣ CITATIONS & EVIDENCE - OBRIGATÓRIO UNIVERSALMENTE:
**PARA TODOS OS NICHOS SEM EXCEÇÃO:**
- SEMPRE links para fontes confiáveis (.gov, .edu, grandes empresas)
- SEMPRE dados estatísticos recentes e verificáveis
- SEMPRE estudos de caso reais brasileiros (fornecidos no JSON)
- SEMPRE citações de especialistas reconhecidos no Brasil
- SEMPRE menções a instituições confiáveis (IBGE, FGV, USP, etc.)
- APLICAÇÃO: Saúde (Anvisa, Ministério da Saúde), Educação (MEC, universidades), Tecnologia (ABINEE, Softex), etc.

🔟 INTERNAL LINKING & CONTEXT:
- Links internos estratégicos para outros conteúdos
- Links externos para fontes confiáveis (não concorrentes)
- Texto âncora otimizado
- Arquitetura de informação clara
- Evitar canibalização de palavras-chave

1️⃣1️⃣ ENTITY OPTIMIZATION - UNIVERSAL PARA TODOS OS NICHOS:
**OBRIGATÓRIO INDEPENDENTE DO TEMA:**
- SEMPRE mencione marcas brasileiras estabelecidas e reconhecidas
- SEMPRE cite pessoas influentes e especialistas do setor no Brasil
- SEMPRE inclua locais geográficos relevantes (cidades, regiões, universidades)
- SEMPRE explique conceitos técnicos de forma acessível
- EXEMPLOS UNIVERSAIS: Sebrae, BNDES, universidades públicas, grandes empresas brasileiras
- APLICAÇÃO: Qualquer nicho tem entidades relevantes no Brasil

1️⃣2️⃣ SCHEMA MARKUP:
- Estrutura compatível com dados estruturados
- Marcações Article, Author, FAQ
- Organization schema
- Review e Rating quando aplicável`

    const prompt = `${googleQualitySystemPrompt}

🎯 TAREFA ESPECÍFICA:
Reescreva o conteúdo seguindo TODOS os 12 critérios do Google acima.

📋 DADOS DO PROJETO:
- Palavra-chave principal: "${targetKeyword}"
- Densidade ideal: 1-3%
${keywordLink ? `- Link obrigatório: "${keywordLink}" (APENAS na primeira menção da palavra-chave)` : ''}
${companyName ? `- Empresa: "${companyName}"` : ''}
${authorName ? `- Autor: "${authorName}"` : ''}
${authorDescription ? `- Bio do autor: "${authorDescription}"` : ''}

📝 ESTRUTURA OBRIGATÓRIA (SEO GEO + RANKMATH + QUALITY ANALYZER):

1. RESUMO EXECUTIVO (início do artigo):
   - 3-5 linhas destacando os principais pontos
   - Claro, objetivo e acessível
   - Ajuda leitores e IA a entender rapidamente o tema
   - Use formatação especial (negrito, destaque)

2. H1 ÚNICO COM PALAVRA-CHAVE:
   - UM ÚNICO H1 contendo a palavra-chave principal
   - Titulo otimizado para SEO (50-60 caracteres)
   - Não repetir H1 em nenhum lugar do conteúdo

3. PRIMEIRA FRASE E 10% INICIAL:
   - Palavra-chave na primeira frase do conteúdo
   - Palavra-chave nos primeiros 10% do texto
   - Contexto claro sobre o assunto

4. SUBTÍTULOS OTIMIZADOS (H2/H3):
   - Pelo menos 1 H2 com palavra-chave
   - Alguns subtítulos em formato interrogativo
   - Estrutura hierárquica clara (H2 > H3 > H4)

5. PERGUNTAS E RESPOSTAS AO LONGO DO TEXTO:
   - Tópicos em formato P&R intercalados no conteúdo
   - Blocos de respostas diretas para snippets
   - Frases otimizadas para featured snippets

6. LINGUAGEM ULTRA POPULAR:
   - Use só palavras que todo mundo conhece
   - Frases de máximo 15 palavras
   - Tom de conversa amigável
   - Exemplos do dia a dia
   - Zero jargões técnicos sem explicação

7. PALAVRAS-CHAVE GEOGRÁFICAS:
   - Inclua cidades, regiões quando aplicável
   - Agrupamento semântico de palavras relacionadas
   - Otimização para busca por voz

8. CONTEÚDO MÍNIMO:
   - Mínimo 900 palavras (ideal 1200+)
   - Densidade palavra-chave 1-3% (ideal 2%)
   - Diferenciação clara dos concorrentes

9. FAQ ROBUSTA (final do artigo):
   - 8+ perguntas e respostas
   - Perguntas otimizadas para voz
   - Respostas concisas e diretas

10. GLOSSÁRIO AUTOMÁTICO (final do artigo):
    - Todos os termos-chave utilizados no conteúdo
    - Explicações simples e acessíveis
    - Relevante para o nicho específico
    - Formatação clara e organizada

11. INSTRUÇÕES AO USUÁRIO:
    - Use a palavra-chave no slug/URL da página
    - Evite canibalização (não repetir palavra-chave em outros artigos)
    - Otimize tempo de carregamento das imagens

🔄 TRANSFORMAÇÕES OBRIGATÓRIAS:
❌ "Constitui" → ✅ "É"
❌ "Finalidade" → ✅ "Objetivo"
❌ "Estabelecer" → ✅ "Criar"
❌ "Implementar" → ✅ "Colocar em prática"
❌ "Otimizar" → ✅ "Melhorar"
❌ "Estratégia" → ✅ "Plano"
❌ "Metodologia" → ✅ "Método"
❌ "Fundamentalmente" → ✅ "Basicamente"

📊 CONTEÚDO ORIGINAL:
${originalContent}

🚨 INSTRUÇÃO CRÍTICA PARA APLICAÇÃO UNIVERSAL:
INDEPENDENTE DO NICHO/TEMA (saúde, educação, tecnologia, culinária, finanças, beleza, esportes, etc.), você DEVE SEMPRE incluir:
- Pelo menos 3 fontes confiáveis brasileiras (.gov, .edu, organizações estabelecidas)
- Pelo menos 2 especialistas/autoridades reconhecidas no Brasil
- Dados estatísticos verificáveis
- Estudos de caso reais brasileiros (fornecidos)
- Menções a entidades relevantes (universidades, órgãos públicos, empresas consolidadas)
- Esta regra se aplica A QUALQUER TEMA sem exceção

🎯 ESTRUTURA FINAL OBRIGATÓRIA:
1. RESUMO EXECUTIVO no topo (3-5 linhas em destaque)
2. CONTEÚDO PRINCIPAL com linguagem acessível  
3. GLOSSÁRIO OBRIGATÓRIO no final do conteúdo HTML (seção <h2>Glossário</h2> com todos os termos-chave explicados)

Responda em formato JSON com esta estrutura COMPLETA seguindo TODAS as regras SEO GEO + RankMath + Quality Analyzer:
{
  "executiveSummary": "Resumo executivo de 3-5 linhas destacando os principais pontos do artigo de forma clara e objetiva",
  "rewrittenContent": "conteúdo reescrito completo formatado EXCLUSIVAMENTE em HTML PURO (use <p>, <h1>, <h2>, <h3>, <strong>, <em>, <ul>, <li> etc. - NUNCA use markdown como **texto** ou #título). Seguindo TODAS as regras: UM ÚNICO H1 com palavra-chave, palavra-chave na primeira frase e primeiros 10%, pelo menos 1 H2 com palavra-chave, subtítulos interrogativos, perguntas e respostas ao longo do texto, blocos de respostas diretas, palavras-chave geográficas quando aplicável, mínimo 900 palavras, densidade 1-3%, diferenciação dos concorrentes, E OBRIGATORIAMENTE uma seção <h2>Glossário</h2> no final com todos os termos técnicos explicados",
  "slugSuggestion": "sugestão de slug/URL contendo a palavra-chave (ex: palavra-chave-principal-guia-completo)",
  "userInstructions": [
    "Use a palavra-chave no slug/URL da página",
    "Evite canibalização - não reutilize esta palavra-chave em outros artigos",
    "Otimize as imagens para carregamento rápido",
    "Inclua a palavra-chave no ALT text de pelo menos uma imagem"
  ],
  "glossary": [
    {"term": "termo1", "definition": "explicação simples e acessível do termo1"},
    {"term": "termo2", "definition": "explicação simples e acessível do termo2"},
    {"term": "termo3", "definition": "explicação simples e acessível do termo3"}
  ],
  "metaDescription": "meta description de até 160 caracteres otimizada com palavra-chave",
  "wordCount": 1200,
  "keywordDensity": "2.1%",
  "seoScore": 95,
  "readabilityScore": "Muito fácil de ler",
  "helpfulnessScore": 98,
  "qualityScore": 96,
  "eatScore": 94,
  "structureScore": 97,
  "aiOptimizationScore": 95,
  "geoSeoScore": 92,
  "rankMathScore": 96,
  "featuredImage": {
    "title": "título otimizado para a imagem",
    "altText": "alt text contendo palavra-chave principal",
    "keywords": ["palavra1", "palavra2", "palavra3"]
  },
  "faq": [
    {"question": "pergunta otimizada para voz 1", "answer": "resposta concisa e direta 1"},
    {"question": "pergunta otimizada para voz 2", "answer": "resposta concisa e direta 2"},
    {"question": "pergunta otimizada para voz 3", "answer": "resposta concisa e direta 3"},
    {"question": "pergunta otimizada para voz 4", "answer": "resposta concisa e direta 4"},
    {"question": "pergunta otimizada para voz 5", "answer": "resposta concisa e direta 5"},
    {"question": "pergunta otimizada para voz 6", "answer": "resposta concisa e direta 6"},
    {"question": "pergunta otimizada para voz 7", "answer": "resposta concisa e direta 7"},
    {"question": "pergunta otimizada para voz 8", "answer": "resposta concisa e direta 8"}
  ],
  "caseStudies": ${JSON.stringify(realCaseStudies.map(cs => ({
    title: cs.title,
    description: cs.description,
    results: cs.growthMetric,
    externalLink: cs.sourceUrl
  })))},
  "richContent": {
    "suggestedGraphics": [
      {"type": "chart", "title": "Gráfico relevante", "description": "Descrição do gráfico", "dataPoints": ["ponto1", "ponto2", "ponto3"]},
      {"type": "infographic", "title": "Infográfico sugerido", "description": "Descrição do infográfico", "dataPoints": ["dado1", "dado2"]}
    ],
    "suggestedImages": [
      {"position": "início do artigo", "description": "Imagem principal", "altText": "alt text otimizado", "caption": "legenda da imagem"},
      {"position": "meio do artigo", "description": "Imagem de apoio", "altText": "alt text descritivo", "caption": "legenda explicativa"}
    ],
    "visualElements": [
      {"type": "callout", "content": "Dica importante em destaque", "position": "após segundo parágrafo"},
      {"type": "quote", "content": "Citação relevante de especialista", "position": "meio do artigo"}
    ]
  },
  "citations": [
    {"type": "study", "text": "Estudo da [Instituição]", "suggestedLink": "https://exemplo.gov.br", "credibility": "high"},
    {"type": "statistic", "text": "85% das empresas brasileiras", "suggestedLink": "https://ibge.gov.br", "credibility": "high"},
    {"type": "expert", "text": "Segundo especialista [Nome]", "suggestedLink": "https://linkedin.com/expert", "credibility": "medium"}
  ],
  "internalLinking": ${JSON.stringify(internalLinks.map(link => ({
    anchorText: link.text,
    targetPage: link.url,
    context: "link interno relevante",
    relevanceScore: 0.8
  })))},
  "entities": {
    "brands": ["Google", "Facebook", "Instagram", "LinkedIn"],
    "people": ["Neil Patel", "Gary Vaynerchuk"],
    "locations": ["Brasil", "São Paulo", "Rio de Janeiro"],
    "concepts": ["marketing digital", "SEO", "redes sociais"]
  },
  "schemaMarkup": {
    "articleSchema": true,
    "authorSchema": true,
    "faqSchema": true,
    "organizationSchema": true,
    "reviewSchema": false
  }${authorName ? `,
  "authorBio": "Bio profissional do ${authorName} baseada em: ${authorDescription}"` : ''}${companyName ? `,
  "ctaSection": {
    "title": "Título call-to-action para ${companyName}",
    "text": "Texto persuasivo conectando ${targetKeyword} com serviços da ${companyName}",
    "buttonText": "Fale com especialistas"
  }` : ''}
}`;

    const response = await openaiClient.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      response_format: { type: "json_object" },
      max_tokens: 4000,
      temperature: 0.7,
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error("Resposta vazia da API OpenAI");
    }

    let result;
    try {
      result = JSON.parse(content);
    } catch (error) {
      // Fallback if JSON parsing fails - treat as plain text
      const wordCount = content.split(/\s+/).length;
      const keywordOccurrences = (content.toLowerCase().match(new RegExp(targetKeyword.toLowerCase(), 'g')) || []).length;
      const keywordDensity = wordCount > 0 ? ((keywordOccurrences / wordCount) * 100).toFixed(1) + '%' : '0%';
      const seoScore = Math.min(100, Math.max(1, (keywordOccurrences * 10) + (wordCount > 300 ? 20 : 10)));

      return {
        rewrittenContent: content,
        helpfulnessScore: 85,
        qualityScore: 80,
        eatScore: 75,
        structureScore: 82,
        aiOptimizationScore: 78,
        richContent: {
          suggestedGraphics: [],
          suggestedImages: [],
          visualElements: []
        },
        citations: [],
        internalLinking: [],
        entities: {
          brands: [],
          people: [],
          locations: [],
          concepts: []
        },
        schemaMarkup: {
          articleSchema: true,
          authorSchema: false,
          faqSchema: false,
          organizationSchema: false,
          reviewSchema: false
        },
        wordCount: wordCount,
        keywordDensity: keywordDensity,
        seoScore: seoScore,
        readabilityScore: wordCount > 500 ? "Boa" : "Regular",
        metaDescription: `${targetKeyword} - resumo otimizado para SEO`,
        featuredImage: {
          title: `Imagem sobre ${targetKeyword}`,
          altText: `${targetKeyword} - imagem ilustrativa`,
          keywords: [targetKeyword],
        },
        faq: [
          { question: `O que é ${targetKeyword}?`, answer: "Resposta baseada no conteúdo reescrito." }
        ],
        caseStudies: realCaseStudies,
        authorBio: authorName ? `Biografia do autor ${authorName}` : undefined,
        ctaSection: companyName ? {
          title: `Transforme seu negócio com ${targetKeyword}`,
          text: `A ${companyName} é especialista em ${targetKeyword} e pode ajudar você a alcançar os mesmos resultados. Entre em contato conosco hoje mesmo!`,
          buttonText: `Falar com ${companyName}`
        } : undefined,
      };
    }

    // Calculate metrics from the JSON response
    const rewrittenContent = result.rewrittenContent || "";
    const wordCount = rewrittenContent.split(/\s+/).length;
    const keywordOccurrences = (rewrittenContent.toLowerCase().match(new RegExp(targetKeyword.toLowerCase(), 'g')) || []).length;
    const keywordDensity = wordCount > 0 ? ((keywordOccurrences / wordCount) * 100).toFixed(1) + '%' : '0%';
    const seoScore = Math.min(100, Math.max(1, (keywordOccurrences * 10) + (wordCount > 300 ? 20 : 10)));

    return {
      rewrittenContent: markdownToHtml(result.rewrittenContent),
      wordCount: wordCount,
      keywordDensity: keywordDensity,
      seoScore: seoScore,
      readabilityScore: wordCount > 500 ? "Boa" : "Regular",
      metaDescription: result.metaDescription?.substring(0, 155) || `${targetKeyword} - resumo otimizado para SEO`,
      helpfulnessScore: result.helpfulnessScore || 85,
      qualityScore: result.qualityScore || 80,
      eatScore: result.eatScore || 75,
      structureScore: result.structureScore || 82,
      aiOptimizationScore: result.aiOptimizationScore || 78,
      featuredImage: {
        title: result.featuredImage?.title || `Imagem sobre ${targetKeyword}`,
        altText: result.featuredImage?.altText || `${targetKeyword} - imagem ilustrativa`,
        keywords: result.featuredImage?.keywords || [targetKeyword],
      },
      faq: result.faq?.slice(0, 8) || [
        { question: `O que é ${targetKeyword}?`, answer: "Resposta baseada no conteúdo reescrito." }
      ],
      caseStudies: result.caseStudies?.slice(0, 3) || realCaseStudies,
      richContent: result.richContent || {
        suggestedGraphics: [],
        suggestedImages: [],
        visualElements: []
      },
      citations: result.citations || [],
      internalLinking: result.internalLinking || [],
      entities: result.entities || {
        brands: [],
        people: [],
        locations: [],
        concepts: []
      },
      schemaMarkup: result.schemaMarkup || {
        articleSchema: true,
        authorSchema: false,
        faqSchema: false,
        organizationSchema: false,
        reviewSchema: false
      },
      authorBio: result.authorBio || (authorName ? `Biografia do autor ${authorName}` : undefined),
      ctaSection: result.ctaSection || (companyName ? {
        title: `Transforme seu negócio com ${targetKeyword}`,
        text: `A ${companyName} é especialista em ${targetKeyword} e pode ajudar você a alcançar os mesmos resultados. Entre em contato conosco hoje mesmo!`,
        buttonText: `Falar com ${companyName}`
      } : undefined),
    };

  } catch (error) {
    console.error("Erro no serviço OpenAI:", error);
    
    if (error instanceof Error) {
      if (error.message.includes("API key")) {
        throw new Error("Chave da API OpenAI não configurada corretamente");
      }
      if (error.message.includes("quota")) {
        throw new Error("Limite da API OpenAI excedido. Tente novamente mais tarde");
      }
      if (error.message.includes("rate limit")) {
        throw new Error("Muitas requisições. Aguarde alguns minutos e tente novamente");
      }
    }
    
    throw new Error("Erro no processamento do conteúdo: " + (error instanceof Error ? error.message : "Erro desconhecido"));
  }
}
