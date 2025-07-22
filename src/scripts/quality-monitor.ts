#!/usr/bin/env tsx
/**
 * Bridge Quality Monitor - Internal Script
 *
 * Provides quality metrics and monitoring for Bridge development and DXT releases.
 * Used internally for quality tracking and experiment validation.
 */

import { QualityMetricsService } from '../services/quality-metrics.js';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

interface QualityReport {
  timestamp: string;
  overallScore: number;
  status: string;
  breakdown: {
    manifest: number;
    build: number;
    codeQuality: number;
    security: number;
    performance: number;
    documentation: number;
    userExperience: number;
  };
  details?: {
    testCoverage: number;
    lintErrors: number;
    bundleSize: string;
    vulnerabilities: number;
    lastUpdated: string;
  };
  recommendations: string[];
}

/**
 * Quality Monitor for Bridge development
 * @remarks
 * Internal script for quality tracking and monitoring.
 * Provides detailed quality metrics for development and release validation.
 */
class QualityMonitor {
  private qualityService: QualityMetricsService;

  constructor() {
    this.qualityService = new QualityMetricsService();
  }

  /**
   * Generates comprehensive quality report
   * @param includeDetails - Whether to include detailed metrics
   * @returns Quality report with scores and recommendations
   */
  async generateReport(includeDetails: boolean = true): Promise<QualityReport> {
    console.log('🔍 Generating Bridge quality report...');

    const metrics = await this.qualityService.calculateQualityMetrics({
      includeDetails,
    });

    const report: QualityReport = {
      timestamp: new Date().toISOString(),
      overallScore: metrics.overallScore,
      status: metrics.status,
      breakdown: metrics.breakdown,
      recommendations: metrics.recommendations,
    };

    if (metrics.details) {
      report.details = metrics.details;
    }

    return report;
  }

  /**
   * Saves quality report to file
   * @param report - Quality report to save
   * @param filename - Optional filename (defaults to timestamp)
   */
  saveReport(report: QualityReport, filename?: string): void {
    const reportsDir = join(process.cwd(), 'loop', 'quality-reports');

    if (!existsSync(reportsDir)) {
      mkdirSync(reportsDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const defaultFilename = `quality-report-${timestamp}.json`;
    const filepath = join(reportsDir, filename || defaultFilename);

    writeFileSync(filepath, JSON.stringify(report, null, 2));
    console.log(`📊 Quality report saved: ${filepath}`);
  }

  /**
   * Displays quality report in console
   * @param report - Quality report to display
   */
  displayReport(report: QualityReport): void {
    console.log('\n📊 Bridge Quality Report');
    console.log('========================');
    console.log(`📅 Generated: ${new Date(report.timestamp).toLocaleString()}`);
    console.log(`🎯 Overall Score: ${report.overallScore}/100`);
    console.log(`📈 Status: ${this.getStatusEmoji(report.status)} ${report.status.toUpperCase()}`);

    console.log('\n📋 Breakdown:');
    console.log(`  📄 Manifest: ${report.breakdown.manifest}/20`);
    console.log(`  🔨 Build: ${report.breakdown.build}/20`);
    console.log(`  💻 Code Quality: ${report.breakdown.codeQuality}/20`);
    console.log(`  🔒 Security: ${report.breakdown.security}/15`);
    console.log(`  ⚡ Performance: ${report.breakdown.performance}/10`);
    console.log(`  📚 Documentation: ${report.breakdown.documentation}/10`);
    console.log(`  👤 User Experience: ${report.breakdown.userExperience}/5`);

    if (report.details) {
      console.log('\n📊 Details:');
      console.log(`  🧪 Test Coverage: ${report.details.testCoverage}%`);
      console.log(`  🔍 Lint Errors: ${report.details.lintErrors}`);
      console.log(`  📦 Bundle Size: ${report.details.bundleSize}`);
      console.log(`  🛡️ Vulnerabilities: ${report.details.vulnerabilities}`);
      console.log(`  🕐 Last Updated: ${new Date(report.details.lastUpdated).toLocaleString()}`);
    }

    console.log('\n💡 Recommendations:');
    report.recommendations.forEach((rec, index) => {
      console.log(`  ${index + 1}. ${rec}`);
    });

    console.log('\n' + this.getQualitySummary(report.overallScore));
  }

  /**
   * Gets status emoji for quality status
   * @param status - Quality status
   * @returns Status emoji
   */
  private getStatusEmoji(status: string): string {
    switch (status) {
      case 'excellent':
        return '🎉';
      case 'good':
        return '✅';
      case 'acceptable':
        return '⚠️';
      case 'poor':
        return '❌';
      default:
        return '❓';
    }
  }

  /**
   * Gets quality summary based on score
   * @param score - Overall quality score
   * @returns Quality summary message
   */
  private getQualitySummary(score: number): string {
    if (score >= 90) {
      return '🎉 EXCELLENT QUALITY - Bridge is ready for production release!';
    } else if (score >= 80) {
      return '✅ GOOD QUALITY - Minor improvements recommended before release.';
    } else if (score >= 70) {
      return '⚠️ ACCEPTABLE QUALITY - Improvements needed before release.';
    } else {
      return '❌ POOR QUALITY - Significant improvements required before release.';
    }
  }

  /**
   * Checks if quality meets release criteria
   * @param report - Quality report to check
   * @returns Whether quality meets release criteria
   */
  meetsReleaseCriteria(report: QualityReport): boolean {
    const criteria = {
      overallScore: report.overallScore >= 80,
      manifest: report.breakdown.manifest >= 15,
      build: report.breakdown.build >= 15,
      codeQuality: report.breakdown.codeQuality >= 15,
      security: report.breakdown.security >= 10,
      performance: report.breakdown.performance >= 7,
      documentation: report.breakdown.documentation >= 7,
      userExperience: report.breakdown.userExperience >= 3,
    };

    const passed = Object.values(criteria).filter(Boolean).length;
    const total = Object.keys(criteria).length;

    console.log('\n🔍 Release Criteria Check:');
    console.log(
      `  Overall Score (≥80): ${criteria.overallScore ? '✅' : '❌'} (${report.overallScore})`
    );
    console.log(
      `  Manifest (≥15): ${criteria.manifest ? '✅' : '❌'} (${report.breakdown.manifest})`
    );
    console.log(`  Build (≥15): ${criteria.build ? '✅' : '❌'} (${report.breakdown.build})`);
    console.log(
      `  Code Quality (≥15): ${criteria.codeQuality ? '✅' : '❌'} (${report.breakdown.codeQuality})`
    );
    console.log(
      `  Security (≥10): ${criteria.security ? '✅' : '❌'} (${report.breakdown.security})`
    );
    console.log(
      `  Performance (≥7): ${criteria.performance ? '✅' : '❌'} (${report.breakdown.performance})`
    );
    console.log(
      `  Documentation (≥7): ${criteria.documentation ? '✅' : '❌'} (${report.breakdown.documentation})`
    );
    console.log(
      `  User Experience (≥3): ${criteria.userExperience ? '✅' : '❌'} (${report.breakdown.userExperience})`
    );

    const meetsCriteria = passed === total;
    console.log(
      `\n📊 Release Ready: ${meetsCriteria ? '✅ YES' : '❌ NO'} (${passed}/${total} criteria met)`
    );

    return meetsCriteria;
  }
}

/**
 * Main function for quality monitoring
 */
async function main(): Promise<void> {
  const monitor = new QualityMonitor();

  try {
    // Generate quality report
    const report = await monitor.generateReport(true);

    // Display report
    monitor.displayReport(report);

    // Check release criteria
    const meetsCriteria = monitor.meetsReleaseCriteria(report);

    // Save report
    monitor.saveReport(report);

    // Exit with appropriate code
    process.exit(meetsCriteria ? 0 : 1);
  } catch (error) {
    console.error('❌ Error generating quality report:', error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
