import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import './ProjectForm.css';
import API_BASE_URL from '../config';
import RiskMatrixTable from '../components/RiskMatrixTable';
import SeverityLevelsConfig from '../components/SeverityLevelsConfig';

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
      'Может ли ошибка применения привести к клиническим последствиям?',
      'Требуется ли клиническая валидация эффективности или безопасности?'
    ],
    controls: 'Клинические испытания, обучение, мониторинг, протоколы безопасности'
  },
  clinicalError: {
    category: 'Клиническое применение',
    questions: [
      'Используется ли изделие в диагностике, лечении, реабилитации или мониторинге состояния пациента?',
      'Может ли ошибка применения привести к клиническим последствиям?',
      'Требуется ли клиническая валидация эффективности или безопасности?'
    ],
    controls: 'Клинические испытания, обучение, мониторинг, протоколы безопасности'
  },
  clinicalValidation: {
    category: 'Клиническое применение',
    questions: [
      'Используется ли изделие в диагностике, лечении, реабилитации или мониторинге состояния пациента?',
      'Может ли ошибка применения привести к клиническим последствиям?',
      'Требуется ли клиническая валидация эффективности или безопасности?'
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
    questions: ['clinicalUse', 'clinicalError', 'clinicalValidation']
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

    // Назначение команды
    projectLead: '',
    teamMembers: [],

    // Уровень риска (доп./не доп.)
    acceptableRiskLevel: 10,

    // Матрица рисков
    riskMatrix: null,

    // Уровни тяжести последствий
    severityLevels: [
      { level: 1, name: "Незначительный", description: "Приводит к неудобству или временному дискомфорту" },
      { level: 2, name: "Незначительный/Легкий", description: "Приводит к временному повреждению или нарушению, не требующему медицинского вмешательства" },
      { level: 3, name: "Серьезный/Значительный", description: "Приводит к повреждению или нарушению, требующему медицинского или хирургического вмешательства" },
      { level: 4, name: "Критический", description: "Приводит к постоянному нарушению или необратимому повреждению" },
      { level: 5, name: "Катастрофический/Фатальный", description: "Приводит к смерти" }
    ],
    riskThreshold: 10,

    // Этапы жизненного цикла
    lifecycleStages: [],
    customLifecycleStages: [],
    customHazards: [''],

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
      clinicalError: false,
      clinicalValidation: false
    },

    // Подробные ответы на чеклисты
    hazardChecklistAnswers: {},
    customHazard: '',
    
    // Активные категории опасностей (вычисляются автоматически на основе hazardQuestions)
    activeHazardCategories: []
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [availableUsers, setAvailableUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [selectedRole, setSelectedRole] = useState('doctor');
  const [riskMatrix, setRiskMatrix] = useState(null);

  useEffect(() => {
    loadCurrentUser();
    loadAvailableUsers();
    if (isEditMode) {
      loadProjectData();
    }

    // Логирование данных пользователя в консоль
    const logUserData = async () => {
      try {
        const token = localStorage.getItem('token');
        const projectId = id; // id доступен в компоненте
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

  const loadCurrentUser = () => {
    const userData = localStorage.getItem('user');
    if (userData) {
      setCurrentUser(JSON.parse(userData));
    }
  };

  const loadAvailableUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/users/`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const usersData = await response.json();
        // Преобразуем в формат для селекта
        const formattedUsers = usersData
          .filter(user => user.is_active) // Только активные пользователи
          .map(user => ({
            id: user.id,
            name: `${user.first_name} ${user.last_name}`.trim() || user.email,
            email: user.email,
            role: user.role
          }));
        setAvailableUsers(formattedUsers);
      } else {
        console.error('Failed to load users:', response.status);
        setAvailableUsers([]);
      }
    } catch (error) {
      console.error('Failed to load users:', error);
      setAvailableUsers([]);
    }
  };

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

        // Загружаем членов проекта
        const membersResponse = await fetch(`${API_BASE_URL}/api/projects/${id}/members`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        let projectLead = '';
        let teamMembers = [];

        if (membersResponse.ok) {
          const membersData = await membersResponse.json();
          teamMembers = membersData
            .filter(member => member.role !== 'owner')
            .map(member => member.user_id.toString());

          // Устанавливаем руководителя проекта (первый член или владелец)
          const leadMember = membersData.find(member => member.role === 'owner') || membersData[0];
          if (leadMember) {
            projectLead = leadMember.user_id.toString();
          }
        }

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
          projectLead: projectLead,
          teamMembers: teamMembers,
          acceptableRiskLevel: projectData.acceptable_risk_level || 10,
          riskMatrix: projectData.risk_matrix || null,
          severityLevels: projectData.severity_levels || [
            { level: 1, name: "Незначительный", description: "Приводит к неудобству или временному дискомфорту" },
            { level: 2, name: "Незначительный/Легкий", description: "Приводит к временному повреждению или нарушению, не требующему медицинского вмешательства" },
            { level: 3, name: "Серьезный/Значительный", description: "Приводит к повреждению или нарушению, требующему медицинского или хирургического вмешательства" },
            { level: 4, name: "Критический", description: "Приводит к постоянному нарушению или необратимому повреждению" },
            { level: 5, name: "Катастрофический/Фатальный", description: "Приводит к смерти" }
          ],
          riskThreshold: projectData.risk_threshold || 10,
          lifecycleStages: projectData.lifecycle_stages || [],
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
          customHazards: projectData.custom_hazard ? projectData.custom_hazard.split('\n').map(line => line.trim()).filter(line => line) : [''],
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

        setFormData(loadedData);
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

  const handleTeamMemberChange = (userId, isSelected) => {
    setFormData(prev => ({
      ...prev,
      teamMembers: isSelected
        ? [...prev.teamMembers, userId]
        : prev.teamMembers.filter(id => id !== userId)
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
      clinicalError: 'Опасности клинического применения',
      clinicalValidation: 'Опасности клинического применения'
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
      // Проверка обязательных полей
      if (!formData.name || !formData.deviceName || !formData.devicePurpose) {
        throw new Error('Пожалуйста, заполните все обязательные поля');
      }

      const token = localStorage.getItem('token');
      const url = isEditMode
        ? `${API_BASE_URL}/api/projects/${id}`
        : `${API_BASE_URL}/api/projects/`;
      
      const method = isEditMode ? 'PUT' : 'POST';
      
      // Вычисляем выбранные категории опасностей на основе чеклиста
      const selectedHazardCategories = calculateSelectedHazardCategories(formData.hazardQuestions);
      
      console.log('Selected Hazard Categories:', selectedHazardCategories);
      
      const response = await fetch(url, {
        method: method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: formData.name,
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
          risk_threshold: parseInt(formData.riskThreshold) || 10
        })
      });

      if (response.ok) {
        const projectData = await response.json();
        
        if (isEditMode) {
          // Для режима редактирования сначала получаем текущих членов и удаляем тех, кто не выбран
          const currentMembersResponse = await fetch(`${API_BASE_URL}/api/projects/${id}/members`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });

          if (currentMembersResponse.ok) {
            const currentMembers = await currentMembersResponse.json();
            const currentMemberIds = currentMembers
              .filter(member => member.role !== 'owner')
              .map(member => member.user_id.toString());

            // Удаляем членов, которые больше не выбраны
            for (const memberId of currentMemberIds) {
              if (!formData.teamMembers.includes(memberId)) {
                try {
                  await fetch(`${API_BASE_URL}/api/projects/${id}/members/${memberId}`, {
                    method: 'DELETE',
                    headers: {
                      'Authorization': `Bearer ${token}`
                    }
                  });
                } catch (error) {
                  console.error(`Ошибка при удалении пользователя ${memberId} из проекта:`, error);
                }
              }
            }
          }
        }

        // Добавляем новых членов команды
        for (const userId of formData.teamMembers) {
          try {
            const memberResponse = await fetch(`${API_BASE_URL}/api/projects/${projectData.id}/members`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                user_id: userId,
                role: selectedRole
              })
            });

            if (!memberResponse.ok) {
              console.warn(`Не удалось добавить пользователя ${userId} в проект`);
            }
          } catch (error) {
            console.error(`Ошибка при добавлении пользователя ${userId} в проект:`, error);
          }
        }
        
        navigate(`/project/${projectData.id}`);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Не удалось сохранить проект');
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
    clinicalError: 'Опасности клинического применения',
    clinicalValidation: 'Опасности клинического применения'
  };

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

          <div className="form-row">
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
              <label>Project role</label>
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                className="form-select"
              >
                <option value="doctor">Clinical Evaluation / Doctor - risk management</option>
                <option value="manager">Top Manager - project and users management</option>
                <option value="quality_management_representative">Quality Management Representative</option>
                <option value="product_manager">Product Manager / Quality Manager</option>
                <option value="risk_assessment_team_leader">Risk Assessment Team Leader</option>
                <option value="risk_assessment_team_member">Member of the Risk Assessment Team</option>
              </select>
              <small className="role-description">
                {selectedRole === 'doctor' && 'Can view risks and edit risk evaluation table'}
                {selectedRole === 'manager' && 'Can edit project, manage members and risks'}
                {selectedRole === 'quality_management_representative' && 'Can view all blocks, create RMF, chat/comment'}
                {selectedRole === 'product_manager' && 'Can view all blocks, edit source data'}
                {selectedRole === 'risk_assessment_team_leader' && 'Can view all, edit source/risk data, verify reports, chat'}
                {selectedRole === 'risk_assessment_team_member' && 'Can view all blocks, edit risk values'}
              </small>
            </div>
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
                required
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
              required
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
              >
                <option value="">Выберите классификацию</option>
                <option value="Class I">Класс I</option>
                <option value="Class IIa">Класс IIa</option>
                <option value="Class IIb">Класс IIb</option>
                <option value="Class III">Класс III</option>
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="operatingEnvironment">Условия эксплуатации</label>
              <input
                type="text"
                id="operatingEnvironment"
                name="operatingEnvironment"
                value={formData.operatingEnvironment}
                onChange={handleInputChange}
                placeholder="Условия окружающей среды"
              />
            </div>
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
            />
          </div>
        </div>



        {/* Назначение команды */}
        <div className="form-section">
          <h2>Назначение команды</h2>

          <div className="form-group">
            <label htmlFor="projectLead">Руководитель проекта</label>
            <select
              id="projectLead"
              name="projectLead"
              value={formData.projectLead}
              onChange={handleInputChange}
            >
              <option value="">Выберите руководителя проекта</option>
              {availableUsers.map(user => (
                <option key={user.id} value={user.id.toString()}>
                  {user.name} ({user.email})
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Члены команды</label>
            <div className="team-selection">
                {availableUsers.map(user => (
                  <label key={user.id} className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={formData.teamMembers.includes(user.id.toString())}
                      onChange={(e) => handleTeamMemberChange(user.id.toString(), e.target.checked)}
                    />
                    <span>{user.name} ({user.email})</span>
                  </label>
                ))}
              </div>
            </div>
        </div>

        {/* Уровни тяжести и пороговое значение риска */}
        <div className="form-section">
          <SeverityLevelsConfig
            severityLevels={formData.severityLevels}
            riskThreshold={formData.riskThreshold}
            onChange={(data) => {
              setFormData({
                ...formData,
                severityLevels: data.severity_levels,
                riskThreshold: data.risk_threshold
              });
            }}
          />
        </div>

        {/* Этапы жизненного цикла */}
        <div className="form-section">
          <h2>Этапы жизненного цикла</h2>
          <p>Выберите этапы жизненного цикла устройства. Это определяет количество вкладок в чек-листе. Всегда включайте "Другие".</p>

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
                  name="operation"
                  checked={formData.lifecycleStages.includes('operation')}
                  onChange={(e) => handleLifecycleCheckboxChange(e, 'operation')}
                />
                Эксплуатация (использование по назначению)
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
                Активное
                <span className={`hazard-indicator ${formData.hazardQuestions.active ? 'active' : ''}`}>• {hazardIndicators.active}</span>
              </label>

              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="sterile"
                  checked={formData.hazardQuestions.sterile}
                  onChange={handleHazardChange}
                />
                Стерильное
                <span className={`hazard-indicator ${formData.hazardQuestions.sterile ? 'active' : ''}`}>• {hazardIndicators.sterile}</span>
              </label>

              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="disposable"
                  checked={formData.hazardQuestions.disposable}
                  onChange={handleHazardChange}
                />
                Одноразовое
                <span className={`hazard-indicator ${formData.hazardQuestions.disposable ? 'active' : ''}`}>• {hazardIndicators.disposable}</span>
              </label>

              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="software"
                  checked={formData.hazardQuestions.software}
                  onChange={handleHazardChange}
                />
                Программное обеспечение входит в состав?
                <span className={`hazard-indicator ${formData.hazardQuestions.software ? 'active' : ''}`}>• {hazardIndicators.software}</span>
              </label>

              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="implantable"
                  checked={formData.hazardQuestions.implantable}
                  onChange={handleHazardChange}
                />
                Предназначено для имплантации?
                <span className={`hazard-indicator ${formData.hazardQuestions.implantable ? 'active' : ''}`}>• {hazardIndicators.implantable}</span>
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
                Имеет ли изделие контакт с телом человека или его жидкостями?
                <span className={`hazard-indicator ${formData.hazardQuestions.bodyContact ? 'active' : ''}`}>• {hazardIndicators.bodyContact}</span>
              </label>

              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="materialContact"
                  checked={formData.hazardQuestions.materialContact}
                  onChange={handleHazardChange}
                />
                Используются ли материалы с прямым контактом с тканями или жидкостями?
                <span className={`hazard-indicator ${formData.hazardQuestions.materialContact ? 'active' : ''}`}>• {hazardIndicators.materialContact}</span>
              </label>

              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="implantableDevice"
                  checked={formData.hazardQuestions.implantableDevice}
                  onChange={handleHazardChange}
                />
                Предназначено ли изделие для имплантации?
                <span className={`hazard-indicator ${formData.hazardQuestions.implantableDevice ? 'active' : ''}`}>• {hazardIndicators.implantableDevice}</span>
              </label>

              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="substanceRelease"
                  checked={formData.hazardQuestions.substanceRelease}
                  onChange={handleHazardChange}
                />
                Есть ли риск выделения веществ из материалов в организм?
                <span className={`hazard-indicator ${formData.hazardQuestions.substanceRelease ? 'active' : ''}`}>• {hazardIndicators.substanceRelease}</span>
              </label>

              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="sensitization"
                  checked={formData.hazardQuestions.sensitization}
                  onChange={handleHazardChange}
                />
                Есть ли риск сенсибилизации, раздражения или цитотоксичности?
                <span className={`hazard-indicator ${formData.hazardQuestions.sensitization ? 'active' : ''}`}>• {hazardIndicators.sensitization}</span>
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
                  Содержит ли изделие программное обеспечение?
                  <span className={`hazard-indicator ${formData.hazardQuestions.containsSoftware ? 'active' : ''}`}>• {hazardIndicators.containsSoftware}</span>
                </label>


                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    name="dataExchange"
                    checked={formData.hazardQuestions.dataExchange}
                    onChange={handleHazardChange}
                  />
                  Обменивается ли изделие данными с другими устройствами или сетями?
                  <span className={`hazard-indicator ${formData.hazardQuestions.dataExchange ? 'active' : ''}`}>• {hazardIndicators.dataExchange}</span>
                </label>

                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    name="wireless"
                    checked={formData.hazardQuestions.wireless}
                    onChange={handleHazardChange}
                  />
                  Передаёт ли изделие информацию по беспроводной связи (Wi-Fi, Bluetooth)?
                  <span className={`hazard-indicator ${formData.hazardQuestions.wireless ? 'active' : ''}`}>• {hazardIndicators.wireless}</span>
                </label>

                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    name="personalData"
                    checked={formData.hazardQuestions.personalData}
                    onChange={handleHazardChange}
                  />
                  Хранит ли изделие персональные или медицинские данные?
                  <span className={`hazard-indicator ${formData.hazardQuestions.personalData ? 'active' : ''}`}>• {hazardIndicators.personalData}</span>
                </label>

                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    name="userInterface"
                    checked={formData.hazardQuestions.userInterface}
                    onChange={handleHazardChange}
                  />
                  Управляется ли изделие через интерфейс пользователя или сеть?
                  <span className={`hazard-indicator ${formData.hazardQuestions.userInterface ? 'active' : ''}`}>• {hazardIndicators.userInterface}</span>
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
                  Является ли изделие активным (использует источник энергии)?
                  <span className={`hazard-indicator ${formData.hazardQuestions.activeDevice ? 'active' : ''}`}>• {hazardIndicators.activeDevice}</span>
                </label>

                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    name="powerConnection"
                    checked={formData.hazardQuestions.powerConnection}
                    onChange={handleHazardChange}
                  />
                  Подключается ли изделие к электросети или батарее?
                  <span className={`hazard-indicator ${formData.hazardQuestions.powerConnection ? 'active' : ''}`}>• {hazardIndicators.powerConnection}</span>
                </label>

                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    name="electricalContacts"
                    checked={formData.hazardQuestions.electricalContacts}
                    onChange={handleHazardChange}
                  />
                  Есть ли электрические контакты, которые могут соприкасаться с пользователем или пациентом?
                  <span className={`hazard-indicator ${formData.hazardQuestions.electricalContacts ? 'active' : ''}`}>• {hazardIndicators.electricalContacts}</span>
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
                Содержит ли изделие движущиеся механические элементы?
                <span className={`hazard-indicator ${formData.hazardQuestions.movingElements ? 'active' : ''}`}>• {hazardIndicators.movingElements}</span>
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="movingRisk"
                  checked={formData.hazardQuestions.movingRisk}
                  onChange={handleHazardChange}
                />
                Есть ли подвижные узлы, создающие риск защемления, раздавливания или травмы?
                <span className={`hazard-indicator ${formData.hazardQuestions.movingRisk ? 'active' : ''}`}>• {hazardIndicators.movingRisk}</span>
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
                Излучает ли изделие энергию (ультразвук, инфракрасное, УФ, радиацию, лазер)?
                <span className={`hazard-indicator ${formData.hazardQuestions.emitsEnergy ? 'active' : ''}`}>• {hazardIndicators.emitsEnergy}</span>
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="opticalSystems"
                  checked={formData.hazardQuestions.opticalSystems}
                  onChange={handleHazardChange}
                />
                Использует ли изделие световые или оптические системы высокой интенсивности?
                <span className={`hazard-indicator ${formData.hazardQuestions.opticalSystems ? 'active' : ''}`}>• {hazardIndicators.opticalSystems}</span>
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
                Требуется ли специальное обучение для безопасного применения?
                <span className={`hazard-indicator ${formData.hazardQuestions.specialTraining ? 'active' : ''}`}>• {hazardIndicators.specialTraining}</span>
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="specialNeeds"
                  checked={formData.hazardQuestions.specialNeeds}
                  onChange={handleHazardChange}
                />
                Предусмотрено ли применение лицами с особыми потребностями?
                <span className={`hazard-indicator ${formData.hazardQuestions.specialNeeds ? 'active' : ''}`}>• {hazardIndicators.specialNeeds}</span>
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="interfaceError"
                  checked={formData.hazardQuestions.interfaceError}
                  onChange={handleHazardChange}
                />
                Есть ли риск неправильного выбора режима или ошибки интерфейса?
                <span className={`hazard-indicator ${formData.hazardQuestions.interfaceError ? 'active' : ''}`}>• {hazardIndicators.interfaceError}</span>
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="alarms"
                  checked={formData.hazardQuestions.alarms}
                  onChange={handleHazardChange}
                />
                Отображает ли изделие сигналы тревоги или предупреждения?
                <span className={`hazard-indicator ${formData.hazardQuestions.alarms ? 'active' : ''}`}>• {hazardIndicators.alarms}</span>
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
                  Изделие является стерильным?
                  <span className={`hazard-indicator ${formData.hazardQuestions.isSterile ? 'active' : ''}`}>• {hazardIndicators.isSterile}</span>
                </label>
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    name="reusable"
                    checked={formData.hazardQuestions.reusable}
                    onChange={handleHazardChange}
                  />
                  Изделие многоразовое (повторная очистка и дезинфекция)?
                  <span className={`hazard-indicator ${formData.hazardQuestions.reusable ? 'active' : ''}`}>• {hazardIndicators.reusable}</span>
                </label>
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    name="biologicalContact"
                    checked={formData.hazardQuestions.biologicalContact}
                    onChange={handleHazardChange}
                  />
                  Имеет ли изделие контакт с биологическими жидкостями?
                  <span className={`hazard-indicator ${formData.hazardQuestions.biologicalContact ? 'active' : ''}`}>• {hazardIndicators.biologicalContact}</span>
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
                Содержит ли изделие химически активные вещества или реагенты?
                <span className={`hazard-indicator ${formData.hazardQuestions.chemicalSubstances ? 'active' : ''}`}>• {hazardIndicators.chemicalSubstances}</span>
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="chemicalRelease"
                  checked={formData.hazardQuestions.chemicalRelease}
                  onChange={handleHazardChange}
                />
                Возможен ли выброс, испарение или утечка химических веществ при эксплуатации?
                <span className={`hazard-indicator ${formData.hazardQuestions.chemicalRelease ? 'active' : ''}`}>• {hazardIndicators.chemicalRelease}</span>
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="chemicalSterilization"
                  checked={formData.hazardQuestions.chemicalSterilization}
                  onChange={handleHazardChange}
                />
                Требует ли изделие стерилизации химическими агентами?
                <span className={`hazard-indicator ${formData.hazardQuestions.chemicalSterilization ? 'active' : ''}`}>• {hazardIndicators.chemicalSterilization}</span>
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
                Используются ли материалы или компоненты животного происхождения (коллаген, желатин и т.п.)?
                <span className={`hazard-indicator ${formData.hazardQuestions.animalMaterials ? 'active' : ''}`}>• {hazardIndicators.animalMaterials}</span>
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
                Содержит ли изделие наночастицы, нанопокрытия или наноструктуры?
                <span className={`hazard-indicator ${formData.hazardQuestions.nanomaterials ? 'active' : ''}`}>• {hazardIndicators.nanomaterials}</span>
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
                Содержит ли изделие лекарственные вещества или покрытия с высвобождением субстанции?
                <span className={`hazard-indicator ${formData.hazardQuestions.pharmaceutical ? 'active' : ''}`}>• {hazardIndicators.pharmaceutical}</span>
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
                Чувствительно ли изделие к температуре, влажности, пыли, вибрации или ЭМИ?
                <span className={`hazard-indicator ${formData.hazardQuestions.environmentalSensitivity ? 'active' : ''}`}>• {hazardIndicators.environmentalSensitivity}</span>
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="environmentalImpact"
                  checked={formData.hazardQuestions.environmentalImpact}
                  onChange={handleHazardChange}
                />
                Может ли изделие оказывать влияние на окружающую среду при утилизации?
                <span className={`hazard-indicator ${formData.hazardQuestions.environmentalImpact ? 'active' : ''}`}>• {hazardIndicators.environmentalImpact}</span>
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
                Подвержено ли изделие механическим нагрузкам, вибрации, ударам?
                <span className={`hazard-indicator ${formData.hazardQuestions.mechanicalLoad ? 'active' : ''}`}>• {hazardIndicators.mechanicalLoad}</span>
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="destructionRisk"
                  checked={formData.hazardQuestions.destructionRisk}
                  onChange={handleHazardChange}
                />
                Есть ли риск разрушения, деформации, разгерметизации?
                <span className={`hazard-indicator ${formData.hazardQuestions.destructionRisk ? 'active' : ''}`}>• {hazardIndicators.destructionRisk}</span>
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
                Может ли изделие нагреваться или охлаждаться при использовании?
                <span className={`hazard-indicator ${formData.hazardQuestions.heating ? 'active' : ''}`}>• {hazardIndicators.heating}</span>
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="surfaceContact"
                  checked={formData.hazardQuestions.surfaceContact}
                  onChange={handleHazardChange}
                />
                Контактирует ли пользователь или пациент с горячими или холодными поверхностями?
                <span className={`hazard-indicator ${formData.hazardQuestions.surfaceContact ? 'active' : ''}`}>• {hazardIndicators.surfaceContact}</span>
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
                Используется ли изделие в диагностике, лечении, реабилитации или мониторинге состояния пациента?
                <span className={`hazard-indicator ${formData.hazardQuestions.clinicalUse ? 'active' : ''}`}>• {hazardIndicators.clinicalUse}</span>
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="clinicalError"
                  checked={formData.hazardQuestions.clinicalError}
                  onChange={handleHazardChange}
                />
                Может ли ошибка применения привести к клиническим последствиям?
                <span className={`hazard-indicator ${formData.hazardQuestions.clinicalError ? 'active' : ''}`}>• {hazardIndicators.clinicalError}</span>
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="clinicalValidation"
                  checked={formData.hazardQuestions.clinicalValidation}
                  onChange={handleHazardChange}
                />
                Требуется ли клиническая валидация эффективности или безопасности?
                <span className={`hazard-indicator ${formData.hazardQuestions.clinicalValidation ? 'active' : ''}`}>• {hazardIndicators.clinicalValidation}</span>
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
