#!/usr/bin/env node

/**
 * Port Manager Script
 * 
 * Утилита для управления портами в процессе разработки.
 * Позволяет проверять, освобождать и резервировать порты.
 * 
 * @author Claude Code
 * @version 1.0.0
 */

const net = require('net');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

// Цвета и иконки
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
  port: '🌐',
  success: '✅',
  warning: '⚠️',
  error: '❌',
  info: '💡',
  kill: '💀',
  search: '🔍',
  free: '🆓',
  busy: '🔒',
};

/**
 * Менеджер портов
 */
class PortManager {
  constructor() {
    this.defaultPorts = [3000, 3001, 3002, 8080, 8081, 8082];
    this.reservedPorts = new Set();
  }
  
  /**
   * Логирование с форматированием
   */
  log(level, message, data = null) {
    const timestamp = new Date().toTimeString().split(' ')[0];
    const levelColors = {
      info: colors.blue,
      success: colors.green,
      warning: colors.yellow,
      error: colors.red,
    };
    
    const levelIcons = {
      info: icons.info,
      success: icons.success,
      warning: icons.warning,
      error: icons.error,
    };
    
    console.log(`${colors.gray}[${timestamp}]${colors.reset} ${levelIcons[level]} ${levelColors[level]}${message}${colors.reset}`);
    
    if (data) {
      console.log(`${colors.gray}   ${JSON.stringify(data, null, 2)}${colors.reset}`);
    }
  }
  
  /**
   * Проверка доступности порта
   */
  async isPortAvailable(port) {
    return new Promise((resolve) => {
      const server = net.createServer();
      
      server.listen(port, '127.0.0.1', () => {
        server.once('close', () => resolve(true));
        server.close();
      });
      
      server.on('error', () => resolve(false));
    });
  }
  
  /**
   * Поиск процесса на порту
   */
  async findProcessOnPort(port) {
    try {
      const isWindows = process.platform === 'win32';
      
      if (isWindows) {
        // Windows: используем netstat
        const { stdout } = await execAsync(`netstat -ano | findstr :${port}`);
        const lines = stdout.trim().split('\n');
        
        for (const line of lines) {
          const parts = line.trim().split(/\s+/);
          const localAddress = parts[1];
          const pid = parts[4];
          
          if (localAddress && localAddress.includes(`:${port}`) && pid && !isNaN(pid)) {
            // Получаем информацию о процессе
            try {
              const { stdout: processInfo } = await execAsync(`tasklist /PID ${pid} /FO CSV`);
              const processLines = processInfo.trim().split('\n');
              if (processLines.length > 1) {
                const processData = processLines[1].split(',');
                const processName = processData[0].replace(/"/g, '');
                return {
                  pid: parseInt(pid),
                  name: processName,
                  command: processName,
                };
              }
            } catch (e) {
              return {
                pid: parseInt(pid),
                name: 'Unknown',
                command: 'Unknown',
              };
            }
          }
        }
      } else {
        // Unix-like: используем lsof
        try {
          const { stdout } = await execAsync(`lsof -ti:${port}`);
          const pids = stdout.trim().split('\n').filter(pid => pid && !isNaN(pid));
          
          if (pids.length > 0) {
            const pid = parseInt(pids[0]);
            
            // Получаем информацию о процессе
            try {
              const { stdout: processInfo } = await execAsync(`ps -p ${pid} -o comm=,args=`);
              const [command, ...args] = processInfo.trim().split(/\s+/);
              
              return {
                pid,
                name: command,
                command: processInfo.trim(),
              };
            } catch (e) {
              return {
                pid,
                name: 'Unknown',
                command: 'Unknown',
              };
            }
          }
        } catch (e) {
          // Если lsof недоступен, пробуем netstat
          try {
            const { stdout } = await execAsync(`netstat -tlnp 2>/dev/null | grep :${port}`);
            const lines = stdout.trim().split('\n');
            
            for (const line of lines) {
              const match = line.match(/(\d+)\//);
              if (match) {
                const pid = parseInt(match[1]);
                return {
                  pid,
                  name: 'Unknown',
                  command: 'Unknown',
                };
              }
            }
          } catch (e2) {
            // Игнорируем ошибки
          }
        }
      }
      
      return null;
    } catch (error) {
      this.log('warning', `Ошибка поиска процесса на порту ${port}: ${error.message}`);
      return null;
    }
  }
  
  /**
   * Завершение процесса
   */
  async killProcess(pid, force = false) {
    try {
      const isWindows = process.platform === 'win32';
      const command = isWindows 
        ? `taskkill /PID ${pid} ${force ? '/F' : ''}`
        : `kill ${force ? '-9' : '-15'} ${pid}`;
      
      await execAsync(command);
      return true;
    } catch (error) {
      this.log('error', `Ошибка завершения процесса ${pid}: ${error.message}`);
      return false;
    }
  }
  
  /**
   * Освобождение порта
   */
  async freePort(port, force = false) {
    this.log('info', `${icons.search} Проверяем порт ${port}...`);
    
    const isAvailable = await this.isPortAvailable(port);
    if (isAvailable) {
      this.log('success', `${icons.free} Порт ${port} уже свободен`);
      return true;
    }
    
    this.log('warning', `${icons.busy} Порт ${port} занят, ищем процесс...`);
    
    const process = await this.findProcessOnPort(port);
    if (!process) {
      this.log('error', `Не удалось найти процесс на порту ${port}`);
      return false;
    }
    
    this.log('info', `${icons.kill} Найден процесс:`, {
      pid: process.pid,
      name: process.name,
      command: process.command,
    });
    
    // Спрашиваем подтверждение, если не force
    if (!force) {
      const readline = require('readline');
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      });
      
      const answer = await new Promise((resolve) => {
        rl.question(`Завершить процесс ${process.name} (PID: ${process.pid})? [y/N]: `, resolve);
      });
      
      rl.close();
      
      if (answer.toLowerCase() !== 'y' && answer.toLowerCase() !== 'yes') {
        this.log('info', 'Операция отменена пользователем');
        return false;
      }
    }
    
    // Пытаемся мягко завершить процесс
    this.log('info', `Отправляем SIGTERM процессу ${process.pid}...`);
    let killed = await this.killProcess(process.pid, false);
    
    if (killed) {
      // Ждем немного и проверяем
      await new Promise(resolve => setTimeout(resolve, 2000));
      const stillAvailable = await this.isPortAvailable(port);
      
      if (stillAvailable) {
        this.log('success', `${icons.success} Процесс успешно завершен, порт ${port} свободен`);
        return true;
      }
    }
    
    // Если мягкое завершение не сработало, принудительно
    this.log('warning', 'Мягкое завершение не сработало, принудительно завершаем процесс...');
    killed = await this.killProcess(process.pid, true);
    
    if (killed) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      const finallyAvailable = await this.isPortAvailable(port);
      
      if (finallyAvailable) {
        this.log('success', `${icons.success} Процесс принудительно завершен, порт ${port} свободен`);
        return true;
      } else {
        this.log('error', `Не удалось освободить порт ${port}`);
        return false;
      }
    } else {
      this.log('error', `Не удалось завершить процесс ${process.pid}`);
      return false;
    }
  }
  
  /**
   * Поиск свободного порта
   */
  async findFreePort(startPort = 3000, endPort = 3100) {
    this.log('info', `${icons.search} Ищем свободный порт в диапазоне ${startPort}-${endPort}...`);
    
    for (let port = startPort; port <= endPort; port++) {
      const isAvailable = await this.isPortAvailable(port);
      if (isAvailable && !this.reservedPorts.has(port)) {
        this.log('success', `${icons.free} Найден свободный порт: ${port}`);
        return port;
      }
    }
    
    this.log('error', `Не найдено свободных портов в диапазоне ${startPort}-${endPort}`);
    return null;
  }
  
  /**
   * Резервирование порта
   */
  reservePort(port) {
    this.reservedPorts.add(port);
    this.log('info', `${icons.port} Порт ${port} зарезервирован`);
  }
  
  /**
   * Освобождение резервации
   */
  unreservePort(port) {
    this.reservedPorts.delete(port);
    this.log('info', `${icons.free} Резервация порта ${port} снята`);
  }
  
  /**
   * Получение статуса портов
   */
  async getPortsStatus(ports = this.defaultPorts) {
    this.log('info', `${icons.search} Проверяем статус портов...`);
    
    const results = [];
    
    for (const port of ports) {
      const isAvailable = await this.isPortAvailable(port);
      const process = isAvailable ? null : await this.findProcessOnPort(port);
      const isReserved = this.reservedPorts.has(port);
      
      results.push({
        port,
        available: isAvailable,
        reserved: isReserved,
        process,
      });
    }
    
    return results;
  }
  
  /**
   * Печать статуса портов в таблице
   */
  printPortsStatus(portsStatus) {
    console.log(`\n${colors.cyan}╔════════════════════════════════════════════════════════════════════════════╗${colors.reset}`);
    console.log(`${colors.cyan}║${colors.reset}                              PORTS STATUS                               ${colors.cyan}║${colors.reset}`);
    console.log(`${colors.cyan}╠════════════════════════════════════════════════════════════════════════════╣${colors.reset}`);
    console.log(`${colors.cyan}║${colors.reset} Port  │ Status     │ Reserved │ Process                                ${colors.cyan}║${colors.reset}`);
    console.log(`${colors.cyan}╠═══════╪════════════╪══════════╪════════════════════════════════════════════╣${colors.reset}`);
    
    for (const status of portsStatus) {
      const portStr = status.port.toString().padEnd(5);
      const statusStr = status.available ? 
        `${colors.green}${icons.free} Free${colors.reset}`.padEnd(20) : 
        `${colors.red}${icons.busy} Busy${colors.reset}`.padEnd(20);
      const reservedStr = status.reserved ? 
        `${colors.yellow}Yes${colors.reset}`.padEnd(16) : 
        `${colors.gray}No${colors.reset}`.padEnd(15);
      
      let processStr = '';
      if (status.process) {
        processStr = `${status.process.name} (${status.process.pid})`.substring(0, 35);
      } else {
        processStr = `${colors.gray}-${colors.reset}`;
      }
      
      console.log(`${colors.cyan}║${colors.reset} ${portStr} │ ${statusStr} │ ${reservedStr} │ ${processStr.padEnd(35)} ${colors.cyan}║${colors.reset}`);
    }
    
    console.log(`${colors.cyan}╚════════════════════════════════════════════════════════════════════════════╝${colors.reset}\n`);
  }
  
  /**
   * Показать помощь
   */
  printHelp() {
    console.log(`
${colors.bright}${colors.cyan}Port Manager - Утилита управления портами${colors.reset}

${colors.bright}Использование:${colors.reset}
  node port-manager.js <command> [options]

${colors.bright}Команды:${colors.reset}
  status [ports...]     Показать статус портов (по умолчанию: 3000,3001,3002)
  check <port>          Проверить конкретный порт
  free <port> [--force] Освободить порт (с подтверждением)
  find [start] [end]    Найти свободный порт в диапазоне
  kill <pid>            Завершить процесс по PID
  reserve <port>        Зарезервировать порт
  unreserve <port>      Снять резервацию порта
  help                  Показать эту справку

${colors.bright}Примеры:${colors.reset}
  node port-manager.js status
  node port-manager.js status 3000 3001 8080
  node port-manager.js check 3000
  node port-manager.js free 3000
  node port-manager.js free 3000 --force
  node port-manager.js find 3000 3100
  node port-manager.js kill 12345
  node port-manager.js reserve 3000

${colors.bright}Флаги:${colors.reset}
  --force               Принудительное выполнение без подтверждения
  --help                Показать справку
`);
  }
  
  /**
   * Главный метод
   */
  async run() {
    const args = process.argv.slice(2);
    const command = args[0];
    const flags = args.filter(arg => arg.startsWith('--'));
    const params = args.filter(arg => !arg.startsWith('--')).slice(1);
    
    if (!command || command === 'help' || flags.includes('--help')) {
      this.printHelp();
      return;
    }
    
    const force = flags.includes('--force');
    
    try {
      switch (command) {
        case 'status': {
          const ports = params.length > 0 ? params.map(p => parseInt(p)) : this.defaultPorts;
          const status = await this.getPortsStatus(ports);
          this.printPortsStatus(status);
          break;
        }
        
        case 'check': {
          if (params.length === 0) {
            this.log('error', 'Укажите порт для проверки');
            return;
          }
          
          const port = parseInt(params[0]);
          const isAvailable = await this.isPortAvailable(port);
          
          if (isAvailable) {
            this.log('success', `${icons.free} Порт ${port} свободен`);
          } else {
            const process = await this.findProcessOnPort(port);
            this.log('warning', `${icons.busy} Порт ${port} занят`, process);
          }
          break;
        }
        
        case 'free': {
          if (params.length === 0) {
            this.log('error', 'Укажите порт для освобождения');
            return;
          }
          
          const port = parseInt(params[0]);
          await this.freePort(port, force);
          break;
        }
        
        case 'find': {
          const startPort = params.length > 0 ? parseInt(params[0]) : 3000;
          const endPort = params.length > 1 ? parseInt(params[1]) : startPort + 100;
          
          const freePort = await this.findFreePort(startPort, endPort);
          if (freePort) {
            console.log(freePort); // Выводим только номер порта для скриптов
          } else {
            process.exit(1);
          }
          break;
        }
        
        case 'kill': {
          if (params.length === 0) {
            this.log('error', 'Укажите PID процесса');
            return;
          }
          
          const pid = parseInt(params[0]);
          const killed = await this.killProcess(pid, force);
          
          if (killed) {
            this.log('success', `${icons.success} Процесс ${pid} завершен`);
          } else {
            this.log('error', `Не удалось завершить процесс ${pid}`);
            process.exit(1);
          }
          break;
        }
        
        case 'reserve': {
          if (params.length === 0) {
            this.log('error', 'Укажите порт для резервирования');
            return;
          }
          
          const port = parseInt(params[0]);
          this.reservePort(port);
          break;
        }
        
        case 'unreserve': {
          if (params.length === 0) {
            this.log('error', 'Укажите порт для снятия резервации');
            return;
          }
          
          const port = parseInt(params[0]);
          this.unreservePort(port);
          break;
        }
        
        default:
          this.log('error', `Неизвестная команда: ${command}`);
          this.printHelp();
          process.exit(1);
      }
    } catch (error) {
      this.log('error', `Ошибка выполнения команды: ${error.message}`);
      process.exit(1);
    }
  }
}

// Запуск если скрипт вызван напрямую
if (require.main === module) {
  const manager = new PortManager();
  manager.run().catch(error => {
    console.error('Критическая ошибка:', error);
    process.exit(1);
  });
}

module.exports = { PortManager };