#!/usr/bin/env node

/**
 * Quote Fixer - Исправляет неправильные кавычки в файлах
 * 
 * Заменяет типографские кавычки на стандартные ASCII кавычки
 * для исправления синтаксических ошибок TypeScript.
 * 
 * @author Claude Code
 * @version 1.0.0
 */

const fs = require('fs');
const path = require('path');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  gray: '\x1b[90m',
};

class QuoteFixer {
  constructor() {
    this.projectRoot = process.cwd();
    this.fixedFiles = [];
    this.errors = [];
  }

  log(color, message) {
    console.log(`${color}${message}${colors.reset}`);
  }

  fixQuotesInFile(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      let fixedContent = content;
      let hasChanges = false;

      // Заменяем типографские кавычки на стандартные
      const quoteMappings = [
        [/"/g, '"'],  // Левая типографская кавычка
        [/"/g, '"'],  // Правая типографская кавычка
        [/'/g, "'"],  // Левая одинарная типографская кавычка
        [/'/g, "'"],  // Правая одинарная типографская кавычка
        [/`/g, "`"],  // Неправильный обратный апостроф
        [/'/g, "'"],  // Акут вместо апострофа
      ];

      quoteMappings.forEach(([regex, replacement]) => {
        if (regex.test(fixedContent)) {
          fixedContent = fixedContent.replace(regex, replacement);
          hasChanges = true;
        }
      });

      if (hasChanges) {
        fs.writeFileSync(filePath, fixedContent, 'utf8');
        this.fixedFiles.push(filePath);
        this.log(colors.green, `✅ Fixed quotes in: ${path.relative(this.projectRoot, filePath)}`);
      }

      return hasChanges;
    } catch (error) {
      this.errors.push({ file: filePath, error: error.message });
      this.log(colors.red, `❌ Error fixing ${filePath}: ${error.message}`);
      return false;
    }
  }

  findAndFixFiles(dir = this.projectRoot) {
    const files = fs.readdirSync(dir);

    for (const file of files) {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);

      if (stat.isDirectory()) {
        // Пропускаем определенные директории
        if (['node_modules', '.git', '.next', 'dist', 'build'].includes(file)) {
          continue;
        }
        this.findAndFixFiles(filePath);
      } else if (stat.isFile()) {
        // Обрабатываем только TypeScript/JavaScript файлы
        if (file.match(/\.(ts|tsx|js|jsx)$/)) {
          this.fixQuotesInFile(filePath);
        }
      }
    }
  }

  async run() {
    this.log(colors.blue, '🔧 Quote Fixer - Fixing typographic quotes in TypeScript files');
    this.log(colors.gray, `Scanning: ${this.projectRoot}`);
    console.log();

    this.findAndFixFiles();

    console.log();
    this.log(colors.blue, '📊 Summary:');
    this.log(colors.green, `✅ Fixed files: ${this.fixedFiles.length}`);
    
    if (this.errors.length > 0) {
      this.log(colors.red, `❌ Errors: ${this.errors.length}`);
      this.errors.forEach(({ file, error }) => {
        this.log(colors.gray, `   ${path.relative(this.projectRoot, file)}: ${error}`);
      });
    }

    if (this.fixedFiles.length > 0) {
      console.log();
      this.log(colors.yellow, '⚠️ Please run type-check again to verify fixes');
    } else {
      console.log();
      this.log(colors.green, '🎉 No quote issues found');
    }
  }
}

// Запуск если скрипт вызван напрямую
if (require.main === module) {
  const fixer = new QuoteFixer();
  fixer.run().catch(console.error);
}

module.exports = { QuoteFixer };