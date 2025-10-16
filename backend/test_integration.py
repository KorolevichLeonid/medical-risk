#!/usr/bin/env python3
"""
Тест интеграции таблиц рисков
"""
import requests
import json

BASE_URL = "http://localhost:8000"
PROJECT_ID = 6  # Из твоего лога
SHEET_ID = "sheet1"

def test_api():
    """Тест API endpoints"""

    print("=== Тестирование API риск-таблиц ===")

    # 1. Проверка доступности сервера
    try:
        response = requests.get(f"{BASE_URL}")
        print("✅ Сервер доступен")
        print(f"Ответ: {response.json()}")
    except Exception as e:
        print(f"❌ Сервер недоступен: {e}")
        return

    # 2. Проверка API документов
    try:
        response = requests.get(f"{BASE_URL}/docs")
        print("✅ Документация API доступна")
    except Exception as e:
        print(f"❌ Ошибка с документацией: {e}")

    # 3. Тест получения данных таблицы (без авторизации)
    try:
        url = f"{BASE_URL}/api/risk-tables/project/{PROJECT_ID}/sheets/{SHEET_ID}"
        print(f"Тестирую GET: {url}")

        response = requests.get(url)
        print(f"Статус: {response.status_code}")

        if response.status_code == 200:
            data = response.json()
            print("✅ Данные таблицы получены!")
            print(f"Количество строк: {len(data.get('rows', []))}")
        elif response.status_code == 404:
            print("⚠️  Таблица не найдена (нормально для нового проекта)")
        else:
            print(f"❌ Ошибка: {response.status_code}")
            print(response.text)

    except Exception as e:
        print(f"❌ Ошибка при получении данных: {e}")

    # 4. Тест сохранения данных таблицы
    try:
        url = f"{BASE_URL}/api/risk-tables/project/{PROJECT_ID}/sheets/{SHEET_ID}"
        print(f"\nТестирую PUT: {url}")

        # Тестовые данные
        test_data = {
            "sheet_name": "Тест Энергетические опасности",
            "sheet_icon": "⚡",
            "columns": [
                {
                    "key": "lifecycle_stage",
                    "label": "Этап жизненного цикла изделия",
                    "width": "180px",
                    "column_index": 0
                }
            ],
            "rows": [
                {
                    "row_number": 1,
                    "row_index": 0,
                    "data": {"lifecycle_stage": "Тест данных"},
                    "cell_colors": None
                }
            ]
        }

        response = requests.put(url, json=test_data, headers={'Content-Type': 'application/json'})
        print(f"Статус: {response.status_code}")

        if response.status_code == 200:
            data = response.json()
            print("✅ Данные таблицы сохранены!")
            print(f"ID таблицы: {data.get('id')}")
        else:
            print(f"❌ Ошибка при сохранении: {response.status_code}")
            print(response.text)

    except Exception as e:
        print(f"❌ Ошибка при сохранении: {e}")

    print("\n=== Тест завершен ===")

if __name__ == "__main__":
    test_api()
