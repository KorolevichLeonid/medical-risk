# Quick Start - Document Generation

## 🚀 Быстрый старт (5 минут)

### Шаг 1: Установка зависимостей

Библиотека `python-docx` уже установлена. Если нет:

```bash
cd medical-risk-auth/backend
pip install python-docx
```

### Шаг 2: Запуск сервера

```bash
# Backend
cd medical-risk-auth/backend
python run.py

# Frontend (в другом терминале)
cd medical-risk-auth/frontend
npm start
```

### Шаг 3: Использование

1. Войдите в систему
2. Откройте проект
3. Нажмите кнопку **"📄 View Document"**
4. Нажмите **"🔄 Generate New Version"**
5. Скачайте документ **"⬇️ Download Document (DOCX)"**

## ✨ Что умеет система

- ✅ Автоматическая генерация Risk Management Report в DOCX
- ✅ История версий с автоматической нумерацией (v1.0, v1.1, v2.0...)
- ✅ Скачивание любой версии документа
- ✅ Заполнение данными из БД проекта
- ✅ 10 разделов + приложения по ISO 14971:2019

## 📋 Структура документа

1. **Титульный лист** - название, модель, номер отчета
2. **Содержание** - список разделов
3. **Идентификация изделия** - информация об устройстве
4. **Идентификация опасностей** - таблица опасностей
5. **Анализ рисков** - оценка до мер контроля (S×P)
6. **Меры контроля** - таблица мер управления
7. **Остаточные риски** - оценка после мер контроля
8. **Общий риск** - совокупная оценка
9. **Выводы** - итоги и подписи команды
10. **Референсы** - стандарты и управление документом
11. **Приложение А** - полная таблица рисков

## 📊 Откуда берутся данные

### Из таблицы `projects`:
- `device_name` → Название устройства
- `device_model` → Модель
- `device_classification` → Классификация риска
- `intended_use` → Назначение
- `lifecycle_stages` → Этапы жизненного цикла
- `active_hazard_categories` → Категории опасностей

### Из таблицы `risk_table_rows` (поле `data` JSON):
- `lifecycle_stage` → Этап жизненного цикла риска
- `hazard` → Опасность
- `hazardous_situation` → Опасная ситуация
- `sequence_of_events` → Последовательность событий
- `harm` → Вред
- `severity_initial` → Начальная тяжесть (1-5)
- `probability_initial` → Начальная вероятность (1-5)
- `control_measures` → Меры контроля
- `verification` → Верификация
- `severity_residual` → Остаточная тяжесть (1-5)
- `probability_residual` → Остаточная вероятность (1-5)

### Из таблицы `project_members`:
- Состав команды проекта
- Роли участников

## ⚠️ Поля-заглушки

Некоторые поля помечены **[PLACEHOLDER]** - их нужно заполнить вручную в Word:

- Manufacturer (производитель)
- Manufacturer Address (адрес)
- Patient Population (популяция пациентов)
- Team Signatures (подписи с ролями)
- Overall Risk Formula (формула общего риска)

**Подробнее см. `DOCUMENT_DATA_MAPPING.md`**

## 🎯 Рекомендации

Для качественного документа заполните в проекте:

### Обязательно:
- ✅ device_name
- ✅ device_model
- ✅ device_classification

### Желательно:
- intended_use
- user_profile
- operating_environment
- standards
- lifecycle_stages (JSON: `["operation", "maintenance"]`)
- active_hazard_categories (JSON: `["Biological Hazards"]`)

### В таблице рисков:
- Все поля базовой идентификации (hazard, situation, events, harm)
- Оценки S и P (начальные и остаточные, 1-5)
- Меры контроля

## 🔗 API Endpoints

```
POST   /api/documents/projects/{id}/generate         - Генерация
GET    /api/documents/projects/{id}/current          - Текущая версия
GET    /api/documents/projects/{id}/versions         - История
GET    /api/documents/projects/{id}/versions/{vid}/download - Скачать
```

## 📚 Документация

- **Руководство пользователя**: `DOCUMENT_GENERATION_GUIDE.md`
- **Маппинг данных**: `DOCUMENT_DATA_MAPPING.md`
- **Детали установки**: `INSTALLATION_SUMMARY.md`
- **API документация**: `http://localhost:8000/docs`

## 🐛 Проблемы?

### Документ не генерируется:
- Проверьте обязательные поля проекта
- Убедитесь, что есть риски в таблице
- Проверьте логи backend

### Данные не отображаются:
- Проверьте формат JSON полей
- Убедитесь, что поля заполнены
- См. примеры в `DOCUMENT_DATA_MAPPING.md`

### Ошибка скачивания:
- Проверьте права доступа
- Очистите кэш браузера
- Перегенерируйте документ

## ✅ Готово!

Система полностью функциональна и готова к использованию. Все поля с данными из БД заполняются автоматически, остальные можно дополнить в Word.

---

**Версия**: 1.0  
**Статус**: Production Ready  
**Дата**: 7 ноября 2025

