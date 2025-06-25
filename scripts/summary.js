#!/usr/bin/env node

/**
 * Project Summary Script
 * 
 * Генерирует краткий отчет о состоянии проекта с ключевыми метриками
 * и рекомендациями для быстрого ознакомления.
 * 
 * @author Claude Code
 * @version 1.0.0
 */

const fs = require('fs');
const path = require('path');

// Цвета для красивого вывода
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
};

const icons = {
  rocket: '🚀',
  check: '✅',
  warning: '⚠️',
  error: '❌',
  info: 'ℹ️',
  gear: '⚙️',
  star: '⭐',
  fire: '🔥',
  gem: '💎',
  trophy: '🏆',
};

class ProjectSummary {
  constructor() {
    this.projectRoot = process.cwd();
  }

  log(color, message) {
    console.log(`${color}${message}${colors.reset}`);
  }

  printBanner() {
    const width = 80;
    const title = 'UNIVERSAL AI CHAT HUB - PROJECT SUMMARY';
    const padding = Math.floor((width - title.length) / 2);
    
    console.log();
    this.log(colors.cyan, '═'.repeat(width));
    this.log(colors.cyan, ' '.repeat(padding) + title);
    this.log(colors.cyan, '═'.repeat(width));
    console.log();
  }

  async getProjectStats() {
    const stats = {
      files: 0,
      tsFiles: 0,
      components: 0,
      utils: 0,
      docs: 0,
      scripts: 0,
      lines: 0,
    };

    const countFiles = (dir) => {
      try {
        const files = fs.readdirSync(dir);
        
        for (const file of files) {
          const filePath = path.join(dir, file);
          const stat = fs.statSync(filePath);
          
          if (stat.isDirectory()) {
            if (!['node_modules', '.git', '.next', 'dist'].includes(file)) {
              countFiles(filePath);
            }
          } else if (stat.isFile()) {
            stats.files++;
            
            if (file.endsWith('.ts') || file.endsWith('.tsx')) {
              stats.tsFiles++;
              
              // Подсчитываем строки
              try {
                const content = fs.readFileSync(filePath, 'utf8');
                stats.lines += content.split('\n').length;
              } catch (e) {
                // Игнорируем ошибки чтения
              }
            }
            
            if (filePath.includes('/components/') && (file.endsWith('.tsx') || file.endsWith('.jsx'))) {
              stats.components++;
            }
            
            if (filePath.includes('/lib/') || filePath.includes('/utils/')) {
              stats.utils++;
            }
            
            if (filePath.includes('/docs/') && file.endsWith('.md')) {
              stats.docs++;
            }
            
            if (filePath.includes('/scripts/') && file.endsWith('.js')) {
              stats.scripts++;
            }
          }
        }
      } catch (error) {
        // Игнорируем ошибки доступа к директориям
      }
    };

    countFiles(this.projectRoot);
    return stats;
  }

  async getPackageInfo() {
    try {
      const packagePath = path.join(this.projectRoot, 'package.json');
      if (fs.existsSync(packagePath)) {
        const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
        return {
          name: packageJson.name,
          version: packageJson.version,
          dependencies: Object.keys(packageJson.dependencies || {}).length,
          devDependencies: Object.keys(packageJson.devDependencies || {}).length,
          scripts: Object.keys(packageJson.scripts || {}).length,
        };
      }
    } catch (error) {
      // Игнорируем ошибки
    }
    return null;
  }

  async getArchitectureInfo() {
    const features = {
      nextjs: fs.existsSync(path.join(this.projectRoot, 'next.config.ts')),
      typescript: fs.existsSync(path.join(this.projectRoot, 'tsconfig.json')),
      tailwind: fs.existsSync(path.join(this.projectRoot, 'tailwind.config.ts')),
      copilotkit: false,
      mcp: false,
      monitoring: false,
      automation: false,
    };

    // Проверяем наличие CopilotKit
    try {
      const packagePath = path.join(this.projectRoot, 'package.json');
      if (fs.existsSync(packagePath)) {
        const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
        features.copilotkit = Object.keys(packageJson.dependencies || {}).some(dep => 
          dep.includes('copilotkit')
        );
      }
    } catch (e) {}

    // Проверяем MCP интеграцию
    features.mcp = fs.existsSync(path.join(this.projectRoot, 'src/lib/mcp'));

    // Проверяем систему мониторинга
    features.monitoring = fs.existsSync(path.join(this.projectRoot, 'src/lib/monitoring'));

    // Проверяем скрипты автоматизации
    features.automation = fs.existsSync(path.join(this.projectRoot, 'scripts')) &&
      fs.readdirSync(path.join(this.projectRoot, 'scripts')).length > 2;

    return features;
  }

  printSection(title, content) {
    this.log(colors.blue, `\n${icons.star} ${title}:`);
    content.forEach(line => {
      this.log(colors.gray, `  ${line}`);
    });
  }

  async run() {
    this.printBanner();

    // Получаем информацию о проекте
    const stats = await this.getProjectStats();
    const packageInfo = await this.getPackageInfo();
    const architecture = await this.getArchitectureInfo();

    // Основная информация
    this.printSection('PROJECT INFO', [
      `${icons.rocket} Name: ${packageInfo?.name || 'Unknown'}`,
      `${icons.info} Version: ${packageInfo?.version || 'Unknown'}`,
      `${icons.gear} TypeScript Lines: ${stats.lines.toLocaleString()}`,
      `${icons.check} Files: ${stats.files} total, ${stats.tsFiles} TypeScript`,
    ]);

    // Архитектура
    this.printSection('ARCHITECTURE', [
      `${architecture.nextjs ? icons.check : icons.error} Next.js ${architecture.nextjs ? '15 (App Router)' : 'Not detected'}`,
      `${architecture.typescript ? icons.check : icons.error} TypeScript ${architecture.typescript ? 'Configured' : 'Missing'}`,
      `${architecture.tailwind ? icons.check : icons.error} Tailwind CSS ${architecture.tailwind ? 'Configured' : 'Missing'}`,
      `${architecture.copilotkit ? icons.check : icons.error} CopilotKit ${architecture.copilotkit ? 'Integrated' : 'Missing'}`,
      `${architecture.mcp ? icons.check : icons.error} MCP Integration ${architecture.mcp ? 'Available' : 'Missing'}`,
    ]);

    // Компоненты
    this.printSection('COMPONENTS', [
      `${icons.gem} React Components: ${stats.components}`,
      `${icons.gear} Utility Modules: ${stats.utils}`,
      `${icons.fire} Documentation Files: ${stats.docs}`,
      `${icons.rocket} Automation Scripts: ${stats.scripts}`,
    ]);

    // Зависимости
    if (packageInfo) {
      this.printSection('DEPENDENCIES', [
        `${icons.check} Production: ${packageInfo.dependencies}`,
        `${icons.gear} Development: ${packageInfo.devDependencies}`,
        `${icons.rocket} NPM Scripts: ${packageInfo.scripts}`,
      ]);
    }

    // Инновации
    this.printSection('INNOVATIONS', [
      `${architecture.monitoring ? icons.trophy : icons.warning} Task Monitoring System ${architecture.monitoring ? 'Implemented' : 'Missing'}`,
      `${architecture.automation ? icons.trophy : icons.warning} Development Automation ${architecture.automation ? 'Available' : 'Basic'}`,
      `${architecture.mcp ? icons.trophy : icons.warning} Universal AI Hub ${architecture.mcp ? 'Implemented' : 'Missing'}`,
      `${stats.docs > 5 ? icons.trophy : icons.warning} Comprehensive Docs ${stats.docs > 5 ? 'Excellent' : 'Basic'}`,
    ]);

    // Статус здоровья
    const healthScore = this.calculateHealthScore(architecture, stats);
    this.printSection('HEALTH STATUS', [
      `${icons.fire} Overall Score: ${healthScore}/100`,
      `${healthScore > 80 ? icons.trophy : healthScore > 60 ? icons.check : icons.warning} Status: ${
        healthScore > 80 ? 'Excellent' : healthScore > 60 ? 'Good' : 'Needs Attention'
      }`,
    ]);

    // Быстрые команды
    this.printSection('QUICK COMMANDS', [
      `${icons.rocket} Start development: npm run dev:smart`,
      `${icons.check} Health check: npm run health`,
      `${icons.gear} Type check: npm run type-check`,
      `${icons.fire} Full audit: node scripts/audit.js`,
      `${icons.trophy} Fix quotes: node scripts/fix-quotes.js`,
    ]);

    // Заключение
    console.log();
    this.log(colors.cyan, '═'.repeat(80));
    
    if (healthScore > 80) {
      this.log(colors.green, `${icons.trophy} EXCELLENT! Project is in great shape and ready for development.`);
    } else if (healthScore > 60) {
      this.log(colors.yellow, `${icons.check} GOOD! Project is functional with minor improvements needed.`);
    } else {
      this.log(colors.red, `${icons.warning} ATTENTION! Project needs significant improvements.`);
    }
    
    this.log(colors.gray, '\nFor detailed analysis, run: node scripts/audit.js');
    this.log(colors.gray, 'For documentation, see: docs/ directory');
    console.log();
  }

  calculateHealthScore(architecture, stats) {
    let score = 0;
    
    // Базовая архитектура (40 баллов)
    if (architecture.nextjs) score += 10;
    if (architecture.typescript) score += 10;
    if (architecture.tailwind) score += 5;
    if (architecture.copilotkit) score += 15;
    
    // Инновации (30 баллов)
    if (architecture.mcp) score += 15;
    if (architecture.monitoring) score += 10;
    if (architecture.automation) score += 5;
    
    // Качество кода (20 баллов)
    if (stats.components > 10) score += 5;
    if (stats.utils > 5) score += 5;
    if (stats.tsFiles > 20) score += 5;
    if (stats.lines > 1000) score += 5;
    
    // Документация (10 баллов)
    if (stats.docs > 5) score += 5;
    if (stats.scripts > 3) score += 5;
    
    return Math.min(100, score);
  }
}

// Запуск если скрипт вызван напрямую
if (require.main === module) {
  const summary = new ProjectSummary();
  summary.run().catch(console.error);
}

module.exports = { ProjectSummary };