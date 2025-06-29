<div align="center">

# Рабочая Память
   
![CopilotKit-Banner](https://github.com/user-attachments/assets/8167c845-0381-45d9-ad1c-83f995d48290)
</div>

Рабочая Память - это пример реализации интеграции сервера и клиента MCP для управления вашими проектами и задачами из приложений для управления проектами, таких как Linear.

## Ключевые Особенности

- **Чат-интерфейс CopilotKit AI:**  
  Общайтесь с CopilotKit AI, который выступает в роли полезного ассистента, способного отвечать на запросы пользователей и выполнять действия внутри приложения.
  
- **Интерактивность в реальном времени:**  
  Живой чат на основе `@copilotkit/react-ui`, который управляет динамическими изменениями состояния и ответами агентов.

- **Управление состоянием и координация агентов:**  
  Использует `@copilotkit/react-core` для надежного управления состоянием агентов и плавной интеграции функций путешествий и исследований.

- **Адаптивный и современный UI:**  
  Разработан с использованием Tailwind CSS для обеспечения плавного и адаптивного взаимодействия на всех устройствах.

## Технологический Стек

- **Фреймворк:** [Next.js](https://nextjs.org)
- **UI Библиотека:** React, [CopilotKit UI](https://www.npmjs.com/package/@copilotkit/react-ui)
- **Управление состоянием:** [CopilotKit React Core](https://www.npmjs.com/package/@copilotkit/react-core)

- **Стилизация:** Tailwind CSS
- **Дополнительные библиотеки:**
  - React Query для получения данных
  - Framer Motion для анимаций
  - Radix UI для доступных компонентов
  - React Flow для диаграмм потоков

## Инструкции по Установке

1. **Предварительные требования:**  
   - [Node.js](https://nodejs.org) (рекомендуется LTS версия)
   - npm, yarn или pnpm

2. **Установка:**  
   ```bash
   # Клонировать репозиторий
   git clone <repository-url>
   
   # Установить зависимости
   npm install
   # или
   yarn install
   # или
   pnpm install
   ```

3. **Настройка окружения:**  
   Создайте файл `.env` в корневой директории с необходимыми переменными окружения.
   ```bash
    OPENAI_API_KEY = ВАШ_API_КЛЮЧ
   ```

4. **Запуск сервера разработки:**  
   ```bash
   npm run dev
   # или
   yarn dev
   # или
   pnpm dev
   ```
   Затем откройте [http://localhost:3000](http://localhost:3000) в вашем браузере.

## Структура Проекта

- **/src/app:**  
  Содержит компоненты страниц Next.js, макеты и глобальные стили.

- **/src/components:**  
  Включает переиспользуемые компоненты, такие как интерфейсы агентов (Travel, Research, Chat, Map, Sidebar) и UI элементы.

- **/src/providers:**  
  Обеспечивает глобальные провайдеры состояния для управления состояниями агентов.

- **/src/lib:**  
  Содержит вспомогательные функции и файлы конфигурации.

- **/src/hooks:**  
  Пользовательские React хуки для общей функциональности.

- **/src/contexts:**  
  Провайдеры контекста React для глобального управления состоянием.

## Разработка

- **Проверка кода:**  
  ```bash
  npm run lint
  # или
  yarn lint
  # или
  pnpm lint
  ```

- **Сборка для продакшена:**  
  ```bash
  npm run build
  # или
  yarn build
  # или
  pnpm build
  ```

## Деплой

Самый простой способ развернуть этот проект - использовать [Vercel](https://vercel.com). Соберите и запустите ваше приложение с помощью:
```bash
npm run build
npm run start
```
Для получения дополнительной информации следуйте руководству по развертыванию Vercel.

## Вклад в Проект

Мы приветствуем вклад в проект! Форкните репозиторий и отправьте pull request с любыми улучшениями, исправлениями ошибок или новыми функциями.

## Лицензия

Распространяется под лицензией MIT. Подробнее см. в файле `LICENSE`.
