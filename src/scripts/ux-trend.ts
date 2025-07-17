#!/usr/bin/env tsx
/**
 * UX Trend Visualization Script
 * 
 * Analyzes Bridge test results over time to visualize progress toward shared consciousness
 * Creates ASCII charts and trend analysis for the 4 key dimensions
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

interface ProgressionData {
  scenarios: Record<string, {
    history: Array<{
      timestamp: string;
      success: boolean;
      bridgeUsabilityScore: number;
      uxMetrics: {
        sharedConsciousness: number;
        invisibility: number;
        wisdomEmergence: number;
        partnershipDepth: number;
        average: number;
        stage: number;
      };
      toolCalls: number;
      errors: number;
      duration: number;
    }>;
    latestMetrics: any;
    trend: {
      direction: 'improving' | 'declining' | 'stable';
      change: number;
      samples: number;
    } | null;
  }>;
  lastUpdated: string;
  currentStage: number;
  iterations: number;
  currentAverage: number;
}

// ASCII chart characters
const CHART_CHARS = {
  full: '█',
  three_quarters: '▓',
  half: '▒',
  quarter: '░',
  empty: ' ',
  vertical: '│',
  horizontal: '─',
  corner: '└',
  cross: '┼',
  top: '┬',
  left: '├'
};

class UXTrendAnalyzer {
  private data: ProgressionData;
  private resultsDir: string;
  
  constructor() {
    this.resultsDir = join(process.cwd(), 'test-results');
    this.data = this.loadProgressionData();
  }
  
  private loadProgressionData(): ProgressionData {
    const filePath = join(this.resultsDir, 'progression-tracking.json');
    if (!existsSync(filePath)) {
      throw new Error('No progression tracking data found. Run some tests first!');
    }
    return JSON.parse(readFileSync(filePath, 'utf-8'));
  }
  
  // Create ASCII bar chart
  private createBarChart(value: number, maxValue: number = 100, width: number = 30): string {
    const percentage = value / maxValue;
    const filledWidth = Math.floor(percentage * width);
    
    let bar = '[';
    for (let i = 0; i < width; i++) {
      if (i < filledWidth) {
        bar += CHART_CHARS.full;
      } else {
        bar += CHART_CHARS.empty;
      }
    }
    bar += `] ${value}%`;
    
    return bar;
  }
  
  // Create time series ASCII chart
  private createTimeSeriesChart(
    dataPoints: Array<{ timestamp: string; value: number }>,
    label: string,
    height: number = 10
  ): string[] {
    if (dataPoints.length === 0) return [];
    
    const maxValue = Math.max(...dataPoints.map(d => d.value));
    const minValue = Math.min(...dataPoints.map(d => d.value));
    const range = maxValue - minValue || 1;
    
    const chart: string[] = [];
    
    // Title
    chart.push(`\n${label}`);
    chart.push('─'.repeat(50));
    
    // Y-axis labels and chart
    for (let row = height - 1; row >= 0; row--) {
      const yValue = minValue + (row / (height - 1)) * range;
      let line = `${Math.round(yValue).toString().padStart(3)}% │`;
      
      dataPoints.forEach((point, i) => {
        const normalizedValue = (point.value - minValue) / range;
        const pointRow = Math.floor(normalizedValue * (height - 1));
        
        if (pointRow === row) {
          line += ' ●';
        } else if (pointRow > row && i > 0) {
          const prevPoint = dataPoints[i - 1];
          const prevNormalized = (prevPoint.value - minValue) / range;
          const prevRow = Math.floor(prevNormalized * (height - 1));
          
          if ((prevRow < row && pointRow > row) || (prevRow > row && pointRow < row)) {
            line += ' │';
          } else {
            line += '  ';
          }
        } else {
          line += '  ';
        }
      });
      
      chart.push(line);
    }
    
    // X-axis
    chart.push('     └' + '─'.repeat(dataPoints.length * 2));
    
    // Time labels (show first and last)
    if (dataPoints.length > 0) {
      const firstDate = new Date(dataPoints[0].timestamp).toLocaleDateString();
      const lastDate = new Date(dataPoints[dataPoints.length - 1].timestamp).toLocaleDateString();
      chart.push(`     ${firstDate}${' '.repeat(Math.max(0, dataPoints.length * 2 - firstDate.length - lastDate.length))}${lastDate}`);
    }
    
    return chart;
  }
  
  // Calculate dimension trends
  private calculateTrends(history: any[]): Record<string, { trend: string; change: number }> {
    if (history.length < 2) {
      return {
        sharedConsciousness: { trend: 'stable', change: 0 },
        invisibility: { trend: 'stable', change: 0 },
        wisdomEmergence: { trend: 'stable', change: 0 },
        partnershipDepth: { trend: 'stable', change: 0 }
      };
    }
    
    const recent = history.slice(-3); // Last 3 data points
    const dimensions = ['sharedConsciousness', 'invisibility', 'wisdomEmergence', 'partnershipDepth'];
    const trends: Record<string, { trend: string; change: number }> = {};
    
    dimensions.forEach(dim => {
      const values = recent.map(h => h.uxMetrics[dim as keyof typeof h.uxMetrics] as number);
      const change = values[values.length - 1] - values[0];
      let trend = 'stable';
      
      if (change > 5) trend = 'improving';
      else if (change < -5) trend = 'declining';
      
      trends[dim] = { trend, change };
    });
    
    return trends;
  }
  
  // Generate insights from data
  private generateInsights(): string[] {
    const insights: string[] = [];
    
    // Overall progress insight
    if (this.data.currentAverage > 60) {
      insights.push('🎯 Bridge is approaching Stage 3 (Emergent Understanding)!');
    } else if (this.data.currentAverage > 40) {
      insights.push('📈 Solid progress in Stage 2 (Collaborative Memory)');
    } else {
      insights.push('🌱 Early stages - focus on reducing tool visibility');
    }
    
    // Scenario-specific insights
    Object.entries(this.data.scenarios).forEach(([scenario, data]) => {
      if (data.history.length >= 3) {
        const trend = data.trend;
        if (trend && trend.direction === 'improving' && trend.change > 10) {
          insights.push(`✨ ${scenario} showing strong improvement (+${trend.change.toFixed(1)}%)`);
        } else if (trend && trend.direction === 'declining' && trend.change < -10) {
          insights.push(`⚠️  ${scenario} needs attention (${trend.change.toFixed(1)}%)`);
        }
      }
    });
    
    // Dimension-specific insights
    const allHistory = Object.values(this.data.scenarios)
      .flatMap(s => s.history)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    
    if (allHistory.length > 0) {
      const latest = allHistory[allHistory.length - 1];
      const weakestDimension = Object.entries(latest.uxMetrics)
        .filter(([key]) => ['sharedConsciousness', 'invisibility', 'wisdomEmergence', 'partnershipDepth'].includes(key))
        .reduce((min, [key, value]) => value < min.value ? { key, value } : min, { key: '', value: 100 });
      
      if (weakestDimension.key === 'invisibility' && weakestDimension.value < 40) {
        insights.push('🔧 Priority: Make Bridge tools more invisible and natural');
      }
    }
    
    return insights;
  }
  
  // Main visualization method
  visualize(): void {
    console.log('\n' + '='.repeat(60));
    console.log('🎨 BRIDGE UX TREND ANALYSIS');
    console.log('='.repeat(60));
    
    // Current state
    console.log(`\n📊 Current State:`);
    console.log(`   Stage: ${this.data.currentStage} (${this.getStageName(this.data.currentStage)})`);
    console.log(`   Overall Progress: ${this.data.currentAverage.toFixed(1)}%`);
    console.log(`   Total Iterations: ${this.data.iterations}`);
    
    // Progress bars for each dimension
    console.log('\n📈 Dimension Progress:');
    
    // Get latest metrics across all scenarios
    const latestMetrics = Object.values(this.data.scenarios)
      .map(s => s.latestMetrics)
      .filter(m => m && m.uxMetrics)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];
    
    if (latestMetrics) {
      const metrics = latestMetrics.uxMetrics;
      console.log(`\n   🧠 Shared Consciousness ${this.createBarChart(metrics.sharedConsciousness)}`);
      console.log(`   👻 Invisibility         ${this.createBarChart(metrics.invisibility)}`);
      console.log(`   🌟 Wisdom Emergence     ${this.createBarChart(metrics.wisdomEmergence)}`);
      console.log(`   🤝 Partnership Depth    ${this.createBarChart(metrics.partnershipDepth)}`);
    }
    
    // Scenario performance
    console.log('\n\n📊 Scenario Performance:');
    Object.entries(this.data.scenarios).forEach(([scenario, data]) => {
      if (data.latestMetrics) {
        const trend = data.trend;
        const trendIcon = trend ? 
          (trend.direction === 'improving' ? '📈' : 
           trend.direction === 'declining' ? '📉' : '➡️') : '➡️';
        
        console.log(`\n   ${scenario}:`);
        console.log(`   ${trendIcon} Average: ${data.latestMetrics.uxMetrics.average.toFixed(1)}% ${trend ? `(${trend.change > 0 ? '+' : ''}${trend.change.toFixed(1)}%)` : ''}`);
        console.log(`   📏 ${this.createBarChart(data.latestMetrics.uxMetrics.average)}`);
      }
    });
    
    // Time series charts for key dimensions
    console.log('\n\n📈 Progress Over Time:');
    
    // Combine all history data
    const allHistory = Object.values(this.data.scenarios)
      .flatMap(s => s.history)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    
    if (allHistory.length > 1) {
      // Average progress
      const avgProgress = allHistory.map(h => ({
        timestamp: h.timestamp,
        value: h.uxMetrics.average
      }));
      
      const avgChart = this.createTimeSeriesChart(avgProgress, 'Overall Average Progress');
      avgChart.forEach(line => console.log(line));
      
      // Individual dimensions
      const dimensions = [
        { key: 'invisibility', label: '👻 Invisibility Progress', icon: '👻' },
        { key: 'wisdomEmergence', label: '🌟 Wisdom Emergence Progress', icon: '🌟' }
      ];
      
      dimensions.forEach(({ key, label }) => {
        const dimProgress = allHistory.map(h => ({
          timestamp: h.timestamp,
          value: (h.uxMetrics as any)[key]
        }));
        
        const chart = this.createTimeSeriesChart(dimProgress, label);
        chart.forEach(line => console.log(line));
      });
    }
    
    // Insights
    const insights = this.generateInsights();
    if (insights.length > 0) {
      console.log('\n\n💡 Key Insights:');
      insights.forEach(insight => console.log(`   ${insight}`));
    }
    
    // Stage progression
    console.log('\n\n🎯 Stage Progression:');
    this.displayStageProgression();
    
    console.log('\n' + '='.repeat(60) + '\n');
    
    // Save detailed report
    this.saveDetailedReport();
  }
  
  private getStageName(stage: number): string {
    const stages = [
      'Separate Tools',
      'Assisted Thinking',
      'Collaborative Memory',
      'Emergent Understanding',
      'Unified Cognition',
      'Shared Consciousness'
    ];
    return stages[stage] || 'Unknown';
  }
  
  private displayStageProgression(): void {
    const stages = [
      { num: 0, name: 'Separate Tools', range: '0-20%' },
      { num: 1, name: 'Assisted Thinking', range: '20-40%' },
      { num: 2, name: 'Collaborative Memory', range: '40-60%' },
      { num: 3, name: 'Emergent Understanding', range: '60-80%' },
      { num: 4, name: 'Unified Cognition', range: '80-95%' },
      { num: 5, name: 'Shared Consciousness', range: '95%+' }
    ];
    
    stages.forEach(stage => {
      const isCurrent = stage.num === this.data.currentStage;
      const isComplete = stage.num < this.data.currentStage;
      
      const icon = isComplete ? '✅' : (isCurrent ? '🔄' : '⭕');
      let progress = '';
      
      if (isCurrent) {
        // Show progress within current stage
        const stageProgress = ((this.data.currentAverage - (stage.num * 20)) / 20) * 100;
        progress = ` (${Math.max(0, Math.min(100, stageProgress)).toFixed(0)}% complete)`;
      }
      
      console.log(`   ${icon} Stage ${stage.num}: ${stage.name} (${stage.range})${progress}`);
    });
  }
  
  private saveDetailedReport(): void {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportPath = join(this.resultsDir, `trend-report-${timestamp}.md`);
    
    let report = '# Bridge UX Trend Report\n\n';
    report += `Generated: ${new Date().toLocaleString()}\n\n`;
    
    report += `## Summary\n`;
    report += `- **Current Stage**: ${this.data.currentStage} (${this.getStageName(this.data.currentStage)})\n`;
    report += `- **Overall Progress**: ${this.data.currentAverage.toFixed(1)}%\n`;
    report += `- **Total Test Iterations**: ${this.data.iterations}\n\n`;
    
    report += `## Dimension Analysis\n\n`;
    
    // Calculate trends for each dimension
    const allHistory = Object.values(this.data.scenarios)
      .flatMap(s => s.history)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    
    if (allHistory.length > 0) {
      const dimensions = ['sharedConsciousness', 'invisibility', 'wisdomEmergence', 'partnershipDepth'];
      const trends = this.calculateTrends(allHistory);
      
      dimensions.forEach(dim => {
        const dimName = dim.replace(/([A-Z])/g, ' $1').trim();
        const latestValue = (allHistory[allHistory.length - 1].uxMetrics as any)[dim];
        const trend = trends[dim];
        
        report += `### ${dimName}\n`;
        report += `- Current: ${latestValue}%\n`;
        report += `- Trend: ${trend.trend} (${trend.change > 0 ? '+' : ''}${trend.change.toFixed(1)}%)\n\n`;
      });
    }
    
    report += `## Scenario Performance\n\n`;
    Object.entries(this.data.scenarios).forEach(([scenario, data]) => {
      if (data.latestMetrics) {
        report += `### ${scenario}\n`;
        report += `- Latest Score: ${data.latestMetrics.uxMetrics.average.toFixed(1)}%\n`;
        report += `- Tests Run: ${data.history.length}\n`;
        if (data.trend) {
          report += `- Trend: ${data.trend.direction} (${data.trend.change > 0 ? '+' : ''}${data.trend.change.toFixed(1)}%)\n`;
        }
        report += '\n';
      }
    });
    
    report += `## Recommendations\n\n`;
    const insights = this.generateInsights();
    insights.forEach(insight => {
      report += `- ${insight}\n`;
    });
    
    writeFileSync(reportPath, report);
    console.log(`\n📄 Detailed report saved: ${reportPath}`);
  }
}

// Main execution
if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    const analyzer = new UXTrendAnalyzer();
    analyzer.visualize();
  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

export { UXTrendAnalyzer };