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
from reportlab.lib.pagesizes import letter, A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_JUSTIFY


def format_role_display_name(role: str) -> str:
    """
    Convert role code to display name in uppercase format
    Used in documents to display roles consistently
    """
    role_mapping = {
        'admin': 'ADMIN',
        'manager': 'MANAGER',
        'doctor': 'DOCTOR',
        'product_manager': 'PRODUCT MANAGER',
        'risk_assessment_team_leader': 'RISK ASSESSMENT TEAM LEADER',
        'quality_management_representative': 'QUALITY MANAGMENT REPRESENTATIVE',
        'risk_assessment_team_member': 'RISK ASSESSMENT TEAM MEMBER'
    }
    return role_mapping.get(role, role.upper() if role else 'UNKNOWN')


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
        try:
            print("DEBUG: Setting up document styles")
            self._setup_document_styles()
            print("DEBUG: Adding title page")
            self._add_title_page()
            print("DEBUG: Adding table of contents")
            self._add_table_of_contents()
            print("DEBUG: Adding device identification")
            self._add_device_identification()
            print("DEBUG: Adding hazard identification")
            self._add_hazard_identification()
            print("DEBUG: Adding risk analysis")
            self._add_risk_analysis()
            print("DEBUG: Adding risk control measures")
            self._add_risk_control_measures()
            print("DEBUG: Adding residual risk evaluation")
            self._add_residual_risk_evaluation()
            print("DEBUG: Adding overall risk acceptability")
            self._add_overall_risk_acceptability()
            print("DEBUG: Adding conclusions")
            self._add_conclusions()
            print("DEBUG: Adding references")
            self._add_references()

            print("DEBUG: Saving document to BytesIO")
            # Save to BytesIO
            file_stream = BytesIO()
            self.doc.save(file_stream)
            file_stream.seek(0)
            print("DEBUG: Document generation completed successfully")
            return file_stream
        except Exception as e:
            print(f"DEBUG: Error in document generation: {e}")
            print(f"DEBUG: Error type: {type(e)}")
            import traceback
            print(f"DEBUG: Traceback: {traceback.format_exc()}")
            raise
    
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
        # Set default font - smaller for compact layout
        style = self.doc.styles['Normal']
        font = style.font
        font.name = 'Calibri'
        font.size = Pt(8)

        # Set compact margins
        sections = self.doc.sections
        for section in sections:
            section.top_margin = Inches(0.5)
            section.bottom_margin = Inches(0.5)
            section.left_margin = Inches(0.5)
            section.right_margin = Inches(0.5)
    
    def _add_title_page(self):
        """Add title page - Section 1"""
        # Title - smaller for compact layout
        title = self.doc.add_paragraph()
        title.alignment = WD_PARAGRAPH_ALIGNMENT.CENTER
        run = title.add_run("RISK MANAGEMENT REPORT")
        run.bold = True
        run.font.size = Pt(12)
        self.doc.add_paragraph()

        # Device information
        device_name = self._get_field_value(self.project.get('device_name'))
        device_model = self._get_field_value(self.project.get('device_model'))

        info_items = [
            ('Medical device:', device_name),
            ('Model:', device_model),
            ('Report No.:', self._get_field_value(self.project.get('report_number'), 'RMR-2025-01')),
            ('Revision:', self._get_field_value(self.project.get('version'), '1.0')),
            ('Date:', datetime.now().strftime('%d %B %Y')),
        ]

        for label, value in info_items:
            p = self.doc.add_paragraph()
            p.add_run(label).bold = True
            p.add_run(f' {value}')

        self.doc.add_paragraph()

        # Remove all team signatures completely

        self.doc.add_page_break()
    
    def _add_table_of_contents(self):
        """Add table of contents - Section 2"""
        heading = self.doc.add_heading('2. СОДЕРЖАНИЕ', level=1)

        # Create table for table of contents with page numbers
        toc_table = self.doc.add_table(rows=1, cols=3)
        toc_table.style = 'Light Grid Accent 1'

        # Header row
        header_cells = toc_table.rows[0].cells
        header_cells[0].text = 'Раздел'
        header_cells[1].text = 'Название'
        header_cells[2].text = 'Страница'

        sections_data = [
            ('1', 'ТИТУЛЬНЫЙ ЛИСТ', '1'),
            ('2', 'СОДЕРЖАНИЕ', '2'),
            ('3', 'ИДЕНТИФИКАЦИЯ ИЗДЕЛИЯ И НАЗНАЧЕНИЕ', '3'),
            ('4', 'Identification of Hazards (Идентификация опасностей)', '4'),
            ('5', 'Risk Analysis (Before Risk Control)', '5'),
            ('6', 'Risk Control Measures (Меры управления рисками)', '6'),
            ('7', 'Residual Risk Evaluation', '7'),
            ('8', 'Overall Residual Risk Acceptability (Оценка совокупного остаточного риска)', '8'),
            ('9', 'Conclusions and Approval', '9'),
            ('10', 'References and Document Control', '10'),
        ]

        for section_num, section_name, page_num in sections_data:
            row_cells = toc_table.add_row().cells
            row_cells[0].text = section_num
            row_cells[1].text = section_name
            row_cells[2].text = page_num

        self.doc.add_paragraph()  # Empty line after table
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
        
        # Data rows - only include fields that have actual data
        fields_data = [
            ('Device name', self._get_field_value(self.project.get('device_name'), '[PLACEHOLDER: Device Name]')),
            ('Model / Type', self._get_field_value(self.project.get('device_model'), '[PLACEHOLDER: Model]')),
        ]

        # Only add optional fields if they have actual data
        optional_fields = [
            ('Manufacturer', self.project.get('manufacturer')),
            ('Manufacturer address', self.project.get('manufacturer_address')),
            ('Category risk', self.project.get('device_classification')),
            ('Intended purpose', self.project.get('intended_use')),
            ('Intended users', self.project.get('user_profile')),
            ('Patient population', self.project.get('patient_population')),
            ('Operating environment', self.project.get('operating_environment')),
            ('Key performance characteristics', self.project.get('key_performance_characteristics')),
            ('Safety-related characteristics', self.project.get('safety_characteristics')),
            ('Standards and regulations applied', self.project.get('standards')),
        ]

        for field_name, field_value in optional_fields:
            processed_value = self._get_field_value(field_value, f'[PLACEHOLDER: {field_name}]')
            if processed_value != 'не заполнено':
                fields_data.append((field_name, processed_value))
        
        for field, value in fields_data:
            row_cells = table.add_row().cells
            row_cells[0].text = field
            row_cells[1].text = value
        
        self.doc.add_paragraph()
        
        # Lifecycle stages
        self.doc.add_paragraph('Этапы жизненного цикла:', style='Heading 3')
        lifecycle_stages = self._parse_json_field(self.project.get('lifecycle_stages', '[]'))
        if lifecycle_stages and isinstance(lifecycle_stages, list):
            for stage in lifecycle_stages:
                self.doc.add_paragraph(f'• {stage}', style='List Bullet')
        else:
            self.doc.add_paragraph('[PLACEHOLDER: Lifecycle Stages]', style='List Bullet')

        # Hazard categories
        self.doc.add_paragraph('Идентифицированные категории опасностей:', style='Heading 3')
        hazard_categories = self._parse_json_field(self.project.get('active_hazard_categories', '[]'))
        if hazard_categories and isinstance(hazard_categories, list):
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
        
        # Render checklist answers - only if filled
        checklist_answers = self._parse_json_field(self.project.get('hazard_checklist_answers', '{}'))
        if checklist_answers and any(
            isinstance(answer_data, dict) and answer_data.get('answer', '').strip() and answer_data.get('answer') != 'не заполнено'
            for answer_data in checklist_answers.values()
        ):
           
            for question_key, answer_data in checklist_answers.items():
                if isinstance(answer_data, dict):
                    question = answer_data.get('question', question_key)
                    answer = answer_data.get('answer', 'не заполнено')
                    notes = answer_data.get('notes', '')
                    if answer and answer != 'не заполнено':
                        self.doc.add_paragraph(f'Вопрос: {question}', style='Heading 4')
                        self.doc.add_paragraph(f'Ответ: {answer}')
                        if notes:
                            self.doc.add_paragraph(f'Примечания: {notes}')
                        self.doc.add_paragraph()  # Empty line
        
        # Hazards table - Exact Excel structure with all fields
        self.doc.add_heading('4.2 Таблица идентифицированных опасностей', level=2)

        if self.risks:
            table = self.doc.add_table(rows=1, cols=6)
            table.style = 'Light Grid Accent 1'

            # Header - Exact Excel columns including Категория опасности and Последовательность событий
            headers = ['№', 'Этап жизненного цикла', 'Категория опасности', 'Наименование опасности', 'Последовательность событий', 'Вред']
            header_cells = table.rows[0].cells
            for i, header in enumerate(headers):
                header_cells[i].text = header

            # Data rows from risk_table_rows
            for idx, risk in enumerate(self.risks, 1):
                data = risk.get('data', {})
                row = table.add_row().cells
                row[0].text = str(idx)
                # Show sheet name where risk is located (without "Управление рисками -" prefix)
                table_name = risk.get('table_name', data.get('lifecycle_stage', ''))
                # Remove "Управление рисками -" prefix if present
                if table_name.startswith('Управление рисками - '):
                    table_name = table_name.replace('Управление рисками - ', '', 1)
                row[1].text = table_name
                # Category of hazard
                row[2].text = data.get('hazard_category', '')
                # Name of hazard
                row[3].text = data.get('hazard_name', '')
                # Sequence of events
                row[4].text = data.get('event_sequence', '')
                # Harm
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
        # Set landscape orientation for this section
        current_section = self.doc.sections[-1]
        current_section.orientation = 1  # 1 = landscape, 0 = portrait
        current_section.page_width, current_section.page_height = current_section.page_height, current_section.page_width

        self.doc.add_heading('5. Risk Analysis (Before Risk Control)', level=1)
        
        self.doc.add_heading('5.1 Методология оценки', level=2)
        self.doc.add_paragraph(
            'Для анализа рисков используется качественно-количественная методика, где:'
        )
        
        # Severity table - use project-defined levels or fallback to defaults
        self.doc.add_paragraph('Severity (S) — Тяжесть вреда:', style='Heading 3')
        severity_levels = self._parse_json_field(self.project.get('severity_levels', '[]'))
        if severity_levels:
            sev_table = self.doc.add_table(rows=len(severity_levels) + 1, cols=4)
            sev_table.style = 'Light Grid Accent 1'

            # Header
            sev_table.rows[0].cells[0].text = 'Уровень'
            sev_table.rows[0].cells[1].text = 'Название'
            sev_table.rows[0].cells[2].text = 'Описание'
            sev_table.rows[0].cells[3].text = 'Балл'

            for idx, level_data in enumerate(severity_levels, 1):
                sev_table.rows[idx].cells[0].text = str(level_data.get('level', ''))
                sev_table.rows[idx].cells[1].text = level_data.get('name', '')
                sev_table.rows[idx].cells[2].text = level_data.get('description', '')
                sev_table.rows[idx].cells[3].text = str(level_data.get('score', level_data.get('level', '')))
        else:
            # Fallback to default severity levels
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

        # Probability table - use project-defined levels or fallback to defaults
        self.doc.add_paragraph('Probability (P) — Вероятность возникновения:', style='Heading 3')
        probability_levels = self._parse_json_field(self.project.get('probability_levels', '[]'))
        if probability_levels:
            prob_table = self.doc.add_table(rows=len(probability_levels) + 1, cols=3)
            prob_table.style = 'Light Grid Accent 1'

            # Header
            prob_table.rows[0].cells[0].text = 'Уровень'
            prob_table.rows[0].cells[1].text = 'Название'
            prob_table.rows[0].cells[2].text = 'Описание'

            for idx, level_data in enumerate(probability_levels, 1):
                prob_table.rows[idx].cells[0].text = str(level_data.get('level', ''))
                prob_table.rows[idx].cells[1].text = level_data.get('name', '')
                prob_table.rows[idx].cells[2].text = level_data.get('description', '')
        else:
            # Fallback to default probability levels
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
        
        # Risk threshold information
        risk_threshold = self.project.get('risk_threshold', 10)
        self.doc.add_paragraph('Уровень риска (доп./не доп.):', style='Heading 3')
        self.doc.add_paragraph(
            f'Укажите пороговое значение уровня риска. Если произведение "Тяжесть вреда" × "Вероятность" '
            f'будет больше или равно этому значению, риск будет считаться недопустимым. Если меньше - допустимым.'
        )
        self.doc.add_paragraph(f'Пороговое значение уровня риска: {risk_threshold}')
        self.doc.add_paragraph('от 1 до 20')
        self.doc.add_paragraph(
            f'ℹ️ Пояснение: Вы можете установить любое пороговое значение риска по вашему усмотрению. '
            f'Значение по умолчанию - 10. Риск считается недопустимым, если его уровень превышает или равен указанному порогу.'
        )
        self.doc.add_paragraph('Пример допустимого риска:')
        self.doc.add_paragraph('Тяжесть: 2 × Вероятность: 1 = Риск: 2 ✓ допустимый')
        self.doc.add_paragraph('Пример недопустимого риска:')
        self.doc.add_paragraph(f'Тяжесть: 5 × Вероятность: 5 = Риск: 25 ✗ недопустимый (при пороге {risk_threshold})')


        
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
        
        # Section 5.3 removed as per requirements
        
        self.doc.add_page_break()
    
    def _add_risk_control_measures(self):
        """Add risk control measures section - Section 6"""
        # Set landscape orientation for this section
        current_section = self.doc.sections[-1]
        current_section.orientation = 1  # 1 = landscape, 0 = portrait
        current_section.page_width, current_section.page_height = current_section.page_height, current_section.page_width

        self.doc.add_heading('6. Risk Control Measures (Меры управления рисками)', level=1)

        self.doc.add_heading('6.1 Цель раздела', level=2)
        self.doc.add_paragraph(
            'Определить и задокументировать меры, применённые для снижения или устранения рисков, '
            'связанных с выявленными опасными ситуациями.'
        )

        self.doc.add_heading('6.2 Таблица мер управления рисками', level=2)

        if self.risks:
            # Create comprehensive table with ALL Excel columns for control measures (remove Категория опасности and Последовательность событий)
            table = self.doc.add_table(rows=1, cols=23)
            table.style = 'Light Grid Accent 1'

            # All Excel headers for control measures (removed Категория опасности and Последовательность событий)
            headers = [
                '№', 'Этап жизненного цикла', 'Наименование опасности', 'Опасная ситуация', 'Вред',
                'Тяжесть вреда, балл', 'Вероятность причинения вреда, балл', 'Риск, балл',
                'Уровень риска (доп./не доп.)', 'Комментарий',
                'Меры по управлению риском (1)', 'Меры по управлению риском (2)', 'Меры по управлению риском (3)',
                'Верификация мер по управлению риском (1)', 'Верификация мер по управлению риском (2)', 'Верификация мер по управлению риском (3)',
                'Тяжесть вреда, балл (остат.)', 'Вероятность причинения вреда, балл (остат.)',
                'Достигнутый риск и его уровень', 'Уровень риска (доп./не доп.) (остат.)', 'Комментарий (остат.)',
                'Безопасность, заложенная в конструкции', 'Защитная мера/средство'
            ]
            header_cells = table.rows[0].cells
            for i, header in enumerate(headers):
                header_cells[i].text = header

            # Data rows with ALL fields (skip Категория опасности and Последовательность событий)
            for idx, risk in enumerate(self.risks, 1):
                data = risk.get('data', {})
                row = table.add_row().cells

                # Calculate initial and residual risks using correct field names from database
                def safe_int_convert(value):
                    """Safely convert string to int, handling various formats"""
                    if value is None:
                        return 0
                    # Convert to string first if not already
                    value_str = str(value).strip()
                    # Return 0 for empty strings
                    if not value_str:
                        return 0
                    try:
                        # Try direct int conversion first
                        return int(value_str)
                    except ValueError:
                        try:
                            # If direct int fails, try float conversion (handles "5.0")
                            return int(float(value_str))
                        except (ValueError, TypeError):
                            # If all conversions fail, return 0
                            return 0

                s_init = safe_int_convert(data.get('severity_score', 0))
                p_init = safe_int_convert(data.get('probability_score', 0))
                risk_init = s_init * p_init

                s_res = safe_int_convert(data.get('residual_risk_level', 0))
                p_res = safe_int_convert(data.get('residual_probability', 0))
                risk_res = s_res * p_res

                # Determine risk acceptability based on threshold
                risk_threshold = self.project.get('risk_threshold', 10)
                initial_acceptability = 'Допустимый' if risk_init < risk_threshold else 'Недопустимый'
                residual_acceptability = 'Допустимый' if risk_res < risk_threshold else 'Недопустимый'

                row_data = [
                    str(idx),  # №
                    risk.get('table_name', data.get('lifecycle_stage', '')),  # Этап жизненного цикла (no prefix)
                    data.get('hazard_name', ''),  # Наименование опасности (skip category)
                    data.get('hazardous_situation', ''),  # Опасная ситуация
                    data.get('harm', ''),  # Вред
                    str(data.get('severity_score', '')),  # Тяжесть вреда, балл
                    str(data.get('probability_score', '')),  # Вероятность причинения вреда, балл
                    str(risk_init) if risk_init else '',  # Риск, балл
                    initial_acceptability,  # Уровень риска (доп./не доп.)
                    data.get('comment_1', ''),  # Комментарий
                    data.get('control_measure_1', ''),  # Меры по управлению риском (1)
                    data.get('control_measure_2', ''),  # Меры по управлению риском (2)
                    data.get('control_measure_3', ''),  # Меры по управлению риском (3)
                    data.get('verification_1', ''),  # Верификация (1)
                    data.get('verification_2', ''),  # Верификация (2)
                    data.get('verification_3', ''),  # Верификация (3)
                    str(data.get('residual_risk_level', '')),  # Тяжесть вреда, балл (остат.)
                    str(data.get('residual_probability', '')),  # Вероятность причинения вреда, балл (остат.)
                    str(risk_res) if risk_res else '',  # Достигнутый риск и его уровень
                    residual_acceptability,  # Уровень риска (доп./не доп.) (остат.)
                    data.get('comment_2', ''),  # Комментарий (остат.)
                    data.get('inherent_safety', ''),  # Безопасность, заложенная в конструкции
                    data.get('protective_measure', '')   # Защитная мера/средство
                ]

                for i, cell_data in enumerate(row_data):
                    if i < len(row):
                        row[i].text = str(cell_data)
        else:
            self.doc.add_paragraph('[PLACEHOLDER: No control measures data available]')
        
        self.doc.add_page_break()
    
    def _add_residual_risk_evaluation(self):
        """Add residual risk evaluation section - Section 7"""
        # Set landscape orientation for this section
        current_section = self.doc.sections[-1]
        current_section.orientation = 1  # 1 = landscape, 0 = portrait
        current_section.page_width, current_section.page_height = current_section.page_height, current_section.page_width

        self.doc.add_heading('7. Residual Risk Evaluation', level=1)

        self.doc.add_heading('7.1 Цель раздела', level=2)
        self.doc.add_paragraph(
            'Определить, являются ли остаточные риски (после реализации мер контроля) приемлемыми '
            'в соответствии с установленными критериями риск-аппетита организации и принципом ALARP'
        )

        self.doc.add_heading('7.2 Таблица оценки остаточных рисков', level=2)

        if self.risks:
            # Create comprehensive table with ALL Excel columns for residual risk evaluation (remove Категория опасности and Последовательность событий)
            table = self.doc.add_table(rows=1, cols=11)
            table.style = 'Light Grid Accent 1'

            # All Excel headers for residual risk evaluation (removed Категория опасности and Последовательность событий)
            headers = [
                '№', 'Этап жизненного цикла', 'Наименование опасности', 'Вред',
                'Тяжесть вреда, балл (остат.)', 'Вероятность причинения вреда, балл (остат.)',
                'Достигнутый риск и его уровень', 'Уровень риска (доп./не доп.) (остат.)',
                'Комментарий (остат.)', 'Анализ остаточный риск/польза',
                'Новые риски в результате принятия мер по управлению'
            ]
            header_cells = table.rows[0].cells
            for i, header in enumerate(headers):
                header_cells[i].text = header

            acceptable_residual = 0
            unacceptable_residual = 0

            for idx, risk in enumerate(self.risks, 1):
                data = risk.get('data', {})

                # Calculate residual risk
                s_res = data.get('severity_residual', 0) or 0
                p_res = data.get('probability_residual', 0) or 0
                risk_res = s_res * p_res

                # Determine residual risk acceptability based on threshold
                risk_threshold = self.project.get('risk_threshold', 10)
                residual_acceptability = 'Допустимый' if risk_res < risk_threshold else 'Недопустимый'

                if risk_res < risk_threshold:
                    acceptable_residual += 1
                else:
                    unacceptable_residual += 1

                row = table.add_row().cells
                # Remove prefix from table_name
                table_name = risk.get('table_name', data.get('lifecycle_stage', ''))
                if table_name.startswith('Управление рисками - '):
                    table_name = table_name.replace('Управление рисками - ', '', 1)

                row_data = [
                    str(idx),  # №
                    table_name,  # Этап жизненного цикла (no prefix)
                    data.get('hazardous_situation', ''),  # Наименование опасности (skip category and sequence)
                    data.get('harm', ''),  # Вред
                    str(data.get('severity_residual', '')),  # Тяжесть вреда, балл (остат.)
                    str(data.get('probability_residual', '')),  # Вероятность причинения вреда, балл (остат.)
                    str(risk_res) if risk_res else '',  # Достигнутый риск и его уровень
                    residual_acceptability,  # Уровень риска (доп./не доп.) (остат.)
                    data.get('comment_2', ''),  # Комментарий (остат.)
                    data.get('risk_benefit_analysis', ''),  # Анализ остаточный риск/польза
                    data.get('new_risks', '')   # Новые риски в результате принятия мер по управлению
                ]

                for i, cell_data in enumerate(row_data):
                    if i < len(row):
                        row[i].text = str(cell_data)
        else:
            self.doc.add_paragraph('[PLACEHOLDER: No residual risk data available]')
            acceptable_residual = 0
            unacceptable_residual = 0
        
      
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
                row[1].text = format_role_display_name(member.get('role', ''))
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
            ('Controlled copy location', 'QMS Repository / Folder: "Risk Management"'),
        ]
        
        for field, value in control_data:
            row = control_table.add_row().cells
            row[0].text = field
            row[1].text = value
        
        self.doc.add_page_break()
    
    def _add_appendix(self):
        """Add appendix - Full Excel table from project"""
        self.doc.add_heading('Приложение А: Полная таблица управления рисками', level=1)

        if self.risks:
            # Create comprehensive table with all Excel data
            table = self.doc.add_table(rows=1, cols=14)
            table.style = 'Light Grid Accent 1'

            headers = [
                '№', 'Этап жизненного цикла', 'Категория опасности', 'Наименование опасности',
                'Последовательность событий', 'Вред', 'Начальная тяжесть (S)', 'Начальная вероятность (P)',
                'Начальный риск (S×P)', 'Меры контроля', 'Метод верификации',
                'Остаточная тяжесть (S)', 'Остаточная вероятность (P)', 'Остаточный риск (S×P)'
            ]
            header_cells = table.rows[0].cells
            for i, header in enumerate(headers):
                header_cells[i].text = header

            for idx, risk in enumerate(self.risks, 1):
                data = risk.get('data', {})
                row = table.add_row().cells
                row[0].text = str(idx)
                row[1].text = risk.get('table_name', data.get('lifecycle_stage', ''))
                row[2].text = data.get('hazard', '')
                row[3].text = data.get('hazardous_situation', '')
                row[4].text = data.get('sequence_of_events', '')
                row[5].text = data.get('harm', '')
                row[6].text = str(data.get('severity_initial', ''))
                row[7].text = str(data.get('probability_initial', ''))

                try:
                    s_init = int(data.get('severity_initial', 0))
                    p_init = int(data.get('probability_initial', 0))
                    row[8].text = str(s_init * p_init)
                except:
                    row[8].text = ''

                row[9].text = data.get('control_measures', '')
                row[10].text = data.get('verification', '')
                row[11].text = str(data.get('severity_residual', ''))
                row[12].text = str(data.get('probability_residual', ''))

                try:
                    s_res = int(data.get('severity_residual', 0))
                    p_res = int(data.get('probability_residual', 0))
                    row[13].text = str(s_res * p_res)
                except:
                    row[13].text = ''
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


class PDFRiskManagementReportGenerator:
    """Generates Risk Management Report documents in PDF format"""

    def __init__(self, project_data: dict, risk_data: list, table_data: dict, team_members: list):
        """
        Initialize the PDF generator with project data

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
        self.styles = getSampleStyleSheet()

        # Create custom styles - compact for landscape printing
        self.styles.add(ParagraphStyle(
            name='CustomTitle',
            parent=self.styles['Title'],
            fontSize=12,
            alignment=TA_CENTER,
            spaceAfter=15
        ))

        self.styles.add(ParagraphStyle(
            name='Heading1',
            parent=self.styles['Heading1'],
            fontSize=11,
            spaceAfter=8,
            alignment=TA_LEFT
        ))

        self.styles.add(ParagraphStyle(
            name='Heading2',
            parent=self.styles['Heading2'],
            fontSize=10,
            spaceAfter=5,
            alignment=TA_LEFT
        ))

        self.styles.add(ParagraphStyle(
            name='Heading3',
            parent=self.styles['Heading3'],
            fontSize=9,
            spaceAfter=3,
            alignment=TA_LEFT
        ))

        self.styles.add(ParagraphStyle(
            name='Normal',
            parent=self.styles['Normal'],
            fontSize=8,
            alignment=TA_JUSTIFY,
            wordWrap='CJK'
        ))

    def generate(self) -> BytesIO:
        """Generate the complete PDF document and return as BytesIO"""
        file_stream = BytesIO()
        doc = SimpleDocTemplate(file_stream, pagesize=A4)
        story = []

        # Build the document content
        self._add_title_page(story)
        self._add_table_of_contents(story)
        self._add_device_identification(story)
        self._add_hazard_identification(story)
        self._add_risk_analysis(story)
        self._add_risk_control_measures(story)
        self._add_residual_risk_evaluation(story)
        self._add_overall_risk_acceptability(story)
        self._add_conclusions(story)
        self._add_references(story)

        doc.build(story)
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

    def _add_title_page(self, story):
        """Add title page - Section 1"""
        # Title
        story.append(Paragraph("RISK MANAGEMENT REPORT", self.styles['CustomTitle']))
        story.append(Spacer(1, 20))

        # Device information
        device_name = self._get_field_value(self.project.get('device_name'))
        device_model = self._get_field_value(self.project.get('device_model'))
        manufacturer = self._get_field_value(self.project.get('manufacturer'))
        manufacturer_address = self._get_field_value(self.project.get('manufacturer_address'))
        report_number = self._get_field_value(self.project.get('report_number'), 'RMR-2025-01')
        version = self._get_field_value(self.project.get('version'), '1.0')

        info_items = [
            f"<b>Medical device:</b> {device_name}",
            f"<b>Model:</b> {device_model}",
            f"<b>Manufacturer:</b> {manufacturer}",
            f"<b>Address:</b> {manufacturer_address}",
            f"<b>Report No.:</b> {report_number}",
            f"<b>Revision:</b> {version}",
            f"<b>Date:</b> {datetime.now().strftime('%d %B %Y')}",
        ]

        for item in info_items:
            story.append(Paragraph(item, self.styles['Normal']))
            story.append(Spacer(1, 5))

        story.append(Spacer(1, 20))

        # Team signatures
        prepared_by = self._get_field_value(self.project.get('prepared_by'))
        reviewed_by = self._get_field_value(self.project.get('reviewed_by'))
        approved_by = self._get_field_value(self.project.get('approved_by'))

        story.append(Paragraph(f'Prepared by: {prepared_by}', self.styles['Normal']))
        story.append(Paragraph(f'Reviewed by: {reviewed_by}', self.styles['Normal']))
        story.append(Paragraph(f'Approved by: {approved_by}', self.styles['Normal']))

        story.append(PageBreak())

    def _add_table_of_contents(self, story):
        """Add table of contents - Section 2"""
        story.append(Paragraph('2. СОДЕРЖАНИЕ', self.styles['Heading1']))

        toc_data = [
            ['1', 'ТИТУЛЬНЫЙ ЛИСТ', '1'],
            ['2', 'СОДЕРЖАНИЕ', '2'],
            ['3', 'ИДЕНТИФИКАЦИЯ ИЗДЕЛИЯ И НАЗНАЧЕНИЕ', '3'],
            ['4', 'Identification of Hazards (Идентификация опасностей)', '4'],
            ['5', 'Risk Analysis (Before Risk Control)', '5'],
            ['6', 'Risk Control Measures (Меры управления рисками)', '6'],
            ['7', 'Residual Risk Evaluation', '7'],
            ['8', 'Overall Residual Risk Acceptability (Оценка совокупного остаточного риска)', '8'],
            ['9', 'Conclusions and Approval', '9'],
            ['10', 'References and Document Control', '10']
        ]

        table = Table(toc_data)
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 8),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
            ('GRID', (0, 0), (-1, -1), 1, colors.black),
        ]))
        story.append(table)
        story.append(Spacer(1, 20))

        story.append(PageBreak())

    def _add_device_identification(self, story):
        """Add device identification section - Section 3"""
        story.append(Paragraph('3. ИДЕНТИФИКАЦИЯ ИЗДЕЛИЯ И НАЗНАЧЕНИЕ', self.styles['Heading1']))

        # Create identification table
        fields_data = [
            ('Device name', self.project.get('device_name', '[PLACEHOLDER: Device Name]')),
            ('Model / Type', self.project.get('device_model', '[PLACEHOLDER: Model]')),
            ('Manufacturer', self.project.get('manufacturer', '[PLACEHOLDER: Manufacturer]')),
            ('Manufacturer address', self.project.get('manufacturer_address', '[PLACEHOLDER: Manufacturer Address]')),
            ('Category risk', self.project.get('device_classification', '[PLACEHOLDER: Classification]')),
            ('Intended purpose', self.project.get('intended_use', '[PLACEHOLDER: Intended Use]')),
            ('Intended users', self.project.get('user_profile', '[PLACEHOLDER: User Profile]')),
            ('Patient population', self.project.get('patient_population', '[PLACEHOLDER: Patient Population]')),
            ('Operating environment', self.project.get('operating_environment', '[PLACEHOLDER: Environment]')),
            ('Key performance characteristics', self.project.get('key_performance_characteristics', '[PLACEHOLDER: Performance Characteristics]')),
            ('Safety-related characteristics', self.project.get('safety_characteristics', '[PLACEHOLDER: Safety Characteristics]')),
            ('Standards and regulations applied', self.project.get('standards', '[PLACEHOLDER: Standards]')),
        ]

        table_data = [['Field', 'Entry']]
        for field, value in fields_data:
            table_data.append([field, value])

        table = Table(table_data)
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 10),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
            ('GRID', (0, 0), (-1, -1), 1, colors.black)
        ]))
        story.append(table)
        story.append(Spacer(1, 20))

        # Lifecycle stages
        story.append(Paragraph('Этапы жизненного цикла:', self.styles['Heading3']))
        lifecycle_stages = self._parse_json_field(self.project.get('lifecycle_stages', '[]'))
        if lifecycle_stages:
            for stage in lifecycle_stages:
                story.append(Paragraph(f'• {stage}', self.styles['Normal']))
        else:
            story.append(Paragraph('[PLACEHOLDER: Lifecycle Stages]', self.styles['Normal']))

        # Hazard categories
        story.append(Paragraph('Идентифицированные категории опасностей:', self.styles['Heading3']))
        hazard_categories = self._parse_json_field(self.project.get('active_hazard_categories', '[]'))
        if hazard_categories:
            for category in hazard_categories:
                story.append(Paragraph(f'• {category}', self.styles['Normal']))
        else:
            story.append(Paragraph('[PLACEHOLDER: Hazard Categories]', self.styles['Normal']))

        story.append(PageBreak())

    def _add_hazard_identification(self, story):
        """Add hazard identification section - Section 4"""
        story.append(Paragraph('4. Identification of Hazards (Идентификация опасностей)', self.styles['Heading1']))

        story.append(Paragraph('4.1 Цель раздела', self.styles['Heading2']))
        story.append(Paragraph(
            'Определить все разумно предсказуемые опасности, возникающие на этапах жизненного цикла '
            'изделия - от проектирования и производства до эксплуатации, очистки, транспортировки, утилизации.',
            self.styles['Normal']
        ))

        # Render checklist answers
        
        checklist_answers = self._parse_json_field(self.project.get('hazard_checklist_answers', '{}'))
        if checklist_answers:
            for question_key, answer_data in checklist_answers.items():
                if isinstance(answer_data, dict):
                    question = answer_data.get('question', question_key)
                    answer = answer_data.get('answer', 'не заполнено')
                    notes = answer_data.get('notes', '')
                else:
                    question = question_key
                    answer = str(answer_data)

                story.append(Paragraph(f'<b>Вопрос:</b> {question}', self.styles['Normal']))
                story.append(Paragraph(f'<b>Ответ:</b> {answer}', self.styles['Normal']))
                if notes:
                    story.append(Paragraph(f'<b>Примечания:</b> {notes}', self.styles['Normal']))
                story.append(Spacer(1, 10))
        else:
            story.append(Paragraph('Чек-лист ответов не заполнен', self.styles['Normal']))

        # Hazards table - Exact Excel structure (removed Категория опасности and Последовательность событий)
        story.append(Paragraph('4.2 Таблица идентифицированных опасностей', self.styles['Heading2']))

        if self.risks:
            table_data = [['№', 'Этап жизненного цикла', 'Наименование опасности', 'Вред']]

            for idx, risk in enumerate(self.risks, 1):
                data = risk.get('data', {})
                table_data.append([
                    str(idx),
                    risk.get('table_name', data.get('lifecycle_stage', '')).replace('Управление рисками - ', '', 1) if risk.get('table_name', data.get('lifecycle_stage', '')).startswith('Управление рисками - ') else risk.get('table_name', data.get('lifecycle_stage', '')),  # Remove "Управление рисками -" prefix
                    data.get('hazardous_situation', ''),  # Skip category and sequence columns
                    data.get('harm', '')
                ])

            table = Table(table_data)
            table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, 0), 8),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
                ('GRID', (0, 0), (-1, -1), 1, colors.black),
                ('FONTSIZE', (0, 1), (-1, -1), 7),
            ]))
            story.append(table)
        else:
            story.append(Paragraph('[PLACEHOLDER: No hazards identified yet]', self.styles['Normal']))

        story.append(Paragraph('4.3 Резюме раздела', self.styles['Heading2']))
        hazard_count = len(self.risks)
        categories_text = ', '.join(self._parse_json_field(self.project.get('active_hazard_categories', '[]'))) or '[PLACEHOLDER: Categories]'
        summary = (
            f'Идентифицированы основные опасности ({hazard_count} шт.), связанные с {categories_text}. '
            'Для каждой опасности будет проведён анализ риска (раздел 5) с оценкой тяжести и вероятности, '
            'а также определены меры контроля (раздел 6).'
        )
        story.append(Paragraph(summary, self.styles['Normal']))

        story.append(PageBreak())

    def _add_risk_analysis(self, story):
        """Add risk analysis section - Section 5"""
        story.append(Paragraph('5. Risk Analysis (Before Risk Control)', self.styles['Heading1']))

        story.append(Paragraph('5.1 Методология оценки', self.styles['Heading2']))
        story.append(Paragraph(
            'Для анализа рисков используется качественно-количественная методика, где:',
            self.styles['Normal']
        ))

        # Severity table
        story.append(Paragraph('Severity (S) — Тяжесть вреда:', self.styles['Heading3']))
        severity_levels = self._parse_json_field(self.project.get('severity_levels', '[]'))
        if severity_levels:
            table_data = [['Уровень', 'Название', 'Описание', 'Балл']]
            for level_data in severity_levels:
                table_data.append([
                    str(level_data.get('level', '')),
                    level_data.get('name', ''),
                    level_data.get('description', ''),
                    str(level_data.get('score', level_data.get('level', '')))
                ])
        else:
            table_data = [
                ['Уровень', 'Описание', 'Пример'],
                ['1', 'Незначительный', 'Лёгкое раздражение кожи'],
                ['2', 'Малый', 'Обратимая травма, лёгкий порез'],
                ['3', 'Средний', 'Временная потеря трудоспособности'],
                ['4', 'Серьёзный', 'Значительная травма, госпитализация'],
                ['5', 'Критический', 'Смерть или необратимое повреждение органа'],
            ]

        table = Table(table_data)
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 8),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
            ('GRID', (0, 0), (-1, -1), 1, colors.black),
        ]))
        story.append(table)
        story.append(Spacer(1, 10))

        # Probability table
        story.append(Paragraph('Probability (P) — Вероятность возникновения:', self.styles['Heading3']))
        probability_levels = self._parse_json_field(self.project.get('probability_levels', '[]'))
        if probability_levels:
            table_data = [['Уровень', 'Название', 'Описание']]
            for level_data in probability_levels:
                table_data.append([
                    str(level_data.get('level', '')),
                    level_data.get('name', ''),
                    level_data.get('description', '')
                ])
        else:
            table_data = [
                ['Уровень', 'Описание', 'Пример'],
                ['1', 'Очень редкое', 'Почти невозможно (<1/10000)'],
                ['2', 'Редкое', 'Возможное при особых обстоятельствах'],
                ['3', 'Иногда', 'Может произойти время от времени'],
                ['4', 'Вероятное', 'Может происходить регулярно'],
                ['5', 'Частое', 'Происходит часто'],
            ]

        table = Table(table_data)
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 8),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
            ('GRID', (0, 0), (-1, -1), 1, colors.black),
        ]))
        story.append(table)
        story.append(Spacer(1, 10))

        # Risk threshold information
        risk_threshold = self.project.get('risk_threshold', 10)
        story.append(Paragraph('Уровень риска (доп./не доп.):', self.styles['Heading3']))
        story.append(Paragraph(
            f'Укажите пороговое значение уровня риска. Если произведение "Тяжесть вреда" × "Вероятность" '
            f'будет больше или равно этому значению, риск будет считаться недопустимым. Если меньше - допустимым.',
            self.styles['Normal']
        ))
        story.append(Paragraph(f'Пороговое значение уровня риска: {risk_threshold}', self.styles['Normal']))
        story.append(Paragraph('от 1 до 20', self.styles['Normal']))
        story.append(Paragraph(
            f'ℹ️ Пояснение: Вы можете установить любое пороговое значение риска по вашему усмотрению. '
            f'Значение по умолчанию - 10. Риск считается недопустимым, если его уровень превышает или равен указанному порогу.',
            self.styles['Normal']
        ))
        story.append(Paragraph('Пример допустимого риска:', self.styles['Normal']))
        story.append(Paragraph('Тяжесть: 2 × Вероятность: 1 = Риск: 2 ✓ допустимый', self.styles['Normal']))
        story.append(Paragraph('Пример недопустимого риска:', self.styles['Normal']))
        story.append(Paragraph(f'Тяжесть: 5 × Вероятность: 5 = Риск: 25 ✗ недопустимый (при пороге {risk_threshold})', self.styles['Normal']))
        story.append(Spacer(1, 10))



        # Risk analysis results table
        story.append(Paragraph('5.2 Таблица анализа рисков', self.styles['Heading2']))

        if self.risks:
            table_data = [['№', 'Hazard', 'Severity (S)', 'Probability (P)', 'Risk Score (S×P)']]

            acceptable_count = 0
            unacceptable_count = 0

            for idx, risk in enumerate(self.risks, 1):
                data = risk.get('data', {})
                severity = data.get('severity_initial', '[PLACEHOLDER]')
                probability = data.get('probability_initial', '[PLACEHOLDER]')

                try:
                    risk_score = int(severity) * int(probability)
                    score_str = str(risk_score)
                    if risk_score < 10:
                        acceptable_count += 1
                    else:
                        unacceptable_count += 1
                except:
                    score_str = '[PLACEHOLDER]'

                table_data.append([
                    str(idx),
                    data.get('hazard', ''),
                    str(severity),
                    str(probability),
                    score_str
                ])

            table = Table(table_data)
            table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, 0), 8),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
                ('GRID', (0, 0), (-1, -1), 1, colors.black),
            ]))
            story.append(table)
        else:
            story.append(Paragraph('[PLACEHOLDER: No risk data available]', self.styles['Normal']))
            acceptable_count = 0
            unacceptable_count = 0

        # Section 5.3 removed as per requirements

        story.append(PageBreak())

    def _add_risk_control_measures(self, story):
        """Add risk control measures section - Section 6"""
        story.append(Paragraph('6. Risk Control Measures (Меры управления рисками)', self.styles['Heading1']))

        story.append(Paragraph('6.1 Цель раздела', self.styles['Heading2']))
        story.append(Paragraph(
            'Определить и задокументировать меры, применённые для снижения или устранения рисков, '
            'связанных с выявленными опасными ситуациями.',
            self.styles['Normal']
        ))

        story.append(Paragraph('6.2 Таблица мер управления рисками', self.styles['Heading2']))

        if self.risks:
            # Create comprehensive table with ALL Excel columns for control measures
            table_data = [['№', 'Этап жизненного цикла', 'Категория опасности', 'Наименование опасности',
                          'Последовательность событий', 'Опасная ситуация', 'Вред',
                          'Тяжесть вреда, балл', 'Вероятность причинения вреда, балл', 'Риск, балл',
                          'Уровень риска (доп./не доп.)', 'Комментарий',
                          'Меры по управлению риском (1)', 'Меры по управлению риском (2)', 'Меры по управлению риском (3)',
                          'Верификация мер по управлению риском (1)', 'Верификация мер по управлению риском (2)', 'Верификация мер по управлению риском (3)',
                          'Тяжесть вреда, балл (остат.)', 'Вероятность причинения вреда, балл (остат.)',
                          'Достигнутый риск и его уровень', 'Уровень риска (доп./не доп.) (остат.)', 'Комментарий (остат.)',
                          'Безопасность, заложенная в конструкции', 'Защитная мера/средство']]

            for idx, risk in enumerate(self.risks, 1):
                data = risk.get('data', {})

                # Calculate initial and residual risks using correct field names from database with safe conversion
                def safe_int_convert(value):
                    """Safely convert string to int, handling various formats"""
                    if value is None:
                        return 0
                    # Convert to string first if not already
                    value_str = str(value).strip()
                    # Return 0 for empty strings
                    if not value_str:
                        return 0
                    try:
                        # Try direct int conversion first
                        return int(value_str)
                    except ValueError:
                        try:
                            # If direct int fails, try float conversion (handles "5.0")
                            return int(float(value_str))
                        except (ValueError, TypeError):
                            # If all conversions fail, return 0
                            return 0

                s_init = safe_int_convert(data.get('severity_score', 0))
                p_init = safe_int_convert(data.get('probability_score', 0))
                risk_init = s_init * p_init

                s_res = safe_int_convert(data.get('residual_risk_level', 0))
                p_res = safe_int_convert(data.get('residual_probability', 0))
                risk_res = s_res * p_res

                # Determine risk acceptability based on threshold
                risk_threshold = self.project.get('risk_threshold', 10)
                initial_acceptability = 'Допустимый' if risk_init < risk_threshold else 'Недопустимый'
                residual_acceptability = 'Допустимый' if risk_res < risk_threshold else 'Недопустимый'

                table_data.append([
                    str(idx),  # №
                    risk.get('table_name', data.get('lifecycle_stage', '')),  # Этап жизненного цикла (no prefix)
                    data.get('hazard_category', ''),  # Категория опасности
                    data.get('hazard_name', ''),  # Наименование опасности
                    data.get('event_sequence', ''),  # Последовательность событий
                    data.get('hazardous_situation', ''),  # Опасная ситуация
                    data.get('harm', ''),  # Вред
                    str(data.get('severity_score', '')),  # Тяжесть вреда, балл
                    str(data.get('probability_score', '')),  # Вероятность причинения вреда, балл
                    str(risk_init) if risk_init else '',  # Риск, балл
                    initial_acceptability,  # Уровень риска (доп./не доп.)
                    data.get('comment_1', ''),  # Комментарий
                    data.get('control_measure_1', ''),  # Меры по управлению риском (1)
                    data.get('control_measure_2', ''),  # Меры по управлению риском (2)
                    data.get('control_measure_3', ''),  # Меры по управлению риском (3)
                    data.get('verification_1', ''),  # Верификация (1)
                    data.get('verification_2', ''),  # Верификация (2)
                    data.get('verification_3', ''),  # Верификация (3)
                    str(data.get('residual_risk_level', '')),  # Тяжесть вреда, балл (остат.)
                    str(data.get('residual_probability', '')),  # Вероятность причинения вреда, балл (остат.)
                    str(risk_res) if risk_res else '',  # Достигнутый риск и его уровень
                    residual_acceptability,  # Уровень риска (доп./не доп.) (остат.)
                    data.get('comment_2', ''),  # Комментарий (остат.)
                    data.get('inherent_safety', ''),  # Безопасность, заложенная в конструкции
                    data.get('protective_measure', '')   # Защитная мера/средство
                ])

            table = Table(table_data)
            table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, 0), 5),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
                ('GRID', (0, 0), (-1, -1), 1, colors.black),
            ]))
            story.append(table)
        else:
            story.append(Paragraph('[PLACEHOLDER: No control measures data available]', self.styles['Normal']))

        story.append(PageBreak())

    def _add_residual_risk_evaluation(self, story):
        """Add residual risk evaluation section - Section 7"""
        story.append(Paragraph('7. Residual Risk Evaluation', self.styles['Heading1']))

        story.append(Paragraph('7.1 Цель раздела', self.styles['Heading2']))
        story.append(Paragraph(
            'Определить, являются ли остаточные риски (после реализации мер контроля) приемлемыми '
            'в соответствии с установленными критериями риск-аппетита организации и принципом ALARP',
            self.styles['Normal']
        ))

        story.append(Paragraph('7.2 Таблица оценки остаточных рисков', self.styles['Heading2']))

        if self.risks:
            # Create comprehensive table with ALL Excel columns for residual risk evaluation
            table_data = [['№', 'Этап жизненного цикла', 'Категория опасности', 'Наименование опасности',
                          'Последовательность событий', 'Вред', 'Тяжесть вреда, балл (остат.)',
                          'Вероятность причинения вреда, балл (остат.)', 'Достигнутый риск и его уровень',
                          'Уровень риска (доп./не доп.) (остат.)', 'Комментарий (остат.)',
                          'Анализ остаточный риск/польза', 'Новые риски в результате принятия мер по управлению']]

            acceptable_residual = 0
            unacceptable_residual = 0

            for idx, risk in enumerate(self.risks, 1):
                data = risk.get('data', {})

                # Calculate residual risk
                s_res = data.get('severity_residual', 0) or 0
                p_res = data.get('probability_residual', 0) or 0
                risk_res = s_res * p_res

                # Determine residual risk acceptability based on threshold
                risk_threshold = self.project.get('risk_threshold', 10)
                residual_acceptability = 'Допустимый' if risk_res < risk_threshold else 'Недопустимый'

                if risk_res < risk_threshold:
                    acceptable_residual += 1
                else:
                    unacceptable_residual += 1

                # Remove prefix from table_name for PDF table 7.2
                table_name = risk.get('table_name', data.get('lifecycle_stage', ''))
                if table_name.startswith('Управление рисками - '):
                    table_name = table_name.replace('Управление рисками - ', '', 1)

                table_data.append([
                    str(idx),  # №
                    table_name,  # Этап жизненного цикла (remove prefix)
                    data.get('hazard_category', ''),  # Категория опасности
                    data.get('hazard_name', ''),  # Наименование опасности
                    data.get('event_sequence', ''),  # Последовательность событий
                    data.get('harm', ''),  # Вред
                    str(data.get('severity_residual', '')),  # Тяжесть вреда, балл (остат.)
                    str(data.get('probability_residual', '')),  # Вероятность причинения вреда, балл (остат.)
                    str(risk_res) if risk_res else '',  # Достигнутый риск и его уровень
                    residual_acceptability,  # Уровень риска (доп./не доп.) (остат.)
                    data.get('comment_2', ''),  # Комментарий (остат.)
                    data.get('risk_benefit_analysis', ''),  # Анализ остаточный риск/польза
                    data.get('new_risks', '')   # Новые риски в результате принятия мер по управлению
                ])

            table = Table(table_data)
            table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, 0), 6),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
                ('GRID', (0, 0), (-1, -1), 1, colors.black),
            ]))
            story.append(table)
        else:
            story.append(Paragraph('[PLACEHOLDER: No residual risk data available]', self.styles['Normal']))
            acceptable_residual = 0
            unacceptable_residual = 0

       
        story.append(PageBreak())

    def _add_overall_risk_acceptability(self, story):
        """Add overall risk acceptability section - Section 8"""
        story.append(Paragraph('8. Overall Residual Risk Acceptability (Оценка совокупного остаточного риска)', self.styles['Heading1']))

        story.append(Paragraph('8.1 Цель раздела', self.styles['Heading2']))
        story.append(Paragraph(
            'Определить, является ли совокупный остаточный риск медицинского изделия приемлемым, '
            'учитывая все идентифицированные индивидуальные риски, их взаимное влияние и соотношение '
            'польза/риск (Benefit-Risk balance), как требует ISO 14971:2019, п. 8.3.',
            self.styles['Normal']
        ))

        
        story.append(Paragraph('[PLACEHOLDER: Benefit-risk assessment if unacceptable risks remain]', self.styles['Normal']))

        story.append(PageBreak())

    def _add_conclusions(self, story):
        """Add conclusions section - Section 9"""
        story.append(Paragraph('9. Conclusions and Approval', self.styles['Heading1']))

        story.append(Paragraph('9.1 Общие выводы', self.styles['Heading2']))

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
            story.append(Paragraph(conclusion, self.styles['Normal']))

        story.append(Paragraph('9.2 Заключение', self.styles['Heading2']))
        device_name = self.project.get('device_name', '[Device Name]')
        conclusion_text = (
            f'На момент утверждения данного отчёта совокупный остаточный риск изделия {device_name} '
            'считается приемлемым. Процесс управления рисками реализован в полном соответствии с ISO 14971:2019.'
        )
        story.append(Paragraph(conclusion_text, self.styles['Normal']))

        story.append(Paragraph('9.3 Состав команды по менеджменту рисков, согласовывание и утверждения отчета', self.styles['Heading2']))

        # Team signatures table
        table_data = [['Имя', 'Должность', 'Подпись', 'Дата']]

        if self.team:
            for member in self.team:
                table_data.append([
                    member.get('name', ''),
                    format_role_display_name(member.get('role', '')),
                    '',  # Signature placeholder
                    datetime.now().strftime('%d.%m.%Y')
                ])
        else:
            for i in range(3):
                table_data.append([
                    '[PLACEHOLDER: Name]',
                    '[PLACEHOLDER: Role]',
                    '',
                    datetime.now().strftime('%d.%m.%Y')
                ])

        table = Table(table_data)
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 8),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
            ('GRID', (0, 0), (-1, -1), 1, colors.black),
        ]))
        story.append(table)

        story.append(PageBreak())

    def _add_references(self, story):
        """Add references section - Section 10"""
        story.append(Paragraph('10. References and Document Control', self.styles['Heading1']))

        story.append(Paragraph('10.1 Ссылки и нормативные документы', self.styles['Heading2']))

        references_data = [
            ['№', 'Документ / Стандарт', 'Наименование'],
            ['1', 'ISO 14971:2019', 'Medical devices — Application of risk management to medical devices'],
            ['2', 'ISO 13485:2016', 'Quality management systems — Requirements for regulatory purposes'],
            ['3', 'MDR 2017/745', 'Regulation (EU) 2017/745 on medical devices'],
            ['4', 'ISO 10993-1:2020', 'Biological evaluation of medical devices — Part 1'],
            ['5', 'ISO 17664:2017', 'Processing of health care products — Information to be provided by the manufacturer'],
            ['6', 'Company SOP QMS-RM-001', 'Risk Management Procedure'],
            ['7', 'IFU-CP-01', 'Instructions for Use'],
        ]

        table = Table(references_data)
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 8),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
            ('GRID', (0, 0), (-1, -1), 1, colors.black),
        ]))
        story.append(table)

        story.append(Paragraph('10.2 Управление документом', self.styles['Heading2']))

        device_name = self.project.get('device_name', '[Device Name]')

        control_data = [
            ['Document title', f'Risk Management Report — {device_name}'],
            ['Document number', self.project.get('report_number', 'RMR-2025-01')],
            ['Revision', self.project.get('version', '1.0')],
            ['Status', 'Approved'],
            ['Effective date', datetime.now().strftime('%d.%m.%Y')],
            ['Controlled copy location', 'QMS Repository / Folder: "Risk Management"'],
        ]

        table = Table(control_data)
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 8),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
            ('GRID', (0, 0), (-1, -1), 1, colors.black),
        ]))
        story.append(table)

        story.append(PageBreak())

    def _add_appendix(self, story):
        """Add appendix - Full Excel table from project"""
        story.append(Paragraph('Приложение А: Полная таблица управления рисками', self.styles['Heading1']))

        if self.risks:
            table_data = [['№', 'Этап жизненного цикла', 'Категория опасности', 'Наименование опасности',
                          'Последовательность событий', 'Вред', 'Начальная тяжесть (S)', 'Начальная вероятность (P)',
                          'Начальный риск (S×P)', 'Меры контроля', 'Метод верификации',
                          'Остаточная тяжесть (S)', 'Остаточная вероятность (P)', 'Остаточный риск (S×P)']]

            for idx, risk in enumerate(self.risks, 1):
                data = risk.get('data', {})
                row_data = [
                    str(idx),
                    risk.get('table_name', data.get('lifecycle_stage', '')),
                    data.get('hazard', ''),
                    data.get('hazardous_situation', ''),
                    data.get('sequence_of_events', ''),
                    data.get('harm', ''),
                    str(data.get('severity_initial', '')),
                    str(data.get('probability_initial', '')),
                ]

                try:
                    s_init = int(data.get('severity_initial', 0))
                    p_init = int(data.get('probability_initial', 0))
                    row_data.append(str(s_init * p_init))
                except:
                    row_data.append('')

                row_data.extend([
                    data.get('control_measures', ''),
                    data.get('verification', ''),
                    str(data.get('severity_residual', '')),
                    str(data.get('probability_residual', '')),
                ])

                try:
                    s_res = int(data.get('severity_residual', 0))
                    p_res = int(data.get('probability_residual', 0))
                    row_data.append(str(s_res * p_res))
                except:
                    row_data.append('')

                table_data.append(row_data)

            table = Table(table_data)
            table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, 0), 6),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
                ('GRID', (0, 0), (-1, -1), 1, colors.black),
            ]))
            story.append(table)
        else:
            story.append(Paragraph('[PLACEHOLDER: No risk data for appendix]', self.styles['Normal']))

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

