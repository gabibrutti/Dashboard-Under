/**
 * Serviço de Pontuação de Maturidade HDI
 * 
 * Implementa a lógica de cálculo da nota de maturidade para certificação HDI.
 * 
 * REGRAS:
 * 1. Pontuação Cumulativa: Níveis vão de 1 a 4. Para ter nível 2, é obrigatório ter nível 1.
 * 2. Exceção (Pontuação Parcial): Se não tem Nível 1 mas tem evidências de N2 ou N3,
 *    ganha 0.2 por cada nível adicional.
 * 3. Meta: Nota >= 2.5 para certificação.
 */

// ============================================================================
// CATEGORIAS DE AVALIAÇÃO HDI (8 categorias)
// ============================================================================
const CATEGORIES = {
  LEADERSHIP: 'leadership',           // Liderança
  STRATEGY_POLICY: 'strategy_policy', // Estratégia e Política
  PEOPLE_MANAGEMENT: 'people_mgmt',   // Gestão de Pessoas
  RESOURCES: 'resources',             // Recursos
  PROCESSES: 'processes',             // Processos e Procedimentos
  RESULTS_HANDLING: 'results_handling', // Resultados de Tratamento de Contatos
  RESULTS_PEOPLE: 'results_people',   // Resultados de Pessoas
  RESULTS_PERFORMANCE: 'results_perf' // Resultados de Performance
};

const CATEGORY_LABELS = {
  [CATEGORIES.LEADERSHIP]: 'Liderança',
  [CATEGORIES.STRATEGY_POLICY]: 'Estratégia e Política',
  [CATEGORIES.PEOPLE_MANAGEMENT]: 'Gestão de Pessoas',
  [CATEGORIES.RESOURCES]: 'Recursos',
  [CATEGORIES.PROCESSES]: 'Processos e Procedimentos',
  [CATEGORIES.RESULTS_HANDLING]: 'Resultados de Tratamento de Contatos',
  [CATEGORIES.RESULTS_PEOPLE]: 'Resultados de Pessoas',
  [CATEGORIES.RESULTS_PERFORMANCE]: 'Resultados de Performance'
};

// ============================================================================
// CÁLCULO DE PONTUAÇÃO POR CATEGORIA
// ============================================================================

/**
 * Calcula a pontuação de uma categoria baseado nos níveis atingidos
 * 
 * @param {Object} levels - { level1: boolean, level2: boolean, level3: boolean, level4: boolean }
 * @returns {Object} { score, breakdown, hasLevel1, partialScore }
 */
function calcCategoryScore(levels) {
  const { level1 = false, level2 = false, level3 = false, level4 = false } = levels;

  // Regra principal: pontuação cumulativa
  // Se tem nível 1, pode acumular os próximos
  if (level1) {
    let score = 1.0; // Nível 1 = 1.0 ponto
    
    if (level2) {
      score = 2.0; // Nível 2 = 2.0 pontos
      
      if (level3) {
        score = 3.0; // Nível 3 = 3.0 pontos
        
        if (level4) {
          score = 4.0; // Nível 4 = 4.0 pontos (máximo)
        }
      }
    }

    return {
      score,
      hasLevel1: true,
      partialScore: false,
      breakdown: {
        level1: true,
        level2: level2 && level1,
        level3: level3 && level2 && level1,
        level4: level4 && level3 && level2 && level1
      }
    };
  }

  // Regra de exceção: pontuação parcial
  // Se NÃO tem nível 1, mas tem evidências de N2 ou N3
  // Ganha 0.2 por cada nível adicional
  let partialScore = 0;
  
  if (level2) partialScore += 0.2;
  if (level3) partialScore += 0.2;
  // Nível 4 sem os anteriores não conta

  return {
    score: partialScore,
    hasLevel1: false,
    partialScore: partialScore > 0,
    breakdown: {
      level1: false,
      level2: level2,
      level3: level3,
      level4: false // Não conta sem a base
    }
  };
}

/**
 * Calcula a nota final de maturidade (média das 8 categorias)
 * 
 * @param {Object} categoryScores - Objeto com scores de cada categoria
 * @returns {Object} { finalScore, passed, categories, recommendations }
 */
function calcMaturityScore(categoryScores) {
  const categories = Object.keys(CATEGORIES).map(key => {
    const categoryId = CATEGORIES[key];
    const levels = categoryScores[categoryId] || {};
    const result = calcCategoryScore(levels);
    
    return {
      id: categoryId,
      label: CATEGORY_LABELS[categoryId],
      ...result
    };
  });

  // Calcular média aritmética
  const totalScore = categories.reduce((sum, cat) => sum + cat.score, 0);
  const finalScore = totalScore / categories.length;

  // Meta: >= 2.5 para certificação
  const passed = finalScore >= 2.5;

  // Gerar recomendações
  const recommendations = [];
  
  categories.forEach(cat => {
    if (!cat.hasLevel1) {
      recommendations.push({
        category: cat.label,
        priority: 'critical',
        message: `Categoria "${cat.label}" não possui Nível 1. Priorize implementar os requisitos básicos.`
      });
    } else if (cat.score < 2.0) {
      recommendations.push({
        category: cat.label,
        priority: 'high',
        message: `Categoria "${cat.label}" está no Nível 1. Trabalhe para atingir o Nível 2.`
      });
    } else if (cat.score < 3.0) {
      recommendations.push({
        category: cat.label,
        priority: 'medium',
        message: `Categoria "${cat.label}" está no Nível 2. Avance para o Nível 3.`
      });
    }
  });

  // Ordenar recomendações por prioridade
  const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  recommendations.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  return {
    finalScore: Math.round(finalScore * 1000) / 1000,
    passed,
    passingScore: 2.5,
    categories,
    recommendations,
    summary: {
      totalCategories: categories.length,
      categoriesWithLevel1: categories.filter(c => c.hasLevel1).length,
      categoriesWithPartialScore: categories.filter(c => c.partialScore).length,
      averageScore: Math.round(finalScore * 100) / 100
    }
  };
}

/**
 * Avalia automaticamente algumas categorias baseado em métricas operacionais
 * 
 * @param {Object} metrics - Métricas HDI calculadas
 * @returns {Object} Avaliação automática de categorias
 */
function autoEvaluateFromMetrics(metrics) {
  const evaluation = {};

  // Resultados de Performance (baseado em FCR, FLR, SLA)
  evaluation[CATEGORIES.RESULTS_PERFORMANCE] = {
    level1: metrics.fcr?.rate >= 50 || metrics.flr?.rate >= 60,
    level2: metrics.fcr?.rate >= 65 && metrics.flr?.rate >= 70,
    level3: metrics.fcr?.rate >= 75 && metrics.flr?.rate >= 80,
    level4: metrics.fcr?.rate >= 85 && metrics.flr?.rate >= 90
  };

  // Resultados de Tratamento de Contatos (baseado em abandono e backlog)
  const abandonRate = metrics.abandonmentRate?.rate || 100;
  const backlogRatio = metrics.backlog?.openTickets > 0 
    ? metrics.backlog.closedTickets / metrics.backlog.openTickets 
    : 0;

  evaluation[CATEGORIES.RESULTS_HANDLING] = {
    level1: abandonRate <= 15 && backlogRatio >= 0.5,
    level2: abandonRate <= 10 && backlogRatio >= 0.8,
    level3: abandonRate <= 5 && backlogRatio >= 1.0,
    level4: abandonRate <= 3 && backlogRatio >= 1.2
  };

  // Resultados de Pessoas (baseado em CSAT)
  const csatAvg = metrics.csat?.average || 0;
  const csatPositive = metrics.csat?.positiveRate || 0;

  evaluation[CATEGORIES.RESULTS_PEOPLE] = {
    level1: csatAvg >= 3.0 || csatPositive >= 60,
    level2: csatAvg >= 3.5 && csatPositive >= 70,
    level3: csatAvg >= 4.0 && csatPositive >= 80,
    level4: csatAvg >= 4.5 && csatPositive >= 90
  };

  return evaluation;
}

/**
 * Gera relatório completo de maturidade
 */
function generateMaturityReport(categoryScores, metrics = null) {
  // Se temos métricas, fazer auto-avaliação das categorias de resultados
  let finalScores = { ...categoryScores };
  
  if (metrics) {
    const autoEval = autoEvaluateFromMetrics(metrics);
    finalScores = { ...finalScores, ...autoEval };
  }

  const maturityResult = calcMaturityScore(finalScores);

  return {
    ...maturityResult,
    generatedAt: new Date().toISOString(),
    metricsUsed: metrics ? true : false,
    status: maturityResult.passed ? 'APROVADO' : 'REPROVADO',
    statusMessage: maturityResult.passed 
      ? `Parabéns! Nota ${maturityResult.finalScore.toFixed(2)} >= 2.5. Elegível para certificação HDI.`
      : `Nota ${maturityResult.finalScore.toFixed(2)} < 2.5. Necessário melhorar para certificação.`
  };
}

// ============================================================================
// EXPORTS
// ============================================================================
module.exports = {
  CATEGORIES,
  CATEGORY_LABELS,
  calcCategoryScore,
  calcMaturityScore,
  autoEvaluateFromMetrics,
  generateMaturityReport
};
