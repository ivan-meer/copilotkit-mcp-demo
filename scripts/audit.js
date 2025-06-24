#!/usr/bin/env node

/**
 * Project Audit Script
 * 
 * Комплексная проверка здоровья проекта с детальными отчетами
 * и рекомендациями по исправлению проблем.
 * 
 * @author Claude Code
 * @version 1.0.0
 */

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

// Цвета и иконки для красивого вывода
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
  success: '✅',
  warning: '⚠️',
  error: '❌',
  info: 'ℹ️',
  check: '🔍',
  fix: '🔧',
  security: '🔒',
  performance: '⚡',
  quality: '💎',
  dependencies: '📦',
};

/**
 * Менеджер аудита проекта
 */
class ProjectAuditor {
  constructor() {
    this.projectRoot = process.cwd();
    this.results = {
      overall: 'unknown',
      score: 0,
      checks: [],
      recommendations: [],
      summary: {
        passed: 0,
        warnings: 0,
        errors: 0,
        total: 0,
      }
    };
  }

  /**
   * Логирование с форматированием
   */
  log(level, icon, message, details = null) {
    const levelColors = {
      success: colors.green,
      warning: colors.yellow,
      error: colors.red,
      info: colors.blue,
    };

    const color = levelColors[level] || colors.blue;
    console.log(`${color}${icon} ${message}${colors.reset}`);
    
    if (details) {
      if (typeof details === 'string') {
        console.log(`${colors.gray}   ${details}${colors.reset}`);
      } else {
        console.log(`${colors.gray}   ${JSON.stringify(details, null, 2)}${colors.reset}`);
      }
    }
  }

  /**
   * Создание разделителя
   */
  separator(title) {
    const width = 80;
    const titleLength = title.length + 2;
    const sideLength = Math.floor((width - titleLength) / 2);
    const line = '═'.repeat(sideLength) + ` ${title} ` + '═'.repeat(width - sideLength - titleLength);
    console.log(`${colors.cyan}${line}${colors.reset}`);
  }

  /**
   * Добавление результата проверки
   */
  addResult(name, status, message, recommendation = null, details = null) {
    const result = {
      name,
      status, // 'pass', 'warn', 'fail'
      message,
      recommendation,
      details,
      timestamp: new Date()
    };

    this.results.checks.push(result);
    
    if (recommendation) {
      this.results.recommendations.push({
        check: name,
        recommendation,
        priority: status === 'fail' ? 'high' : 'medium'
      });
    }

    // Обновляем счетчики
    switch (status) {
      case 'pass':
        this.results.summary.passed++;
        break;
      case 'warn':
        this.results.summary.warnings++;
        break;
      case 'fail':
        this.results.summary.errors++;
        break;
    }
    this.results.summary.total++;

    // Логируем результат
    const levelMap = { pass: 'success', warn: 'warning', fail: 'error' };
    const iconMap = { pass: icons.success, warn: icons.warning, fail: icons.error };
    
    this.log(levelMap[status], iconMap[status], `${name}: ${message}`, details);
  }

  /**
   * Проверка структуры проекта
   */
  async checkProjectStructure() {
    this.separator('PROJECT STRUCTURE');

    const requiredFiles = [
      'package.json',
      'tsconfig.json',
      'next.config.ts',
      'tailwind.config.ts',
      '.gitignore',
      'README.md'
    ];

    const requiredDirs = [
      'src',
      'src/components',
      'src/lib',
      'src/app',
      'public',
      'docs',
      'scripts'
    ];

    // Проверяем файлы
    for (const file of requiredFiles) {
      const filePath = path.join(this.projectRoot, file);
      if (fs.existsSync(filePath)) {
        this.addResult(
          `Required file: ${file}`,
          'pass',
          'File exists'
        );
      } else {
        this.addResult(
          `Required file: ${file}`,
          'fail',
          'File missing',
          `Create ${file} file`
        );
      }
    }

    // Проверяем директории
    for (const dir of requiredDirs) {
      const dirPath = path.join(this.projectRoot, dir);
      if (fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory()) {
        this.addResult(
          `Required directory: ${dir}`,
          'pass',
          'Directory exists'
        );
      } else {
        this.addResult(
          `Required directory: ${dir}`,
          'fail',
          'Directory missing',
          `Create ${dir} directory`
        );
      }
    }
  }

  /**
   * Проверка зависимостей
   */
  async checkDependencies() {
    this.separator('DEPENDENCIES');

    try {
      // Проверяем package.json
      const packagePath = path.join(this.projectRoot, 'package.json');
      if (!fs.existsSync(packagePath)) {
        this.addResult(
          'Package.json',
          'fail',
          'package.json not found'
        );
        return;
      }

      const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));

      // Проверяем критичные зависимости
      const criticalDeps = [
        'react',
        'react-dom',
        'next',
        'typescript',
        '@copilotkit/react-core',
        '@copilotkit/react-ui',
        '@copilotkit/runtime'
      ];

      for (const dep of criticalDeps) {
        if (packageJson.dependencies?.[dep] || packageJson.devDependencies?.[dep]) {
          this.addResult(
            `Critical dependency: ${dep}`,
            'pass',
            'Dependency found'
          );
        } else {
          this.addResult(
            `Critical dependency: ${dep}`,
            'fail',
            'Dependency missing',
            `Install ${dep}: npm install ${dep}`
          );
        }
      }

      // Проверяем безопасность
      try {
        const { stdout } = await execAsync('npm audit --json');
        const auditResult = JSON.parse(stdout);
        
        if (auditResult.metadata.vulnerabilities.total === 0) {
          this.addResult(
            'Security audit',
            'pass',
            'No vulnerabilities found'
          );
        } else {
          const { high, critical } = auditResult.metadata.vulnerabilities;
          if (critical > 0) {
            this.addResult(
              'Security audit',
              'fail',
              `${critical} critical vulnerabilities found`,
              'Run: npm audit fix'
            );
          } else if (high > 0) {
            this.addResult(
              'Security audit',
              'warn',
              `${high} high severity vulnerabilities found`,
              'Run: npm audit fix'
            );
          } else {
            this.addResult(
              'Security audit',
              'warn',
              `${auditResult.metadata.vulnerabilities.total} vulnerabilities found`,
              'Run: npm audit'
            );
          }
        }
      } catch (error) {
        this.addResult(
          'Security audit',
          'warn',
          'Could not run security audit',
          'Run: npm audit manually'
        );
      }

      // Проверяем устаревшие пакеты
      try {
        const { stdout } = await execAsync('npm outdated --json');
        const outdated = JSON.parse(stdout);
        const outdatedCount = Object.keys(outdated).length;
        
        if (outdatedCount === 0) {
          this.addResult(
            'Package updates',
            'pass',
            'All packages up to date'
          );
        } else {
          this.addResult(
            'Package updates',
            'warn',
            `${outdatedCount} packages have updates available`,
            'Run: npm update'
          );
        }
      } catch (error) {
        // npm outdated возвращает ошибку когда есть устаревшие пакеты
        this.addResult(
          'Package updates',
          'warn',
          'Some packages may be outdated',
          'Run: npm outdated to check'
        );
      }

    } catch (error) {
      this.addResult(
        'Dependencies check',
        'fail',
        `Error checking dependencies: ${error.message}`
      );
    }
  }

  /**
   * Проверка TypeScript
   */
  async checkTypeScript() {
    this.separator('TYPESCRIPT');

    try {
      // Проверяем компиляцию TypeScript
      const { stdout, stderr } = await execAsync('npx tsc --noEmit');
      
      if (stderr && stderr.trim()) {
        const errors = stderr.trim().split('\n').length;
        this.addResult(
          'TypeScript compilation',
          'fail',
          `${errors} TypeScript errors found`,
          'Fix TypeScript errors before proceeding',
          stderr.split('\n').slice(0, 5).join('\n') + (errors > 5 ? '\n...' : '')
        );
      } else {
        this.addResult(
          'TypeScript compilation',
          'pass',
          'No TypeScript errors'
        );
      }
    } catch (error) {
      if (error.stderr) {
        const errorLines = error.stderr.trim().split('\n');
        const errorCount = errorLines.filter(line => line.includes('error TS')).length;
        
        this.addResult(
          'TypeScript compilation',
          'fail',
          `${errorCount} TypeScript errors found`,
          'Fix TypeScript errors before proceeding',
          errorLines.slice(0, 10).join('\n') + (errorLines.length > 10 ? '\n...' : '')
        );
      } else {
        this.addResult(
          'TypeScript compilation',
          'fail',
          'TypeScript check failed',
          'Ensure TypeScript is properly configured'
        );
      }
    }
  }

  /**
   * Проверка Next.js конфигурации
   */
  async checkNextJSConfig() {
    this.separator('NEXT.JS CONFIGURATION');

    // Проверяем next.config.ts
    const nextConfigPath = path.join(this.projectRoot, 'next.config.ts');
    if (fs.existsSync(nextConfigPath)) {
      this.addResult(
        'Next.js config',
        'pass',
        'next.config.ts found'
      );
    } else {
      // Проверяем альтернативные файлы конфигурации
      const altConfigs = ['next.config.js', 'next.config.mjs'];
      let configFound = false;
      
      for (const config of altConfigs) {
        if (fs.existsSync(path.join(this.projectRoot, config))) {
          this.addResult(
            'Next.js config',
            'warn',
            `Found ${config}, consider migrating to next.config.ts`,
            'Migrate to TypeScript config for better type safety'
          );
          configFound = true;
          break;
        }
      }
      
      if (!configFound) {
        this.addResult(
          'Next.js config',
          'fail',
          'No Next.js config file found',
          'Create next.config.ts file'
        );
      }
    }

    // Проверяем app directory structure
    const appDir = path.join(this.projectRoot, 'src/app');
    if (fs.existsSync(appDir)) {
      const layoutPath = path.join(appDir, 'layout.tsx');
      if (fs.existsSync(layoutPath)) {
        this.addResult(
          'App Router layout',
          'pass',
          'Root layout.tsx found'
        );
      } else {
        this.addResult(
          'App Router layout',
          'fail',
          'Root layout.tsx missing',
          'Create src/app/layout.tsx'
        );
      }
    } else {
      this.addResult(
        'App Router',
        'warn',
        'App directory not found, using Pages Router',
        'Consider migrating to App Router'
      );
    }
  }

  /**
   * Проверка кодовой базы
   */
  async checkCodeQuality() {
    this.separator('CODE QUALITY');

    try {
      // ESLint проверка
      try {
        const { stdout } = await execAsync('npx eslint . --ext .ts,.tsx --format json');
        const lintResults = JSON.parse(stdout);
        
        const totalErrors = lintResults.reduce((sum, result) => sum + result.errorCount, 0);
        const totalWarnings = lintResults.reduce((sum, result) => sum + result.warningCount, 0);
        
        if (totalErrors === 0 && totalWarnings === 0) {
          this.addResult(
            'ESLint',
            'pass',
            'No linting issues found'
          );
        } else if (totalErrors > 0) {
          this.addResult(
            'ESLint',
            'fail',
            `${totalErrors} errors and ${totalWarnings} warnings found`,
            'Run: npm run lint:fix'
          );
        } else {
          this.addResult(
            'ESLint',
            'warn',
            `${totalWarnings} warnings found`,
            'Run: npm run lint:fix'
          );
        }
      } catch (error) {
        this.addResult(
          'ESLint',
          'warn',
          'Could not run ESLint check',
          'Ensure ESLint is properly configured'
        );
      }

      // Проверяем размер файлов
      const srcDir = path.join(this.projectRoot, 'src');
      if (fs.existsSync(srcDir)) {
        const largeFiles = [];
        
        const checkDirectory = (dir) => {
          const files = fs.readdirSync(dir);
          
          for (const file of files) {
            const filePath = path.join(dir, file);
            const stat = fs.statSync(filePath);
            
            if (stat.isDirectory()) {
              checkDirectory(filePath);
            } else if (stat.isFile() && (file.endsWith('.ts') || file.endsWith('.tsx'))) {
              const sizeKB = stat.size / 1024;
              if (sizeKB > 500) { // Файлы больше 500KB
                largeFiles.push({
                  file: filePath.replace(this.projectRoot, ''),
                  size: Math.round(sizeKB)
                });
              }
            }
          }
        };

        checkDirectory(srcDir);
        
        if (largeFiles.length === 0) {
          this.addResult(
            'File sizes',
            'pass',
            'No unusually large files found'
          );
        } else {
          this.addResult(
            'File sizes',
            'warn',
            `${largeFiles.length} large files found`,
            'Consider splitting large files into smaller modules',
            largeFiles.slice(0, 5)
          );
        }
      }

    } catch (error) {
      this.addResult(
        'Code quality check',
        'fail',
        `Error checking code quality: ${error.message}`
      );
    }
  }

  /**
   * Проверка производительности
   */
  async checkPerformance() {
    this.separator('PERFORMANCE');

    // Проверяем node_modules размер
    const nodeModulesPath = path.join(this.projectRoot, 'node_modules');
    if (fs.existsSync(nodeModulesPath)) {
      try {
        const { stdout } = await execAsync(`du -sh "${nodeModulesPath}"`);
        const size = stdout.trim().split('\t')[0];
        
        // Примерная оценка размера (очень грубая)
        const sizeNum = parseFloat(size);
        const unit = size.slice(-1);
        
        if (unit === 'G' && sizeNum > 2) {
          this.addResult(
            'Dependencies size',
            'warn',
            `node_modules is ${size}, consider dependency cleanup`,
            'Review and remove unused dependencies'
          );
        } else {
          this.addResult(
            'Dependencies size',
            'pass',
            `node_modules size: ${size}`
          );
        }
      } catch (error) {
        this.addResult(
          'Dependencies size',
          'info',
          'Could not determine node_modules size'
        );
      }
    }

    // Проверяем .next размер
    const nextDir = path.join(this.projectRoot, '.next');
    if (fs.existsSync(nextDir)) {
      try {
        const { stdout } = await execAsync(`du -sh "${nextDir}"`);
        const size = stdout.trim().split('\t')[0];
        
        this.addResult(
          'Build size',
          'info',
          `.next build size: ${size}`
        );
      } catch (error) {
        // Игнорируем ошибки
      }
    }
  }

  /**
   * Проверка Git репозитория
   */
  async checkGitRepository() {
    this.separator('GIT REPOSITORY');

    const gitDir = path.join(this.projectRoot, '.git');
    if (!fs.existsSync(gitDir)) {
      this.addResult(
        'Git repository',
        'warn',
        'Not a Git repository',
        'Initialize Git repository: git init'
      );
      return;
    }

    try {
      // Проверяем статус
      const { stdout: status } = await execAsync('git status --porcelain');
      
      if (status.trim() === '') {
        this.addResult(
          'Git status',
          'pass',
          'Working directory clean'
        );
      } else {
        const changes = status.trim().split('\n').length;
        this.addResult(
          'Git status',
          'warn',
          `${changes} uncommitted changes`,
          'Commit or stash your changes'
        );
      }

      // Проверяем .gitignore
      const gitignorePath = path.join(this.projectRoot, '.gitignore');
      if (fs.existsSync(gitignorePath)) {
        const gitignore = fs.readFileSync(gitignorePath, 'utf8');
        const requiredIgnores = ['node_modules', '.next', '.env', 'dist'];
        const missingIgnores = requiredIgnores.filter(ignore => !gitignore.includes(ignore));
        
        if (missingIgnores.length === 0) {
          this.addResult(
            'Gitignore',
            'pass',
            'All important patterns are ignored'
          );
        } else {
          this.addResult(
            'Gitignore',
            'warn',
            `Missing gitignore patterns: ${missingIgnores.join(', ')}`,
            'Update .gitignore file'
          );
        }
      } else {
        this.addResult(
          'Gitignore',
          'fail',
          '.gitignore file missing',
          'Create .gitignore file'
        );
      }

    } catch (error) {
      this.addResult(
        'Git check',
        'warn',
        `Git check failed: ${error.message}`
      );
    }
  }

  /**
   * Проверка скриптов
   */
  async checkScripts() {
    this.separator('PROJECT SCRIPTS');

    const packagePath = path.join(this.projectRoot, 'package.json');
    if (!fs.existsSync(packagePath)) return;

    const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    const scripts = packageJson.scripts || {};

    const requiredScripts = [
      'dev',
      'build',
      'start',
      'lint',
      'type-check'
    ];

    for (const script of requiredScripts) {
      if (scripts[script]) {
        this.addResult(
          `Script: ${script}`,
          'pass',
          `Script defined: ${scripts[script]}`
        );
      } else {
        this.addResult(
          `Script: ${script}`,
          'warn',
          'Script missing',
          `Add ${script} script to package.json`
        );
      }
    }

    // Проверяем наличие дополнительных полезных скриптов
    const usefulScripts = ['health', 'dev:smart', 'clean', 'restart'];
    const existingUsefulScripts = usefulScripts.filter(script => scripts[script]);
    
    if (existingUsefulScripts.length > 0) {
      this.addResult(
        'Enhanced scripts',
        'pass',
        `Found enhanced scripts: ${existingUsefulScripts.join(', ')}`
      );
    } else {
      this.addResult(
        'Enhanced scripts',
        'info',
        'No enhanced development scripts found',
        'Consider adding development utility scripts'
      );
    }
  }

  /**
   * Вычисление общего результата
   */
  calculateOverallResult() {
    const { passed, warnings, errors, total } = this.results.summary;
    
    if (total === 0) {
      this.results.overall = 'unknown';
      this.results.score = 0;
      return;
    }

    // Вычисляем оценку
    const passedWeight = 1;
    const warningWeight = 0.5;
    const errorWeight = 0;
    
    const weightedScore = (passed * passedWeight + warnings * warningWeight + errors * errorWeight) / total;
    this.results.score = Math.round(weightedScore * 100);

    // Определяем общий результат
    if (errors === 0 && warnings <= total * 0.1) {
      this.results.overall = 'excellent';
    } else if (errors === 0 && warnings <= total * 0.3) {
      this.results.overall = 'good';
    } else if (errors <= total * 0.1) {
      this.results.overall = 'fair';
    } else {
      this.results.overall = 'poor';
    }
  }

  /**
   * Печать итогового отчета
   */
  printSummary() {
    console.log('\n');
    this.separator('AUDIT SUMMARY');

    const { passed, warnings, errors, total } = this.results.summary;
    const score = this.results.score;
    
    // Цвет на основе общего результата
    const overallColor = {
      excellent: colors.green,
      good: colors.blue,
      fair: colors.yellow,
      poor: colors.red,
      unknown: colors.gray
    }[this.results.overall];

    console.log(`${overallColor}${icons.check} Overall Health: ${this.results.overall.toUpperCase()} (${score}/100)${colors.reset}\n`);

    // Статистика
    console.log(`${colors.green}${icons.success} Passed: ${passed}${colors.reset}`);
    console.log(`${colors.yellow}${icons.warning} Warnings: ${warnings}${colors.reset}`);
    console.log(`${colors.red}${icons.error} Errors: ${errors}${colors.reset}`);
    console.log(`${colors.blue}${icons.info} Total Checks: ${total}${colors.reset}\n`);

    // Рекомендации
    if (this.results.recommendations.length > 0) {
      console.log(`${colors.bright}${icons.fix} Recommendations:${colors.reset}`);
      
      const highPriority = this.results.recommendations.filter(r => r.priority === 'high');
      const mediumPriority = this.results.recommendations.filter(r => r.priority === 'medium');
      
      if (highPriority.length > 0) {
        console.log(`\n  ${colors.red}High Priority:${colors.reset}`);
        highPriority.forEach((rec, i) => {
          console.log(`    ${i + 1}. ${rec.recommendation}`);
        });
      }
      
      if (mediumPriority.length > 0) {
        console.log(`\n  ${colors.yellow}Medium Priority:${colors.reset}`);
        mediumPriority.slice(0, 5).forEach((rec, i) => {
          console.log(`    ${i + 1}. ${rec.recommendation}`);
        });
        
        if (mediumPriority.length > 5) {
          console.log(`    ... and ${mediumPriority.length - 5} more`);
        }
      }
    }

    // Заключение
    console.log('\n');
    if (this.results.overall === 'excellent') {
      console.log(`${colors.green}🎉 Excellent! Your project is in great shape.${colors.reset}`);
    } else if (this.results.overall === 'good') {
      console.log(`${colors.blue}👍 Good! Minor improvements recommended.${colors.reset}`);
    } else if (this.results.overall === 'fair') {
      console.log(`${colors.yellow}⚠️ Fair. Some issues need attention.${colors.reset}`);
    } else if (this.results.overall === 'poor') {
      console.log(`${colors.red}❗ Poor. Critical issues must be addressed.${colors.reset}`);
    }

    console.log('\n' + '═'.repeat(80));
  }

  /**
   * Сохранение отчета в файл
   */
  async saveReport() {
    const reportsDir = path.join(this.projectRoot, 'reports');
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportPath = path.join(reportsDir, `audit-${timestamp}.json`);
    
    const report = {
      ...this.results,
      timestamp: new Date(),
      environment: {
        nodeVersion: process.version,
        platform: process.platform,
        cwd: this.projectRoot
      }
    };

    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    console.log(`${colors.blue}${icons.info} Report saved to: ${reportPath}${colors.reset}`);
  }

  /**
   * Главная функция аудита
   */
  async run() {
    console.log(`${colors.cyan}${colors.bright}🔍 PROJECT AUDIT${colors.reset}`);
    console.log(`${colors.gray}Analyzing project health and best practices...${colors.reset}\n`);

    try {
      await this.checkProjectStructure();
      await this.checkDependencies();
      await this.checkTypeScript();
      await this.checkNextJSConfig();
      await this.checkCodeQuality();
      await this.checkPerformance();
      await this.checkGitRepository();
      await this.checkScripts();

      this.calculateOverallResult();
      this.printSummary();
      
      if (process.argv.includes('--save-report')) {
        await this.saveReport();
      }

      // Возвращаем код выхода на основе результата
      if (this.results.summary.errors > 0) {
        process.exit(1);
      } else if (this.results.summary.warnings > 0) {
        process.exit(0); // Предупреждения не критичны
      } else {
        process.exit(0);
      }

    } catch (error) {
      console.error(`${colors.red}${icons.error} Audit failed: ${error.message}${colors.reset}`);
      process.exit(1);
    }
  }
}

// Запуск если скрипт вызван напрямую
if (require.main === module) {
  const auditor = new ProjectAuditor();
  auditor.run().catch(console.error);
}

module.exports = { ProjectAuditor };