"""
Service for generating Risk Management Report DOCX documents
"""
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_PARAGRAPH_ALIGNMENT
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from io import BytesIO
from datetime import datetime
from typing import Dict, List, Optional
import json


class RiskManagementReportGenerator:
    """Generates Risk Management Report documents in DOCX format"""
    
    def __init__(self, project_data: dict, risk_data: list, table_data: dict, team_members: list):
        """
        Initialize the generator with project data
        
        Args:
            project_data: Project information from database
            risk_data: Risk factors data from risk_table_rows
            table_data: Risk management table structure and data
            team_members: Project team members list
        """
        self.project = project_data
        self.risks = risk_data
        self.table_data = table_data
        self.team = team_members
        self.doc = Document()
        
    def generate(self) -> BytesIO:
        """Generate the complete document and return as BytesIO"""
        self._setup_document_styles()
        self._add_title_page()
        self._add_table_of_contents()
        self._add_device_identification()
        self._add_hazard_identification()
        self._add_risk_analysis()
        self._add_risk_control_measures()
        self._add_residual_risk_evaluation()
        self._add_overall_risk_acceptability()
        self._add_conclusions()
        self._add_references()
        self._add_appendix()
        
        # Save to BytesIO
        file_stream = BytesIO()
        self.doc.save(file_stream)
        file_stream.seek(0)
        return file_stream
    
    def _get_field_value(self, value, default_placeholder='[PLACEHOLDER]'):
        """Get field value or return 'не заполнено' if empty"""
        if value is None:
            return 'не заполнено'
        value_str = str(value).strip()
        if not value_str or value_str == default_placeholder or value_str.startswith('[PLACEHOLDER'):
            return 'не заполнено'
        return value_str
    
    def _setup_document_styles(self):
        """Setup document styles"""
        # Set default font
        style = self.doc.styles['Normal']
        font = style.font
        font.name = 'Calibri'
        font.size = Pt(11)
    
    def _add_title_page(self):
        """Add title page - Section 1"""
        # Title
        title = self.doc.add_paragraph()
        title.alignment = WD_PARAGRAPH_ALIGNMENT.CENTER
        run = title.add_run("RISK MANAGEMENT REPORT")
        run.bold = True
        run.font.size = Pt(18)
        self.doc.add_paragraph()
        
        # Device information table
        device_name = self._get_field_value(self.project.get('device_name'))
        device_model = self._get_field_value(self.project.get('device_model'))
        
        # Get manufacturer from project or use default
        manufacturer = self._get_field_value(self.project.get('manufacturer'))
        manufacturer_address = self._get_field_value(self.project.get('manufacturer_address'))
        
        info_items = [
            ('Medical device:', device_name),
            ('Model:', device_model),
            ('Manufacturer:', manufacturer),
            ('Address:', manufacturer_address),
            ('Report No.:', self._get_field_value(self.project.get('report_number'), 'RMR-2025-01')),
            ('Revision:', self._get_field_value(self.project.get('version'), '1.0')),
            ('Date:', datetime.now().strftime('%d %B %Y')),
        ]
        
        for label, value in info_items:
            p = self.doc.add_paragraph()
            p.add_run(label).bold = True
            p.add_run(f' {value}')
        
        self.doc.add_paragraph()
        
        # Team signatures
        prepared_by = self._get_field_value(self.project.get('prepared_by'))
        reviewed_by = self._get_field_value(self.project.get('reviewed_by'))
        approved_by = self._get_field_value(self.project.get('approved_by'))
        self.doc.add_paragraph(f'Prepared by: {prepared_by}')
        self.doc.add_paragraph(f'Reviewed by: {reviewed_by}')
        self.doc.add_paragraph(f'Approved by: {approved_by}')
        
        self.doc.add_page_break()
    
    def _add_table_of_contents(self):
        """Add table of contents - Section 2"""
        heading = self.doc.add_heading('2. СОДЕРЖАНИЕ', level=1)
        
        sections = [
            "1. ТИТУЛЬНЫЙ ЛИСТ",
            "2. СОДЕРЖАНИЕ",
            "3. ИДЕНТИФИКАЦИЯ ИЗДЕЛИЯ И НАЗНАЧЕНИЕ",
            "4. Identification of Hazards (Идентификация опасностей)",
            "5. Risk Analysis (Before Risk Control)",
            "6. Risk Control Measures (Меры управления рисками)",
            "7. Residual Risk Evaluation",
            "8. Overall Residual Risk Acceptability (Оценка совокупного остаточного риска)",
            "9. Conclusions and Approval",
            "10. References and Document Control",
            "Приложение А"
        ]
        
        for section in sections:
            self.doc.add_paragraph(section, style='List Bullet')
        
        self.doc.add_page_break()
    
    def _add_device_identification(self):
        """Add device identification section - Section 3"""
        self.doc.add_heading('3. ИДЕНТИФИКАЦИЯ ИЗДЕЛИЯ И НАЗНАЧЕНИЕ', level=1)
        
        # Create identification table
        table = self.doc.add_table(rows=1, cols=2)
        table.style = 'Light Grid Accent 1'
        
        # Header row
        header_cells = table.rows[0].cells
        header_cells[0].text = 'Field'
        header_cells[1].text = 'Entry'
        
        # Data rows
        fields_data = [
            ('Device name', self.project.get('device_name', '[PLACEHOLDER: Device Name]')),
            ('Model / Type', self.project.get('device_model', '[PLACEHOLDER: Model]')),
            ('Category risk', self.project.get('device_classification', '[PLACEHOLDER: Classification]')),
            ('Intended purpose', self.project.get('intended_use', '[PLACEHOLDER: Intended Use]')),
            ('Intended users', self.project.get('user_profile', '[PLACEHOLDER: User Profile]')),
            ('Patient population', '[PLACEHOLDER: Patient Population]'),
            ('Operating environment', self.project.get('operating_environment', '[PLACEHOLDER: Environment]')),
            ('Key performance characteristics', '[PLACEHOLDER: Performance Characteristics]'),
            ('Safety-related characteristics', '[PLACEHOLDER: Safety Characteristics]'),
            ('Standards and regulations applied', self.project.get('standards', '[PLACEHOLDER: Standards]')),
        ]
        
        for field, value in fields_data:
            row_cells = table.add_row().cells
            row_cells[0].text = field
            row_cells[1].text = value
        
        self.doc.add_paragraph()
        
        # Lifecycle stages
        self.doc.add_paragraph('Этапы жизненного цикла:', style='Heading 3')
        lifecycle_stages = self._parse_json_field(self.project.get('lifecycle_stages', '[]'))
        if lifecycle_stages:
            for stage in lifecycle_stages:
                self.doc.add_paragraph(f'• {stage}', style='List Bullet')
        else:
            self.doc.add_paragraph('[PLACEHOLDER: Lifecycle Stages]', style='List Bullet')
        
        # Hazard categories
        self.doc.add_paragraph('Идентифицированные категории опасностей:', style='Heading 3')
        hazard_categories = self._parse_json_field(self.project.get('active_hazard_categories', '[]'))
        if hazard_categories:
            for category in hazard_categories:
                self.doc.add_paragraph(f'• {category}', style='List Bullet')
        else:
            self.doc.add_paragraph('[PLACEHOLDER: Hazard Categories]', style='List Bullet')
        
        self.doc.add_page_break()
    
    def _add_hazard_identification(self):
        """Add hazard identification section - Section 4"""
        self.doc.add_heading('4. Identification of Hazards (Идентификация опасностей)', level=1)
        
        self.doc.add_heading('4.1 Цель раздела', level=2)
        self.doc.add_paragraph(
            'Определить все разумно предсказуемые опасности, возникающие на этапах жизненного цикла '
            'изделия - от проектирования и производства до эксплуатации, очистки, транспортировки, утилизации.'
        )
        
        # PLACEHOLDER: Checklist answers
        self.doc.add_heading('4.1 Идентификация предполагаемого назначение, неправильного предполагаемого применения, характеристики связанных с безопасностью', level=2)
        self.doc.add_paragraph('[PLACEHOLDER: Checklist with answers from hazard_checklist_answers field]')
        
        # Hazards table
        self.doc.add_heading('4.2 Таблица идентифицированных опасностей', level=2)
        
        if self.risks:
            table = self.doc.add_table(rows=1, cols=6)
            table.style = 'Light Grid Accent 1'
            
            # Header
            headers = ['№', 'Lifecycle Stage', 'Hazard', 'Hazardous Situation', 'Sequence of Events', 'Harm']
            header_cells = table.rows[0].cells
            for i, header in enumerate(headers):
                header_cells[i].text = header
            
            # Data rows from risk_table_rows
            for idx, risk in enumerate(self.risks, 1):
                data = risk.get('data', {})
                row = table.add_row().cells
                row[0].text = str(idx)
                row[1].text = data.get('lifecycle_stage', '')
                row[2].text = data.get('hazard', '')
                row[3].text = data.get('hazardous_situation', '')
                row[4].text = data.get('sequence_of_events', '')
                row[5].text = data.get('harm', '')
        else:
            self.doc.add_paragraph('[PLACEHOLDER: No hazards identified yet]')
        
        self.doc.add_heading('4.3 Резюме раздела', level=2)
        hazard_count = len(self.risks)
        categories_text = ', '.join(self._parse_json_field(self.project.get('active_hazard_categories', '[]'))) or '[PLACEHOLDER: Categories]'
        self.doc.add_paragraph(
            f'Идентифицированы основные опасности ({hazard_count} шт.), связанные с {categories_text}. '
            'Для каждой опасности будет проведён анализ риска (раздел 5) с оценкой тяжести и вероятности, '
            'а также определены меры контроля (раздел 6).'
        )
        
        self.doc.add_page_break()
    
    def _add_risk_analysis(self):
        """Add risk analysis section - Section 5"""
        self.doc.add_heading('5. Risk Analysis (Before Risk Control)', level=1)
        
        self.doc.add_heading('5.1 Методология оценки', level=2)
        self.doc.add_paragraph(
            'Для анализа рисков используется качественно-количественная методика с матрицей 5×5, где:'
        )
        
        # Severity table
        self.doc.add_paragraph('Severity (S) — Тяжесть вреда:', style='Heading 3')
        sev_table = self.doc.add_table(rows=6, cols=3)
        sev_table.style = 'Light Grid Accent 1'
        
        sev_data = [
            ('Уровень', 'Описание', 'Пример'),
            ('1', 'Незначительный', 'Лёгкое раздражение кожи'),
            ('2', 'Малый', 'Обратимая травма, лёгкий порез'),
            ('3', 'Средний', 'Временная потеря трудоспособности'),
            ('4', 'Серьёзный', 'Значительная травма, госпитализация'),
            ('5', 'Критический', 'Смерть или необратимое повреждение органа'),
        ]
        
        for row_idx, row_data in enumerate(sev_data):
            for col_idx, cell_text in enumerate(row_data):
                sev_table.rows[row_idx].cells[col_idx].text = cell_text
        
        self.doc.add_paragraph()
        
        # Probability table
        self.doc.add_paragraph('Probability (P) — Вероятность возникновения:', style='Heading 3')
        prob_table = self.doc.add_table(rows=6, cols=3)
        prob_table.style = 'Light Grid Accent 1'
        
        prob_data = [
            ('Уровень', 'Описание', 'Пример'),
            ('1', 'Очень редкое', 'Почти невозможно (<1/10000)'),
            ('2', 'Редкое', 'Возможное при особых обстоятельствах'),
            ('3', 'Иногда', 'Может произойти время от времени'),
            ('4', 'Вероятное', 'Может происходить регулярно'),
            ('5', 'Частое', 'Происходит часто'),
        ]
        
        for row_idx, row_data in enumerate(prob_data):
            for col_idx, cell_text in enumerate(row_data):
                prob_table.rows[row_idx].cells[col_idx].text = cell_text
        
        self.doc.add_paragraph()
        
        # Risk acceptability criteria
        self.doc.add_paragraph('Критерии приемлемости риска:', style='Heading 3')
        criteria_table = self.doc.add_table(rows=3, cols=3)
        criteria_table.style = 'Light Grid Accent 1'
        
        criteria_data = [
            ('Диапазон', 'Категория риска', 'Интерпретация'),
            ('1–9', 'Низкий (Acceptable)', 'Допустимый без мер'),
            ('10–25', 'Высокий (Unacceptable)', 'Требует мер контроля'),
        ]
        
        for row_idx, row_data in enumerate(criteria_data):
            for col_idx, cell_text in enumerate(row_data):
                criteria_table.rows[row_idx].cells[col_idx].text = cell_text
        
        # Risk analysis results table
        self.doc.add_heading('5.2 Таблица анализа рисков', level=2)
        
        if self.risks:
            table = self.doc.add_table(rows=1, cols=5)
            table.style = 'Light Grid Accent 1'
            
            headers = ['№', 'Hazard', 'Severity (S)', 'Probability (P)', 'Risk Score (S×P)']
            header_cells = table.rows[0].cells
            for i, header in enumerate(headers):
                header_cells[i].text = header
            
            acceptable_count = 0
            unacceptable_count = 0
            
            for idx, risk in enumerate(self.risks, 1):
                data = risk.get('data', {})
                row = table.add_row().cells
                row[0].text = str(idx)
                row[1].text = data.get('hazard', '')
                
                severity = data.get('severity_initial', '[PLACEHOLDER]')
                probability = data.get('probability_initial', '[PLACEHOLDER]')
                
                row[2].text = str(severity)
                row[3].text = str(probability)
                
                # Calculate risk score
                try:
                    risk_score = int(severity) * int(probability)
                    row[4].text = str(risk_score)
                    if risk_score < 10:
                        acceptable_count += 1
                    else:
                        unacceptable_count += 1
                except:
                    row[4].text = '[PLACEHOLDER]'
        else:
            self.doc.add_paragraph('[PLACEHOLDER: No risk data available]')
            acceptable_count = 0
            unacceptable_count = 0
        
        self.doc.add_heading('5.3 Резюме раздела', level=2)
        self.doc.add_paragraph(f'Кол-во неприемлемых рисков – {unacceptable_count}')
        self.doc.add_paragraph(f'Кол-во приемлемых – {acceptable_count}')
        
        self.doc.add_page_break()
    
    def _add_risk_control_measures(self):
        """Add risk control measures section - Section 6"""
        self.doc.add_heading('6. Risk Control Measures (Меры управления рисками)', level=1)
        
        self.doc.add_heading('6.1 Цель раздела', level=2)
        self.doc.add_paragraph(
            'Определить и задокументировать меры, применённые для снижения или устранения рисков, '
            'связанных с выявленными опасными ситуациями.'
        )
        
        self.doc.add_heading('6.2 Таблица мер управления рисками и верификация', level=2)
        
        if self.risks:
            table = self.doc.add_table(rows=1, cols=4)
            table.style = 'Light Grid Accent 1'
            
            headers = ['№', 'Hazard', 'Control Measures', 'Verification Method']
            header_cells = table.rows[0].cells
            for i, header in enumerate(headers):
                header_cells[i].text = header
            
            for idx, risk in enumerate(self.risks, 1):
                data = risk.get('data', {})
                row = table.add_row().cells
                row[0].text = str(idx)
                row[1].text = data.get('hazard', '')
                row[2].text = data.get('control_measures', '[PLACEHOLDER: Control Measures]')
                row[3].text = data.get('verification', '[PLACEHOLDER: Verification Method]')
        else:
            self.doc.add_paragraph('[PLACEHOLDER: No control measures data available]')
        
        self.doc.add_page_break()
    
    def _add_residual_risk_evaluation(self):
        """Add residual risk evaluation section - Section 7"""
        self.doc.add_heading('7. Residual Risk Evaluation', level=1)
        
        self.doc.add_heading('7.1 Цель раздела', level=2)
        self.doc.add_paragraph(
            'Определить, являются ли остаточные риски (после реализации мер контроля) приемлемыми '
            'в соответствии с установленными критериями риск-аппетита организации и принципом ALARP'
        )
        
        self.doc.add_heading('7.2 Таблица оценки остаточных рисков', level=2)
        
        if self.risks:
            table = self.doc.add_table(rows=1, cols=6)
            table.style = 'Light Grid Accent 1'
            
            headers = ['№', 'Hazard', 'Residual S', 'Residual P', 'Residual Risk', 'Acceptable?']
            header_cells = table.rows[0].cells
            for i, header in enumerate(headers):
                header_cells[i].text = header
            
            acceptable_residual = 0
            unacceptable_residual = 0
            
            for idx, risk in enumerate(self.risks, 1):
                data = risk.get('data', {})
                row = table.add_row().cells
                row[0].text = str(idx)
                row[1].text = data.get('hazard', '')
                
                res_severity = data.get('severity_residual', '[PLACEHOLDER]')
                res_probability = data.get('probability_residual', '[PLACEHOLDER]')
                
                row[2].text = str(res_severity)
                row[3].text = str(res_probability)
                
                try:
                    residual_score = int(res_severity) * int(res_probability)
                    row[4].text = str(residual_score)
                    
                    if residual_score < 10:
                        row[5].text = 'Yes'
                        acceptable_residual += 1
                    else:
                        row[5].text = 'No'
                        unacceptable_residual += 1
                except:
                    row[4].text = '[PLACEHOLDER]'
                    row[5].text = '[PLACEHOLDER]'
        else:
            self.doc.add_paragraph('[PLACEHOLDER: No residual risk data available]')
            acceptable_residual = 0
            unacceptable_residual = 0
        
        self.doc.add_heading('7.3 Обоснование приемлемости', level=2)
        self.doc.add_paragraph(f'Кол-во рисков приемлемых - {acceptable_residual}')
        self.doc.add_paragraph(f'Кол-во рисков не приемлемых – {unacceptable_residual}')
        
        self.doc.add_page_break()
    
    def _add_overall_risk_acceptability(self):
        """Add overall risk acceptability section - Section 8"""
        self.doc.add_heading('8. Overall Residual Risk Acceptability (Оценка совокупного остаточного риска)', level=1)
        
        self.doc.add_heading('8.1 Цель раздела', level=2)
        self.doc.add_paragraph(
            'Определить, является ли совокупный остаточный риск медицинского изделия приемлемым, '
            'учитывая все идентифицированные индивидуальные риски, их взаимное влияние и соотношение '
            'польза/риск (Benefit-Risk balance), как требует ISO 14971:2019, п. 8.3.'
        )
        
        # PLACEHOLDER: Calculate overall risk
        self.doc.add_heading('8.2 Совокупный остаточный риск', level=2)
        self.doc.add_paragraph('[PLACEHOLDER: Overall risk calculation formula and result]')
        self.doc.add_paragraph('Совокупный остаточный риск = [PLACEHOLDER]')
        self.doc.add_paragraph('Совокупный остаточный риск - [PLACEHOLDER: приемлемый/неприемлемый]')
        
        self.doc.add_heading('8.3 Оценка соотношения польза/риск', level=2)
        self.doc.add_paragraph('[PLACEHOLDER: Benefit-risk assessment if unacceptable risks remain]')
        
        self.doc.add_page_break()
    
    def _add_conclusions(self):
        """Add conclusions section - Section 9"""
        self.doc.add_heading('9. Conclusions and Approval', level=1)
        
        self.doc.add_heading('9.1 Общие выводы', level=2)
        
        total_risks = len(self.risks)
        
        conclusions = [
            'На основании проведённого процесса идентификации опасностей, анализа, оценки и управления рисками, подтверждено, что:',
            '',
            '• Все идентифицированные риски были рассмотрены и оценены в соответствии с требованиями ISO 14971:2019;',
            f'• Идентифицировано рисков – {total_risks} [PLACEHOLDER: из них приемлемых - ? неприемлемых - ?]',
            '• Все меры контроля риска внедрены, проверены и признаны эффективными;',
            '• Все остаточные риски находятся на приемлемом уровне или в зоне ALARP;',
            '• Совокупный остаточный риск признан приемлемым в контексте назначения изделия и ожидаемой пользы;',
            '• Документация по управлению рисками является полной, прослеживаемой и согласована с системой менеджмента качества, соответствующей ISO 13485:2016;',
            '• Постпроизводственная информация (PMS, жалобы, CAPA) будет регулярно анализироваться для пересмотра оценки рисков.'
        ]
        
        for conclusion in conclusions:
            self.doc.add_paragraph(conclusion)
        
        self.doc.add_heading('9.2 Заключение', level=2)
        device_name = self.project.get('device_name', '[Device Name]')
        self.doc.add_paragraph(
            f'На момент утверждения данного отчёта совокупный остаточный риск изделия {device_name} '
            'считается приемлемым. Процесс управления рисками реализован в полном соответствии с ISO 14971:2019.'
        )
        
        self.doc.add_heading('9.3 Состав команды по менеджменту рисков, согласовывание и утверждения отчета', level=2)
        
        # Team signatures table
        table = self.doc.add_table(rows=1, cols=4)
        table.style = 'Light Grid Accent 1'
        
        headers = ['Имя', 'Должность', 'Подпись', 'Дата']
        header_cells = table.rows[0].cells
        for i, header in enumerate(headers):
            header_cells[i].text = header
        
        # Add team members
        if self.team:
            for member in self.team:
                row = table.add_row().cells
                row[0].text = member.get('name', '')
                row[1].text = member.get('role', '')
                row[2].text = ''  # Signature placeholder
                row[3].text = datetime.now().strftime('%d.%m.%Y')
        else:
            # PLACEHOLDER rows
            for i in range(3):
                row = table.add_row().cells
                row[0].text = '[PLACEHOLDER: Name]'
                row[1].text = '[PLACEHOLDER: Role]'
                row[2].text = ''
                row[3].text = datetime.now().strftime('%d.%m.%Y')
        
        self.doc.add_page_break()
    
    def _add_references(self):
        """Add references section - Section 10"""
        self.doc.add_heading('10. References and Document Control', level=1)
        
        self.doc.add_heading('10.1 Ссылки и нормативные документы', level=2)
        
        # References table
        table = self.doc.add_table(rows=1, cols=3)
        table.style = 'Light Grid Accent 1'
        
        headers = ['№', 'Документ / Стандарт', 'Наименование']
        header_cells = table.rows[0].cells
        for i, header in enumerate(headers):
            header_cells[i].text = header
        
        references = [
            ('1', 'ISO 14971:2019', 'Medical devices — Application of risk management to medical devices'),
            ('2', 'ISO 13485:2016', 'Quality management systems — Requirements for regulatory purposes'),
            ('3', 'MDR 2017/745', 'Regulation (EU) 2017/745 on medical devices'),
            ('4', 'ISO 10993-1:2020', 'Biological evaluation of medical devices — Part 1'),
            ('5', 'ISO 17664:2017', 'Processing of health care products — Information to be provided by the manufacturer'),
            ('6', 'Company SOP QMS-RM-001', 'Risk Management Procedure'),
            ('7', 'IFU-CP-01', 'Instructions for Use'),
        ]
        
        for ref in references:
            row = table.add_row().cells
            for i, text in enumerate(ref):
                row[i].text = text
        
        self.doc.add_paragraph()
        
        # Document control
        self.doc.add_heading('10.2 Управление документом', level=2)
        
        control_table = self.doc.add_table(rows=1, cols=2)
        control_table.style = 'Light Grid Accent 1'
        
        header_cells = control_table.rows[0].cells
        header_cells[0].text = 'Поле'
        header_cells[1].text = 'Значение'
        
        device_name = self.project.get('device_name', '[Device Name]')
        
        control_data = [
            ('Document title', f'Risk Management Report — {device_name}'),
            ('Document number', self.project.get('report_number', 'RMR-2025-01')),
            ('Revision', self.project.get('version', '1.0')),
            ('Status', 'Approved'),
            ('Effective date', datetime.now().strftime('%d.%m.%Y')),
            ('Prepared by', '[PLACEHOLDER: Preparer Name]'),
            ('Reviewed by', '[PLACEHOLDER: Reviewer Name]'),
            ('Approved by', '[PLACEHOLDER: Approver Name]'),
            ('Next review date', '[PLACEHOLDER: Next Review Date]'),
            ('Controlled copy location', 'QMS Repository / Folder: "Risk Management"'),
        ]
        
        for field, value in control_data:
            row = control_table.add_row().cells
            row[0].text = field
            row[1].text = value
        
        self.doc.add_page_break()
    
    def _add_appendix(self):
        """Add appendix - Full risk table"""
        self.doc.add_heading('Приложение А: Полная таблица управления рисками', level=1)
        
        if self.risks:
            # Create comprehensive table
            table = self.doc.add_table(rows=1, cols=10)
            table.style = 'Light Grid Accent 1'
            
            headers = [
                '№', 'Lifecycle', 'Hazard', 'Situation', 'Events',
                'Harm', 'S', 'P', 'Risk', 'Controls'
            ]
            header_cells = table.rows[0].cells
            for i, header in enumerate(headers):
                header_cells[i].text = header
            
            for idx, risk in enumerate(self.risks, 1):
                data = risk.get('data', {})
                row = table.add_row().cells
                row[0].text = str(idx)
                row[1].text = data.get('lifecycle_stage', '')[:20]  # Truncate for space
                row[2].text = data.get('hazard', '')[:30]
                row[3].text = data.get('hazardous_situation', '')[:30]
                row[4].text = data.get('sequence_of_events', '')[:30]
                row[5].text = data.get('harm', '')[:30]
                row[6].text = str(data.get('severity_initial', ''))
                row[7].text = str(data.get('probability_initial', ''))
                
                try:
                    s = int(data.get('severity_initial', 0))
                    p = int(data.get('probability_initial', 0))
                    row[8].text = str(s * p)
                except:
                    row[8].text = ''
                
                row[9].text = data.get('control_measures', '')[:30]
        else:
            self.doc.add_paragraph('[PLACEHOLDER: No risk data for appendix]')
    
    def _parse_json_field(self, field_value):
        """Parse JSON field from database"""
        if not field_value:
            return []
        
        try:
            if isinstance(field_value, str):
                return json.loads(field_value)
            return field_value
        except:
            return []

