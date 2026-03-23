"""
Checklist questions for hazard identification
This file provides a centralized source of questions for all document formats
"""

# Mapping of question keys to human-readable questions and categories
QUESTION_MAPPING = {
    # Lifecycle stages (этапы жизненного цикла)
    'lifecycle_design': {
        'question': 'Проектирование и разработка',
        'category': 'Этапы жизненного цикла'
    },
    'lifecycle_procurement': {
        'question': 'Закупка и входной контроль компонентов и материалов',
        'category': 'Этапы жизненного цикла'
    },
    'lifecycle_production': {
        'question': 'Производство',
        'category': 'Этапы жизненного цикла'
    },
    'lifecycle_packaging': {
        'question': 'Упаковка',
        'category': 'Этапы жизненного цикла'
    },
    'lifecycle_transportation': {
        'question': 'Транспортировка',
        'category': 'Этапы жизненного цикла'
    },
    'lifecycle_storage': {
        'question': 'Хранение',
        'category': 'Этапы жизненного цикла'
    },
    'lifecycle_installation': {
        'question': 'Установка и ввод в эксплуатацию',
        'category': 'Этапы жизненного цикла'
    },
    'lifecycle_use': {
        'question': 'Использование по назначению',
        'category': 'Этапы жизненного цикла'
    },
    'lifecycle_maintenance': {
        'question': 'Техническое обслуживание и ремонт',
        'category': 'Этапы жизненного цикла'
    },
    'lifecycle_decontamination': {
        'question': 'Дезинфекция и стерилизация',
        'category': 'Этапы жизненного цикла'
    },
    'lifecycle_disposal': {
        'question': 'Утилизация',
        'category': 'Этапы жизненного цикла'
    },
    'lifecycle_training': {
        'question': 'Обучение персонала',
        'category': 'Этапы жизненного цикла'
    },
    'lifecycle_documentation': {
        'question': 'Создание и обновление документации',
        'category': 'Этапы жизненного цикла'
    },
    'lifecycle_postmarket': {
        'question': 'Постмаркетинговый надзор',
        'category': 'Этапы жизненного цикла'
    },
    
    # Hazard categories (категории опасностей)
    'active': {
        'question': 'Активное медицинское изделие (работает с электрической энергией)',
        'category': 'Опасности, связанные с электричеством'
    },
    'sterile': {
        'question': 'Стерильное изделие',
        'category': 'Биосовместимость'
    },
    'disposable': {
        'question': 'Одноразовое изделие',
        'category': 'Биосовместимость'
    },
    'software': {
        'question': 'Изделие с программным обеспечением',
        'category': 'Программное обеспечение'
    },
    'implantable': {
        'question': 'Имплантируемое изделие',
        'category': 'Биосовместимость'
    },
    'bodyContact': {
        'question': 'Контакт с телом пациента',
        'category': 'Биосовместимость'
    },
    'materialContact': {
        'question': 'Контакт с материалами/веществами',
        'category': 'Химические вещества'
    },
    'implantableDevice': {
        'question': 'Имплантируемое устройство',
        'category': 'Биосовместимость'
    },
    'substanceRelease': {
        'question': 'Выделение веществ',
        'category': 'Химические вещества'
    },
    'sensitization': {
        'question': 'Потенциальная сенсибилизация',
        'category': 'Биосовместимость'
    },
    'containsSoftware': {
        'question': 'Содержит программное обеспечение',
        'category': 'Программное обеспечение'
    },
    'dataExchange': {
        'question': 'Обмен данными с другими системами',
        'category': 'Программное обеспечение'
    },
    'wireless': {
        'question': 'Беспроводная связь',
        'category': 'Электрическая энергия'
    },
    'personalData': {
        'question': 'Обработка персональных данных',
        'category': 'Программное обеспечение'
    },
    'userInterface': {
        'question': 'Пользовательский интерфейс',
        'category': 'Программное обеспечение'
    },
    'activeDevice': {
        'question': 'Активное устройство',
        'category': 'Электрическая энергия'
    },
    'powerConnection': {
        'question': 'Подключение к электропитанию',
        'category': 'Электрическая энергия'
    },
    'electricalContacts': {
        'question': 'Электрические контакты',
        'category': 'Электрическая энергия'
    },
    'movingElements': {
        'question': 'Движущиеся элементы',
        'category': 'Механические факторы'
    },
    'movingRisk': {
        'question': 'Риск от движущихся частей',
        'category': 'Механические факторы'
    },
    'emitsEnergy': {
        'question': 'Изделие излучает энергию',
        'category': 'Электрическая энергия'
    },
    'opticalSystems': {
        'question': 'Оптические системы',
        'category': 'Электрическая энергия'
    },
    'specialTraining': {
        'question': 'Требуется специальная подготовка персонала',
        'category': 'Программное обеспечение'
    },
    'specialNeeds': {
        'question': 'Особые потребности пользователей',
        'category': 'Программное обеспечение'
    },
    'interfaceError': {
        'question': 'Ошибки интерфейса',
        'category': 'Программное обеспечение'
    },
    'alarms': {
        'question': 'Система оповещения/тревоги',
        'category': 'Программное обеспечение'
    },
    'isSterile': {
        'question': 'Изделие стерильно',
        'category': 'Биосовместимость'
    },
    'reusable': {
        'question': 'Многоразовое использование',
        'category': 'Биосовместимость'
    },
    'biologicalContact': {
        'question': 'Биологический контакт',
        'category': 'Биосовместимость'
    },
    'chemicalSubstances': {
        'question': 'Химические вещества в составе',
        'category': 'Химические вещества'
    },
    'chemicalRelease': {
        'question': 'Выделение химических веществ',
        'category': 'Химические вещества'
    },
    'chemicalSterilization': {
        'question': 'Химическая стерилизация',
        'category': 'Химические вещества'
    },
    'animalMaterials': {
        'question': 'Материалы животного происхождения',
        'category': 'Биосовместимость'
    },
    'nanomaterials': {
        'question': 'Наноматериалы',
        'category': 'Наноматериалы'
    },
    'pharmaceutical': {
        'question': 'Фармацевтические субстанции',
        'category': 'Фармацевтические субстанции'
    },
    'environmentalSensitivity': {
        'question': 'Чувствительность к окружающей среде',
        'category': 'Воздействие окружающей среды'
    },
    'environmentalImpact': {
        'question': 'Воздействие на окружающую среду',
        'category': 'Воздействие окружающей среды'
    },
    'mechanicalLoad': {
        'question': 'Механические нагрузки',
        'category': 'Механические факторы'
    },
    'destructionRisk': {
        'question': 'Риск разрушения',
        'category': 'Механические факторы'
    },
    'heating': {
        'question': 'Тепловое воздействие',
        'category': 'Термические воздействия'
    },
    'surfaceContact': {
        'question': 'Контакт с поверхностями',
        'category': 'Термические воздействия'
    },
    'reliability': {
        'question': 'Надежность и отказоустойчивость',
        'category': 'Программное обеспечение'
    },
    'clinicalUse': {
        'question': 'Клиническое применение',
        'category': 'Клиническое применение'
    },
    'clinicalError': {
        'question': 'Клинические ошибки',
        'category': 'Клиническое применение'
    },
    'clinicalValidation': {
        'question': 'Клиническая валидация',
        'category': 'Клиническое применение'
    }
}

def get_checklist_questions():
    """Get all checklist questions organized by category"""
    questions_by_category = {}
    for key, info in QUESTION_MAPPING.items():
        category = info['category']
        if category not in questions_by_category:
            questions_by_category[category] = []
        questions_by_category[category].append({
            'key': key,
            'question': info['question']
        })
    return questions_by_category

def get_checklist_questions_flat():
    """Get all checklist questions as a flat list"""
    questions = []
    for key, info in QUESTION_MAPPING.items():
        questions.append({
            'key': key,
            'question': info['question'],
            'category': info['category']
        })
    return questions

def get_question_info(key):
    """Get question information by key"""
    return QUESTION_MAPPING.get(key, {'question': key, 'category': 'Разное'})

def format_answer(value):
    """Format boolean answer to Да/Нет"""
    if isinstance(value, bool):
        return 'Да' if value else 'Нет'
    elif isinstance(value, str):
        value_lower = value.lower().strip()
        if value_lower in ['true', 'да', 'yes', '1']:
            return 'Да'
        elif value_lower in ['false', 'нет', 'no', '0']:
            return 'Нет'
    return 'Нет'  # Default to Нет for unknown values

def get_hazard_categories_from_answers(answers):
    """Extract hazard categories from answers"""
    if not answers:
        return []
    
    categories = set()
    for key, value in answers.items():
        if value:  # Only include categories where answer is True
            question_info = get_question_info(key)
            category = question_info['category']
            # Map to hazard categories
            if category in ['Электрическая энергия', 'Биосовместимость', 'Программное обеспечение', 
                           'Химические вещества', 'Механические факторы', 'Термические воздействия',
                           'Наноматериалы', 'Фармацевтические субстанции', 'Воздействие окружающей среды',
                           'Клиническое применение']:
                categories.add(category)
    
    return list(categories)

def get_lifecycle_stages_from_answers(answers):
    """Extract lifecycle stages from answers"""
    if not answers:
        return []
    
    stages = []
    for key, value in answers.items():
        if value and key.startswith('lifecycle_'):
            question_info = get_question_info(key)
            stages.append(question_info['question'])
    
    return stages