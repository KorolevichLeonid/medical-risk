import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import './ProjectForm.css';
import API_BASE_URL from '../config';
import RiskMatrixTable from '../components/RiskMatrixTable';
import SeverityLevelsConfig from '../components/SeverityLevelsConfig';
import ProbabilityLevelsConfig from '../components/ProbabilityLevelsConfig';

// Detailed hazard checklist data
const hazardDetails = {
  active: {
    category: 'Опасности, связанные с электричеством',
    questions: [
      'Является ли изделие активным (использует источник энергии)?',
      'Подключается ли изделие к электросети или батарее?',
      'Есть ли электрические контакты, которые могут соприкасаться с пользователем или пациентом?'
    ],
    controls: 'Изоляция, заземление, предохранители, мониторинг параметров'
  },
  sterile: {
    category: 'Опасности, связанные с микробиологическими факторами',
    questions: [
      'Изделие является стерильным?',
      'Изделие многоразовое (повторная очистка и дезинфекция)?',
      'Имеет ли изделие контакт с биологическими жидкостями?'
    ],
    controls: 'Стерилизация, барьерные средства, гигиена, повторная обработка'
  },
  disposable: {
    category: 'Опасности, связанные с микробиологическими факторами',
    questions: [
      'Изделие является стерильным?',
      'Изделие многоразовое (повторная очистка и дезинфекция)?',
      'Имеет ли изделие контакт с биологическими жидкостями?'
    ],
    controls: 'Одноразовое использование, правильная утилизация'
  },
  software: {
    category: 'Опасности, связанные с безопасностью данных и систем',
    questions: [
      'Содержит ли изделие программное обеспечение?',
      'Обменивается ли изделие данными с другими устройствами или сетями?',
      'Передаёт ли изделие информацию по беспроводной связи (Wi-Fi, Bluetooth)?',
      'Хранит ли изделие персональные или медицинские данные?',
      'Управляется ли изделие через интерфейс пользователя или сеть?'
    ],
    controls: 'Верификация ПО, шифрование данных, аудит, резервные системы'
  },
  implantable: {
    category: 'Опасности, связанные с биосовместимостью',
    questions: [
      'Имеет ли изделие контакт с телом человека или его жидкостями?',
      'Используются ли материалы с прямым контактом с тканями или жидкостями?',
      'Предназначено ли изделие для имплантации?',
      'Есть ли риск выделения веществ из материалов в организм?',
      'Есть ли риск сенсибилизации, раздражения или цитотоксичности?'
    ],
    controls: 'Биосовместимые материалы, валидация, мониторинг реакции организма'
  },
  bodyContact: {
    category: 'Биосовместимость',
    questions: [
      'Имеет ли изделие контакт с телом человека или его жидкостями?',
      'Используются ли материалы с прямым контактом с тканями или жидкостями?',
      'Предназначено ли изделие для имплантации?',
      'Есть ли риск выделения веществ из материалов в организм?',
      'Есть ли риск сенсибилизации, раздражения или цитотоксичности?'
    ],
    controls: 'Биосовместимые материалы, валидация, мониторинг реакции организма'
  },
  materialContact: {
    category: 'Биосовместимость',
    questions: [
      'Имеет ли изделие контакт с телом человека или его жидкостями?',
      'Используются ли материалы с прямым контактом с тканями или жидкостями?',
      'Предназначено ли изделие для имплантации?',
      'Есть ли риск выделения веществ из материалов в организм?',
      'Есть ли риск сенсибилизации, раздражения или цитотоксичности?'
    ],
    controls: 'Биосовместимые материалы, валидация, мониторинг реакции организма'
  },
  implantableDevice: {
    category: 'Биосовместимость',
    questions: [
      'Имеет ли изделие контакт с телом человека или его жидкостями?',
      'Используются ли материалы с прямым контактом с тканями или жидкостями?',
      'Предназначено ли изделие для имплантации?',
      'Есть ли риск выделения веществ из материалов в организм?',
      'Есть ли риск сенсибилизации, раздражения или цитотоксичности?'
    ],
    controls: 'Биосовместимые материалы, валидация, мониторинг реакции организма'
  },
  substanceRelease: {
    category: 'Биосовместимость',
    questions: [
      'Имеет ли изделие контакт с телом человека или его жидкостями?',
      'Используются ли материалы с прямым контактом с тканями или жидкостями?',
      'Предназначено ли изделие для имплантации?',
      'Есть ли риск выделения веществ из материалов в организм?',
      'Есть ли риск сенсибилизации, раздражения или цитотоксичности?'
    ],
    controls: 'Биосовместимые материалы, валидация, мониторинг реакции организма'
  },
  sensitization: {
    category: 'Биосовместимость',
    questions: [
      'Имеет ли изделие контакт с телом человека или его жидкостями?',
      'Используются ли материалы с прямым контактом с тканями или жидкостями?',
      'Предназначено ли изделие для имплантации?',
      'Есть ли риск выделения веществ из материалов в организм?',
      'Есть ли риск сенсибилизации, раздражения или цитотоксичности?'
    ],
    controls: 'Биосовместимые материалы, валидация, мониторинг реакции организма'
  },
  containsSoftware: {
    category: 'Опасности, связанные с безопасностью данных и систем',
    questions: [
      'Содержит ли изделие программное обеспечение?',
      'Обменивается ли изделие данными с другими устройствами или сетями?',
      'Передаёт ли изделие информацию по беспроводной связи (Wi-Fi, Bluetooth)?',
      'Хранит ли изделие персональные или медицинские данные?',
      'Управляется ли изделие через интерфейс пользователя или сеть?'
    ],
    controls: 'Верификация ПО, шифрование данных, аудит, резервные системы'
  },
  dataExchange: {
    category: 'Опасности, связанные с безопасностью данных и систем',
    questions: [
      'Содержит ли изделие программное обеспечение?',
      'Обменивается ли изделие данными с другими устройствами или сетями?',
      'Передаёт ли изделие информацию по беспроводной связи (Wi-Fi, Bluetooth)?',
      'Хранит ли изделие персональные или медицинские данные?',
      'Управляется ли изделие через интерфейс пользователя или сеть?'
    ],
    controls: 'Верификация ПО, шифрование данных, аудит, резервные системы'
  },
  wireless: {
    category: 'Опасности, связанные с безопасностью данных и систем',
    questions: [
      'Содержит ли изделие программное обеспечение?',
      'Обменивается ли изделие данными с другими устройствами или сетями?',
      'Передаёт ли изделие информацию по беспроводной связи (Wi-Fi, Bluetooth)?',
      'Хранит ли изделие персональные или медицинские данные?',
      'Управляется ли изделие через интерфейс пользователя или сеть?'
    ],
    controls: 'Верификация ПО, шифрование данных, аудит, резервные системы'
  },
  personalData: {
    category: 'Опасности, связанные с безопасностью данных и систем',
    questions: [
      'Содержит ли изделие программное обеспечение?',
      'Обменивается ли изделие данными с другими устройствами или сетями?',
      'Передаёт ли изделие информацию по беспроводной связи (Wi-Fi, Bluetooth)?',
      'Хранит ли изделие персональные или медицинские данные?',
      'Управляется ли изделие через интерфейс пользователя или сеть?'
    ],
    controls: 'Верификация ПО, шифрование данных, аудит, резервные системы'
  },
  userInterface: {
    category: 'Опасности, связанные с безопасностью данных и систем',
    questions: [
      'Содержит ли изделие программное обеспечение?',
      'Обменивается ли изделие данными с другими устройствами или сетями?',
      'Передаёт ли изделие информацию по беспроводной связи (Wi-Fi, Bluetooth)?',
      'Хранит ли изделие персональные или медицинские данные?',
      'Управляется ли изделие через интерфейс пользователя или сеть?'
    ],
    controls: 'Верификация ПО, шифрование данных, аудит, резервные системы'
  },
  activeDevice: {
    category: 'Опасности, связанные с электричеством',
    questions: [
      'Является ли изделие активным (использует источник энергии)?',
      'Подключается ли изделие к электросети или батарее?',
      'Есть ли электрические контакты, которые могут соприкасаться с пользователем или пациентом?'
    ],
    controls: 'Изоляция, заземление, предохранители, мониторинг параметров'
  },
  powerConnection: {
    category: 'Опасности, связанные с электричеством',
    questions: [
      'Является ли изделие активным (использует источник энергии)?',
      'Подключается ли изделие к электросети или батарее?',
      'Есть ли электрические контакты, которые могут соприкасаться с пользователем или пациентом?'
    ],
    controls: 'Изоляция, заземление, предохранители, мониторинг параметров'
  },
  electricalContacts: {
    category: 'Опасности, связанные с электричеством',
    questions: [
      'Является ли изделие активным (использует источник энергии)?',
      'Подключается ли изделие к электросети или батарее?',
      'Есть ли электрические контакты, которые могут соприкасаться с пользователем или пациентом?'
    ],
    controls: 'Изоляция, заземление, предохранители, мониторинг параметров'
  },
  movingElements: {
    category: 'Движущиеся части',
    questions: [
      'Содержит ли изделие движущиеся механические элементы?',
      'Есть ли подвижные узлы, создающие риск защемления, раздавливания или травмы?'
    ],
    controls: 'Защитные экраны, стоп-устройства, датчики безопасности'
  },
  movingRisk: {
    category: 'Движущиеся части',
    questions: [
      'Содержит ли изделие движущиеся механические элементы?',
      'Есть ли подвижные узлы, создающие риск защемления, раздавливания или травмы?'
    ],
    controls: 'Защитные экраны, стоп-устройства, датчики безопасности'
  },
  emitsEnergy: {
    category: 'Излучение',
    questions: [
      'Излучает ли изделие энергию (ультразвук, инфракрасное, УФ, радиацию, лазер)?',
      'Использует ли изделие световые или оптические системы высокой интенсивности?'
    ],
    controls: 'Экранирование, дозиметрия, защитные средства, зоны безопасности'
  },
  opticalSystems: {
    category: 'Излучение',
    questions: [
      'Излучает ли изделие энергию (ультразвук, инфракрасное, УФ, радиацию, лазер)?',
      'Использует ли изделие световые или оптические системы высокой интенсивности?'
    ],
    controls: 'Экранирование, дозиметрия, защитные средства, зоны безопасности'
  },
  specialTraining: {
    category: 'Удобство использования',
    questions: [
      'Требуется ли специальное обучение для безопасного применения?',
      'Предусмотрено ли применение лицами с особыми потребностями?',
      'Есть ли риск неправильного выбора режима или ошибки интерфейса?',
      'Отображает ли изделие сигналы тревоги или предупреждения?'
    ],
    controls: 'Обучение, дизайн интерфейса, инструкции, обратная связь'
  },
  specialNeeds: {
    category: 'Удобство использования',
    questions: [
      'Требуется ли специальное обучение для безопасного применения?',
      'Предусмотрено ли применение лицами с особыми потребностями?',
      'Есть ли риск неправильного выбора режима или ошибки интерфейса?',
      'Отображает ли изделие сигналы тревоги или предупреждения?'
    ],
    controls: 'Обучение, дизайн интерфейса, инструкции, обратная связь'
  },
  interfaceError: {
    category: 'Удобство использования',
    questions: [
      'Требуется ли специальное обучение для безопасного применения?',
      'Предусмотрено ли применение лицами с особыми потребностями?',
      'Есть ли риск неправильного выбора режима или ошибки интерфейса?',
      'Отображает ли изделие сигналы тревоги или предупреждения?'
    ],
    controls: 'Обучение, дизайн интерфейса, инструкции, обратная связь'
  },
  alarms: {
    category: 'Удобство использования',
    questions: [
      'Требуется ли специальное обучение для безопасного применения?',
      'Предусмотрено ли применение лицами с особыми потребностями?',
      'Есть ли риск неправильного выбора режима или ошибки интерфейса?',
      'Отображает ли изделие сигналы тревоги или предупреждения?'
    ],
    controls: 'Обучение, дизайн интерфейса, инструкции, обратная связь'
  },
  isSterile: {
    category: 'Опасности, связанные с микробиологическими факторами',
    questions: [
      'Изделие является стерильным?',
      'Изделие многоразовое (повторная очистка и дезинфекция)?',
      'Имеет ли изделие контакт с биологическими жидкостями?'
    ],
    controls: 'Стерилизация, барьерные средства, гигиена, повторная обработка'
  },
  reusable: {
    category: 'Опасности, связанные с микробиологическими факторами',
    questions: [
      'Изделие является стерильным?',
      'Изделие многоразовое (повторная очистка и дезинфекция)?',
      'Имеет ли изделие контакт с биологическими жидкостями?'
    ],
    controls: 'Стерилизация, барьерные средства, гигиена, повторная обработка'
  },
  biologicalContact: {
    category: 'Опасности, связанные с микробиологическими факторами',
    questions: [
      'Изделие является стерильным?',
      'Изделие многоразовое (повторная очистка и дезинфекция)?',
      'Имеет ли изделие контакт с биологическими жидкостями?'
    ],
    controls: 'Стерилизация, барьерные средства, гигиена, повторная обработка'
  },
  chemicalSubstances: {
    category: 'Химические вещества',
    questions: [
      'Содержит ли изделие химически активные вещества или реагенты?',
      'Возможен ли выброс, испарение или утечка химических веществ при эксплуатации?',
      'Требует ли изделие стерилизации химическими агентами?'
    ],
    controls: 'Изоляция, система обнаружения, НДС, защита от воздействия'
  },
  chemicalRelease: {
    category: 'Химические вещества',
    questions: [
      'Содержит ли изделие химически активные вещества или реагенты?',
      'Возможен ли выброс, испарение или утечка химических веществ при эксплуатации?',
      'Требует ли изделие стерилизации химическими агентами?'
    ],
    controls: 'Изоляция, система обнаружения, НДС, защита от воздействия'
  },
  chemicalSterilization: {
    category: 'Химические вещества',
    questions: [
      'Содержит ли изделие химически активные вещества или реагенты?',
      'Возможен ли выброс, испарение или утечка химических веществ при эксплуатации?',
      'Требует ли изделие стерилизации химическими агентами?'
    ],
    controls: 'Изоляция, система обнаружения, НДС, защита от воздействия'
  },
  animalMaterials: {
    category: 'Ткани животного происхождения',
    questions: [
      'Используются ли материалы или компоненты животного происхождения (коллаген, желатин и т.п.)?'
    ],
    controls: 'Валидация источников, тестирование на загрязнители, traceability'
  },
  nanomaterials: {
    category: 'Наноматериалы',
    questions: [
      'Содержит ли изделие наночастицы, нанопокрытия или наноструктуры?'
    ],
    controls: 'Защита дыхания, ограничение экспозиции, мониторинг здоровья'
  },
  pharmaceutical: {
    category: 'Фармацевтические субстанции',
    questions: [
      'Содержит ли изделие лекарственные вещества или покрытия с высвобождением субстанции?'
    ],
    controls: 'Мониторинг реакций, антагонисты, лекарственная безопасность'
  },
  environmentalSensitivity: {
    category: 'Воздействие окружающей среды',
    questions: [
      'Чувствительно ли изделие к температуре, влажности, пыли, вибрации или ЭМИ?',
      'Может ли изделие оказывать влияние на окружающую среду при утилизации?'
    ],
    controls: 'Защита от окружающей среды, мониторинг условий, правильная утилизация'
  },
  environmentalImpact: {
    category: 'Воздействие окружающей среды',
    questions: [
      'Чувствительно ли изделие к температуре, влажности, пыли, вибрации или ЭМИ?',
      'Может ли изделие оказывать влияние на окружающую среду при утилизации?'
    ],
    controls: 'Защита от окружающей среды, мониторинг условий, правильная утилизация'
  },
  mechanicalLoad: {
    category: 'Механические факторы',
    questions: [
      'Подвержено ли изделие механическим нагрузкам, вибрации, ударам?',
      'Есть ли риск разрушения, деформации, разгерметизации?'
    ],
    controls: 'Расчет прочности, резервирование, инструменты контроля'
  },
  destructionRisk: {
    category: 'Механические факторы',
    questions: [
      'Подвержено ли изделие механическим нагрузкам, вибрации, ударам?',
      'Есть ли риск разрушения, деформации, разгерметизации?'
    ],
    controls: 'Расчет прочности, резервирование, инструменты контроля'
  },
  heating: {
    category: 'Термические воздействия',
    questions: [
      'Может ли изделие нагреваться или охлаждаться при использовании?',
      'Контактирует ли пользователь или пациент с горячими или холодными поверхностями?'
    ],
    controls: 'Охлаждение, защита, предупреждающие сигналы, температурный контроль'
  },
  surfaceContact: {
    category: 'Термические воздействия',
    questions: [
      'Может ли изделие нагреваться или охлаждаться при использовании?',
      'Контактирует ли пользователь или пациент с горячими или холодными поверхностями?'
    ],
    controls: 'Охлаждение, защита, предупреждающие сигналы, температурный контроль'
  },
  clinicalUse: {
    category: 'Клиническое применение',
    questions: [
      'Используется ли изделие в диагностике, лечении, реабилитации или мониторинге состояния пациента?',
      'Может ли ошибка применения привести к клиническим последствиям?'
    ],
    controls: 'Клинические испытания, обучение, мониторинг, протоколы безопасности'
  },
  clinicalError: {
    category: 'Клиническое применение',
    questions: [
      'Используется ли изделие в диагностике, лечении, реабилитации или мониторинге состояния пациента?',
      'Может ли ошибка применения привести к клиническим последствиям?'
    ],
    controls: 'Клинические испытания, обучение, мониторинг, протоколы безопасности'
  }
};

// Mapping: какие вопросы активируют какие категории опасностей
const HAZARD_CATEGORY_MAPPING = {
  // Всегда активные категории
  'always_active': [
    'Опасности, связанные с удобством использования (usability)',
    'Опасности, связанные с надежностью, отказом конструкции или функций изделия',
    'Опасности клинического применения',
    'Другие'
  ],
  
  // Биосовместимость
  'biocompatibility': {
    category: 'Опасности, связанные с биосовместимостью',
    questions: ['bodyContact', 'materialContact', 'implantableDevice', 'substanceRelease', 'sensitization', 'implantable']
  },
  
  // Безопасность данных и систем
  'data_security': {
    category: 'Опасности, связанные с безопасностью данных и систем',
    questions: ['containsSoftware', 'dataExchange', 'wireless', 'personalData', 'userInterface', 'software']
  },
  
  // Электричество
  'electrical': {
    category: 'Опасности, связанные с электричеством',
    questions: ['activeDevice', 'powerConnection', 'electricalContacts', 'active']
  },
  
  // Движущиеся части
  'moving_parts': {
    category: 'Опасности, связанные с движущимися частями',
    questions: ['movingElements', 'movingRisk']
  },
  
  // Излучение
  'radiation': {
    category: 'Опасности, связанные с излучением',
    questions: ['emitsEnergy', 'opticalSystems']
  },
  
  // Удобство использования (всегда активна)
  'usability': {
    category: 'Опасности, связанные с удобством использования (usability)',
    questions: ['specialTraining', 'specialNeeds', 'interfaceError', 'alarms']
  },
  
  // Микробиологические факторы
  'microbiology': {
    category: 'Опасности, связанные с микробиологическими факторами',
    questions: ['isSterile', 'reusable', 'biologicalContact', 'sterile', 'disposable']
  },
  
  // Химические вещества
  'chemical': {
    category: 'Опасности, связанные с химическими веществами',
    questions: ['chemicalSubstances', 'chemicalRelease', 'chemicalSterilization']
  },
  
  // Ткани животного происхождения
  'animal_tissue': {
    category: 'Опасности, связанные с тканями животного происхождения',
    questions: ['animalMaterials']
  },
  
  // Наноматериалы
  'nanomaterials': {
    category: 'Опасности, связанные с наноматериалами',
    questions: ['nanomaterials']
  },
  
  // Фармацевтические субстанции
  'pharmaceutical': {
    category: 'Опасности, связанные с фармацевтическими субстанциями',
    questions: ['pharmaceutical']
  },
  
  // Воздействие окружающей среды
  'environmental': {
    category: 'Опасности, связанные с воздействием окружающей среды',
    questions: ['environmentalSensitivity', 'environmentalImpact']
  },
  
  // Механические факторы
  'mechanical': {
    category: 'Опасности, связанные с механическими факторами, физические',
    questions: ['mechanicalLoad', 'destructionRisk']
  },
  
  // Термические воздействия
  'thermal': {
    category: 'Опасности, связанные с термическими воздействиями',
    questions: ['heating', 'surfaceContact']
  },
  
  // Надежность (всегда активна)
  'reliability': {
    category: 'Опасности, связанные с надежностью, отказом конструкции или функций изделия',
    questions: ['reliability']
  },
  
  // Клиническое применение (всегда активна)
  'clinical': {
    category: 'Опасности клинического применения',
    questions: ['clinicalUse', 'clinicalError']
  }
};

/**
 * Вычисляет активные категории опасностей на основе ответов на вопросы чеклиста
 * @param {Object} hazardQuestions - объект с ответами на вопросы (true/false)
 * @param {Array<string>} customHazards - массив кастомных опасностей, введённых пользователем
 * @returns {Array<string>} - массив названий активных категорий
 */
const calculateActiveHazardCategories = (hazardQuestions, customHazards = []) => {
  const activeCategories = new Set();
  
  // Добавляем всегда активные категории
  HAZARD_CATEGORY_MAPPING.always_active.forEach(category => {
    activeCategories.add(category);
  });
  
  // Проверяем каждую категорию
  Object.entries(HAZARD_CATEGORY_MAPPING).forEach(([key, value]) => {
    if (key === 'always_active') return; // Пропускаем always_active
    
    const { category, questions } = value;
    
    // Если хотя бы на один вопрос из группы ответили "Да", активируем категорию
    const hasPositiveAnswer = questions.some(questionKey => hazardQuestions[questionKey] === true);
    
    if (hasPositiveAnswer) {
      activeCategories.add(category);
    }
  });
  
  // Добавляем кастомные опасности, которые пользователь ввёл вручную
  if (customHazards && Array.isArray(customHazards)) {
    customHazards.forEach(hazard => {
      const trimmedHazard = hazard ? hazard.trim() : '';
      if (trimmedHazard && trimmedHazard.length > 0) {
        activeCategories.add(trimmedHazard);
      }
    });
  }
  
  return Array.from(activeCategories);
};

const getNumericScore = (level) => {
  const score = Number(level?.score);
  if (!Number.isNaN(score)) {
    return score;
  }
  const levelValue = Number(level?.level);
  return Number.isNaN(levelValue) ? 0 : levelValue;
};

const normalizeLevelsWithScores = (levels = []) => {
  let previousScore = null;
  return levels.map((level, index) => {
    const levelNumber = Number(level?.level) || index + 1;
    let score = getNumericScore(level);
    if (!Number.isFinite(score) || score <= 0) {
      score = levelNumber;
    }
    if (previousScore !== null && score <= previousScore) {
      score = previousScore + 1;
    }
    previousScore = score;
    return {
      ...level,
      level: levelNumber,
      score
    };
  });
};

  const getRiskThresholdRange = (severityLevels = [], probabilityLevels = []) => {
    const severityScores = severityLevels.map(getNumericScore).filter(Number.isFinite);
    const probabilityScores = probabilityLevels.map(getNumericScore).filter(Number.isFinite);

  const minSeverity = severityScores.length ? Math.min(...severityScores) : 1;
  const maxSeverity = severityScores.length ? Math.max(...severityScores) : 1;
  const minProbability = probabilityScores.length ? Math.min(...probabilityScores) : 1;
  const maxProbability = probabilityScores.length ? Math.max(...probabilityScores) : 1;

  return {
    min: minSeverity * minProbability,
    max: maxSeverity * maxProbability
  };
};

  const clampRiskThreshold = (threshold, severityLevels, probabilityLevels) => {
    const { min, max } = getRiskThresholdRange(severityLevels, probabilityLevels);
    if (!Number.isFinite(threshold)) return min;
    return Math.min(Math.max(threshold, min), max);
  };

  const getScoreValue = (level) => {
    if (level?.score === '' || level?.score === null || level?.score === undefined) {
      return NaN;
    }
    const score = Number(level?.score);
    return Number.isFinite(score) ? score : NaN;
  };

  const validateLevelScores = (levels = [], label) => {
    const missingScores = levels.some((level) => !Number.isFinite(getScoreValue(level)));
    if (missingScores) {
      return `Заполните баллы для всех уровней (${label}).`;
    }

    for (let i = 1; i < levels.length; i += 1) {
      const previous = getScoreValue(levels[i - 1]);
      const current = getScoreValue(levels[i]);
      if (current <= previous) {
        return `Баллы должны возрастать по уровню (${label}).`;
      }
    }

    return null;
  };

  const normalizeLifecycleStages = (stages = []) => {
    const mapped = (Array.isArray(stages) ? stages : []).map((stage) =>
      stage === 'operation' ? 'Эксплуатация' : stage
    );
    return [...new Set(mapped)];
  };

const ProjectForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditMode = Boolean(id && id !== 'new');
  
  const [formData, setFormData] = useState({
    // Основная информация о проекте
    name: '',
    description: '',
    status: 'draft',

    // Информация об устройстве
    deviceName: '',
    deviceModel: '',
    devicePurpose: '',
    deviceDescription: '',
    deviceClassification: '',
    intendedUse: '',
    operatingEnvironment: '',

    // Технические характеристики
    technicalSpecs: '',
    regulatoryRequirements: '',
    standards: '',


    // Уровень риска (доп./не доп.)
    acceptableRiskLevel: 10,

    // Матрица рисков
    riskMatrix: null,

    // Уровни тяжести последствий
    severityLevels: [
      { level: 1, score: 1, name: "Незначительный", description: "Приводит к неудобству или временному дискомфорту" },
      { level: 2, score: 2, name: "Незначительный/Легкий", description: "Приводит к временному повреждению или нарушению, не требующему медицинского вмешательства" },
      { level: 3, score: 3, name: "Серьезный/Значительный", description: "Приводит к повреждению или нарушению, требующему медицинского или хирургического вмешательства" },
      { level: 4, score: 4, name: "Критический", description: "Приводит к постоянному нарушению или необратимому повреждению" },
      { level: 5, score: 5, name: "Катастрофический/Фатальный", description: "Приводит к смерти" }
    ],
    // Уровни вероятностей последствий
    probabilityLevels: [
      { level: 1, score: 1, name: "Маловероятный", description: "Маловероятно произойти (только в исключительном случае стечения нескольких редких ошибок и/или обстоятельств)" },
      { level: 2, score: 2, name: "Отдаленный", description: "Может произойти, но не часто (возможно для немногих устройств, один или два раза за время эксплуатации)" },
      { level: 3, score: 3, name: "Эпизодический", description: "Вероятно произойти (возможно для многих устройств один или два раза за время эксплуатации, или для отдельных устройств несколько раз за время эксплуатации)" },
      { level: 4, score: 4, name: "Частый", description: "Происходит часто (происходит для многих или всех устройств несколько раз за время эксплуатации)" }
    ],
    riskThreshold: 10,

    // Этапы жизненного цикла
    lifecycleStages: [],
    customLifecycleStages: [],
    customHazards: [],

    // Вопросы об опасностях и вкладки
    hazardQuestions: {
      active: false,
      sterile: false,
      disposable: false,
      software: false,
      implantable: false,
      // Биосовместимость
      bodyContact: false,
      materialContact: false,
      implantableDevice: false,
      substanceRelease: false,
      sensitization: false,
      // Данные и системы
      containsSoftware: false,
      dataExchange: false,
      wireless: false,
      personalData: false,
      userInterface: false,
      // Электричество
      activeDevice: false,
      powerConnection: false,
      electricalContacts: false,
      // Движущиеся части
      movingElements: false,
      movingRisk: false,
      // Излучение
      emitsEnergy: false,
      opticalSystems: false,
      // Удобство использования
      specialTraining: false,
      specialNeeds: false,
      interfaceError: false,
      alarms: false,
      // Микробиологические факторы
      isSterile: false,
      reusable: false,
      biologicalContact: false,
      // Химические вещества
      chemicalSubstances: false,
      chemicalRelease: false,
      chemicalSterilization: false,
      // Ткани животного происхождения
      animalMaterials: false,
      // Наноматериалы
      nanomaterials: false,
      // Фармацевтические субстанции
      pharmaceutical: false,
      // Воздействие окружающей среды
      environmentalSensitivity: false,
      environmentalImpact: false,
      // Механические факторы
      mechanicalLoad: false,
      destructionRisk: false,
      // Термические воздействия
      heating: false,
      surfaceContact: false,
      // Надежность (всегда активна)
      reliability: true,
      // Клиническое применение
      clinicalUse: false,
      clinicalError: false
    },

    // Подробные ответы на чеклисты
    hazardChecklistAnswers: {},
    customHazard: '',
    
    // Активные категории опасностей (вычисляются автоматически на основе hazardQuestions)
    activeHazardCategories: []
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [riskMatrix, setRiskMatrix] = useState(null);

  useEffect(() => {
    if (isEditMode) {
      loadProjectData();
    }
  }, [isEditMode]);

  // Separate useEffect for logging user data only when we have a valid project ID
  useEffect(() => {
    const logUserData = async () => {
      // Only log for existing projects with valid IDs (not 'new' or undefined)
      if (!id || id === 'new' || id === 'undefined' || !isEditMode || isEditMode === false) {
        return;
      }

      try {
        const token = localStorage.getItem('token');
        const projectId = id;
        // Double-check that projectId is a valid number
        if (!projectId || isNaN(parseInt(projectId))) {
          return;
        }

        const response = await fetch(`${API_BASE_URL}/api/users/me/permissions?project_id=${projectId}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          const userData = await response.json();
          console.log('Данные пользователя (ProjectForm):', userData);
          console.log('Разрешения пользователя (ProjectForm):', userData.permissions);
        }
      } catch (error) {
        console.error('Ошибка при получении данных пользователя:', error);
      }
    };

    logUserData();
  }, [id, isEditMode]);

  // Автоматически пересчитываем активные категории опасностей при изменении hazardQuestions или customHazards
  useEffect(() => {
    const activeCategories = calculateActiveHazardCategories(
      formData.hazardQuestions,
      formData.customHazards
    );
    if (JSON.stringify(activeCategories) !== JSON.stringify(formData.activeHazardCategories)) {
      setFormData(prev => ({
        ...prev,
        activeHazardCategories: activeCategories
      }));
    }
  }, [formData.hazardQuestions, formData.customHazards]);

  const loadProjectData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      console.log('Loading project data for ID:', id);
      console.log('Token exists:', !!token);

      const response = await fetch(`${API_BASE_URL}/api/projects/${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      console.log('Response status:', response.status);
      console.log('Response ok:', response.ok);

      if (response.ok) {
        const projectData = await response.json();
        console.log('Project data loaded:', projectData);

        const loadedData = {
          name: projectData.name || '',
          description: projectData.description || '',
          status: projectData.status || 'draft',
          deviceName: projectData.device_name || '',
          deviceModel: projectData.device_model || '',
          devicePurpose: projectData.device_purpose || '',
          deviceDescription: projectData.device_description || '',
          deviceClassification: projectData.device_classification || '',
          intendedUse: projectData.intended_use || '',
          operatingEnvironment: projectData.operating_environment || '',
          technicalSpecs: projectData.technical_specs || '',
          regulatoryRequirements: projectData.regulatory_requirements || '',
          standards: projectData.standards || '',
          acceptableRiskLevel: projectData.acceptable_risk_level || 10,
          riskMatrix: projectData.risk_matrix || null,
          severityLevels: normalizeLevelsWithScores(projectData.severity_levels || [
            { level: 1, score: 1, name: "Незначительный", description: "Приводит к неудобству или временному дискомфорту" },
            { level: 2, score: 2, name: "Незначительный/Легкий", description: "Приводит к временному повреждению или нарушению, не требующему медицинского вмешательства" },
            { level: 3, score: 3, name: "Серьезный/Значительный", description: "Приводит к повреждению или нарушению, требующему медицинского или хирургического вмешательства" },
            { level: 4, score: 4, name: "Критический", description: "Приводит к постоянному нарушению или необратимому повреждению" },
            { level: 5, score: 5, name: "Катастрофический/Фатальный", description: "Приводит к смерти" }
          ]),
          probabilityLevels: normalizeLevelsWithScores(projectData.probability_levels || [
            { level: 1, score: 1, name: "Маловероятный", description: "Маловероятно произойти (только в исключительном случае стечения нескольких редких ошибок и/или обстоятельств)" },
            { level: 2, score: 2, name: "Отдаленный", description: "Может произойти, но не часто (возможно для немногих устройств, один или два раза за время эксплуатации)" },
            { level: 3, score: 3, name: "Эпизодический", description: "Вероятно произойти (возможно для многих устройств один или два раза за время эксплуатации, или для отдельных устройств несколько раз за время эксплуатации)" },
            { level: 4, score: 4, name: "Частый", description: "Происходит часто (происходит для многих или всех устройств несколько раз за время эксплуатации)" }
          ]),
          riskThreshold: projectData.risk_threshold || 10,
          lifecycleStages: normalizeLifecycleStages(projectData.lifecycle_stages || []),
          customLifecycleStages: projectData.custom_lifecycle_stages || [],
          hazardQuestions: projectData.hazard_questions || {
            active: false,
            sterile: false,
            disposable: false,
            software: false,
            implantable: false,
            bodyContact: false,
            materialContact: false,
            implantableDevice: false,
            substanceRelease: false,
            sensitization: false,
            containsSoftware: false,
            dataExchange: false,
            wireless: false,
            personalData: false,
            userInterface: false,
            activeDevice: false,
            powerConnection: false,
            electricalContacts: false,
            movingElements: false,
            movingRisk: false,
            emitsEnergy: false,
            opticalSystems: false,
            specialTraining: false,
            specialNeeds: false,
            interfaceError: false,
            alarms: false,
            isSterile: false,
            reusable: false,
            biologicalContact: false,
            chemicalSubstances: false,
            chemicalRelease: false,
            chemicalSterilization: false,
            animalMaterials: false,
            nanomaterials: false,
            pharmaceutical: false,
            environmentalSensitivity: false,
            environmentalImpact: false,
            mechanicalLoad: false,
            destructionRisk: false,
            heating: false,
            surfaceContact: false,
            reliability: true,
            clinicalUse: false,
            clinicalError: false,
            clinicalValidation: false
          },
          hazardChecklistAnswers: (() => {
            if (!projectData.hazard_checklist_answers) return {};
            if (typeof projectData.hazard_checklist_answers === 'object') return projectData.hazard_checklist_answers;
            if (typeof projectData.hazard_checklist_answers === 'string') {
              try {
                return JSON.parse(projectData.hazard_checklist_answers);
              } catch (e) {
                console.error('Failed to parse hazard_checklist_answers:', e);
                return {};
              }
            }
            return {};
          })(),
          customHazards: projectData.custom_hazard
            ? projectData.custom_hazard.split('\n').map(line => line.trim()).filter(line => line)
            : [],
          activeHazardCategories: (() => {
            if (!projectData.active_hazard_categories) return [];
            if (Array.isArray(projectData.active_hazard_categories)) return projectData.active_hazard_categories;
            if (typeof projectData.active_hazard_categories === 'string') {
              try {
                return JSON.parse(projectData.active_hazard_categories);
              } catch (e) {
                console.error('Failed to parse active_hazard_categories:', e);
                return [];
              }
            }
            return [];
          })()
        };

        console.log('Parsed hazard checklist answers:', loadedData.hazardChecklistAnswers);
        console.log('Active hazard categories:', loadedData.activeHazardCategories);

        // Ensure if 'other' is selected, there's at least one custom lifecycle stage
        if (loadedData.lifecycleStages.includes('other') && loadedData.customLifecycleStages.length === 0) {
          loadedData.customLifecycleStages = [''];
        }

        const normalizedThreshold = clampRiskThreshold(
          loadedData.riskThreshold,
          loadedData.severityLevels,
          loadedData.probabilityLevels
        );
        setFormData({
          ...loadedData,
          riskThreshold: normalizedThreshold
        });
        console.log('Form data set successfully');
      } else {
        const errorText = await response.text();
        console.error('Failed to load project data:', response.status, errorText);
        setError(`Не удалось загрузить данные проекта: ${response.status} ${errorText}`);
      }
    } catch (err) {
      console.error('Error loading project data:', err);
      setError(`Не удалось загрузить данные проекта: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleLifecycleCheckboxChange = (e, stage) => {
    const { checked } = e.target;
    if (checked && stage === 'other') {
      setFormData(prev => ({
        ...prev,
        lifecycleStages: [...prev.lifecycleStages, stage],
        customLifecycleStages: prev.customLifecycleStages.length === 0 ? [''] : prev.customLifecycleStages
      }));
    } else if (!checked && stage === 'other') {
      setFormData(prev => ({
        ...prev,
        lifecycleStages: prev.lifecycleStages.filter(s => s !== stage),
        customLifecycleStages: []
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        lifecycleStages: checked
          ? [...prev.lifecycleStages, stage]
          : prev.lifecycleStages.filter(s => s !== stage)
      }));
    }
  };

  const handleHazardChange = (e) => {
    const { name, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      hazardQuestions: {
        ...prev.hazardQuestions,
        [name]: checked
      }
    }));
  };

  // Handlers for dynamic custom fields
  const addCustomLifecycleStage = () => {
    setFormData(prev => ({
      ...prev,
      customLifecycleStages: [...prev.customLifecycleStages, '']
    }));
  };

  const removeCustomLifecycleStage = (index) => {
    setFormData(prev => ({
      ...prev,
      customLifecycleStages: prev.customLifecycleStages.filter((_, i) => i !== index)
    }));
  };

  const handleCustomLifecycleStageChange = (index, value) => {
    setFormData(prev => ({
      ...prev,
      customLifecycleStages: prev.customLifecycleStages.map((stage, i) => i === index ? value : stage)
    }));
  };

  const addCustomHazard = () => {
    setFormData(prev => ({
      ...prev,
      customHazards: [...prev.customHazards, '']
    }));
  };

  const removeCustomHazard = (index) => {
    setFormData(prev => ({
      ...prev,
      customHazards: prev.customHazards.filter((_, i) => i !== index)
    }));
  };

  const handleCustomHazardChange = (index, value) => {
    setFormData(prev => ({
      ...prev,
      customHazards: prev.customHazards.map((hazard, i) => i === index ? value : hazard)
    }));
  };

  const handleHazardChecklistChange = (category, questionKey, checked, customValue = null) => {
    setFormData(prev => {
      const updatedAnswers = {
        ...prev.hazardChecklistAnswers,
        [category]: {
          ...prev.hazardChecklistAnswers[category],
          [questionKey]: checked,
          ...(customValue !== null && { [`${questionKey}_custom`]: customValue })
        }
      };

      // If unchecking an "other" question, clear its custom value
      if (!checked && customValue === null) {
        const categoryAnswers = updatedAnswers[category];
        const customKey = `${questionKey}_custom`;
        if (categoryAnswers[customKey]) {
          delete categoryAnswers[customKey];
        }
      }

      return {
        ...prev,
        hazardChecklistAnswers: updatedAnswers
      };
    });
  };

  // Функция для определения выбранных категорий опасностей на основе чеклиста
  const calculateSelectedHazardCategories = (hazardQuestions) => {
    const categories = [];
    
    // Маппинг вопросов к категориям опасностей
    const questionToCategoryMap = {
      // Биосовместимость
      bodyContact: 'Опасности, связанные с биосовместимостью',
      materialContact: 'Опасности, связанные с биосовместимостью',
      implantableDevice: 'Опасности, связанные с биосовместимостью',
      substanceRelease: 'Опасности, связанные с биосовместимостью',
      sensitization: 'Опасности, связанные с биосовместимостью',
      implantable: 'Опасности, связанные с биосовместимостью',
      
      // Безопасность данных и систем
      containsSoftware: 'Опасности, связанные с безопасностью данных и систем',
      dataExchange: 'Опасности, связанные с безопасностью данных и систем',
      wireless: 'Опасности, связанные с безопасностью данных и систем',
      personalData: 'Опасности, связанные с безопасностью данных и систем',
      userInterface: 'Опасности, связанные с безопасностью данных и систем',
      software: 'Опасности, связанные с безопасностью данных и систем',
      
      // Электричество
      activeDevice: 'Опасности, связанные с электричеством',
      powerConnection: 'Опасности, связанные с электричеством',
      electricalContacts: 'Опасности, связанные с электричеством',
      active: 'Опасности, связанные с электричеством',
      
      // Движущиеся части
      movingElements: 'Опасности, связанные с движущимися частями',
      movingRisk: 'Опасности, связанные с движущимися частями',
      
      // Излучение
      emitsEnergy: 'Опасности, связанные с излучением',
      opticalSystems: 'Опасности, связанные с излучением',
      
      // Удобство использования (ВСЕГДА активна)
      specialTraining: 'Опасности, связанные с удобством использования (usability)',
      specialNeeds: 'Опасности, связанные с удобством использования (usability)',
      interfaceError: 'Опасности, связанные с удобством использования (usability)',
      alarms: 'Опасности, связанные с удобством использования (usability)',
      
      // Микробиологические факторы
      isSterile: 'Опасности, связанные с микробиологическими факторами',
      reusable: 'Опасности, связанные с микробиологическими факторами',
      biologicalContact: 'Опасности, связанные с микробиологическими факторами',
      sterile: 'Опасности, связанные с микробиологическими факторами',
      disposable: 'Опасности, связанные с микробиологическими факторами',
      
      // Химические вещества
      chemicalSubstances: 'Опасности, связанные с химическими веществами',
      chemicalRelease: 'Опасности, связанные с химическими веществами',
      chemicalSterilization: 'Опасности, связанные с химическими веществами',
      
      // Ткани животного происхождения
      animalMaterials: 'Опасности, связанные с тканями животного происхождения',
      
      // Наноматериалы
      nanomaterials: 'Опасности, связанные с наноматериалами',
      
      // Фармацевтические субстанции
      pharmaceutical: 'Опасности, связанные с фармацевтическими субстанциями',
      
      // Воздействие окружающей среды
      environmentalSensitivity: 'Опасности, связанные с воздействием окружающей среды',
      environmentalImpact: 'Опасности, связанные с воздействием окружающей среды',
      
      // Механические факторы
      mechanicalLoad: 'Опасности, связанные с механическими факторами, физические',
      destructionRisk: 'Опасности, связанные с механическими факторами, физические',
      
      // Термические воздействия
      heating: 'Опасности, связанные с термическими воздействиями',
      surfaceContact: 'Опасности, связанные с термическими воздействиями',
      
      // Клиническое применение
    clinicalUse: 'Опасности клинического применения',
    clinicalError: 'Опасности клинического применения'
    };
    
    // Обходим все вопросы и добавляем соответствующие категории
    for (const [question, isChecked] of Object.entries(hazardQuestions)) {
      if (isChecked && questionToCategoryMap[question]) {
        const category = questionToCategoryMap[question];
        // Добавляем только уникальные категории
        if (!categories.includes(category)) {
          categories.push(category);
        }
      }
    }
    
    // Всегда добавляем обязательные категории
    const alwaysIncluded = [
      'Опасности, связанные с удобством использования (usability)',
      'Опасности, связанные с надежностью, отказом конструкции или функций изделия',
      'Опасности клинического применения',
      'Другие'
    ];
    
    alwaysIncluded.forEach(category => {
      if (!categories.includes(category)) {
        categories.push(category);
      }
    });
    
    return categories;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Для создания проекта-пустышки требуем только название проекта.
      // Остальные поля можно заполнить позже на странице проекта.
      const errors = [];
      if (!formData.name || formData.name.trim() === '') {
        errors.push('Название проекта');
      }

      // Расширенная валидация нужна только в режиме редактирования полной анкеты проекта.
      if (isEditMode) {
        const requiredEditFields = [
          { key: 'description', label: 'Описание проекта' },
          { key: 'deviceName', label: 'Название устройства' },
          { key: 'deviceModel', label: 'Модель устройства' },
          { key: 'devicePurpose', label: 'Назначение устройства' },
          { key: 'deviceDescription', label: 'Описание устройства' },
          { key: 'deviceClassification', label: 'Классификация устройства' },
          { key: 'operatingEnvironment', label: 'Условия эксплуатации' },
          { key: 'technicalSpecs', label: 'Технические характеристики' },
          { key: 'regulatoryRequirements', label: 'Нормативные требования' },
          { key: 'standards', label: 'Применимые стандарты' },
        ];
        requiredEditFields.forEach(({ key, label }) => {
          const value = formData[key];
          if (typeof value !== 'string' || value.trim() === '') {
            errors.push(label);
          }
        });

        if (!formData.lifecycleStages || formData.lifecycleStages.length === 0) {
          errors.push('Этапы жизненного цикла (минимум один)');
        }

        const severityScoreError = validateLevelScores(formData.severityLevels, 'уровни тяжести');
        if (severityScoreError) {
          errors.push(severityScoreError);
        }

        const probabilityScoreError = validateLevelScores(formData.probabilityLevels, 'уровни вероятностей');
        if (probabilityScoreError) {
          errors.push(probabilityScoreError);
        }
      }

      if (errors.length > 0) {
        throw new Error(`Пожалуйста, заполните обязательные поля: ${errors.join(', ')}`);
      }

      const token = localStorage.getItem('token');
      const url = isEditMode
        ? `${API_BASE_URL}/api/projects/${id}`
        : `${API_BASE_URL}/api/projects/`;
      
      const method = isEditMode ? 'PUT' : 'POST';
      
      let requestBody = {
        name: formData.name.trim(),
      };

      if (isEditMode) {
        // Вычисляем выбранные категории опасностей на основе чеклиста
        const selectedHazardCategories = calculateSelectedHazardCategories(formData.hazardQuestions);
        console.log('Selected Hazard Categories:', selectedHazardCategories);

        const normalizedThreshold = clampRiskThreshold(
          parseInt(formData.riskThreshold),
          formData.severityLevels,
          formData.probabilityLevels
        );

        requestBody = {
          ...requestBody,
          description: formData.description,
          device_name: formData.deviceName,
          device_model: formData.deviceModel,
          device_purpose: formData.devicePurpose,
          device_description: formData.deviceDescription,
          device_classification: formData.deviceClassification,
          intended_use: formData.intendedUse,
          operating_environment: formData.operatingEnvironment,
          technical_specs: formData.technicalSpecs,
          regulatory_requirements: formData.regulatoryRequirements,
          standards: formData.standards,
          status: formData.status,
          lifecycle_stages: formData.lifecycleStages,
          custom_lifecycle_stages: formData.customLifecycleStages,
          hazard_questions: formData.hazardQuestions,
          hazard_checklist_answers: formData.hazardChecklistAnswers,
          active_hazard_categories: formData.activeHazardCategories,
          custom_hazard: formData.customHazards.join('\n'),
          severity_levels: formData.severityLevels,
          probability_levels: formData.probabilityLevels,
          risk_threshold: normalizedThreshold
        };
      }

      const response = await fetch(url, {
        method: method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      if (response.ok) {
        const projectData = await response.json();
        navigate(`/project/${projectData.id}`);
      } else {
        let message = 'Не удалось сохранить проект';
        try {
          const errorData = await response.json();
          message = errorData.detail || message;
        } catch (_) {
          // ignore parse errors and keep fallback message
        }
        throw new Error(message);
      }

    } catch (err) {
      setError(err.message || 'Не удалось сохранить проект');
    } finally {
      setLoading(false);
    }
  };

  // Все пользователи могут создавать проекты

  // Проверки доступа для редактирования происходят на backend

  if (loading && isEditMode) {
    return (
      <div className="project-form">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Загрузка проекта...</p>
        </div>
      </div>
    );
  }

  if (!isEditMode) {
    return (
      <div className="project-form">
        <div className="form-header">
          <h1>Создать новый проект</h1>
          <p>Быстрое создание: укажите только название проекта</p>
        </div>

        <form onSubmit={handleSubmit} className="form">
          <div className="form-section">
            <h2>Основная информация</h2>
            <div className="form-group">
              <label htmlFor="name">Название проекта</label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="Введите название проекта"
                required
              />
            </div>
          </div>

          {error && <div className="error-message">{error}</div>}

          <div className="form-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => navigate(-1)}
            >
              Отмена
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
            >
              {loading ? 'Сохранение...' : 'Создать проект'}
            </button>
          </div>
        </form>
      </div>
    );
  }

  // Mapping of hazard questions to their unlocked categories
  const hazardIndicators = {
    active: 'Опасности, связанные с электричеством',
    sterile: 'Опасности, связанные с микробиологическими факторами',
    disposable: 'Опасности, связанные с микробиологическими факторами',
    software: 'Опасности, связанные с безопасностью данных и систем',
    implantable: 'Опасности, связанные с биосовместимостью',
    bodyContact: 'Опасности, связанные с биосовместимостью',
    materialContact: 'Опасности, связанные с биосовместимостью',
    implantableDevice: 'Опасности, связанные с биосовместимостью',
    substanceRelease: 'Опасности, связанные с биосовместимостью',
    sensitization: 'Опасности, связанные с биосовместимостью',
    containsSoftware: 'Опасности, связанные с безопасностью данных и систем',
    dataExchange: 'Опасности, связанные с безопасностью данных и систем',
    wireless: 'Опасности, связанные с безопасностью данных и систем',
    personalData: 'Опасности, связанные с безопасностью данных и систем',
    userInterface: 'Опасности, связанные с безопасностью данных и систем',
    activeDevice: 'Опасности, связанные с электричеством',
    powerConnection: 'Опасности, связанные с электричеством',
    electricalContacts: 'Опасности, связанные с электричеством',
    movingElements: 'Опасности, связанные с движущимися частями',
    movingRisk: 'Опасности, связанные с движущимися частями',
    emitsEnergy: 'Опасности, связанные с излучением',
    opticalSystems: 'Опасности, связанные с излучением',
    specialTraining: 'Опасности, связанные с удобством использования',
    specialNeeds: 'Опасности, связанные с удобством использования',
    interfaceError: 'Опасности, связанные с удобством использования',
    alarms: 'Опасности, связанные с удобством использования',
    isSterile: 'Опасности, связанные с микробиологическими факторами',
    reusable: 'Опасности, связанные с микробиологическими факторами',
    biologicalContact: 'Опасности, связанные с микробиологическими факторами',
    chemicalSubstances: 'Опасности, связанные с химическими веществами',
    chemicalRelease: 'Опасности, связанные с химическими веществами',
    chemicalSterilization: 'Опасности, связанные с химическими веществами',
    animalMaterials: 'Опасности, связанные с тканями животного происхождения',
    nanomaterials: 'Опасности, связанные с наноматериалами',
    pharmaceutical: 'Опасности, связанные с фармацевтическими субстанциями',
    environmentalSensitivity: 'Опасности, связанные с воздействием окружающей среды',
    environmentalImpact: 'Опасности, связанные с воздействием окружающей среды',
    mechanicalLoad: 'Опасности, связанные с механическими факторами',
    destructionRisk: 'Опасности, связанные с механическими факторами',
    heating: 'Опасности, связанные с термическими воздействиями',
    surfaceContact: 'Опасности, связанные с термическими воздействиями',
    clinicalUse: 'Опасности клинического применения',
    clinicalError: 'Опасности клинического применения'
  };

  const riskThresholdRange = getRiskThresholdRange(
    formData.severityLevels,
    formData.probabilityLevels
  );

  return (
    <div className="project-form">
      <div className="form-header">
        <h1>{isEditMode ? 'Редактировать проект' : 'Создать новый проект'}</h1>
        <p>{isEditMode ? 'Обновить информацию и настройки проекта' : 'Настроить новый проект анализа рисков медицинского устройства'}</p>
      </div>

      <form onSubmit={handleSubmit} className="form">
        {/* Основная информация */}
        <div className="form-section">
          <h2>Основная информация</h2>

          <div className="form-group">
            <label htmlFor="name">Название проекта</label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              placeholder="Введите название проекта"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="description">Описание проекта</label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              placeholder="Опишите цели и область проекта"
              rows="3"
              required={isEditMode}
            />
          </div>
        </div>

        {/* Информация об устройстве */}
        <div className="form-section">
          <h2>Информация об устройстве</h2>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="deviceName">Название устройства</label>
              <input
                type="text"
                id="deviceName"
                name="deviceName"
                value={formData.deviceName}
                onChange={handleInputChange}
                placeholder="Введите название устройства"
                required={isEditMode}
              />
            </div>

            <div className="form-group">
              <label htmlFor="deviceModel">Модель устройства</label>
              <input
                type="text"
                id="deviceModel"
                name="deviceModel"
                value={formData.deviceModel}
                onChange={handleInputChange}
                placeholder="Введите номер модели"
                required={isEditMode}
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="devicePurpose">Назначение устройства</label>
            <textarea
              id="devicePurpose"
              name="devicePurpose"
              value={formData.devicePurpose}
              onChange={handleInputChange}
              placeholder="Опишите назначение устройства"
              rows="2"
              required={isEditMode}
            />
          </div>

          <div className="form-group">
            <label htmlFor="deviceDescription">Описание устройства</label>
            <textarea
              id="deviceDescription"
              name="deviceDescription"
              value={formData.deviceDescription}
              onChange={handleInputChange}
              placeholder="Предоставьте подробное описание устройства"
              rows="3"
              required={isEditMode}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="deviceClassification">Классификация устройства</label>
              <select
                id="deviceClassification"
                name="deviceClassification"
                value={formData.deviceClassification}
                onChange={handleInputChange}
                required={isEditMode}
              >
                <option value="">Выберите классификацию</option>
                <option value="Class I">Класс I</option>
                <option value="Class IIa">Класс IIa</option>
                <option value="Class IIb">Класс IIb</option>
                <option value="Class III">Класс III</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="operatingEnvironment">Условия эксплуатации</label>
            <textarea
              id="operatingEnvironment"
              name="operatingEnvironment"
              value={formData.operatingEnvironment}
              onChange={handleInputChange}
              placeholder="Условия окружающей среды"
              rows="3"
              required={isEditMode}
            />
          </div>
        </div>

        {/* Технические характеристики */}
        <div className="form-section">
          <h2>Технические характеристики</h2>

          <div className="form-group">
            <label htmlFor="technicalSpecs">Технические характеристики</label>
            <textarea
              id="technicalSpecs"
              name="technicalSpecs"
              value={formData.technicalSpecs}
              onChange={handleInputChange}
              placeholder="Ключевые технические характеристики и особенности"
              rows="3"
              required={isEditMode}
            />
          </div>

          <div className="form-group">
            <label htmlFor="regulatoryRequirements">Нормативные требования</label>
            <textarea
              id="regulatoryRequirements"
              name="regulatoryRequirements"
              value={formData.regulatoryRequirements}
              onChange={handleInputChange}
              placeholder="Применимые нормативные требования (FDA, CE и т.д.)"
              rows="2"
              required={isEditMode}
            />
          </div>

          <div className="form-group">
            <label htmlFor="standards">Применимые стандарты</label>
            <textarea
              id="standards"
              name="standards"
              value={formData.standards}
              onChange={handleInputChange}
              placeholder="Соответствующие отраслевые стандарты (ISO, IEC и т.д.)"
              rows="2"
              required={isEditMode}
            />
          </div>
        </div>



        {/* Уровни тяжести последствий */}
        <div className="form-section">
          <SeverityLevelsConfig
            severityLevels={formData.severityLevels}
            riskThreshold={formData.riskThreshold}
            minRiskValue={riskThresholdRange.min}
            maxRiskValue={riskThresholdRange.max}
            onChange={(data) => {
              setFormData({
                ...formData,
                severityLevels: data.severity_levels,
                riskThreshold: data.risk_threshold
              });
            }}
          />
        </div>

        {/* Уровни вероятностей последствий */}
        <div className="form-section">
          <ProbabilityLevelsConfig
            probabilityLevels={formData.probabilityLevels}
            onChange={(data) => {
              setFormData({
                ...formData,
                probabilityLevels: data.probability_levels
              });
            }}
          />
        </div>

        {/* Этапы жизненного цикла */}
        <div className="form-section">
          <h2>Этапы жизненного цикла</h2>
          <p>Выберите этапы жизненного цикла устройства. Это определяет количество вкладок в чек-листе. Всегда включайте "Другие".</p>
          {isEditMode && (
            <p style={{ color: '#b45309', fontSize: '13px', marginTop: '-4px' }}>
              Подсказка: перед сохранением должен быть выбран минимум один этап жизненного цикла.
            </p>
          )}

          <div className="form-group">
            <label>Этапы жизненного цикла</label>
            <div className="checkbox-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="design_development"
                  checked={formData.lifecycleStages.includes('design_development')}
                  onChange={(e) => handleLifecycleCheckboxChange(e, 'design_development')}
                />
                Проектирование и разработка
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="procurement"
                  checked={formData.lifecycleStages.includes('procurement')}
                  onChange={(e) => handleLifecycleCheckboxChange(e, 'procurement')}
                />
                Закупка и входной контроль компонентов и материалов
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="production"
                  checked={formData.lifecycleStages.includes('production')}
                  onChange={(e) => handleLifecycleCheckboxChange(e, 'production')}
                />
                Производство и сборка
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="packaging"
                  checked={formData.lifecycleStages.includes('packaging')}
                  onChange={(e) => handleLifecycleCheckboxChange(e, 'packaging')}
                />
                Упаковка и маркировка
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="installation"
                  checked={formData.lifecycleStages.includes('installation')}
                  onChange={(e) => handleLifecycleCheckboxChange(e, 'installation')}
                />
                Монтаж
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="sterilization"
                  checked={formData.lifecycleStages.includes('sterilization')}
                  onChange={(e) => handleLifecycleCheckboxChange(e, 'sterilization')}
                />
                Стерилизация
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="testing"
                  checked={formData.lifecycleStages.includes('testing')}
                  onChange={(e) => handleLifecycleCheckboxChange(e, 'testing')}
                />
                Испытания и выпуск продукции
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="storage"
                  checked={formData.lifecycleStages.includes('storage')}
                  onChange={(e) => handleLifecycleCheckboxChange(e, 'storage')}
                />
                Хранение
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="transportation"
                  checked={formData.lifecycleStages.includes('transportation')}
                  onChange={(e) => handleLifecycleCheckboxChange(e, 'transportation')}
                />
                Транспортировка и дистрибуция
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="commissioning"
                  checked={formData.lifecycleStages.includes('commissioning')}
                  onChange={(e) => handleLifecycleCheckboxChange(e, 'commissioning')}
                />
                Установка и ввод в эксплуатацию
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="operation_russian"
                  checked={formData.lifecycleStages.includes('Эксплуатация')}
                  onChange={(e) => handleLifecycleCheckboxChange(e, 'Эксплуатация')}
                />
                Эксплуатация
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="maintenance"
                  checked={formData.lifecycleStages.includes('maintenance')}
                  onChange={(e) => handleLifecycleCheckboxChange(e, 'maintenance')}
                />
                Техническое обслуживание и сервис
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="decommissioning"
                  checked={formData.lifecycleStages.includes('decommissioning')}
                  onChange={(e) => handleLifecycleCheckboxChange(e, 'decommissioning')}
                />
                Демонтаж и вывод из эксплуатации
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="disposal"
                  checked={formData.lifecycleStages.includes('disposal')}
                  onChange={(e) => handleLifecycleCheckboxChange(e, 'disposal')}
                />
                Утилизация и уничтожение изделия или его компонентов
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="other"
                  checked={formData.lifecycleStages.includes('other')}
                  onChange={(e) => handleLifecycleCheckboxChange(e, 'other')}
                />
                Добавить
              </label>
            </div>
          </div>

          {formData.lifecycleStages.includes('other') && (
            <div className="form-group">
              <label>Пользовательские этапы жизненного цикла</label>
              {formData.customLifecycleStages.map((stage, index) => (
                <div key={index} className="dynamic-field">
                  <input
                    type="text"
                    value={stage}
                    onChange={(e) => handleCustomLifecycleStageChange(index, e.target.value)}
                    placeholder="Введите пользовательский этап жизненного цикла"
                  />
                  <button type="button" onClick={() => removeCustomLifecycleStage(index)}>Удалить</button>
                </div>
              ))}
              <button type="button" className="btn-add-more" onClick={addCustomLifecycleStage}>+ Добавить еще</button>
            </div>
          )}
        </div>

        {/* Оценка опасностей */}
        <div className="form-section">
          <h2>Оценка опасностей</h2>
          <p>Ответьте на следующие вопросы, чтобы определить, какие вкладки опасностей будут доступны. Некоторые вкладки всегда доступны.</p>

          {/* Основные свойства устройства */}
          <div className="form-group">
            <label>Основные свойства устройства</label>
            <div className="checkbox-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="active"
                  checked={formData.hazardQuestions.active}
                  onChange={handleHazardChange}
                />
                <div className="checkbox-text">
                  <strong>Активное</strong>
                  <span className={`hazard-indicator ${formData.hazardQuestions.active ? 'active' : ''}`}>• {hazardIndicators.active}</span>
                </div>
              </label>

              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="sterile"
                  checked={formData.hazardQuestions.sterile}
                  onChange={handleHazardChange}
                />
                <div className="checkbox-text">
                  <strong>Стерильное</strong>
                  <span className={`hazard-indicator ${formData.hazardQuestions.sterile ? 'active' : ''}`}>• {hazardIndicators.sterile}</span>
                </div>
              </label>

              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="disposable"
                  checked={formData.hazardQuestions.disposable}
                  onChange={handleHazardChange}
                />
                <div className="checkbox-text">
                  <strong>Одноразовое</strong>
                  <span className={`hazard-indicator ${formData.hazardQuestions.disposable ? 'active' : ''}`}>• {hazardIndicators.disposable}</span>
                </div>
              </label>

              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="software"
                  checked={formData.hazardQuestions.software}
                  onChange={handleHazardChange}
                />
                <div className="checkbox-text">
                  <strong>Программное обеспечение входит в состав?</strong>
                  <span className={`hazard-indicator ${formData.hazardQuestions.software ? 'active' : ''}`}>• {hazardIndicators.software}</span>
                </div>
              </label>

              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="implantable"
                  checked={formData.hazardQuestions.implantable}
                  onChange={handleHazardChange}
                />
                <div className="checkbox-text">
                  <strong>Предназначено для имплантации?</strong>
                  <span className={`hazard-indicator ${formData.hazardQuestions.implantable ? 'active' : ''}`}>• {hazardIndicators.implantable}</span>
                </div>
              </label>
            </div>
          </div>

          {/* Биосовместимость */}
          <div className="form-group">
            <label>Биосовместимость</label>
            <div className="checkbox-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="bodyContact"
                  checked={formData.hazardQuestions.bodyContact}
                  onChange={handleHazardChange}
                />
                <div className="checkbox-text">
                  <strong>Имеет ли изделие контакт с телом человека или его жидкостями?</strong>
                  <span className={`hazard-indicator ${formData.hazardQuestions.bodyContact ? 'active' : ''}`}>• {hazardIndicators.bodyContact}</span>
                </div>
              </label>

              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="materialContact"
                  checked={formData.hazardQuestions.materialContact}
                  onChange={handleHazardChange}
                />
                <div className="checkbox-text">
                  <strong>Используются ли материалы с прямым контактом с тканями или жидкостями?</strong>
                  <span className={`hazard-indicator ${formData.hazardQuestions.materialContact ? 'active' : ''}`}>• {hazardIndicators.materialContact}</span>
                </div>
              </label>

              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="implantableDevice"
                  checked={formData.hazardQuestions.implantableDevice}
                  onChange={handleHazardChange}
                />
                <div className="checkbox-text">
                  <strong>Предназначено ли изделие для имплантации?</strong>
                  <span className={`hazard-indicator ${formData.hazardQuestions.implantableDevice ? 'active' : ''}`}>• {hazardIndicators.implantableDevice}</span>
                </div>
              </label>

              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="substanceRelease"
                  checked={formData.hazardQuestions.substanceRelease}
                  onChange={handleHazardChange}
                />
                <div className="checkbox-text">
                  <strong>Есть ли риск выделения веществ из материалов в организм?</strong>
                  <span className={`hazard-indicator ${formData.hazardQuestions.substanceRelease ? 'active' : ''}`}>• {hazardIndicators.substanceRelease}</span>
                </div>
              </label>

              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="sensitization"
                  checked={formData.hazardQuestions.sensitization}
                  onChange={handleHazardChange}
                />
                <div className="checkbox-text">
                  <strong>Есть ли риск сенсибилизации, раздражения или цитотоксичности?</strong>
                  <span className={`hazard-indicator ${formData.hazardQuestions.sensitization ? 'active' : ''}`}>• {hazardIndicators.sensitization}</span>
                </div>
              </label>
            </div>
          </div>

          {/* Данные и системы */}
          <div className="form-group">
            <label>Опасности, связанные с безопасностью данных и систем</label>
              <div className="checkbox-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    name="containsSoftware"
                    checked={formData.hazardQuestions.containsSoftware}
                    onChange={handleHazardChange}
                  />
                <div className="checkbox-text">
                  <strong>Содержит ли изделие программное обеспечение?</strong>
                  <span className={`hazard-indicator ${formData.hazardQuestions.containsSoftware ? 'active' : ''}`}>• {hazardIndicators.containsSoftware}</span>
                </div>
                </label>


                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    name="dataExchange"
                    checked={formData.hazardQuestions.dataExchange}
                    onChange={handleHazardChange}
                  />
                <div className="checkbox-text">
                  <strong>Обменивается ли изделие данными с другими устройствами или сетями?</strong>
                  <span className={`hazard-indicator ${formData.hazardQuestions.dataExchange ? 'active' : ''}`}>• {hazardIndicators.dataExchange}</span>
                </div>
                </label>

                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    name="wireless"
                    checked={formData.hazardQuestions.wireless}
                    onChange={handleHazardChange}
                  />
                <div className="checkbox-text">
                  <strong>Передаёт ли изделие информацию по беспроводной связи (Wi-Fi, Bluetooth)?</strong>
                  <span className={`hazard-indicator ${formData.hazardQuestions.wireless ? 'active' : ''}`}>• {hazardIndicators.wireless}</span>
                </div>
                </label>

                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    name="personalData"
                    checked={formData.hazardQuestions.personalData}
                    onChange={handleHazardChange}
                  />
                <div className="checkbox-text">
                  <strong>Хранит ли изделие персональные или медицинские данные?</strong>
                  <span className={`hazard-indicator ${formData.hazardQuestions.personalData ? 'active' : ''}`}>• {hazardIndicators.personalData}</span>
                </div>
                </label>

                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    name="userInterface"
                    checked={formData.hazardQuestions.userInterface}
                    onChange={handleHazardChange}
                  />
                <div className="checkbox-text">
                  <strong>Управляется ли изделие через интерфейс пользователя или сеть?</strong>
                  <span className={`hazard-indicator ${formData.hazardQuestions.userInterface ? 'active' : ''}`}>• {hazardIndicators.userInterface}</span>
                </div>
                </label>
              </div>
          </div>

          {/* Электричество */}
          <div className="form-group">
            <label>Опасности, связанные с электричеством</label>
              <div className="checkbox-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    name="activeDevice"
                    checked={formData.hazardQuestions.activeDevice}
                    onChange={handleHazardChange}
                  />
                <div className="checkbox-text">
                  <strong>Является ли изделие активным (использует источник энергии)?</strong>
                  <span className={`hazard-indicator ${formData.hazardQuestions.activeDevice ? 'active' : ''}`}>• {hazardIndicators.activeDevice}</span>
                </div>
                </label>

                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    name="powerConnection"
                    checked={formData.hazardQuestions.powerConnection}
                    onChange={handleHazardChange}
                  />
                <div className="checkbox-text">
                  <strong>Подключается ли изделие к электросети или батарее?</strong>
                  <span className={`hazard-indicator ${formData.hazardQuestions.powerConnection ? 'active' : ''}`}>• {hazardIndicators.powerConnection}</span>
                </div>
                </label>

                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    name="electricalContacts"
                    checked={formData.hazardQuestions.electricalContacts}
                    onChange={handleHazardChange}
                  />
                <div className="checkbox-text">
                  <strong>Есть ли электрические контакты, которые могут соприкасаться с пользователем или пациентом?</strong>
                  <span className={`hazard-indicator ${formData.hazardQuestions.electricalContacts ? 'active' : ''}`}>• {hazardIndicators.electricalContacts}</span>
                </div>
                </label>
              </div>
          </div>

          {/* Движущиеся части */}
          <div className="form-group">
            <label>Движущиеся части</label>
            <div className="checkbox-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="movingElements"
                  checked={formData.hazardQuestions.movingElements}
                  onChange={handleHazardChange}
                />
                <div className="checkbox-text">
                  <strong>Содержит ли изделие движущиеся механические элементы?</strong>
                  <span className={`hazard-indicator ${formData.hazardQuestions.movingElements ? 'active' : ''}`}>• {hazardIndicators.movingElements}</span>
                </div>
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="movingRisk"
                  checked={formData.hazardQuestions.movingRisk}
                  onChange={handleHazardChange}
                />
                <div className="checkbox-text">
                  <strong>Есть ли подвижные узлы, создающие риск защемления, раздавливания или травмы?</strong>
                  <span className={`hazard-indicator ${formData.hazardQuestions.movingRisk ? 'active' : ''}`}>• {hazardIndicators.movingRisk}</span>
                </div>
              </label>
            </div>
          </div>

          {/* Излучение */}
          <div className="form-group">
            <label>Излучение</label>
            <div className="checkbox-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="emitsEnergy"
                  checked={formData.hazardQuestions.emitsEnergy}
                  onChange={handleHazardChange}
                />
                <div className="checkbox-text">
                  <strong>Излучает ли изделие энергию (ультразвук, инфракрасное, УФ, радиацию, лазер)?</strong>
                  <span className={`hazard-indicator ${formData.hazardQuestions.emitsEnergy ? 'active' : ''}`}>• {hazardIndicators.emitsEnergy}</span>
                </div>
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="opticalSystems"
                  checked={formData.hazardQuestions.opticalSystems}
                  onChange={handleHazardChange}
                />
                <div className="checkbox-text">
                  <strong>Использует ли изделие световые или оптические системы высокой интенсивности?</strong>
                  <span className={`hazard-indicator ${formData.hazardQuestions.opticalSystems ? 'active' : ''}`}>• {hazardIndicators.opticalSystems}</span>
                </div>
              </label>
            </div>
          </div>

          {/* Удобство использования */}
          <div className="form-group">
            <label>Удобство использования</label>
            <div className="checkbox-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="specialTraining"
                  checked={formData.hazardQuestions.specialTraining}
                  onChange={handleHazardChange}
                />
                <div className="checkbox-text">
                  <strong>Требуется ли специальное обучение для безопасного применения?</strong>
                  <span className={`hazard-indicator ${formData.hazardQuestions.specialTraining ? 'active' : ''}`}>• {hazardIndicators.specialTraining}</span>
                </div>
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="specialNeeds"
                  checked={formData.hazardQuestions.specialNeeds}
                  onChange={handleHazardChange}
                />
                <div className="checkbox-text">
                  <strong>Предусмотрено ли применение лицами с особыми потребностями?</strong>
                  <span className={`hazard-indicator ${formData.hazardQuestions.specialNeeds ? 'active' : ''}`}>• {hazardIndicators.specialNeeds}</span>
                </div>
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="interfaceError"
                  checked={formData.hazardQuestions.interfaceError}
                  onChange={handleHazardChange}
                />
                <div className="checkbox-text">
                  <strong>Есть ли риск неправильного выбора режима или ошибки интерфейса?</strong>
                  <span className={`hazard-indicator ${formData.hazardQuestions.interfaceError ? 'active' : ''}`}>• {hazardIndicators.interfaceError}</span>
                </div>
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="alarms"
                  checked={formData.hazardQuestions.alarms}
                  onChange={handleHazardChange}
                />
                <div className="checkbox-text">
                  <strong>Отображает ли изделие сигналы тревоги или предупреждения?</strong>
                  <span className={`hazard-indicator ${formData.hazardQuestions.alarms ? 'active' : ''}`}>• {hazardIndicators.alarms}</span>
                </div>
              </label>
            </div>
          </div>

          {/* Микробиологические факторы */}
          {(formData.hazardQuestions.sterile || formData.hazardQuestions.disposable) && (
            <div className="form-group">
              <label>Опасности, связанные с микробиологическими факторами</label>
              <div className="checkbox-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    name="isSterile"
                    checked={formData.hazardQuestions.isSterile}
                    onChange={handleHazardChange}
                  />
                <div className="checkbox-text">
                  <strong>Изделие является стерильным?</strong>
                  <span className={`hazard-indicator ${formData.hazardQuestions.isSterile ? 'active' : ''}`}>• {hazardIndicators.isSterile}</span>
                </div>
                </label>
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    name="reusable"
                    checked={formData.hazardQuestions.reusable}
                    onChange={handleHazardChange}
                  />
                <div className="checkbox-text">
                  <strong>Изделие многоразовое (повторная очистка и дезинфекция)?</strong>
                  <span className={`hazard-indicator ${formData.hazardQuestions.reusable ? 'active' : ''}`}>• {hazardIndicators.reusable}</span>
                </div>
                </label>
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    name="biologicalContact"
                    checked={formData.hazardQuestions.biologicalContact}
                    onChange={handleHazardChange}
                  />
                <div className="checkbox-text">
                  <strong>Имеет ли изделие контакт с биологическими жидкостями?</strong>
                  <span className={`hazard-indicator ${formData.hazardQuestions.biologicalContact ? 'active' : ''}`}>• {hazardIndicators.biologicalContact}</span>
                </div>
                </label>
              </div>
            </div>
          )}

          {/* Химические вещества */}
          <div className="form-group">
            <label>Химические вещества</label>
            <div className="checkbox-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="chemicalSubstances"
                  checked={formData.hazardQuestions.chemicalSubstances}
                  onChange={handleHazardChange}
                />
                <div className="checkbox-text">
                  <strong>Содержит ли изделие химически активные вещества или реагенты?</strong>
                  <span className={`hazard-indicator ${formData.hazardQuestions.chemicalSubstances ? 'active' : ''}`}>• {hazardIndicators.chemicalSubstances}</span>
                </div>
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="chemicalRelease"
                  checked={formData.hazardQuestions.chemicalRelease}
                  onChange={handleHazardChange}
                />
                <div className="checkbox-text">
                  <strong>Возможен ли выброс, испарение или утечка химических веществ при эксплуатации?</strong>
                  <span className={`hazard-indicator ${formData.hazardQuestions.chemicalRelease ? 'active' : ''}`}>• {hazardIndicators.chemicalRelease}</span>
                </div>
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="chemicalSterilization"
                  checked={formData.hazardQuestions.chemicalSterilization}
                  onChange={handleHazardChange}
                />
                <div className="checkbox-text">
                  <strong>Требует ли изделие стерилизации химическими агентами?</strong>
                  <span className={`hazard-indicator ${formData.hazardQuestions.chemicalSterilization ? 'active' : ''}`}>• {hazardIndicators.chemicalSterilization}</span>
                </div>
              </label>
            </div>
          </div>

          {/* Ткани животного происхождения */}
          <div className="form-group">
            <label>Ткани животного происхождения</label>
            <div className="checkbox-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="animalMaterials"
                  checked={formData.hazardQuestions.animalMaterials}
                  onChange={handleHazardChange}
                />
                <div className="checkbox-text">
                  <strong>Используются ли материалы или компоненты животного происхождения (коллаген, желатин и т.п.)?</strong>
                  <span className={`hazard-indicator ${formData.hazardQuestions.animalMaterials ? 'active' : ''}`}>• {hazardIndicators.animalMaterials}</span>
                </div>
              </label>
            </div>
          </div>

          {/* Наноматериалы */}
          <div className="form-group">
            <label>Наноматериалы</label>
            <div className="checkbox-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="nanomaterials"
                  checked={formData.hazardQuestions.nanomaterials}
                  onChange={handleHazardChange}
                />
                <div className="checkbox-text">
                  <strong>Содержит ли изделие наночастицы, нанопокрытия или наноструктуры?</strong>
                  <span className={`hazard-indicator ${formData.hazardQuestions.nanomaterials ? 'active' : ''}`}>• {hazardIndicators.nanomaterials}</span>
                </div>
              </label>
            </div>
          </div>

          {/* Фармацевтические субстанции */}
          <div className="form-group">
            <label>Фармацевтические субстанции</label>
            <div className="checkbox-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="pharmaceutical"
                  checked={formData.hazardQuestions.pharmaceutical}
                  onChange={handleHazardChange}
                />
                <div className="checkbox-text">
                  <strong>Содержит ли изделие лекарственные вещества или покрытия с высвобождением субстанции?</strong>
                  <span className={`hazard-indicator ${formData.hazardQuestions.pharmaceutical ? 'active' : ''}`}>• {hazardIndicators.pharmaceutical}</span>
                </div>
              </label>
            </div>
          </div>

          {/* Воздействие окружающей среды */}
          <div className="form-group">
            <label>Воздействие окружающей среды</label>
            <div className="checkbox-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="environmentalSensitivity"
                  checked={formData.hazardQuestions.environmentalSensitivity}
                  onChange={handleHazardChange}
                />
                <div className="checkbox-text">
                  <strong>Чувствительно ли изделие к температуре, влажности, пыли, вибрации или ЭМИ?</strong>
                  <span className={`hazard-indicator ${formData.hazardQuestions.environmentalSensitivity ? 'active' : ''}`}>• {hazardIndicators.environmentalSensitivity}</span>
                </div>
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="environmentalImpact"
                  checked={formData.hazardQuestions.environmentalImpact}
                  onChange={handleHazardChange}
                />
                <div className="checkbox-text">
                  <strong>Может ли изделие оказывать влияние на окружающую среду при утилизации?</strong>
                  <span className={`hazard-indicator ${formData.hazardQuestions.environmentalImpact ? 'active' : ''}`}>• {hazardIndicators.environmentalImpact}</span>
                </div>
              </label>
            </div>
          </div>

          {/* Механические факторы */}
          <div className="form-group">
            <label>Механические факторы</label>
            <div className="checkbox-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="mechanicalLoad"
                  checked={formData.hazardQuestions.mechanicalLoad}
                  onChange={handleHazardChange}
                />
                <div className="checkbox-text">
                  <strong>Подвержено ли изделие механическим нагрузкам, вибрации, ударам?</strong>
                  <span className={`hazard-indicator ${formData.hazardQuestions.mechanicalLoad ? 'active' : ''}`}>• {hazardIndicators.mechanicalLoad}</span>
                </div>
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="destructionRisk"
                  checked={formData.hazardQuestions.destructionRisk}
                  onChange={handleHazardChange}
                />
                <div className="checkbox-text">
                  <strong>Есть ли риск разрушения, деформации, разгерметизации?</strong>
                  <span className={`hazard-indicator ${formData.hazardQuestions.destructionRisk ? 'active' : ''}`}>• {hazardIndicators.destructionRisk}</span>
                </div>
              </label>
            </div>
          </div>

          {/* Термические воздействия */}
          <div className="form-group">
            <label>Термические воздействия</label>
            <div className="checkbox-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="heating"
                  checked={formData.hazardQuestions.heating}
                  onChange={handleHazardChange}
                />
                <div className="checkbox-text">
                  <strong>Может ли изделие нагреваться или охлаждаться при использовании?</strong>
                  <span className={`hazard-indicator ${formData.hazardQuestions.heating ? 'active' : ''}`}>• {hazardIndicators.heating}</span>
                </div>
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="surfaceContact"
                  checked={formData.hazardQuestions.surfaceContact}
                  onChange={handleHazardChange}
                />
                <div className="checkbox-text">
                  <strong>Контактирует ли пользователь или пациент с горячими или холодными поверхностями?</strong>
                  <span className={`hazard-indicator ${formData.hazardQuestions.surfaceContact ? 'active' : ''}`}>• {hazardIndicators.surfaceContact}</span>
                </div>
              </label>
            </div>
          </div>

          {/* Клиническое применение */}
          <div className="form-group">
            <label>Клиническое применение</label>
            <div className="checkbox-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="clinicalUse"
                  checked={formData.hazardQuestions.clinicalUse}
                  onChange={handleHazardChange}
                />
                <div className="checkbox-text">
                  <strong>Используется ли изделие в диагностике, лечении, реабилитации или мониторинге состояния пациента?</strong>
                  <span className={`hazard-indicator ${formData.hazardQuestions.clinicalUse ? 'active' : ''}`}>• {hazardIndicators.clinicalUse}</span>
                </div>
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="clinicalError"
                  checked={formData.hazardQuestions.clinicalError}
                  onChange={handleHazardChange}
                />
                <div className="checkbox-text">
                  <strong>Может ли ошибка применения привести к клиническим последствиям?</strong>
                  <span className={`hazard-indicator ${formData.hazardQuestions.clinicalError ? 'active' : ''}`}>• {hazardIndicators.clinicalError}</span>
                </div>
              </label>
            </div>
          </div>

          {/* Пользовательская опасность */}
          <div className="form-group">
            <label>Пользовательские опасности</label>
            <div className="checkbox-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="customHazardsEnabled"
                  checked={formData.customHazards.length > 0}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setFormData(prev => ({
                        ...prev,
                        customHazards: prev.customHazards.length === 0 ? [''] : prev.customHazards
                      }));
                    } else {
                      setFormData(prev => ({
                        ...prev,
                        customHazards: []
                      }));
                    }
                  }}
                />
                Добавить
              </label>
            </div>

            {formData.customHazards.length > 0 && (
              <div className="custom-hazards-fields">
                {formData.customHazards.map((hazard, index) => (
                  <div key={index} className="dynamic-field">
                    <input
                      type="text"
                      value={hazard}
                      onChange={(e) => handleCustomHazardChange(index, e.target.value)}
                      placeholder="Введите пользовательскую опасность"
                    />
                    <button type="button" onClick={() => removeCustomHazard(index)}>Удалить</button>
                  </div>
                ))}
                <button type="button" className="btn-add-more" onClick={addCustomHazard}>+ Добавить еще</button>
              </div>
            )}
          </div>
        </div>

        {error && <div className="error-message">{error}</div>}

        {/* Действия формы */}
        <div className="form-actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => navigate(-1)}
          >
            Отмена
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
          >
            {loading ? 'Сохранение...' : (isEditMode ? 'Обновить проект' : 'Создать проект')}
          </button>
        </div>
      </form>

      {/* Плавающая кнопка возврата наверх */}
      <button
        className={`floating-return visible`}
        onClick={() => {
          const content = document.querySelector('.content-body');
          if (content) content.scrollTo({ top: 0, behavior: 'smooth' });
          else window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        aria-label="Вернуться наверх"
      >
        ↑
      </button>
    </div>
  );
};

export default ProjectForm;
