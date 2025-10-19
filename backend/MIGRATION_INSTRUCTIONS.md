# 🛠️ Инструкция по миграции базы данных

## Проблема

При попытке создать риск без оценок возникает ошибка:
```
NOT NULL constraint failed: risk_factors.severity_score
```

## Причина

База данных требует обязательного заполнения полей `severity_score`, `probability_score`, `risk_score`, но мы изменили логику - теперь эти поля заполняются позже в таблице управления рисками.

## Решение

Нужно изменить схему таблицы `risk_factors` в базе данных.

---

## 📝 Шаг 1: Остановите backend сервер

В терминале где запущен backend нажмите **Ctrl+C**

---

## 📝 Шаг 2: Сделайте бэкап базы данных

**Windows PowerShell:**
```powershell
cd backend
Copy-Item medical_risk.db -Destination medical_risk_backup.db
```

---

## 📝 Шаг 3: Выполните миграцию

### Вариант A: Через Python скрипт

```powershell
cd backend
python migrate_risk_factors.py
```

### Вариант B: Через SQLite напрямую

1. Откройте командную строку
2. Перейдите в папку backend:
   ```
   cd backend
   ```

3. Откройте SQLite:
   ```
   sqlite3 medical_risk.db
   ```

4. Выполните миграцию:
   ```sql
   .read migrate_nullable_scores.sql
   ```

5. Выйдите из SQLite:
   ```
   .exit
   ```

### Вариант C: Через DB Browser for SQLite (самый простой!)

1. Скачайте и установите **DB Browser for SQLite**: https://sqlitebrowser.org/dl/
2. Откройте файл `backend\medical_risk.db`
3. Перейдите на вкладку **"Execute SQL"**
4. Скопируйте содержимое файла `migrate_nullable_scores.sql` и вставьте в окно SQL
5. Нажмите **"Execute"** (иконка ▶)
6. Нажмите **"Write Changes"** (иконка 💾)
7. Закройте DB Browser

---

## 📝 Шаг 4: Проверьте миграцию

Запустите Python скрипт для проверки:

```powershell
cd backend
python -c "import sqlite3; conn = sqlite3.connect('medical_risk.db'); cursor = conn.cursor(); cursor.execute('PRAGMA table_info(risk_factors)'); columns = cursor.fetchall(); [print(f'{col[1]}: nullable={col[3] == 0}') for col in columns if col[1] in ['severity_score', 'probability_score', 'risk_score']]; conn.close()"
```

**Ожидаемый результат:**
```
severity_score: nullable=True
probability_score: nullable=True
risk_score: nullable=True
```

---

## 📝 Шаг 5: Запустите backend снова

```powershell
cd backend
python run.py
```

---

## 📝 Шаг 6: Протестируйте

1. Откройте http://localhost:3000
2. Перейдите в любой проект
3. Нажмите **"Manage Risk Analysis"**
4. Нажмите **"+ Add Risk"**
5. Заполните форму (без severity и probability)
6. Нажмите **"Add Risk"**

**Ожидаемый результат:** Риск создается успешно без ошибок!

---

## ⚠️ Если что-то пошло не так

### Восстановление из бэкапа:

```powershell
cd backend
Remove-Item medical_risk.db
Copy-Item medical_risk_backup.db -Destination medical_risk.db
```

---

## 🔧 Альтернатива: Пересоздать БД с нуля (если нет важных данных)

Если в базе нет важных данных, можно просто пересоздать:

```powershell
cd backend
Remove-Item medical_risk.db
python init_db.py
```

**Внимание:** Все данные будут удалены!

---

## ✅ Проверка после миграции

После успешной миграции должно работать:

- ✅ Создание рисков без оценок
- ✅ Автоматическая синхронизация с таблицей
- ✅ Оценка рисков в Excel-таблице
- ✅ Обратная синхронизация оценок

---

## 📞 Поддержка

Если возникли проблемы:
1. Проверьте бэкап
2. Посмотрите логи backend
3. Убедитесь, что backend сервер остановлен перед миграцией

