# AI-профиль пользователя и обновление анонимизации

Дата этапа: 13.05.2026  
Ветка разработки: `feature/ai-profile-privacy-roadmap`  
Перенесено в `main`: commit `c9994ca8f276fe95acc4254dee4790108713e125`

## 1. Цель этапа

Целью этапа было подготовить сайт `dr.kapustin.fi / Lääkärin Työpöytä` к персонализированной работе AI для разных врачей и одновременно усилить privacy-layer перед сохранением или AI-обработкой пользовательских клинических текстов.

Основные задачи:

1. привести текущую серверную анонимизацию в более универсальный и переиспользуемый вид;
2. добавить режимы анонимизации для разных сценариев;
3. реализовать пользовательский AI-профиль;
4. дать пользователю возможность анализировать собственный стиль по анонимизированным образцам;
5. подключить AI-профиль к `/api/chat`, пользовательским AI-инструментам и `/malli`;
6. добавить управление степенью применения AI-профиля для отдельных AI-инструментов;
7. добавить AI-hionta / AI-коррекцию для существующих шаблонов в `/malli`;
8. подготовить архитектуру к будущему усилению анонимизации через DVV-данные.

---

## 2. Главное продуктовое решение

Реализована не скрытая “память AI”, а управляемый пользователем профиль:

```text
AI-profiili / AI-профиль / AI profile
```

Пользователь сам видит, редактирует и отключает данные, влияющие на AI:

- профессиональная роль;
- специальность / направление;
- рабочая среда;
- уровень опыта;
- клинический контекст по умолчанию;
- предпочитаемая структура текста;
- уровень детализации;
- стиль письма;
- постоянные инструкции для AI;
- ограничения: чего AI должен избегать;
- краткое описание стиля, сформированное AI.

Клинический итоговый текст, шаблоны и переменные остаются на финском языке. Язык интерфейса может быть `fi`, `ru` или `en`.

---

## 3. Обновление анонимизации

### 3.1. Основной файл

```text
lib/privacy/anonymizePatientText.ts
```

### 3.2. Новые режимы

Добавлен тип:

```ts
export type AnonymizationMode = 'chat' | 'profileSample' | 'storage';
```

Использование:

```ts
anonymizePatientText(text, { mode: 'chat' });
anonymizePatientText(text, { mode: 'profileSample' });
anonymizePatientText(text, { mode: 'storage' });
```

### 3.3. Назначение режимов

#### `chat`

Используется для обычного AI-чата и текстовых инструментов.

Цель:

- удалить очевидные идентификаторы;
- не разрушать клиническую хронологию;
- сохранять обычные клинические даты, если они не выглядят как syntymäaika / DOB.

Пример:

```text
Leikkaus tehty 12.3.2024. Kontrolli 15.4.2024.
```

В режиме `chat` эти даты сохраняются.

#### `profileSample`

Используется для образцов текста, которые пользователь вставляет для анализа своего стиля.

Цель:

- более строгая анонимизация;
- подготовка текста перед AI-анализом;
- минимизация риска попадания идентификаторов в style analysis.

#### `storage`

Используется для всего, что потенциально сохраняется в БД как пользовательский пример или prompt.

Цель:

- наиболее строгий режим;
- точные даты маскируются как `[DATE]`;
- пользовательские prompt’ы и сохраняемые образцы проходят более строгую обработку.

### 3.4. Что усилено

1. Обновлён HETU-pattern под современные разделители.
2. Контрольный символ HETU теперь обязателен.
3. Расширена обработка адресов.
4. Добавлены ruotsinkieliset street suffixes.
5. Расширен whitelist организаций и медицинских систем.
6. Исправлена логика дат: обычная дата больше не считается сама по себе идентификатором в `chat`-режиме.
7. Сохранён принцип: клинические даты в обычных текстах не удаляются без оснований.

### 3.5. Новый reusable API

Добавлен endpoint:

```text
POST /api/privacy/anonymize
```

Файл:

```text
app/api/privacy/anonymize/route.ts
```

Request:

```json
{
  "text": "...",
  "mode": "profileSample"
}
```

Response:

```json
{
  "sanitizedText": "...",
  "hasFindings": true,
  "findingTypes": ["explicitName", "phone"],
  "findings": [],
  "mode": "profileSample"
}
```

Endpoint требует авторизованного пользователя.

---

## 4. AI-профиль пользователя

### 4.1. UI

Добавлена карточка в `/settings`:

```text
components/AiProfileSettingsCard.tsx
```

Подключена в:

```text
app/settings/page.tsx
```

Карточка локализована на:

- Finnish;
- Russian;
- English.

### 4.2. API

Добавлен endpoint:

```text
GET /api/profile/ai
PUT /api/profile/ai
```

Файл:

```text
app/api/profile/ai/route.ts
```

Назначение:

- загрузить AI-профиль текущего пользователя;
- сохранить настройки AI-профиля;
- пользователь видит и редактирует все поля сам.

### 4.3. Анализ стиля

Добавлен endpoint:

```text
POST /api/profile/ai/analyze-style
```

Файл:

```text
app/api/profile/ai/analyze-style/route.ts
```

Flow:

```text
Пользователь вставляет пример текста
↓
anonymizePatientText(text, { mode: 'profileSample' })
↓
OpenAI анализирует только стиль
↓
styleSummary сохраняется в UserAiProfile
↓
исходный текст не сохраняется
↓
анонимизированный образец сохраняется только при явном checkbox
```

Важно:

- исходный текст не сохраняется;
- AI не делает клинических выводов по пациенту;
- анализируется только структура и стиль письма;
- пользователь может вручную редактировать `styleSummary`.

---

## 5. Миграции БД

### 5.1. AI-профиль

Добавлена миграция:

```text
prisma/migrations/20260513120000_user_ai_profile/migration.sql
```

Создаёт таблицы:

```text
UserAiProfile
UserAiProfileSample
```

`UserAiProfile` содержит настройки AI-профиля пользователя.

`UserAiProfileSample` содержит только анонимизированные примеры, если пользователь явно выбрал их сохранение.

### 5.2. Режим AI-профиля для пользовательских инструментов

Добавлена миграция:

```text
prisma/migrations/20260513123000_ai_tool_profile_mode/migration.sql
```

Добавляет в таблицу `AiTool` поля:

```text
useUserAiProfile BOOLEAN DEFAULT true
profileMode TEXT DEFAULT 'full'
```

### 5.3. Синхронизация Prisma schema

Обновлён:

```text
prisma/schema.prisma
```

Добавлены:

```prisma
model UserAiProfile
model UserAiProfileSample
```

В `User` добавлено:

```prisma
aiProfile UserAiProfile?
```

В `AiTool` добавлено:

```prisma
useUserAiProfile Boolean @default(true)
profileMode      String  @default("full")
```

---

## 6. Подключение AI-профиля к генерациям

### 6.1. Helper-файл

Добавлен:

```text
lib/ai/userAiProfile.ts
```

Основные функции:

```ts
buildUserAiProfileInstruction(profile, mode)
withUserAiProfileInstruction(systemPrompt, profileInstruction)
normalizeAiProfileMode(value)
defaultProfileModeForTool(mode)
```

### 6.2. Режимы применения профиля

```ts
export type AiProfileMode = 'none' | 'styleOnly' | 'workContextOnly' | 'full';
```

#### `full`

Использует:

- рабочий контекст;
- роль;
- специальность;
- стиль письма;
- постоянные инструкции;
- ограничения.

Подходит для:

- loppuarvio;
- lähetteet;
- summary;
- клинические тексты.

#### `styleOnly`

Использует только:

- стиль;
- структуру;
- уровень детализации;
- постоянные инструкции по оформлению.

Подходит для:

- исправления текста;
- перевода/переформулировки;
- `/malli`;
- AI-hionta.

#### `workContextOnly`

Использует только:

- роль;
- рабочую среду;
- клинический контекст.

Не копирует стиль письма.

#### `none`

AI-профиль не используется.

Подходит для:

- labrat;
- строгих форматов;
- ситуаций, где стиль пользователя может мешать.

### 6.3. Default-логика

В `defaultProfileModeForTool()` сейчас:

```text
labrat      -> none
translate   -> styleOnly
fix         -> styleOnly
summarize   -> full
other       -> full
```

---

## 7. Обновление `/api/chat`

Файл:

```text
app/api/chat/route.ts
```

Изменения:

1. Пользовательский AI-профиль загружается для текущего пользователя.
2. AI-профиль подмешивается в system prompt согласно режиму.
3. `customPrompt` анонимизируется в режиме `storage`.
4. `text` анонимизируется в режиме `chat`.
5. Сохранённые пользовательские AI-tool prompts тоже анонимизируются в режиме `storage`.
6. Если таблица профиля отсутствует или профиль не найден, AI продолжает работать без персонализации.
7. Для `malli:` в обычном чате используется `styleOnly`.
8. Для обычного медицинского чата используется `full`.

---

## 8. Обновление пользовательских AI-инструментов

### 8.1. API

Обновлены:

```text
app/api/ai-tools/route.ts
app/api/ai-tools/[id]/route.ts
```

Добавлена поддержка:

```text
useUserAiProfile
profileMode
```

### 8.2. UI

Обновлён:

```text
app/ai-tools/page.tsx
```

Добавлен блок:

```text
Use AI profile in this tool / Использовать AI-профиль / Käytä AI-profiilia
```

Пользователь может выбрать:

```text
Full
Style only
Work context
Off
```

Блок локализован на `fi`, `ru`, `en`.

---

## 9. Интеграция с `/malli`

### 9.1. Backend

Обновлён:

```text
app/api/templates/ai/route.ts
```

Теперь endpoint:

1. анонимизирует входные свободные тексты;
2. использует AI-профиль в режиме `styleOnly`;
3. строго инструктирует AI не переписывать весь шаблон при редактировании существующего;
4. возвращает privacy-информацию;
5. возвращает JSON-only response.

### 9.2. Что анонимизируется

```text
sampleText      -> profileSample
selectedText    -> profileSample
userInstruction -> chat
```

`currentTemplate` не анонимизируется, потому что это технический шаблон с переменными и showIf-логикой. Его нельзя повреждать privacy pipeline’ом.

### 9.3. AI-hionta / AI-коррекция

Добавлен компонент:

```text
components/templates/TemplateAiPolishModal.tsx
```

Подключён в:

```text
app/templates/redesign/page.tsx
```

Flow:

```text
Пользователь выбирает шаблон
↓
Нажимает AI-hionta / AI-коррекция
↓
Пишет инструкцию
↓
/api/templates/ai получает currentTemplate + userInstruction
↓
AI предлагает обновлённый templateText
↓
Пользователь видит preview
↓
Нажимает “Применить”
↓
Открывается редактор шаблона с предложенным текстом
↓
Пользователь вручную сохраняет
```

AI не сохраняет шаблон автоматически.

### 9.4. Ключевое правило для AI-hionta

Для режимов:

```text
improve_template
transform_instruction
```

AI обязан:

- сохранять существующую структуру;
- не переписывать весь шаблон без явной просьбы;
- менять только указанную часть;
- сохранять существующие field names;
- сохранять options и showIf-логику, если пользователь не просит их менять;
- возвращать полный обновлённый `templateText`, а не diff.

---

## 10. Проверки, выполненные на этапе

### 10.1. Privacy tests

Команда:

```bash
npm run test:privacy
```

Ожидаемый результат:

```text
Privacy anonymizer tests passed: 15
```

Проверяются:

- HETU;
- новые HETU-разделители;
- неполный HETU не считается валидным;
- email;
- phone;
- DOB;
- explicit patient name;
- relative name;
- healthcare staff name;
- organization whitelist;
- street address;
- long address;
- clinical dates in `chat` mode;
- exact dates in `storage` mode.

### 10.2. Prisma

Команды:

```bash
npx prisma generate
npx prisma migrate deploy
```

Результат на момент проверки:

```text
Generated Prisma Client successfully
No pending migrations to apply
```

### 10.3. Build

Команда:

```bash
npm run build
```

Результат:

```text
Compiled successfully
Linting and checking validity of types
Generating static pages
Finalizing page optimization
```

В build видны новые routes:

```text
/api/privacy/anonymize
/api/profile/ai
/api/profile/ai/analyze-style
/api/templates/ai
```

### 10.4. Известный не связанный warning

Во время build появляется старый warning:

```text
Dynamic server usage: Page couldn't be rendered statically because it used `headers`
/api/pikaohjeet-v2/users
```

Он не связан с этим этапом и не ломает build.

---

## 11. Deployment notes

После деплоя из `main` рекомендуется выполнить:

```bash
npx prisma generate
npx prisma migrate deploy
npm run test:privacy
npm run build
```

Если миграции уже применены, `migrate deploy` покажет:

```text
No pending migrations to apply
```

Это нормально.

---

## 12. Безопасность и privacy-принципы

1. Исходные образцы пользовательского текста для анализа стиля не сохраняются.
2. Перед анализом стиля текст проходит `profileSample`-анонимизацию.
3. Анонимизированный пример сохраняется только если пользователь явно включил соответствующий checkbox.
4. Пользовательский AI-профиль прозрачен: пользователь видит и редактирует его сам.
5. AI-профиль можно отключить глобально.
6. Для каждого пользовательского AI-инструмента можно отдельно выбрать режим применения профиля.
7. Существующие клинические шаблоны не прогоняются через anonymizer, чтобы не повредить syntax/showIf/variables.
8. Свободный клинический текст перед AI-обработкой проходит anonymization pipeline.

---

## 13. Что вошло в `main`

Из ветки `feature/ai-profile-privacy-roadmap` в `main` перенесено 26 commits.

Текущий стабильный commit после переноса:

```text
c9994ca8f276fe95acc4254dee4790108713e125
```

Основные файлы:

```text
app/ai-tools/page.tsx
app/api/ai-tools/[id]/route.ts
app/api/ai-tools/route.ts
app/api/chat/route.ts
app/api/privacy/anonymize/route.ts
app/api/profile/ai/analyze-style/route.ts
app/api/profile/ai/route.ts
app/api/templates/ai/route.ts
app/settings/page.tsx
app/templates/redesign/page.tsx
components/AiProfileSettingsCard.tsx
components/templates/TemplateAiPolishModal.tsx
lib/ai/userAiProfile.ts
lib/privacy/anonymizePatientText.ts
prisma/migrations/20260513120000_user_ai_profile/migration.sql
prisma/migrations/20260513123000_ai_tool_profile_mode/migration.sql
prisma/schema.prisma
scripts/test-privacy-anonymizer.ts
```

---

## 14. Что сознательно не включено в этот этап

### DVV-based name detection

Усиление через открытые данные DVV не включено в этот этап.

Причина:

- текущий этап уже достаточно большой;
- сначала нужно понаблюдать за работой базовой персонализации и обновлённой анонимизации;
- DVV-детектор потребует отдельного слоя scoring/whitelist, чтобы не получить много ложных срабатываний.

Планируемая будущая ветка:

```text
feature/dvv-name-anonymization
```

Будущий scope:

1. загрузчик DVV XLSX;
2. преобразование в локальный JSON;
3. scoring-based name detector;
4. включение сначала только для `profileSample` и `storage`;
5. расширение whitelist;
6. тесты на ложные срабатывания;
7. attribution для DVV data source.

---

## 15. Рекомендуемые дальнейшие шаги

1. Несколько дней понаблюдать за реальной работой AI-профиля, `/ai-tools` и `/malli`.
2. Исправить мелкие UX-замечания по карточке AI-профиля и AI-hionta.
3. При необходимости заменить raw SQL в части API на Prisma Client, теперь schema синхронизирована.
4. Отдельной веткой реализовать DVV-based anonymization enhancement.
5. Позже добавить более детальные настройки применения профиля для системных AI-инструментов.

---

## 16. Краткий итог

Этап успешно завершён.

Реализовано:

```text
✅ reusable privacy anonymization layer
✅ anonymization modes: chat / profileSample / storage
✅ reusable /api/privacy/anonymize
✅ user-specific AI profile
✅ style analysis from anonymized samples
✅ AI profile integration into /api/chat
✅ per-tool AI profile mode
✅ AI-hionta for /malli
✅ Prisma schema synchronization
✅ tests and build passed
```

Следующий крупный этап: `feature/dvv-name-anonymization`.
