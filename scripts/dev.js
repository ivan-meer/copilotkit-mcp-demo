#!/usr/bin/env node

/**
 * Умный скрипт разработки с проверкой портов и красивым логированием
 * 
 * Этот скрипт:
 * 1. Проверяет доступность портов
 * 2. Убивает процессы на занятых портах
 * 3. Инициализирует красивое логирование
 * 4. Запускает Next.js в режиме разработки
 * 5. Мониторит состояние приложения
 * 
 * @author Claude Code
 * @version 1.0.0
 */

const { spawn, exec } = require('child_process');
const net = require('net');
const path = require('path');
const fs = require('fs');

// Цветовые коды для терминала
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
};

// Иконки для логов
const icons = {
  info: '💡',
  success: '✅',
  warning: '⚠️',
  error: '❌',
  loading: '⏳',
  rocket: '🚀',
  gear: '⚙️',
  network: '🌐',
  process: '⚡',
  clean: '🧹',
  search: '🔍',
  kill: '💀',
  heart: '💖',
};

/**
 * Красивое логирование
 */
class DevLogger {
  constructor() {
    this.startTime = Date.now();
    this.sessionId = this.generateSessionId();
  }
  
  generateSessionId() {
    return `dev_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  }
  
  getTimestamp() {
    const now = new Date();
    return now.toTimeString().split(' ')[0] + '.' + now.getMilliseconds().toString().padStart(3, '0');
  }
  
  formatMessage(level, icon, message, data = null) {
    const timestamp = `${colors.gray}[${this.getTimestamp()}]${colors.reset}`;
    const levelColor = level === 'error' ? colors.red :
                      level === 'warn' ? colors.yellow :
                      level === 'success' ? colors.green :
                      level === 'info' ? colors.blue : colors.cyan;
    
    let formatted = `${timestamp} ${icon} ${levelColor}${message}${colors.reset}`;
    
    if (data) {
      formatted += `\n${colors.dim}   ${JSON.stringify(data, null, 2)}${colors.reset}`;
    }
    
    return formatted;
  }
  
  info(message, data) {
    console.log(this.formatMessage('info', icons.info, message, data));
  }
  
  success(message, data) {
    console.log(this.formatMessage('success', icons.success, message, data));
  }
  
  warn(message, data) {
    console.log(this.formatMessage('warn', icons.warning, message, data));
  }
  
  error(message, data) {
    console.log(this.formatMessage('error', icons.error, message, data));
  }
  
  loading(message) {
    console.log(this.formatMessage('loading', icons.loading, message));
  }
  
  printBanner() {
    const banner = `
${colors.cyan}╔════════════════════════════════════════════════════════════╗${colors.reset}
${colors.cyan}║${colors.reset}                                                            ${colors.cyan}║${colors.reset}
${colors.cyan}║${colors.reset}  ${colors.bright}${colors.blue}${icons.rocket} Universal AI Chat Hub - Dev Mode${colors.reset}              ${colors.cyan}║${colors.reset}
${colors.cyan}║${colors.reset}     ${colors.gray}Smart Development Script${colors.reset}                           ${colors.cyan}║${colors.reset}
${colors.cyan}║${colors.reset}     ${colors.gray}Session: ${this.sessionId}${colors.reset}                  ${colors.cyan}║${colors.reset}
${colors.cyan}║${colors.reset}                                                            ${colors.cyan}║${colors.reset}
${colors.cyan}║${colors.reset}  ${colors.green}Features:${colors.reset}                                              ${colors.cyan}║${colors.reset}
${colors.cyan}║${colors.reset}  ${colors.blue}${icons.network} Port Management${colors.reset}                                    ${colors.cyan}║${colors.reset}
${colors.cyan}║${colors.reset}  ${colors.blue}${icons.process} Process Monitoring${colors.reset}                                ${colors.cyan}║${colors.reset}
${colors.cyan}║${colors.reset}  ${colors.blue}${icons.heart} Health Checking${colors.reset}                                    ${colors.cyan}║${colors.reset}
${colors.cyan}║${colors.reset}  ${colors.blue}${icons.gear} Auto-restart${colors.reset}                                       ${colors.cyan}║${colors.reset}
${colors.cyan}║${colors.reset}                                                            ${colors.cyan}║${colors.reset}
${colors.cyan}╚════════════════════════════════════════════════════════════╝${colors.reset}
`;
    console.log(banner);
  }
  
  printSeparator(title) {
    const line = '─'.repeat(60);
    console.log(`\n${colors.cyan}${line}${colors.reset}`);
    if (title) {
      console.log(`${colors.bright}${colors.cyan}${title}${colors.reset}`);
      console.log(`${colors.cyan}${line}${colors.reset}`);
    }
  }
}

/**
 * Менеджер портов
 */
class PortManager {
  constructor(logger) {
    this.logger = logger;
    this.defaultPorts = [3000, 3001, 3002];
  }
  
  /**
   * Проверка доступности порта
   */
  async isPortAvailable(port) {
    return new Promise((resolve) => {
      const server = net.createServer();
      
      server.listen(port, () => {
        server.once('close', () => resolve(true));
        server.close();
      });
      
      server.on('error', () => resolve(false));
    });
  }
  
  /**
   * Поиск процессов на порту
   */
  async findProcessOnPort(port) {
    return new Promise((resolve) => {
      // Для разных ОС используем разные команды
      const isWindows = process.platform === 'win32';
      const command = isWindows 
        ? `netstat -ano | findstr :${port}`
        : `lsof -ti:${port}`;
      
      exec(command, (error, stdout) => {
        if (error) {
          resolve(null);
          return;
        }
        
        if (isWindows) {
          // Парсим вывод netstat для Windows
          const lines = stdout.trim().split('\n');
          const pids = lines
            .map(line => line.trim().split(/\s+/).pop())
            .filter(pid => pid && !isNaN(pid));
          resolve(pids[0] || null);
        } else {
          // Unix-like системы
          const pid = stdout.trim().split('\n')[0];
          resolve(pid || null);
        }
      });
    });
  }
  
  /**
   * Убийство процесса по PID
   */
  async killProcess(pid) {
    return new Promise((resolve) => {
      const isWindows = process.platform === 'win32';
      const command = isWindows ? `taskkill /PID ${pid} /F` : `kill -9 ${pid}`;
      
      exec(command, (error) => {
        resolve(!error);
      });
    });
  }
  
  /**
   * Освобождение порта
   */
  async freePort(port) {
    this.logger.loading(`Проверяем порт ${port}...`);
    
    const isAvailable = await this.isPortAvailable(port);
    if (isAvailable) {
      this.logger.success(`Порт ${port} свободен`);
      return true;
    }
    
    this.logger.warn(`Порт ${port} занят, ищем процесс...`);
    
    const pid = await this.findProcessOnPort(port);
    if (!pid) {
      this.logger.error(`Не удалось найти процесс на порту ${port}`);
      return false;
    }
    
    this.logger.info(`${icons.kill} Завершаем процесс PID ${pid} на порту ${port}`);
    
    const killed = await this.killProcess(pid);
    if (killed) {
      this.logger.success(`Процесс ${pid} успешно завершен`);
      
      // Ждем немного и проверяем еще раз
      await new Promise(resolve => setTimeout(resolve, 1000));
      const nowAvailable = await this.isPortAvailable(port);
      
      if (nowAvailable) {
        this.logger.success(`Порт ${port} теперь свободен`);
        return true;
      } else {
        this.logger.error(`Порт ${port} все еще занят`);
        return false;
      }
    } else {
      this.logger.error(`Не удалось завершить процесс ${pid}`);
      return false;
    }
  }
  
  /**
   * Поиск свободного порта
   */
  async findAvailablePort() {
    for (const port of this.defaultPorts) {
      const isAvailable = await this.isPortAvailable(port);
      if (isAvailable) {
        return port;
      }
    }
    
    // Если все порты заняты, пытаемся освободить первый
    const primaryPort = this.defaultPorts[0];
    const freed = await this.freePort(primaryPort);
    
    return freed ? primaryPort : null;
  }
}

/**
 * Монитор здоровья приложения
 */
class HealthMonitor {
  constructor(logger, port) {
    this.logger = logger;
    this.port = port;
    this.checkInterval = null;
    this.isHealthy = false;
    this.consecutiveFailures = 0;
    this.maxFailures = 3;
  }
  
  /**
   * Проверка здоровья приложения
   */
  async checkHealth() {
    try {
      const response = await fetch(`http://localhost:${this.port}/api/health`);
      if (response.ok) {
        if (!this.isHealthy) {
          this.logger.success(`${icons.heart} Приложение работает нормально`);
          this.isHealthy = true;
        }
        this.consecutiveFailures = 0;
        return true;
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error) {
      this.consecutiveFailures++;
      
      if (this.isHealthy) {
        this.logger.warn(`${icons.warning} Проблемы с доступностью приложения: ${error.message}`);
        this.isHealthy = false;
      }
      
      if (this.consecutiveFailures >= this.maxFailures) {
        this.logger.error(`${icons.error} Приложение недоступно уже ${this.consecutiveFailures} проверок подряд`);
      }
      
      return false;
    }
  }
  
  /**
   * Запуск мониторинга
   */
  start() {
    this.logger.info(`${icons.heart} Запускаем мониторинг здоровья на порту ${this.port}`);
    
    // Первая проверка через 5 секунд после запуска
    setTimeout(() => {
      this.checkHealth();
      
      // Затем проверяем каждые 30 секунд
      this.checkInterval = setInterval(() => {
        this.checkHealth();
      }, 30000);
    }, 5000);
  }
  
  /**
   * Остановка мониторинга
   */
  stop() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }
}

/**
 * Главный класс для запуска разработки
 */
class DevRunner {
  constructor() {
    this.logger = new DevLogger();
    this.portManager = new PortManager(this.logger);
    this.healthMonitor = null;
    this.nextProcess = null;
    this.isShuttingDown = false;
  }
  
  /**
   * Проверка существования package.json
   */
  checkPackageJson() {
    const packagePath = path.join(process.cwd(), 'package.json');
    
    if (!fs.existsSync(packagePath)) {
      this.logger.error('package.json не найден в текущей директории');
      process.exit(1);
    }
    
    try {
      const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
      this.logger.info(`Проект: ${packageJson.name || 'Unknown'} v${packageJson.version || '0.0.0'}`);
      
      if (!packageJson.scripts || !packageJson.scripts.dev) {
        this.logger.error('Скрипт "dev" не найден в package.json');
        process.exit(1);
      }
      
      return packageJson;
    } catch (error) {
      this.logger.error('Ошибка чтения package.json:', error.message);
      process.exit(1);
    }
  }
  
  /**
   * Запуск Next.js
   */
  async startNextJs(port) {
    return new Promise((resolve, reject) => {
      this.logger.loading(`Запускаем Next.js на порту ${port}...`);
      
      // Устанавливаем переменную окружения для порта
      const env = { ...process.env, PORT: port.toString() };
      
      this.nextProcess = spawn('npm', ['run', 'dev'], {
        stdio: 'pipe',
        env,
        shell: true,
      });
      
      let started = false;
      
      // Обработка вывода
      this.nextProcess.stdout.on('data', (data) => {
        const output = data.toString();
        
        // Парсим вывод Next.js для определения успешного запуска
        if (output.includes('Ready in') || output.includes('started server on')) {
          if (!started) {
            started = true;
            this.logger.success(`${icons.rocket} Next.js успешно запущен на http://localhost:${port}`);
            resolve();
          }
        }
        
        // Фильтруем и форматируем логи Next.js
        this.formatNextJsOutput(output);
      });
      
      this.nextProcess.stderr.on('data', (data) => {
        const output = data.toString();
        
        // Проверяем на ошибки запуска
        if (output.includes('EADDRINUSE') || output.includes('port already in use')) {
          this.logger.error(`Порт ${port} уже используется`);
          reject(new Error(`Port ${port} is already in use`));
          return;
        }
        
        this.formatNextJsOutput(output, true);
      });
      
      this.nextProcess.on('error', (error) => {
        this.logger.error('Ошибка запуска Next.js:', error.message);
        reject(error);
      });
      
      this.nextProcess.on('exit', (code) => {
        if (!this.isShuttingDown) {
          if (code === 0) {
            this.logger.info('Next.js процесс завершен');
          } else {
            this.logger.error(`Next.js процесс завершен с кодом ${code}`);
          }
        }
      });
      
      // Таймаут для запуска (30 секунд)
      setTimeout(() => {
        if (!started) {
          this.logger.error('Таймаут запуска Next.js (30 секунд)');
          reject(new Error('Next.js startup timeout'));
        }
      }, 30000);
    });
  }
  
  /**
   * Форматирование вывода Next.js
   */
  formatNextJsOutput(output, isError = false) {
    const lines = output.split('\n').filter(line => line.trim());
    
    for (const line of lines) {
      if (!line.trim()) continue;
      
      // Пропускаем некоторые служебные сообщения
      if (line.includes('webpack compiled') && !line.includes('error')) {
        continue;
      }
      
      // Форматируем разные типы сообщений
      if (line.includes('error') || line.includes('Error') || isError) {
        this.logger.error(`Next.js: ${line.trim()}`);
      } else if (line.includes('warn') || line.includes('Warning')) {
        this.logger.warn(`Next.js: ${line.trim()}`);
      } else if (line.includes('ready') || line.includes('compiled successfully')) {
        this.logger.success(`Next.js: ${line.trim()}`);
      } else if (line.includes('compiling') || line.includes('building')) {
        this.logger.loading(`Next.js: ${line.trim()}`);
      } else {
        this.logger.info(`Next.js: ${line.trim()}`);
      }
    }
  }
  
  /**
   * Обработка сигналов завершения
   */
  setupGracefulShutdown() {
    const shutdown = () => {
      if (this.isShuttingDown) return;
      
      this.isShuttingDown = true;
      this.logger.info(`${icons.clean} Graceful shutdown...`);
      
      if (this.healthMonitor) {
        this.healthMonitor.stop();
      }
      
      if (this.nextProcess) {
        this.logger.info('Завершаем Next.js процесс...');
        this.nextProcess.kill('SIGTERM');
        
        // Принудительное завершение через 5 секунд
        setTimeout(() => {
          if (this.nextProcess && !this.nextProcess.killed) {
            this.logger.warn('Принудительное завершение процесса...');
            this.nextProcess.kill('SIGKILL');
          }
        }, 5000);
      }
      
      setTimeout(() => {
        this.logger.success('Завершено');
        process.exit(0);
      }, 1000);
    };
    
    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
    process.on('SIGHUP', shutdown);
  }
  
  /**
   * Основной метод запуска
   */
  async run() {
    try {
      // Печатаем баннер
      this.logger.printBanner();
      
      // Настраиваем graceful shutdown
      this.setupGracefulShutdown();
      
      // Проверяем package.json
      this.logger.printSeparator('📦 Проверка проекта');
      const packageJson = this.checkPackageJson();
      
      // Управление портами
      this.logger.printSeparator('🌐 Управление портами');
      const port = await this.portManager.findAvailablePort();
      
      if (!port) {
        this.logger.error('Не удалось найти свободный порт');
        process.exit(1);
      }
      
      // Запуск Next.js
      this.logger.printSeparator('🚀 Запуск сервера разработки');
      await this.startNextJs(port);
      
      // Запуск мониторинга здоровья
      this.logger.printSeparator('💖 Мониторинг здоровья');
      this.healthMonitor = new HealthMonitor(this.logger, port);
      this.healthMonitor.start();
      
      // Финальная информация
      this.logger.printSeparator('🎉 Готово к разработке');
      this.logger.success(`Приложение доступно по адресу: http://localhost:${port}`);
      this.logger.info(`Для остановки нажмите Ctrl+C`);
      this.logger.info(`Session ID: ${this.logger.sessionId}`);
      
    } catch (error) {
      this.logger.error('Ошибка запуска:', error.message);
      process.exit(1);
    }
  }
}

// Проверяем, что скрипт запущен напрямую
if (require.main === module) {
  const runner = new DevRunner();
  runner.run().catch((error) => {
    console.error('Критическая ошибка:', error);
    process.exit(1);
  });
}

module.exports = { DevRunner, PortManager, HealthMonitor, DevLogger };