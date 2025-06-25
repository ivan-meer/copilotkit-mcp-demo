#!/usr/bin/env node

/**
 * Health Check Script
 * 
 * Комплексная проверка здоровья приложения Universal AI Chat Hub.
 * Проверяет все компоненты системы и предоставляет детальный отчет.
 * 
 * @author Claude Code
 * @version 1.0.0
 */

const http = require('http');
const https = require('https');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

// Цвета для терминала
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
};

const icons = {
  health: '💖',
  success: '✅',
  warning: '⚠️',
  error: '❌',
  info: '💡',
  network: '🌐',
  database: '💾',
  api: '🔌',
  config: '⚙️',
  performance: '⚡',
  memory: '🧠',
  security: '🔐',
};

/**
 * Logger для health check
 */
class HealthLogger {
  getTimestamp() {
    return new Date().toISOString();
  }
  
  info(message, data) {
    console.log(`${colors.gray}[${this.getTimestamp()}]${colors.reset} ${icons.info} ${colors.blue}${message}${colors.reset}`);
    if (data) console.log(`   ${colors.gray}${JSON.stringify(data, null, 2)}${colors.reset}`);
  }
  
  success(message, data) {
    console.log(`${colors.gray}[${this.getTimestamp()}]${colors.reset} ${icons.success} ${colors.green}${message}${colors.reset}`);
    if (data) console.log(`   ${colors.gray}${JSON.stringify(data, null, 2)}${colors.reset}`);
  }
  
  warning(message, data) {
    console.log(`${colors.gray}[${this.getTimestamp()}]${colors.reset} ${icons.warning} ${colors.yellow}${message}${colors.reset}`);
    if (data) console.log(`   ${colors.gray}${JSON.stringify(data, null, 2)}${colors.reset}`);
  }
  
  error(message, data) {
    console.log(`${colors.gray}[${this.getTimestamp()}]${colors.reset} ${icons.error} ${colors.red}${message}${colors.reset}`);
    if (data) console.log(`   ${colors.gray}${JSON.stringify(data, null, 2)}${colors.reset}`);
  }
  
  printSection(title) {
    const line = '─'.repeat(60);
    console.log(`\n${colors.cyan}${line}${colors.reset}`);
    console.log(`${colors.bright}${colors.cyan}${title}${colors.reset}`);
    console.log(`${colors.cyan}${line}${colors.reset}\n`);
  }
  
  printSummary(results) {
    const total = results.length;
    const passed = results.filter(r => r.status === 'success').length;
    const warnings = results.filter(r => r.status === 'warning').length;
    const failed = results.filter(r => r.status === 'error').length;
    
    console.log(`\n${colors.cyan}╔══════════════════════════════════════════════════════════════╗${colors.reset}`);
    console.log(`${colors.cyan}║${colors.reset}                      HEALTH CHECK SUMMARY                      ${colors.cyan}║${colors.reset}`);
    console.log(`${colors.cyan}╠══════════════════════════════════════════════════════════════╣${colors.reset}`);
    console.log(`${colors.cyan}║${colors.reset} Total Checks: ${total.toString().padEnd(45)} ${colors.cyan}║${colors.reset}`);
    console.log(`${colors.cyan}║${colors.reset} ${colors.green}✅ Passed: ${passed.toString().padEnd(47)}${colors.reset} ${colors.cyan}║${colors.reset}`);
    console.log(`${colors.cyan}║${colors.reset} ${colors.yellow}⚠️  Warnings: ${warnings.toString().padEnd(44)}${colors.reset} ${colors.cyan}║${colors.reset}`);
    console.log(`${colors.cyan}║${colors.reset} ${colors.red}❌ Failed: ${failed.toString().padEnd(47)}${colors.reset} ${colors.cyan}║${colors.reset}`);
    console.log(`${colors.cyan}║${colors.reset}                                                              ${colors.cyan}║${colors.reset}`);
    
    const healthScore = Math.round((passed / total) * 100);
    const scoreColor = healthScore >= 90 ? colors.green :
                      healthScore >= 70 ? colors.yellow : colors.red;
    
    console.log(`${colors.cyan}║${colors.reset} Health Score: ${scoreColor}${healthScore}%${colors.reset}${' '.repeat(44)} ${colors.cyan}║${colors.reset}`);
    console.log(`${colors.cyan}╚══════════════════════════════════════════════════════════════╝${colors.reset}\n`);
    
    return healthScore;
  }
}

/**
 * Основной класс для health check
 */
class HealthChecker {
  constructor() {
    this.logger = new HealthLogger();
    this.results = [];
    this.config = this.loadConfig();
  }
  
  /**
   * Загрузка конфигурации
   */
  loadConfig() {
    const defaultConfig = {
      ports: [3000, 3001, 3002],
      endpoints: [
        'http://localhost:3000/api/health',
        'http://localhost:3000/api/copilotkit',
      ],
      timeouts: {
        http: 5000,
        process: 3000,
      },
      thresholds: {
        memory: 500, // MB
        cpu: 80,     // %
        response: 2000, // ms
      },
    };
    
    try {
      const configPath = path.join(process.cwd(), 'health-check.config.js');
      if (fs.existsSync(configPath)) {
        const userConfig = require(configPath);
        return { ...defaultConfig, ...userConfig };
      }
    } catch (error) {
      this.logger.warning('Не удалось загрузить конфигурацию, используем значения по умолчанию');
    }
    
    return defaultConfig;
  }
  
  /**
   * Добавление результата проверки
   */
  addResult(name, status, message, data = null, duration = null) {
    this.results.push({
      name,
      status,
      message,
      data,
      duration,
      timestamp: new Date().toISOString(),
    });
    
    const logMethod = status === 'success' ? 'success' :
                     status === 'warning' ? 'warning' : 'error';
    
    const logMessage = duration ? `${message} (${duration}ms)` : message;
    this.logger[logMethod](logMessage, data);
  }
  
  /**
   * HTTP запрос с таймаутом
   */
  async httpRequest(url, timeout = 5000) {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      const urlObj = new URL(url);
      const httpModule = urlObj.protocol === 'https:' ? https : http;
      
      const req = httpModule.request(url, (res) => {
        const duration = Date.now() - startTime;
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            data,
            duration,
          });
        });
      });
      
      req.on('error', (error) => {
        reject({
          error: error.message,
          duration: Date.now() - startTime,
        });
      });
      
      req.setTimeout(timeout, () => {
        req.destroy();
        reject({
          error: 'Request timeout',
          duration: Date.now() - startTime,
        });
      });
      
      req.end();
    });
  }
  
  /**
   * Выполнение команды с таймаутом
   */
  async execCommand(command, timeout = 3000) {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      
      exec(command, { timeout }, (error, stdout, stderr) => {
        const duration = Date.now() - startTime;
        
        if (error) {
          reject({
            error: error.message,
            stderr,
            duration,
          });
        } else {
          resolve({
            stdout: stdout.trim(),
            stderr: stderr.trim(),
            duration,
          });
        }
      });
    });
  }
  
  /**
   * Проверка портов
   */
  async checkPorts() {
    this.logger.printSection(`${icons.network} Network Connectivity`);
    
    for (const port of this.config.ports) {
      try {
        const result = await this.httpRequest(`http://localhost:${port}`, 2000);
        
        if (result.statusCode < 500) {
          this.addResult(
            `Port ${port}`,
            'success',
            `Порт ${port} доступен`,
            { statusCode: result.statusCode },
            result.duration
          );
        } else {
          this.addResult(
            `Port ${port}`,
            'warning',
            `Порт ${port} отвечает с ошибкой ${result.statusCode}`,
            { statusCode: result.statusCode },
            result.duration
          );
        }
      } catch (error) {
        this.addResult(
          `Port ${port}`,
          'error',
          `Порт ${port} недоступен: ${error.error}`,
          error,
          error.duration
        );
      }
    }
  }
  
  /**
   * Проверка API endpoints
   */
  async checkEndpoints() {
    this.logger.printSection(`${icons.api} API Endpoints`);
    
    for (const endpoint of this.config.endpoints) {
      try {
        const result = await this.httpRequest(endpoint, this.config.timeouts.http);
        
        if (result.statusCode === 200) {
          let responseData = null;
          try {
            responseData = JSON.parse(result.data);
          } catch (e) {
            responseData = result.data.substring(0, 100);
          }
          
          const isSlowResponse = result.duration > this.config.thresholds.response;
          
          this.addResult(
            `Endpoint ${endpoint}`,
            isSlowResponse ? 'warning' : 'success',
            isSlowResponse ? 
              `Endpoint отвечает медленно (${result.duration}ms > ${this.config.thresholds.response}ms)` :
              `Endpoint работает корректно`,
            { responseData, headers: result.headers },
            result.duration
          );
        } else {
          this.addResult(
            `Endpoint ${endpoint}`,
            'warning',
            `Endpoint отвечает с кодом ${result.statusCode}`,
            { statusCode: result.statusCode, data: result.data.substring(0, 200) },
            result.duration
          );
        }
      } catch (error) {
        this.addResult(
          `Endpoint ${endpoint}`,
          'error',
          `Endpoint недоступен: ${error.error}`,
          error,
          error.duration
        );
      }
    }
  }
  
  /**
   * Проверка процессов
   */
  async checkProcesses() {
    this.logger.printSection(`${icons.performance} System Processes`);
    
    // Проверка процессов Node.js
    try {
      const result = await this.execCommand('ps aux | grep node', this.config.timeouts.process);
      const nodeProcesses = result.stdout
        .split('\n')
        .filter(line => line.includes('node') && !line.includes('grep'))
        .length;
      
      if (nodeProcesses > 0) {
        this.addResult(
          'Node.js Processes',
          'success',
          `Найдено ${nodeProcesses} Node.js процессов`,
          { count: nodeProcesses },
          result.duration
        );
      } else {
        this.addResult(
          'Node.js Processes',
          'warning',
          'Node.js процессы не найдены',
          null,
          result.duration
        );
      }
    } catch (error) {
      this.addResult(
        'Node.js Processes',
        'error',
        `Ошибка проверки процессов: ${error.error}`,
        error,
        error.duration
      );
    }
  }
  
  /**
   * Проверка памяти и CPU
   */
  async checkSystemResources() {
    this.logger.printSection(`${icons.memory} System Resources`);
    
    // Проверка памяти
    try {
      const result = await this.execCommand('free -m', this.config.timeouts.process);
      const memoryLines = result.stdout.split('\n');
      const memoryInfo = memoryLines[1].split(/\s+/);
      
      const totalMemory = parseInt(memoryInfo[1]);
      const usedMemory = parseInt(memoryInfo[2]);
      const freeMemory = parseInt(memoryInfo[3]);
      const memoryUsagePercent = Math.round((usedMemory / totalMemory) * 100);
      
      const memoryStatus = memoryUsagePercent > 90 ? 'error' :
                          memoryUsagePercent > 75 ? 'warning' : 'success';
      
      this.addResult(
        'Memory Usage',
        memoryStatus,
        `Использование памяти: ${memoryUsagePercent}% (${usedMemory}MB / ${totalMemory}MB)`,
        {
          total: totalMemory,
          used: usedMemory,
          free: freeMemory,
          percentage: memoryUsagePercent,
        },
        result.duration
      );
    } catch (error) {
      // Для Windows попробуем другую команду
      try {
        const result = await this.execCommand('wmic OS get TotalVisibleMemorySize,FreePhysicalMemory /value', this.config.timeouts.process);
        // Простой парсинг для Windows
        this.addResult(
          'Memory Usage',
          'warning',
          'Проверка памяти доступна только для Linux/macOS',
          null,
          result.duration
        );
      } catch (winError) {
        this.addResult(
          'Memory Usage',
          'error',
          `Ошибка проверки памяти: ${error.error}`,
          error,
          error.duration
        );
      }
    }
    
    // Проверка CPU (для Linux/macOS)
    try {
      const result = await this.execCommand("top -bn1 | grep 'Cpu(s)' | awk '{print $2}' | cut -d'%' -f1", this.config.timeouts.process);
      const cpuUsage = parseFloat(result.stdout);
      
      if (!isNaN(cpuUsage)) {
        const cpuStatus = cpuUsage > this.config.thresholds.cpu ? 'warning' : 'success';
        
        this.addResult(
          'CPU Usage',
          cpuStatus,
          `Использование CPU: ${cpuUsage.toFixed(1)}%`,
          { percentage: cpuUsage },
          result.duration
        );
      } else {
        this.addResult(
          'CPU Usage',
          'warning',
          'Не удалось определить использование CPU',
          null,
          result.duration
        );
      }
    } catch (error) {
      this.addResult(
        'CPU Usage',
        'warning',
        'Проверка CPU недоступна на этой системе',
        null,
        error.duration
      );
    }
  }
  
  /**
   * Проверка файлов конфигурации
   */
  async checkConfiguration() {
    this.logger.printSection(`${icons.config} Configuration Files`);
    
    const configFiles = [
      { path: 'package.json', required: true },
      { path: '.env', required: false },
      { path: 'next.config.ts', required: true },
      { path: 'tsconfig.json', required: true },
      { path: 'tailwind.config.ts', required: true },
    ];
    
    for (const file of configFiles) {
      const filePath = path.join(process.cwd(), file.path);
      
      if (fs.existsSync(filePath)) {
        try {
          const stats = fs.statSync(filePath);
          const sizeKB = Math.round(stats.size / 1024);
          
          this.addResult(
            `Config ${file.path}`,
            'success',
            `Файл ${file.path} найден (${sizeKB}KB)`,
            {
              size: stats.size,
              modified: stats.mtime,
              readable: stats.mode & parseInt('444', 8) ? true : false,
            }
          );
          
          // Дополнительная проверка для package.json
          if (file.path === 'package.json') {
            try {
              const packageData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
              const hasRequiredScripts = packageData.scripts && 
                                        packageData.scripts.dev && 
                                        packageData.scripts.build;
              
              this.addResult(
                'Package.json Scripts',
                hasRequiredScripts ? 'success' : 'warning',
                hasRequiredScripts ? 
                  'Необходимые скрипты найдены' : 
                  'Отсутствуют некоторые скрипты (dev, build)',
                {
                  scripts: packageData.scripts ? Object.keys(packageData.scripts) : [],
                  dependencies: packageData.dependencies ? Object.keys(packageData.dependencies).length : 0,
                }
              );
            } catch (parseError) {
              this.addResult(
                'Package.json Validation',
                'error',
                'Ошибка парсинга package.json',
                { error: parseError.message }
              );
            }
          }
        } catch (error) {
          this.addResult(
            `Config ${file.path}`,
            'error',
            `Ошибка чтения файла ${file.path}: ${error.message}`,
            { error: error.message }
          );
        }
      } else {
        this.addResult(
          `Config ${file.path}`,
          file.required ? 'error' : 'warning',
          `Файл ${file.path} не найден`,
          { required: file.required }
        );
      }
    }
  }
  
  /**
   * Проверка зависимостей
   */
  async checkDependencies() {
    this.logger.printSection(`${icons.database} Dependencies`);
    
    try {
      const result = await this.execCommand('npm list --depth=0', 5000);
      
      // Подсчитываем количество зависимостей
      const dependencyLines = result.stdout.split('\n').filter(line => 
        line.includes('├──') || line.includes('└──')
      );
      
      this.addResult(
        'NPM Dependencies',
        'success',
        `Установлено ${dependencyLines.length} зависимостей`,
        { count: dependencyLines.length },
        result.duration
      );
      
      // Проверяем на устаревшие пакеты
      try {
        const outdatedResult = await this.execCommand('npm outdated --json', 3000);
        if (outdatedResult.stdout) {
          const outdated = JSON.parse(outdatedResult.stdout);
          const outdatedCount = Object.keys(outdated).length;
          
          if (outdatedCount > 0) {
            this.addResult(
              'Outdated Dependencies',
              'warning',
              `Найдено ${outdatedCount} устаревших зависимостей`,
              { outdated: Object.keys(outdated) },
              outdatedResult.duration
            );
          } else {
            this.addResult(
              'Outdated Dependencies',
              'success',
              'Все зависимости актуальны',
              null,
              outdatedResult.duration
            );
          }
        }
      } catch (outdatedError) {
        // npm outdated может завершиться с кодом 1 даже при успехе
        this.addResult(
          'Outdated Dependencies',
          'info',
          'Проверка устаревших зависимостей пропущена',
          null
        );
      }
      
    } catch (error) {
      this.addResult(
        'NPM Dependencies',
        'error',
        `Ошибка проверки зависимостей: ${error.error}`,
        error,
        error.duration
      );
    }
  }
  
  /**
   * Генерация отчета
   */
  generateReport() {
    const reportData = {
      timestamp: new Date().toISOString(),
      summary: {
        total: this.results.length,
        passed: this.results.filter(r => r.status === 'success').length,
        warnings: this.results.filter(r => r.status === 'warning').length,
        failed: this.results.filter(r => r.status === 'error').length,
      },
      checks: this.results,
      system: {
        platform: process.platform,
        nodeVersion: process.version,
        cwd: process.cwd(),
      },
    };
    
    // Сохраняем отчет в файл
    const reportPath = path.join(process.cwd(), 'health-check-report.json');
    try {
      fs.writeFileSync(reportPath, JSON.stringify(reportData, null, 2));
      this.logger.success(`Отчет сохранен: ${reportPath}`);
    } catch (error) {
      this.logger.error(`Ошибка сохранения отчета: ${error.message}`);
    }
    
    return reportData;
  }
  
  /**
   * Основной метод проверки
   */
  async run() {
    console.log(`${colors.cyan}╔══════════════════════════════════════════════════════════════╗${colors.reset}`);
    console.log(`${colors.cyan}║${colors.reset}                                                              ${colors.cyan}║${colors.reset}`);
    console.log(`${colors.cyan}║${colors.reset}  ${colors.bright}${colors.blue}${icons.health} Universal AI Chat Hub - Health Check${colors.reset}              ${colors.cyan}║${colors.reset}`);
    console.log(`${colors.cyan}║${colors.reset}     ${colors.gray}Comprehensive System Health Monitoring${colors.reset}              ${colors.cyan}║${colors.reset}`);
    console.log(`${colors.cyan}║${colors.reset}                                                              ${colors.cyan}║${colors.reset}`);
    console.log(`${colors.cyan}╚══════════════════════════════════════════════════════════════╝${colors.reset}\n`);
    
    const startTime = Date.now();
    
    try {
      // Выполняем все проверки
      await this.checkPorts();
      await this.checkEndpoints();
      await this.checkProcesses();
      await this.checkSystemResources();
      await this.checkConfiguration();
      await this.checkDependencies();
      
      // Выводим сводку
      const healthScore = this.logger.printSummary(this.results);
      
      // Генерируем отчет
      const report = this.generateReport();
      
      const totalTime = Date.now() - startTime;
      this.logger.info(`Проверка завершена за ${totalTime}ms`);
      
      // Возвращаем код выхода на основе результатов
      const hasErrors = this.results.some(r => r.status === 'error');
      process.exit(hasErrors ? 1 : 0);
      
    } catch (error) {
      this.logger.error('Критическая ошибка во время health check:', error.message);
      process.exit(1);
    }
  }
}

// Запуск, если скрипт вызван напрямую
if (require.main === module) {
  const checker = new HealthChecker();
  checker.run();
}

module.exports = { HealthChecker };