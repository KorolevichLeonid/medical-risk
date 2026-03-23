"""
Service for generating Risk Management Report DOCX documents
"""
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_PARAGRAPH_ALIGNMENT
from docx.enum.section import WD_ORIENT
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from io import BytesIO
from datetime import datetime
from typing import Dict, List, Optional
import json
import re
import os
import importlib
from reportlab.lib.pagesizes import letter, A4, landscape
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_JUSTIFY
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

try:
    _font_manager_module = importlib.import_module("app.services.font_manager")
except Exception:
    _font_manager_module = None

if _font_manager_module:
    font_manager = getattr(_font_manager_module, "font_manager", None)
    initialize_fonts = getattr(_font_manager_module, "initialize_fonts", lambda: False)
    get_cyrillic_font = getattr(_font_manager_module, "get_cyrillic_font", lambda: None)
    get_font_for_style = getattr(
        _font_manager_module,
        "get_font_for_style",
        lambda font_name, bold=False: font_name,
    )
else:
    font_manager = None

    def initialize_fonts():
        return False

    def get_cyrillic_font():
        return None

    def get_font_for_style(font_name: str, bold: bool = False):
        return font_name

from html2docx import html2docx


LIFECYCLE_STAGE_LABELS = {
    'design_development': 'Проектирование и разработка',
    'procurement': 'Закупка и входной контроль компонентов и материалов',
    'production': 'Производство и сборка',
    'packaging': 'Упаковка и маркировка',
    'installation': 'Монтаж',
    'sterilization': 'Стерилизация',
    'testing': 'Испытания и выпуск продукции',
    'storage': 'Хранение',
    'transportation': 'Транспортировка и дистрибуция',
    'commissioning': 'Установка и ввод в эксплуатацию',
    'operation': 'Эксплуатация',
    'maintenance': 'Техническое обслуживание и сервис',
    'decommissioning': 'Демонтаж и вывод из эксплуатации',
    'disposal': 'Утилизация и уничтожение изделия или его компонентов',
    'other': 'Другие',
}


def _resolve_pdf_cyrillic_fonts() -> tuple[Optional[str], Optional[str]]:
    """Find regular/bold TTF fonts with Cyrillic support for xhtml2pdf."""
    env_font = os.getenv("REPORT_FONT_PATH")
    env_bold = os.getenv("REPORT_FONT_BOLD_PATH")

    regular_candidates = [
        env_font,
        r"C:\Windows\Fonts\arial.ttf",
        r"C:\Windows\Fonts\calibri.ttf",
        r"C:\Windows\Fonts\times.ttf",
        r"C:\Windows\Fonts\tahoma.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "/usr/share/fonts/truetype/noto/NotoSans-Regular.ttf",
        "/Library/Fonts/Arial Unicode.ttf",
    ]
    bold_candidates = [
        env_bold,
        r"C:\Windows\Fonts\arialbd.ttf",
        r"C:\Windows\Fonts\calibrib.ttf",
        r"C:\Windows\Fonts\timesbd.ttf",
        r"C:\Windows\Fonts\tahomabd.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        "/usr/share/fonts/truetype/noto/NotoSans-Bold.ttf",
        "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
    ]

    regular = next((os.path.abspath(p) for p in regular_candidates if p and os.path.isfile(os.path.abspath(p))), None)
    bold = next((os.path.abspath(p) for p in bold_candidates if p and os.path.isfile(os.path.abspath(p))), None)

    if not regular:
        return None, None
    if not bold:
        bold = regular
    return regular, bold


def _to_file_uri(path: str) -> str:
    # Use normalized absolute filesystem path (without file:///)
    # to avoid xhtml2pdf temp-font handling issues on Windows.
    return os.path.abspath(path).replace("\\", "/")


def _prepare_html_for_xhtml2pdf(html_content: str) -> str:
    """Inject embedded font CSS so xhtml2pdf renders Cyrillic reliably."""
    regular_font, bold_font = _resolve_pdf_cyrillic_fonts()
    if not regular_font:
        return html_content

    injected_css = f"""
<style>
    @font-face {{
        font-family: 'ReportCyrillic';
        src: url('{_to_file_uri(regular_font)}');
    }}
    @font-face {{
        font-family: 'ReportCyrillic';
        src: url('{_to_file_uri(bold_font)}');
        font-weight: bold;
    }}
    html, body, p, div, span, td, th, li, strong, b, h1, h2, h3, h4, h5, h6 {{
        font-family: 'ReportCyrillic' !important;
    }}
</style>
"""

    if "</head>" in html_content:
        return html_content.replace("</head>", f"{injected_css}</head>", 1)
    return f"<head>{injected_css}</head>{html_content}"


def _pisa_link_callback(uri: str, rel: str) -> str:
    """Resolve local font/image URIs for xhtml2pdf."""
    if uri.startswith("file:///"):
        return uri.replace("file:///", "", 1)
    if os.path.isabs(uri) and os.path.exists(uri):
        return uri
    return uri


def _format_lifecycle_stage_label(value):
    if value is None:
        return ''
    text = str(value).strip()
    if not text:
        return ''
    prefix = 'Управление рисками - '
    if text.startswith(prefix):
        text = text.replace(prefix, '', 1).strip()
    return LIFECYCLE_STAGE_LABELS.get(text, text)


def _to_int_or_none(value):
    if value is None:
        return None
    value_str = str(value).strip()
    if value_str == '':
        return None
    try:
        return int(value_str)
    except ValueError:
        try:
            return int(float(value_str))
        except (ValueError, TypeError):
            return None


def _flatten_risk_rows(risk_data: list) -> list:
    """Flatten risk rows into the same shape used by HTML preview."""
    flattened = []
    for risk in risk_data or []:
        if not isinstance(risk, dict):
            continue
        data = risk.get('data', {})
        row = data.copy() if isinstance(data, dict) else {}
        row['table_name'] = risk.get('table_name', '')
        # Keep backward-compatible structure for legacy generators
        row['data'] = data.copy() if isinstance(data, dict) else {}
        flattened.append(row)
    return flattened


def build_dynamic_conclusion_lines(risks: list, risk_threshold: int, device_name: str) -> dict:
    """Build dynamic lines for section 9 conclusions based on risk evaluation completeness/acceptability."""
    total_risks = len(risks) if risks else 0

    evaluated_initial = 0
    acceptable_initial = 0
    unacceptable_initial = 0

    evaluated_residual = 0
    unacceptable_residual = 0

    for raw_risk in risks or []:
        data = raw_risk.get('data') if isinstance(raw_risk, dict) else None
        risk = data if isinstance(data, dict) else (raw_risk if isinstance(raw_risk, dict) else {})

        s_init = _to_int_or_none(risk.get('severity_score', risk.get('severity_initial')))
        p_init = _to_int_or_none(risk.get('probability_score', risk.get('probability_initial')))
        if s_init is not None and p_init is not None and s_init > 0 and p_init > 0:
            evaluated_initial += 1
            initial_score = s_init * p_init
            if initial_score < risk_threshold:
                acceptable_initial += 1
            else:
                unacceptable_initial += 1

        s_res = _to_int_or_none(risk.get('residual_risk_level', risk.get('severity_residual')))
        p_res = _to_int_or_none(risk.get('residual_probability', risk.get('probability_residual')))
        if s_res is not None and p_res is not None and s_res > 0 and p_res > 0:
            evaluated_residual += 1
            residual_score = s_res * p_res
            if residual_score >= risk_threshold:
                unacceptable_residual += 1

    open_risks = max(total_risks - evaluated_residual, 0)

    if total_risks == 0:
        reviewed_line = 'Идентифицированные риски отсутствуют; оценка рисков в таблицах не требуется.'
    elif evaluated_initial == total_risks:
        reviewed_line = 'Все идентифицированные риски были рассмотрены и оценены в соответствии с требованиями ISO 14971:2019.'
    elif evaluated_initial == 0:
        reviewed_line = 'Идентифицированные риски не были оценены в таблице анализа рисков.'
    else:
        reviewed_line = f'Идентифицированные риски рассмотрены частично: оценено {evaluated_initial} из {total_risks}.'

    risk_count_line = (
        f'Идентифицировано рисков – {total_risks}; '
        f'из них приемлемых - {acceptable_initial}; '
        f'неприемлемых - {unacceptable_initial}.'
    )

    if total_risks == 0:
        controls_line = 'Меры контроля риска не требуются, так как идентифицированные риски отсутствуют.'
    elif evaluated_initial < total_risks:
        controls_line = 'Эффективность мер контроля риска не подтверждена для всех рисков, так как часть рисков не оценена.'
    elif unacceptable_initial == 0:
        controls_line = 'Все меры контроля риска внедрены, проверены и признаны эффективными.'
    else:
        controls_line = 'Не все меры контроля риска признаны эффективными, так как остаются неприемлемые риски.'

    if total_risks == 0:
        residual_line = 'Остаточные риски отсутствуют.'
    elif evaluated_residual < total_risks:
        residual_line = (
            f'Не все остаточные риски оценены: оценено {evaluated_residual} из {total_risks}; '
            f'не закрытых рисков - {open_risks}.'
        )
    elif unacceptable_residual == 0:
        residual_line = 'Все остаточные риски находятся на приемлемом уровне или в зоне ALARP.'
    else:
        residual_line = (
            f'Не все остаточные риски находятся на приемлемом уровне: '
            f'неприемлемых остаточных рисков - {unacceptable_residual}.'
        )

    overall_risk_acceptable = total_risks == 0 or (open_risks == 0 and unacceptable_residual == 0)
    if overall_risk_acceptable:
        overall_line = 'Совокупный остаточный риск признан приемлемым в контексте назначения изделия и ожидаемой пользы.'
        conclusion_main_line = (
            f'На момент утверждения данного отчёта совокупный остаточный риск изделия {device_name} '
            'считается приемлемым.'
        )
        conclusion_process_line = 'Процесс управления рисками реализован в полном соответствии с ISO 14971:2019.'
    else:
        overall_line = 'Совокупный остаточный риск не может быть признан приемлемым до закрытия всех открытых и/или неприемлемых рисков.'
        reasons = []
        if open_risks > 0:
            reasons.append(f'не закрытые риски: {open_risks}')
        if unacceptable_residual > 0:
            reasons.append(f'неприемлемые остаточные риски: {unacceptable_residual}')
        if not reasons and unacceptable_initial > 0:
            reasons.append(f'неприемлемые оцененные риски: {unacceptable_initial}')
        reason_text = '; '.join(reasons) if reasons else 'требуются дополнительные мероприятия по управлению рисками'
        conclusion_main_line = (
            f'На момент утверждения данного отчёта изделие {device_name} не может быть допущено к реализации, '
            f'поскольку выявлены {reason_text}.'
        )
        conclusion_process_line = 'Процесс управления рисками не завершён: требуется закрытие и повторная оценка всех проблемных рисков.'

    return {
        'reviewed_line': reviewed_line,
        'risk_count_line': risk_count_line,
        'controls_line': controls_line,
        'residual_line': residual_line,
        'overall_line': overall_line,
        'conclusion_main_line': conclusion_main_line,
        'conclusion_process_line': conclusion_process_line,
    }


def format_role_display_name(role: str) -> str:
    """
    Convert role code to display name in uppercase format
    Used in documents to display roles consistently
    """
    role_mapping = {
        'admin': 'АДМИНИСТРАТОР',
        'manager': 'МЕНЕДЖЕР',
        'specialist': 'СПЕЦИАЛИСТ'
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
        # Flatten risk data to match HTML preview format
        self.risks = _flatten_risk_rows(risk_data)
        self.table_data = table_data
        self.team = team_members
        self.doc = Document()
        
    def generate(self) -> BytesIO:
        """Generate the complete document and return as BytesIO"""
        try:
            html_content = self._generate_html_content()
            print("DEBUG: Converting HTML preview to DOCX")
            return self._generate_docx_from_html(html_content)
        except Exception as e:
            print(f"DEBUG: HTML->DOCX failed, falling back to legacy generator: {e}")
            return self._generate_docx_legacy()

    def _generate_html_content(self) -> str:
        """Generate HTML content identical to the preview"""
        # Import the HTML generation function from documents.py
        from ..routers.documents import generate_html_preview

        # Create a mock project object that behaves like a SQLAlchemy model
        class MockProject:
            def __init__(self, data):
                for key, value in data.items():
                    setattr(self, key, value)

        # Create a mock doc_version object
        class MockDocVersion:
            def __init__(self, project_data):
                self.created_at = datetime.now()
                self.report_number = project_data.get('report_number', 'RMR-2025-01')
                self.version = project_data.get('version', '1.0')
                # Store reference to project data for attribute access
                self._project_data = project_data

        mock_project = MockProject(self.project)
        mock_doc_version = MockDocVersion(self.project)

        return generate_html_preview(mock_project, mock_doc_version, self.risks, self.team)

    def _generate_docx_from_html(self, html_content: str) -> BytesIO:
        """Generate DOCX from HTML preview content."""
        body_match = re.search(r"<body[^>]*>(?P<body>.*)</body>", html_content, re.IGNORECASE | re.DOTALL)
        if body_match:
            html_content = f"<html><body>{body_match.group('body')}</body></html>"

        file_stream = html2docx(html_content, "Отчёт по управлению рисками")
        file_bytes = file_stream.getvalue()
        if not file_bytes:
            raise ValueError("HTML to DOCX conversion returned empty data")

        doc = Document(BytesIO(file_bytes))
        table_count = html_content.lower().count("<table")
        if table_count and len(doc.tables) < table_count:
            raise ValueError("HTML conversion produced incomplete tables")
        if not self._doc_has_content(doc):
            raise ValueError("HTML to DOCX conversion produced empty document")

        output_stream = BytesIO()
        doc.save(output_stream)
        output_stream.seek(0)
        return output_stream

    def _doc_has_content(self, doc: Document) -> bool:
        """Check if a docx Document has any meaningful content."""
        if doc.tables:
            return True
        for paragraph in doc.paragraphs:
            if paragraph.text and paragraph.text.strip():
                return True
        return False

    def _apply_docx_landscape(self, doc: Document):
        """Force DOCX to use landscape orientation with compact margins."""
        try:
            style = doc.styles['Normal']
            style.font.name = 'Calibri'
            style.font.size = Pt(8)
        except Exception:
            pass
        for section in doc.sections:
            section.orientation = WD_ORIENT.LANDSCAPE
            section.page_width, section.page_height = section.page_height, section.page_width
            section.top_margin = Inches(0.5)
            section.bottom_margin = Inches(0.5)
            section.left_margin = Inches(0.5)
            section.right_margin = Inches(0.5)

    def _generate_docx_legacy(self) -> BytesIO:
        """Legacy DOCX generation method (kept as fallback)."""
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
            file_stream = BytesIO()
            self.doc.save(file_stream)
            file_stream.seek(0)
            print("DEBUG: Document generation completed successfully (legacy)")
            return file_stream
        except Exception as e:
            print(f"DEBUG: Error in legacy document generation: {e}")
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

        # Set compact margins + landscape orientation
        sections = self.doc.sections
        for section in sections:
            section.top_margin = Inches(0.5)
            section.bottom_margin = Inches(0.5)
            section.left_margin = Inches(0.5)
            section.right_margin = Inches(0.5)
            section.orientation = WD_ORIENT.LANDSCAPE
            section.page_width, section.page_height = section.page_height, section.page_width
    
    def _add_title_page(self):
        """Add title page - Section 1"""
        # Title - smaller for compact layout
        title = self.doc.add_paragraph()
        title.alignment = WD_PARAGRAPH_ALIGNMENT.CENTER
        run = title.add_run("ОТЧЁТ ПО УПРАВЛЕНИЮ РИСКАМИ")
        run.bold = True
        run.font.size = Pt(12)
        self.doc.add_paragraph()

        # Device information
        device_name = self._get_field_value(self.project.get('device_name'))
        device_model = self._get_field_value(self.project.get('device_model'))

        info_items = [
            ('Медицинское изделие:', device_name),
            ('Модель:', device_model),
            ('Номер отчёта:', self._get_field_value(self.project.get('report_number'), 'RMR-2025-01')),
            ('Редакция:', self._get_field_value(self.project.get('version'), '1.0')),
            ('Дата:', datetime.now().strftime('%d %B %Y')),
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
            ('4', 'ИДЕНТИФИКАЦИЯ ОПАСНОСТЕЙ', '4'),
            ('5', 'АНАЛИЗ РИСКОВ (ДО ПРИМЕНЕНИЯ МЕР КОНТРОЛЯ)', '5'),
            ('6', 'МЕРЫ УПРАВЛЕНИЯ РИСКАМИ', '6'),
            ('7', 'ОЦЕНКА ОСТАТОЧНОГО РИСКА', '7'),
            ('8', 'ОЦЕНКА ПРИЕМЛЕМОСТИ СОВОКУПНОГО ОСТАТОЧНОГО РИСКА', '8'),
            ('9', 'ВЫВОДЫ И УТВЕРЖДЕНИЕ', '9'),
            ('10', 'ССЫЛКИ И УПРАВЛЕНИЕ ДОКУМЕНТОМ', '10'),
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
        header_cells[0].text = 'Поле'
        header_cells[1].text = 'Значение'
        
        fields_data = [
            ('Наименование изделия', self._get_field_value(self.project.get('device_name'), '[PLACEHOLDER: Device Name]')),
            ('Модель / Тип', self._get_field_value(self.project.get('device_model'), '[PLACEHOLDER: Model]')),
            ('Класс риска', self._get_field_value(self.project.get('device_classification'))),
            ('Условия эксплуатации', self._get_field_value(self.project.get('operating_environment'))),
            ('Применяемые стандарты и регламенты', self._get_field_value(self.project.get('standards'))),
            ('Периодичность пересмотра', 'По мере обновления проекта, существенных изменений изделия или поступления новой информации.'),
        ]
        
        for field, value in fields_data:
            row_cells = table.add_row().cells
            row_cells[0].text = field
            row_cells[1].text = value
        
        self.doc.add_paragraph()

        intended_table = self.doc.add_table(rows=1, cols=2)
        intended_table.style = 'Light Grid Accent 1'
        intended_table.rows[0].cells[0].text = 'Назначение / разумно прогнозируемое неправильное применение'
        intended_table.rows[0].cells[1].text = ''

        intended_use_value = self.project.get('intended_use') or self.project.get('device_purpose')
        intended_rows = [
            ('Назначение', self._get_field_value(intended_use_value)),
            ('Медицинские показания', self._get_field_value(self.project.get('indications'))),
            ('Целевая группа пациентов', self._get_field_value(self.project.get('target_group'))),
            ('Предполагаемые пользователи', self._get_field_value(self.project.get('user_profile'))),
            ('Среда применения', self._get_field_value(self.project.get('operating_environment'))),
            ('Противопоказания', self._get_field_value(self.project.get('contraindications'))),
            ('Ограничения', self._get_field_value(self.project.get('regulatory_requirements'))),
        ]
        for field, value in intended_rows:
            row_cells = intended_table.add_row().cells
            row_cells[0].text = field
            row_cells[1].text = value

        self.doc.add_paragraph()

        misuse_table = self.doc.add_table(rows=2, cols=6)
        misuse_table.style = 'Light Grid Accent 1'
        misuse_headers = ['ID', 'Сценарий misuse', 'Причина / механизм', 'Потенциальный вред', 'Этап ЖЦ', 'Комментарий']
        for i, header in enumerate(misuse_headers):
            misuse_table.rows[0].cells[i].text = header
        misuse_table.rows[1].cells[0].text = 'Список misuse пока не заполнен.'

        self.doc.add_paragraph()
        self.doc.add_paragraph('Утилизация', style='Heading 3')
        self.doc.add_paragraph(self._get_field_value(self.project.get('disposal')))
        self.doc.add_paragraph('')
        self.doc.add_paragraph('Предупреждения', style='Heading 3')
        self.doc.add_paragraph(self._get_field_value(self.project.get('warnings')))

        self.doc.add_paragraph()
        
        # Lifecycle stages
        self.doc.add_paragraph('Этапы жизненного цикла:', style='Heading 3')
        lifecycle_stages = self._parse_json_field(self.project.get('lifecycle_stages', '[]'))
        if lifecycle_stages and isinstance(lifecycle_stages, list):
            for stage in lifecycle_stages:
                self.doc.add_paragraph(f'• {_format_lifecycle_stage_label(stage)}', style='List Bullet')
        else:
            self.doc.add_paragraph('[PLACEHOLDER: Lifecycle Stages]', style='List Bullet')

        # Hazard categories from hazard_questions
        self.doc.add_paragraph('Идентифицированные категории опасностей:', style='Heading 3')
        hazard_categories = self._parse_hazard_categories_from_questions(self.project.get('hazard_questions', '{}'))
        if hazard_categories:
            for category in hazard_categories:
                self.doc.add_paragraph(f'• {category}', style='List Bullet')
        else:
            self.doc.add_paragraph('[PLACEHOLDER: Hazard Categories]', style='List Bullet')
        
        self.doc.add_page_break()
    
    def _add_hazard_identification(self):
        """Add hazard identification section - Section 4"""
        self.doc.add_heading('4. ИДЕНТИФИКАЦИЯ ОПАСНОСТЕЙ', level=1)
        
        self.doc.add_heading('4.1 Цель раздела', level=2)
        self.doc.add_paragraph(
            'Определить все разумно предсказуемые опасности, возникающие на этапах жизненного цикла '
            'изделия - от проектирования и производства до эксплуатации, очистки, транспортировки, утилизации.'
        )
        
        from types import SimpleNamespace
        from ..routers.documents import build_checklist_411_sections

        self.doc.add_heading('4.1.1 Ответы на вопросы чек-листа', level=3)
        lifecycle_rows, hazard_rows = build_checklist_411_sections(SimpleNamespace(**self.project))

        def add_checklist_table(title, rows):
            self.doc.add_heading(title, level=4)
            if not rows:
                self.doc.add_paragraph('не заполнено')
                return
            table = self.doc.add_table(rows=1, cols=3)
            table.style = 'Light Grid Accent 1'
            table.rows[0].cells[0].text = 'Группа'
            table.rows[0].cells[1].text = 'Пункт'
            table.rows[0].cells[2].text = 'Ответ'
            for row_data in rows:
                row = table.add_row().cells
                row[0].text = str(row_data.get('group', ''))
                row[1].text = str(row_data.get('item', ''))
                row[2].text = str(row_data.get('answer', 'Нет'))
            self.doc.add_paragraph()

        add_checklist_table('Этапы жизненного цикла', lifecycle_rows)
        add_checklist_table('Опасности проекта', hazard_rows)

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
                row = table.add_row().cells
                row[0].text = str(idx)
                # Show sheet name where risk is located (without "Управление рисками -" prefix)
                table_name = risk.get('table_name', '')
                table_name = _format_lifecycle_stage_label(table_name)
                row[1].text = table_name
                # Category of hazard
                row[2].text = risk.get('hazard_category', '')
                # Name of hazard
                row[3].text = risk.get('hazard_name', '')
                # Sequence of events
                row[4].text = risk.get('event_sequence', '')
                # Harm
                row[5].text = risk.get('harm', '')
        else:
            self.doc.add_paragraph('Нет идентифицированных опасностей')
        
        self.doc.add_heading('4.3 Резюме раздела', level=2)
        hazard_count = len(self.risks)
        categories_text = ', '.join(self._parse_json_field(self.project.get('active_hazard_categories', '[]'))) or 'не заполнено'
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

        self.doc.add_heading('5. АНАЛИЗ РИСКОВ (ДО ПРИМЕНЕНИЯ МЕР КОНТРОЛЯ)', level=1)
        
        self.doc.add_heading('5.1 Методология оценки', level=2)
        self.doc.add_paragraph(
            'Для анализа рисков используется качественно-количественная методика, где:'
        )
        
        # Severity table - use project-defined levels or fallback to defaults
        self.doc.add_paragraph('Тяжесть вреда (S):', style='Heading 3')
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
        self.doc.add_paragraph('Вероятность возникновения (P):', style='Heading 3')
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
            
            headers = ['№', 'Опасность', 'Тяжесть (S)', 'Вероятность (P)', 'Оценка риска (S×P)']
            header_cells = table.rows[0].cells
            for i, header in enumerate(headers):
                header_cells[i].text = header
            
            acceptable_count = 0
            unacceptable_count = 0
            
            for idx, risk in enumerate(self.risks, 1):
                row = table.add_row().cells
                row[0].text = str(idx)
                row[1].text = risk.get('hazard', '')

                severity = risk.get('severity_initial', 'не заполнено')
                probability = risk.get('probability_initial', 'не заполнено')

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
                    row[4].text = 'не заполнено'
        else:
            self.doc.add_paragraph('Нет данных по рискам')
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

        self.doc.add_heading('6. МЕРЫ УПРАВЛЕНИЯ РИСКАМИ', level=1)

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
                    _format_lifecycle_stage_label(risk.get('table_name', data.get('lifecycle_stage', ''))),
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
            self.doc.add_paragraph('Нет данных по мерам управления рисками')
        
        self.doc.add_page_break()
    
    def _add_residual_risk_evaluation(self):
        """Add residual risk evaluation section - Section 7"""
        # Set landscape orientation for this section
        current_section = self.doc.sections[-1]
        current_section.orientation = 1  # 1 = landscape, 0 = portrait
        current_section.page_width, current_section.page_height = current_section.page_height, current_section.page_width

        self.doc.add_heading('7. ОЦЕНКА ОСТАТОЧНОГО РИСКА', level=1)

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
                table_name = _format_lifecycle_stage_label(risk.get('table_name', data.get('lifecycle_stage', '')))

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
            self.doc.add_paragraph('Нет данных по остаточным рискам')
            acceptable_residual = 0
            unacceptable_residual = 0
        
      
        self.doc.add_page_break()
    
    def _add_overall_risk_acceptability(self):
        """Add overall risk acceptability section - Section 8"""
        self.doc.add_heading('8. ОЦЕНКА ПРИЕМЛЕМОСТИ СОВОКУПНОГО ОСТАТОЧНОГО РИСКА', level=1)
        
        self.doc.add_heading('8.1 Цель раздела', level=2)
        self.doc.add_paragraph(
            'Определить, является ли совокупный остаточный риск медицинского изделия приемлемым, '
            'учитывая все идентифицированные индивидуальные риски, их взаимное влияние и соотношение '
            'польза/риск, как требует ISO 14971:2019, п. 8.3.'
        )
        
        self.doc.add_heading('8.3 Оценка соотношения польза/риск', level=2)
        self.doc.add_paragraph('Оценка соотношения польза/риск выполняется при наличии неприемлемых остаточных рисков.')
        
        self.doc.add_page_break()
    
    def _add_conclusions(self):
        """Add conclusions section - Section 9"""
        self.doc.add_heading('9. ВЫВОДЫ И УТВЕРЖДЕНИЕ', level=1)
        
        self.doc.add_heading('9.1 Общие выводы', level=2)
        
        risk_threshold = self.project.get('risk_threshold', 10)
        device_name = self.project.get('device_name', 'не заполнено')
        dynamic = build_dynamic_conclusion_lines(self.risks, risk_threshold, device_name)

        conclusions = [
            'На основании проведённого процесса идентификации опасностей, анализа, оценки и управления рисками, подтверждено, что:',
            '',
            f'• {dynamic["reviewed_line"]}',
            f'• {dynamic["risk_count_line"]}',
            f'• {dynamic["controls_line"]}',
            f'• {dynamic["residual_line"]}',
            f'• {dynamic["overall_line"]}',
            '• Документация по управлению рисками является полной, прослеживаемой и согласована с системой менеджмента качества, соответствующей ISO 13485:2016;',
            '• Постпроизводственная информация (PMS, жалобы, CAPA) будет регулярно анализироваться для пересмотра оценки рисков.'
        ]
        
        for conclusion in conclusions:
            self.doc.add_paragraph(conclusion)
        
        self.doc.add_heading('9.2 Заключение', level=2)
        self.doc.add_paragraph(dynamic['conclusion_main_line'])
        self.doc.add_paragraph(dynamic['conclusion_process_line'])
        
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
                row[0].text = 'не заполнено'
                row[1].text = 'не заполнено'
                row[2].text = ''
                row[3].text = datetime.now().strftime('%d.%m.%Y')
        
        self.doc.add_page_break()
    
    def _add_references(self):
        """Add references section - Section 10"""
        self.doc.add_heading('10. ССЫЛКИ И УПРАВЛЕНИЕ ДОКУМЕНТОМ', level=1)
        
        self.doc.add_heading('10.1 Ссылки и нормативные документы', level=2)
        
        # References table
        table = self.doc.add_table(rows=1, cols=3)
        table.style = 'Light Grid Accent 1'
        
        headers = ['№', 'Документ / Стандарт', 'Наименование']
        header_cells = table.rows[0].cells
        for i, header in enumerate(headers):
            header_cells[i].text = header
        
        references = [
            ('1', 'ISO 14971:2019', 'Медицинские изделия — Применение менеджмента риска к медицинским изделиям'),
            ('2', 'ISO 13485:2016', 'Системы менеджмента качества — Требования для целей регулирования'),
            ('3', 'MDR 2017/745', 'Регламент (ЕС) 2017/745 о медицинских изделиях'),
            ('4', 'ISO 10993-1:2020', 'Биологическая оценка медицинских изделий — Часть 1'),
            ('5', 'ISO 17664:2017', 'Обработка продукции для здравоохранения — Информация, предоставляемая производителем'),
            ('6', 'Company SOP QMS-RM-001', 'Процедура управления рисками'),
            ('7', 'IFU-CP-01', 'Инструкция по применению'),
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
            ('Название документа', f'Отчёт по управлению рисками — {device_name}'),
            ('Номер документа', self.project.get('report_number', 'RMR-2025-01')),
            ('Редакция', self.project.get('version', '1.0')),
            ('Статус', 'Утверждён'),
            ('Дата вступления в силу', datetime.now().strftime('%d.%m.%Y')),
            ('Местоположение контролируемой копии', 'Репозиторий СМК / Папка: "Управление рисками"'),
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
            self.doc.add_paragraph('Нет данных по рискам для приложения')
    
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

    def _parse_hazard_categories_from_questions(self, hazard_questions):
        """Extract hazard categories from hazard_questions structure (PDF generator)."""
        if not hazard_questions:
            return []

        try:
            if isinstance(hazard_questions, str):
                parsed = json.loads(hazard_questions)
            else:
                parsed = hazard_questions

            hazard_categories = []
            if isinstance(parsed, dict):
                category_mapping = {
                    'active': 'Электрическая энергия',
                    'sterile': 'Биологическая опасность',
                    'disposable': 'Биологическая опасность',
                    'software': 'Программное обеспечение',
                    'implantable': 'Биологическая опасность',
                    'bodyContact': 'Биологическая опасность',
                    'materialContact': 'Биологическая опасность',
                    'implantableDevice': 'Биологическая опасность',
                    'substanceRelease': 'Биологическая опасность',
                    'sensitization': 'Биологическая опасность',
                    'containsSoftware': 'Программное обеспечение',
                    'dataExchange': 'Программное обеспечение',
                    'wireless': 'Электрическая энергия',
                    'personalData': 'Программное обеспечение',
                    'userInterface': 'Программное обеспечение',
                    'activeDevice': 'Электрическая энергия',
                    'powerConnection': 'Электрическая энергия',
                    'electricalContacts': 'Электрическая энергия',
                    'movingElements': 'Механическая энергия',
                    'movingRisk': 'Механическая энергия',
                    'emitsEnergy': 'Электрическая энергия',
                    'opticalSystems': 'Электрическая энергия',
                    'specialTraining': 'Программное обеспечение',
                    'specialNeeds': 'Программное обеспечение',
                    'interfaceError': 'Программное обеспечение',
                    'alarms': 'Программное обеспечение',
                    'isSterile': 'Биологическая опасность',
                    'reusable': 'Биологическая опасность',
                    'biologicalContact': 'Биологическая опасность',
                    'chemicalSubstances': 'Химическая опасность',
                    'chemicalRelease': 'Химическая опасность',
                    'chemicalSterilization': 'Химическая опасность',
                    'animalMaterials': 'Биологическая опасность',
                    'nanomaterials': 'Биологическая опасность',
                    'pharmaceutical': 'Биологическая опасность',
                    'environmentalSensitivity': 'Окружающая среда',
                    'environmentalImpact': 'Окружающая среда',
                    'mechanicalLoad': 'Механическая энергия',
                    'destructionRisk': 'Механическая энергия',
                    'heating': 'Тепловая энергия',
                    'surfaceContact': 'Тепловая энергия',
                    'reliability': 'Программное обеспечение',
                    'clinicalUse': 'Программное обеспечение',
                    'clinicalError': 'Программное обеспечение',
                    'clinicalValidation': 'Программное обеспечение'
                }
                for question_key, is_active in parsed.items():
                    if is_active and question_key in category_mapping:
                        category = category_mapping[question_key]
                        if category not in hazard_categories:
                            hazard_categories.append(category)
            elif isinstance(parsed, list):
                hazard_categories = [str(item) for item in parsed if item]
            else:
                hazard_categories = []
        except (json.JSONDecodeError, TypeError, AttributeError) as e:
            print(f"DEBUG: Error parsing hazard_categories from hazard_questions (PDF): {e}")
            hazard_categories = []

        return hazard_categories

    def _parse_hazard_categories_from_questions(self, hazard_questions):
        """Extract hazard categories from hazard_questions structure."""
        if not hazard_questions:
            return []

        try:
            if isinstance(hazard_questions, str):
                parsed = json.loads(hazard_questions)
            else:
                parsed = hazard_questions

            hazard_categories = []
            if isinstance(parsed, dict):
                category_mapping = {
                    'active': 'Электрическая энергия',
                    'sterile': 'Биологическая опасность',
                    'disposable': 'Биологическая опасность',
                    'software': 'Программное обеспечение',
                    'implantable': 'Биологическая опасность',
                    'bodyContact': 'Биологическая опасность',
                    'materialContact': 'Биологическая опасность',
                    'implantableDevice': 'Биологическая опасность',
                    'substanceRelease': 'Биологическая опасность',
                    'sensitization': 'Биологическая опасность',
                    'containsSoftware': 'Программное обеспечение',
                    'dataExchange': 'Программное обеспечение',
                    'wireless': 'Электрическая энергия',
                    'personalData': 'Программное обеспечение',
                    'userInterface': 'Программное обеспечение',
                    'activeDevice': 'Электрическая энергия',
                    'powerConnection': 'Электрическая энергия',
                    'electricalContacts': 'Электрическая энергия',
                    'movingElements': 'Механическая энергия',
                    'movingRisk': 'Механическая энергия',
                    'emitsEnergy': 'Электрическая энергия',
                    'opticalSystems': 'Электрическая энергия',
                    'specialTraining': 'Программное обеспечение',
                    'specialNeeds': 'Программное обеспечение',
                    'interfaceError': 'Программное обеспечение',
                    'alarms': 'Программное обеспечение',
                    'isSterile': 'Биологическая опасность',
                    'reusable': 'Биологическая опасность',
                    'biologicalContact': 'Биологическая опасность',
                    'chemicalSubstances': 'Химическая опасность',
                    'chemicalRelease': 'Химическая опасность',
                    'chemicalSterilization': 'Химическая опасность',
                    'animalMaterials': 'Биологическая опасность',
                    'nanomaterials': 'Биологическая опасность',
                    'pharmaceutical': 'Биологическая опасность',
                    'environmentalSensitivity': 'Окружающая среда',
                    'environmentalImpact': 'Окружающая среда',
                    'mechanicalLoad': 'Механическая энергия',
                    'destructionRisk': 'Механическая энергия',
                    'heating': 'Тепловая энергия',
                    'surfaceContact': 'Тепловая энергия',
                    'reliability': 'Программное обеспечение',
                    'clinicalUse': 'Программное обеспечение',
                    'clinicalError': 'Программное обеспечение',
                    'clinicalValidation': 'Программное обеспечение'
                }

                for question_key, is_active in parsed.items():
                    if is_active and question_key in category_mapping:
                        category = category_mapping[question_key]
                        if category not in hazard_categories:
                            hazard_categories.append(category)
            elif isinstance(parsed, list):
                hazard_categories = [str(item) for item in parsed if item]
            else:
                hazard_categories = []
        except (json.JSONDecodeError, TypeError, AttributeError) as e:
            print(f"DEBUG: Error parsing hazard_categories from hazard_questions (PDF): {e}")
            hazard_categories = []

        return hazard_categories

    def _parse_hazard_categories_from_questions(self, hazard_questions):
        """Extract hazard categories from hazard_questions structure"""
        if not hazard_questions:
            return []

        try:
            if isinstance(hazard_questions, str):
                parsed = json.loads(hazard_questions)
            else:
                parsed = hazard_questions
            
            # Extract hazard categories from the questions structure
            hazard_categories = []
            if isinstance(parsed, dict):
                # For the current structure where keys are question names and values are booleans
                # We need to map the boolean values to category names
                category_mapping = {
                    'active': 'Электрическая энергия',
                    'sterile': 'Биологическая опасность',
                    'disposable': 'Биологическая опасность',
                    'software': 'Программное обеспечение',
                    'implantable': 'Биологическая опасность',
                    'bodyContact': 'Биологическая опасность',
                    'materialContact': 'Биологическая опасность',
                    'implantableDevice': 'Биологическая опасность',
                    'substanceRelease': 'Биологическая опасность',
                    'sensitization': 'Биологическая опасность',
                    'containsSoftware': 'Программное обеспечение',
                    'dataExchange': 'Программное обеспечение',
                    'wireless': 'Электрическая энергия',
                    'personalData': 'Программное обеспечение',
                    'userInterface': 'Программное обеспечение',
                    'activeDevice': 'Электрическая энергия',
                    'powerConnection': 'Электрическая энергия',
                    'electricalContacts': 'Электрическая энергия',
                    'movingElements': 'Механическая энергия',
                    'movingRisk': 'Механическая энергия',
                    'emitsEnergy': 'Электрическая энергия',
                    'opticalSystems': 'Электрическая энергия',
                    'specialTraining': 'Программное обеспечение',
                    'specialNeeds': 'Программное обеспечение',
                    'interfaceError': 'Программное обеспечение',
                    'alarms': 'Программное обеспечение',
                    'isSterile': 'Биологическая опасность',
                    'reusable': 'Биологическая опасность',
                    'biologicalContact': 'Биологическая опасность',
                    'chemicalSubstances': 'Химическая опасность',
                    'chemicalRelease': 'Химическая опасность',
                    'chemicalSterilization': 'Химическая опасность',
                    'animalMaterials': 'Биологическая опасность',
                    'nanomaterials': 'Биологическая опасность',
                    'pharmaceutical': 'Биологическая опасность',
                    'environmentalSensitivity': 'Окружающая среда',
                    'environmentalImpact': 'Окружающая среда',
                    'mechanicalLoad': 'Механическая энергия',
                    'destructionRisk': 'Механическая энергия',
                    'heating': 'Тепловая энергия',
                    'surfaceContact': 'Тепловая энергия',
                    'reliability': 'Программное обеспечение',
                    'clinicalUse': 'Программное обеспечение',
                    'clinicalError': 'Программное обеспечение',
                    'clinicalValidation': 'Программное обеспечение'
                }
                
                # Add categories where the value is True
                for question_key, is_active in parsed.items():
                    if is_active and question_key in category_mapping:
                        category = category_mapping[question_key]
                        if category not in hazard_categories:
                            hazard_categories.append(category)
            elif isinstance(parsed, list):
                # Handle legacy format where it might be a list
                hazard_categories = [str(item) for item in parsed if item]
            else:
                hazard_categories = []
        except (json.JSONDecodeError, TypeError, AttributeError) as e:
            print(f"DEBUG: Error parsing hazard_categories from hazard_questions: {e}")
            hazard_categories = []
        
        return hazard_categories

    def _parse_hazard_categories_from_questions(self, hazard_questions):
        """Extract hazard categories from hazard_questions structure"""
        if not hazard_questions:
            return []

        try:
            if isinstance(hazard_questions, str):
                parsed = json.loads(hazard_questions)
            else:
                parsed = hazard_questions
            
            # Extract hazard categories from the questions structure
            hazard_categories = []
            if isinstance(parsed, dict):
                # For the current structure where keys are question names and values are booleans
                # We need to map the boolean values to category names
                category_mapping = {
                    'active': 'Электрическая энергия',
                    'sterile': 'Биологическая опасность',
                    'disposable': 'Биологическая опасность',
                    'software': 'Программное обеспечение',
                    'implantable': 'Биологическая опасность',
                    'bodyContact': 'Биологическая опасность',
                    'materialContact': 'Биологическая опасность',
                    'implantableDevice': 'Биологическая опасность',
                    'substanceRelease': 'Биологическая опасность',
                    'sensitization': 'Биологическая опасность',
                    'containsSoftware': 'Программное обеспечение',
                    'dataExchange': 'Программное обеспечение',
                    'wireless': 'Электрическая энергия',
                    'personalData': 'Программное обеспечение',
                    'userInterface': 'Программное обеспечение',
                    'activeDevice': 'Электрическая энергия',
                    'powerConnection': 'Электрическая энергия',
                    'electricalContacts': 'Электрическая энергия',
                    'movingElements': 'Механическая энергия',
                    'movingRisk': 'Механическая энергия',
                    'emitsEnergy': 'Электрическая энергия',
                    'opticalSystems': 'Электрическая энергия',
                    'specialTraining': 'Программное обеспечение',
                    'specialNeeds': 'Программное обеспечение',
                    'interfaceError': 'Программное обеспечение',
                    'alarms': 'Программное обеспечение',
                    'isSterile': 'Биологическая опасность',
                    'reusable': 'Биологическая опасность',
                    'biologicalContact': 'Биологическая опасность',
                    'chemicalSubstances': 'Химическая опасность',
                    'chemicalRelease': 'Химическая опасность',
                    'chemicalSterilization': 'Химическая опасность',
                    'animalMaterials': 'Биологическая опасность',
                    'nanomaterials': 'Биологическая опасность',
                    'pharmaceutical': 'Биологическая опасность',
                    'environmentalSensitivity': 'Окружающая среда',
                    'environmentalImpact': 'Окружающая среда',
                    'mechanicalLoad': 'Механическая энергия',
                    'destructionRisk': 'Механическая энергия',
                    'heating': 'Тепловая энергия',
                    'surfaceContact': 'Тепловая энергия',
                    'reliability': 'Программное обеспечение',
                    'clinicalUse': 'Программное обеспечение',
                    'clinicalError': 'Программное обеспечение',
                    'clinicalValidation': 'Программное обеспечение'
                }
                
                # Add categories where the value is True
                for question_key, is_active in parsed.items():
                    if is_active and question_key in category_mapping:
                        category = category_mapping[question_key]
                        if category not in hazard_categories:
                            hazard_categories.append(category)
            elif isinstance(parsed, list):
                # Handle legacy format where it might be a list
                hazard_categories = [str(item) for item in parsed if item]
            else:
                hazard_categories = []
        except (json.JSONDecodeError, TypeError, AttributeError) as e:
            print(f"DEBUG: Error parsing hazard_categories from hazard_questions: {e}")
            hazard_categories = []
        
        return hazard_categories


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
        self.risks = _flatten_risk_rows(risk_data)
        self.table_data = table_data
        self.team = team_members
        self.styles = getSampleStyleSheet()
        self.page_size = landscape(A4)
        self.page_width, self.page_height = self.page_size
        self.left_margin = 18
        self.right_margin = 18
        self.top_margin = 18
        self.bottom_margin = 18
        self.content_width = self.page_width - self.left_margin - self.right_margin
        self.font_name, self.font_name_bold = self._register_fonts()

        # Create custom styles - compact for landscape printing
        if 'CustomTitle' not in self.styles:
            self.styles.add(ParagraphStyle(
                name='CustomTitle',
                parent=self.styles['Title'],
                fontName=self.font_name_bold,
                fontSize=12,
                alignment=TA_CENTER,
                spaceAfter=15
            ))

        heading1 = self.styles['Heading1']
        heading1.fontName = self.font_name_bold
        heading1.fontSize = 11
        heading1.spaceAfter = 8
        heading1.alignment = TA_LEFT

        heading2 = self.styles['Heading2']
        heading2.fontName = self.font_name_bold
        heading2.fontSize = 10
        heading2.spaceAfter = 5
        heading2.alignment = TA_LEFT

        heading3 = self.styles['Heading3']
        heading3.fontName = self.font_name_bold
        heading3.fontSize = 9
        heading3.spaceAfter = 3
        heading3.alignment = TA_LEFT

        normal = self.styles['Normal']
        normal.fontName = self.font_name
        normal.fontSize = 8
        normal.alignment = TA_JUSTIFY
        normal.wordWrap = 'CJK'

    def generate(self) -> BytesIO:
        """Generate PDF from the same HTML preview used in UI/DOCX."""
        try:
            html_content = self._generate_html_content()
            print("DEBUG: Converting HTML preview to PDF")
            return self._generate_pdf_from_html(html_content)
        except Exception as e:
            print(f"DEBUG: HTML->PDF failed, falling back to legacy PDF generator: {e}")
            return self._generate_pdf_legacy()

    def _generate_html_content(self) -> str:
        """Generate HTML content identical to the preview."""
        from ..routers.documents import generate_html_preview

        class MockProject:
            def __init__(self, data):
                for key, value in data.items():
                    setattr(self, key, value)

        class MockDocVersion:
            def __init__(self, project_data):
                self.created_at = datetime.now()
                self.report_number = project_data.get('report_number', 'RMR-2025-01')
                self.version = project_data.get('version', '1.0')

        mock_project = MockProject(self.project)
        mock_doc_version = MockDocVersion(self.project)

        return generate_html_preview(mock_project, mock_doc_version, self.risks, self.team)

    def _generate_pdf_from_html(self, html_content: str) -> BytesIO:
        """Generate PDF directly from preview HTML to keep 1:1 content parity."""
        try:
            from xhtml2pdf import pisa  # type: ignore[import-not-found]
        except Exception as import_error:
            raise ImportError("xhtml2pdf is not installed") from import_error

        prepared_html = _prepare_html_for_xhtml2pdf(html_content)
        output = BytesIO()
        result = pisa.CreatePDF(
            src=prepared_html,
            dest=output,
            encoding='utf-8',
            link_callback=_pisa_link_callback
        )
        if result.err:
            raise ValueError("HTML to PDF conversion failed")

        pdf_bytes = output.getvalue()
        if not pdf_bytes:
            raise ValueError("HTML to PDF conversion returned empty data")

        output.seek(0)
        return output

    def _generate_pdf_legacy(self) -> BytesIO:
        """Legacy reportlab PDF generator used only as fallback."""
        file_stream = BytesIO()
        doc = SimpleDocTemplate(
            file_stream,
            pagesize=self.page_size,
            leftMargin=self.left_margin,
            rightMargin=self.right_margin,
            topMargin=self.top_margin,
            bottomMargin=self.bottom_margin
        )
        story = []

        # Build PLAN first, then REPORT in the same document
        self._add_title_page(story, is_plan=True)
        self._add_table_of_contents(story, is_plan=True)
        self._add_device_identification(story, is_plan=True)
        self._add_hazard_identification(story, is_plan=True)
        self._add_risk_analysis(story)
        self._add_risk_control_measures(story, is_plan=True)
        self._add_residual_risk_evaluation(story, is_plan=True)
        self._add_overall_risk_acceptability(story)
        self._add_conclusions(story, is_plan=True)
        self._add_references(story)

        story.append(PageBreak())

        self._add_title_page(story, is_plan=False)
        self._add_table_of_contents(story, is_plan=False)
        self._add_device_identification(story, is_plan=False)
        self._add_hazard_identification(story, is_plan=False)
        self._add_risk_analysis(story)
        self._add_risk_control_measures(story, is_plan=False)
        self._add_residual_risk_evaluation(story, is_plan=False)
        self._add_overall_risk_acceptability(story)
        self._add_conclusions(story, is_plan=False)
        self._add_references(story)

        doc.build(story)
        file_stream.seek(0)
        return file_stream

    def _register_fonts(self):
        """Register a Unicode-capable font for Cyrillic text using font manager."""
        # Initialize font manager and register fonts
        if initialize_fonts():
            cyrillic_font = get_cyrillic_font()
            if cyrillic_font:
                print(f"DEBUG: Using Cyrillic font: {cyrillic_font}")
                return cyrillic_font, get_font_for_style(cyrillic_font, bold=True)
        
        # Fallback to original font registration method
        env_font = os.getenv("REPORT_FONT_PATH")
        env_bold = os.getenv("REPORT_FONT_BOLD_PATH")
        font_candidates = [
            env_font,
            os.path.join(os.path.dirname(__file__), "..", "assets", "fonts", "DejaVuSans.ttf"),
            os.path.join(os.path.dirname(__file__), "..", "assets", "fonts", "DejaVuSans-Bold.ttf"),
            r"C:\Windows\Fonts\arial.ttf",
            r"C:\Windows\Fonts\arialbd.ttf",
            r"C:\Windows\Fonts\calibri.ttf",
            r"C:\Windows\Fonts\calibrib.ttf",
            r"C:\Windows\Fonts\times.ttf",
            r"C:\Windows\Fonts\timesbd.ttf",
            r"C:\Windows\Fonts\verdana.ttf",
            r"C:\Windows\Fonts\verdanab.ttf",
            r"C:\Windows\Fonts\tahoma.ttf",
            r"C:\Windows\Fonts\tahomabd.ttf",
            "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
            "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
            "/usr/share/fonts/truetype/freefont/FreeSans.ttf",
            "/usr/share/fonts/truetype/freefont/FreeSansBold.ttf",
            "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
            "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
            "/usr/share/fonts/truetype/noto/NotoSans-Regular.ttf",
            "/usr/share/fonts/truetype/noto/NotoSans-Bold.ttf",
            "/Library/Fonts/Arial Unicode.ttf",
            "/System/Library/Fonts/Supplemental/Arial.ttf",
            "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
        ]

        for font_path in font_candidates:
            if not font_path:
                continue
            font_path = os.path.abspath(font_path)
            if os.path.isfile(font_path):
                try:
                    # Try to register the font
                    font_name = "ReportFont"
                    pdfmetrics.registerFont(TTFont(font_name, font_path))
                    
                    # Find bold variant
                    bold_path = self._find_bold_font_path(font_path, env_bold)
                    if bold_path and os.path.isfile(bold_path):
                        bold_font_name = "ReportFontBold"
                        pdfmetrics.registerFont(TTFont(bold_font_name, bold_path))
                        print(f"DEBUG: Successfully registered fonts: {font_path} and {bold_path}")
                        return font_name, bold_font_name
                    else:
                        print(f"DEBUG: Successfully registered font: {font_path} (no bold variant found)")
                        return font_name, font_name
                except Exception as e:
                    print(f"DEBUG: Failed to register font {font_path}: {e}")
                    continue
        
        # Fallback to built-in fonts
        print("DEBUG: Falling back to Helvetica fonts (Cyrillic may not render)")
        return "Helvetica", "Helvetica-Bold"

    def _find_bold_font_path(self, font_path: str, env_bold: Optional[str]) -> Optional[str]:
        if env_bold:
            return os.path.abspath(env_bold)

        font_dir = os.path.dirname(font_path)
        font_name = os.path.basename(font_path).lower()
        bold_candidates = []

        if "dejavu" in font_name:
            bold_candidates.append(os.path.join(font_dir, "DejaVuSans-Bold.ttf"))
        if "arial" in font_name:
            bold_candidates.append(os.path.join(font_dir, "arialbd.ttf"))
        if "calibri" in font_name:
            bold_candidates.append(os.path.join(font_dir, "calibrib.ttf"))
        if "times" in font_name:
            bold_candidates.append(os.path.join(font_dir, "timesbd.ttf"))

        for candidate in bold_candidates:
            if os.path.isfile(candidate):
                return candidate
        return None

    def _calc_col_widths(self, ratios: List[float]) -> List[float]:
        if not ratios:
            return []
        total = sum(ratios)
        if total <= 0:
            ratios = [1.0 for _ in ratios]
            total = len(ratios)
        return [self.content_width * (ratio / total) for ratio in ratios]

    def _apply_table_style(self, table: Table, style_commands: List[tuple]):
        base_commands = [
            ('FONTNAME', (0, 0), (-1, -1), self.font_name),
            ('LEFTPADDING', (0, 0), (-1, -1), 2),
            ('RIGHTPADDING', (0, 0), (-1, -1), 2),
            ('TOPPADDING', (0, 0), (-1, -1), 2),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('WORDWRAP', (0, 0), (-1, -1), 'CJK'),
        ]
        table.hAlign = 'LEFT'
        table.setStyle(TableStyle(base_commands + style_commands))

    def _wrap_table_data(self, table_data: List[List[object]], header_size: int, body_size: int):
        header_style = ParagraphStyle(
            name='TableHeader',
            parent=self.styles['Normal'],
            fontName=self.font_name_bold,
            fontSize=header_size,
            leading=header_size + 1,
            wordWrap='CJK'
        )
        body_style = ParagraphStyle(
            name='TableBody',
            parent=self.styles['Normal'],
            fontName=self.font_name,
            fontSize=body_size,
            leading=body_size + 1,
            wordWrap='CJK'
        )

        wrapped = []
        for row_index, row in enumerate(table_data):
            row_style = header_style if row_index == 0 else body_style
            wrapped_row = []
            for cell in row:
                text = '' if cell is None else str(cell)
                wrapped_row.append(Paragraph(text, row_style))
            wrapped.append(wrapped_row)
        return wrapped

    def _section_spacing(self, story):
        story.append(Spacer(1, 12))

    def _get_field_value(self, value, default_placeholder='[PLACEHOLDER]'):
        """Get field value or return 'не заполнено' if empty"""
        if value is None:
            return 'не заполнено'
        value_str = str(value).strip()
        if not value_str or value_str == default_placeholder or value_str.startswith('[PLACEHOLDER'):
            return 'не заполнено'
        return value_str

    def _add_title_page(self, story, is_plan: bool = False):
        """Add title page - Section 1"""
        # Title
        title_text = "ПЛАН УПРАВЛЕНИЯ РИСКАМИ" if is_plan else "ОТЧЁТ ПО УПРАВЛЕНИЮ РИСКАМИ"
        story.append(Paragraph(title_text, self.styles['CustomTitle']))
        story.append(Spacer(1, 20))

        # Device information
        device_name = self._get_field_value(self.project.get('device_name'))
        device_model = self._get_field_value(self.project.get('device_model'))
        manufacturer = self._get_field_value(self.project.get('manufacturer'))
        manufacturer_address = self._get_field_value(self.project.get('manufacturer_address'))
        report_number = self._get_field_value(self.project.get('report_number'), 'RMR-2025-01')
        version = self._get_field_value(self.project.get('version'), '1.0')

        info_items = [
            f"<b>Медицинское изделие:</b> {device_name}",
            f"<b>Модель:</b> {device_model}",
            f"<b>Производитель:</b> {manufacturer}",
            f"<b>Адрес:</b> {manufacturer_address}",
            f"<b>Номер отчёта:</b> {report_number}",
            f"<b>Редакция:</b> {version}",
            f"<b>Дата:</b> {datetime.now().strftime('%d %B %Y')}",
        ]

        for item in info_items:
            story.append(Paragraph(item, self.styles['Normal']))
            story.append(Spacer(1, 5))

        story.append(Spacer(1, 20))

        # Team signatures
        prepared_by = self._get_field_value(self.project.get('prepared_by'))
        reviewed_by = self._get_field_value(self.project.get('reviewed_by'))
        approved_by = self._get_field_value(self.project.get('approved_by'))

        story.append(Paragraph(f'Подготовил: {prepared_by}', self.styles['Normal']))
        story.append(Paragraph(f'Проверил: {reviewed_by}', self.styles['Normal']))
        story.append(Paragraph(f'Утвердил: {approved_by}', self.styles['Normal']))

        self._section_spacing(story)

    def _add_table_of_contents(self, story, is_plan: bool = False):
        """Add table of contents - Section 2"""
        story.append(Paragraph('2. СОДЕРЖАНИЕ', self.styles['Heading1']))

        toc_data = [
            ['1', 'ТИТУЛЬНЫЙ ЛИСТ', '1'],
            ['2', 'СОДЕРЖАНИЕ', '2'],
            ['3', 'ИДЕНТИФИКАЦИЯ ИЗДЕЛИЯ И НАЗНАЧЕНИЕ', '3'],
            ['4', 'ИДЕНТИФИКАЦИЯ ОПАСНОСТЕЙ', '4'],
            ['5', 'АНАЛИЗ РИСКОВ (ДО ПРИМЕНЕНИЯ МЕР КОНТРОЛЯ)', '5'],
            ['6', 'МЕРЫ УПРАВЛЕНИЯ РИСКАМИ', '6'],
            ['7', 'ОЦЕНКА ОСТАТОЧНОГО РИСКА', '7'],
            ['8', 'ОЦЕНКА ПРИЕМЛЕМОСТИ СОВОКУПНОГО ОСТАТОЧНОГО РИСКА', '8'],
            ['9', 'СОСТАВ КОМАНДЫ ПО МЕНЕДЖМЕНТУ РИСКОВ', '9'] if is_plan else ['9', 'ВЫВОДЫ И УТВЕРЖДЕНИЕ', '9'],
            ['10', 'ССЫЛКИ И УПРАВЛЕНИЕ ДОКУМЕНТОМ', '10']
        ]

        toc_data = self._wrap_table_data(toc_data, header_size=8, body_size=7)
        table = Table(
            toc_data,
            colWidths=self._calc_col_widths([1, 6, 1]),
            repeatRows=1
        )
        self._apply_table_style(table, [
            ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, 0), self.font_name_bold),
            ('FONTNAME', (0, 1), (-1, -1), self.font_name),
            ('FONTSIZE', (0, 0), (-1, 0), 8),
            ('FONTSIZE', (0, 1), (-1, -1), 7),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
            ('GRID', (0, 0), (-1, -1), 1, colors.black),
            ('WORDWRAP', (0, 0), (-1, -1), 'CJK'),
        ])
        story.append(table)
        story.append(Spacer(1, 20))

        self._section_spacing(story)

    def _add_device_identification(self, story, is_plan: bool = False):
        """Add device identification section - Section 3"""
        story.append(Paragraph('3. ИДЕНТИФИКАЦИЯ ИЗДЕЛИЯ И НАЗНАЧЕНИЕ', self.styles['Heading1']))

        # Create identification table
        fields_data = [
            ('Наименование изделия', self.project.get('device_name', 'не заполнено')),
            ('Модель / Тип', self.project.get('device_model', 'не заполнено')),
            ('Класс риска', self.project.get('device_classification', 'не заполнено')),
            ('Условия эксплуатации', self.project.get('operating_environment', 'не заполнено')),
            ('Применяемые стандарты и регламенты', self.project.get('standards', 'не заполнено')),
            ('Периодичность пересмотра', 'По мере обновления проекта, существенных изменений изделия или поступления новой информации.'),
        ]

        table_data = [['Поле', 'Значение']]
        for field, value in fields_data:
            table_data.append([field, value])

        table_data = self._wrap_table_data(table_data, header_size=10, body_size=8)
        table = Table(
            table_data,
            colWidths=self._calc_col_widths([1, 3]),
            repeatRows=1
        )
        self._apply_table_style(table, [
            ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, 0), self.font_name_bold),
            ('FONTNAME', (0, 1), (-1, -1), self.font_name),
            ('FONTSIZE', (0, 0), (-1, 0), 10),
            ('FONTSIZE', (0, 1), (-1, -1), 8),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
            ('GRID', (0, 0), (-1, -1), 1, colors.black),
            ('WORDWRAP', (0, 0), (-1, -1), 'CJK'),
        ])
        story.append(table)
        story.append(Spacer(1, 20))

        # Lifecycle stages
        story.append(Paragraph('Этапы жизненного цикла:', self.styles['Heading3']))
        lifecycle_stages = self._parse_json_field(self.project.get('lifecycle_stages', '[]'))
        if lifecycle_stages:
            for stage in lifecycle_stages:
                story.append(Paragraph(f'• {_format_lifecycle_stage_label(stage)}', self.styles['Normal']))
        else:
            story.append(Paragraph('не заполнено', self.styles['Normal']))

        if not is_plan:
            # Hazard categories
            hazard_categories = self._parse_hazard_categories_from_questions(self.project.get('hazard_questions', '{}'))
            if hazard_categories:
                for category in hazard_categories:
                    story.append(Paragraph(f'• {category}', self.styles['Normal']))
            else:
                story.append(Paragraph('[PLACEHOLDER: Hazard Categories]', self.styles['Normal']))

        # Intended use section
        intended_use_value = self.project.get('intended_use') or self.project.get('device_purpose')
        intended_use_data = [
            ['Назначение / разумно прогнозируемое неправильное применение', ''],
            ['Назначение', self._get_field_value(intended_use_value)],
            ['Медицинские показания', self._get_field_value(self.project.get('indications'))],
            ['Целевая группа пациентов', self._get_field_value(self.project.get('target_group'))],
            ['Предполагаемые пользователи', self._get_field_value(self.project.get('user_profile'))],
            ['Среда применения', self._get_field_value(self.project.get('operating_environment'))],
            ['Противопоказания', self._get_field_value(self.project.get('contraindications'))],
            ['Ограничения', self._get_field_value(self.project.get('regulatory_requirements'))],
        ]
        intended_use_data = self._wrap_table_data(intended_use_data, header_size=8, body_size=7)
        intended_table = Table(
            intended_use_data,
            colWidths=self._calc_col_widths([1.5, 3.5]),
            repeatRows=1
        )
        self._apply_table_style(intended_table, [
            ('SPAN', (0, 0), (1, 0)),
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#CFE2F3')),
            ('ALIGN', (0, 0), (-1, 0), 'LEFT'),
            ('GRID', (0, 0), (-1, -1), 1, colors.black),
        ])
        story.append(Spacer(1, 8))
        story.append(intended_table)

        # Misuse scenarios table
        misuse_data = [
            ['ID', 'Сценарий misuse', 'Причина / механизм', 'Потенциальный вред', 'Этап ЖЦ', 'Комментарий'],
            ['Список misuse пока не заполнен.', '', '', '', '', '']
        ]
        misuse_data = self._wrap_table_data(misuse_data, header_size=8, body_size=7)
        misuse_table = Table(
            misuse_data,
            colWidths=self._calc_col_widths([1, 3, 3, 2.5, 1.5, 2]),
            repeatRows=1
        )
        self._apply_table_style(misuse_table, [
            ('SPAN', (0, 1), (5, 1)),
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1F4E79')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('GRID', (0, 0), (-1, -1), 1, colors.black),
        ])
        story.append(Spacer(1, 6))
        story.append(misuse_table)

        story.append(Spacer(1, 8))
        story.append(Paragraph('Утилизация', self.styles['Heading3']))
        story.append(Paragraph(self._get_field_value(self.project.get('disposal')), self.styles['Normal']))
        story.append(Spacer(1, 4))
        story.append(Paragraph('Предупреждения', self.styles['Heading3']))
        story.append(Paragraph(self._get_field_value(self.project.get('warnings')), self.styles['Normal']))

        self._section_spacing(story)

    def _add_hazard_identification(self, story, is_plan: bool = False):
        """Add hazard identification section - Section 4"""
        story.append(Paragraph('4. ИДЕНТИФИКАЦИЯ ОПАСНОСТЕЙ', self.styles['Heading1']))

        story.append(Paragraph('4.1 Цель раздела', self.styles['Heading2']))
        story.append(Paragraph(
            'Определить все разумно предсказуемые опасности, возникающие на этапах жизненного цикла '
            'изделия - от проектирования и производства до эксплуатации, очистки, транспортировки, утилизации.',
            self.styles['Normal']
        ))

        from types import SimpleNamespace
        from ..routers.documents import build_checklist_411_sections

        story.append(Paragraph('4.1.1 Ответы на вопросы чек-листа', self.styles['Heading3']))
        lifecycle_rows, hazard_rows = build_checklist_411_sections(SimpleNamespace(**self.project))

        def add_checklist_table_pdf(title, rows):
            story.append(Paragraph(title, self.styles['Heading4']))
            if not rows:
                story.append(Paragraph('не заполнено', self.styles['Normal']))
                story.append(Spacer(1, 8))
                return

            table_data = [['Группа', 'Пункт', 'Ответ']]
            for row_data in rows:
                table_data.append([
                    str(row_data.get('group', '')),
                    str(row_data.get('item', '')),
                    str(row_data.get('answer', 'Нет')),
                ])

            table_data = self._wrap_table_data(table_data, header_size=8, body_size=7)
            table = Table(
                table_data,
                colWidths=self._calc_col_widths([2.5, 5.0, 1.5]),
                repeatRows=1
            )
            self._apply_table_style(table, [
                ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                ('FONTNAME', (0, 0), (-1, 0), self.font_name_bold),
                ('FONTNAME', (0, 1), (-1, -1), self.font_name),
                ('FONTSIZE', (0, 0), (-1, 0), 8),
                ('FONTSIZE', (0, 1), (-1, -1), 7),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 10),
                ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
                ('GRID', (0, 0), (-1, -1), 1, colors.black),
                ('WORDWRAP', (0, 0), (-1, -1), 'CJK'),
            ])
            story.append(table)
            story.append(Spacer(1, 10))

        add_checklist_table_pdf('Этапы жизненного цикла', lifecycle_rows)
        if not is_plan:
            add_checklist_table_pdf('Опасности проекта', hazard_rows)

            # Hazards table - Exact Excel structure (removed Категория опасности and Последовательность событий)
            story.append(Paragraph('4.2 Таблица идентифицированных опасностей', self.styles['Heading2']))

            if self.risks:
                table_data = [['№', 'Этап жизненного цикла', 'Наименование опасности', 'Вред']]

                for idx, risk in enumerate(self.risks, 1):
                    data = risk.get('data', {})
                    table_data.append([
                        str(idx),
                        _format_lifecycle_stage_label(risk.get('table_name', data.get('lifecycle_stage', ''))),
                        data.get('hazardous_situation', ''),  # Skip category and sequence columns
                        data.get('harm', '')
                    ])

                table_data = self._wrap_table_data(table_data, header_size=8, body_size=7)
                table = Table(
                    table_data,
                    colWidths=self._calc_col_widths([1, 3, 4, 2]),
                    repeatRows=1
                )
                self._apply_table_style(table, [
                    ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
                    ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                    ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                    ('FONTNAME', (0, 0), (-1, 0), self.font_name_bold),
                    ('FONTNAME', (0, 1), (-1, -1), self.font_name),
                    ('FONTSIZE', (0, 0), (-1, 0), 8),
                    ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                    ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
                    ('GRID', (0, 0), (-1, -1), 1, colors.black),
                    ('FONTSIZE', (0, 1), (-1, -1), 7),
                    ('WORDWRAP', (0, 0), (-1, -1), 'CJK'),
                ])
                story.append(table)
            else:
                story.append(Paragraph('Нет идентифицированных опасностей', self.styles['Normal']))

        summary_heading = '4.2 Резюме раздела' if is_plan else '4.3 Резюме раздела'
        story.append(Paragraph(summary_heading, self.styles['Heading2']))
        hazard_count = len(self.risks)
        categories_text = ', '.join(self._parse_json_field(self.project.get('active_hazard_categories', '[]'))) or 'не заполнено'
        summary = (
            f'Идентифицированы основные опасности ({hazard_count} шт.), связанные с {categories_text}. '
            'Для каждой опасности будет проведён анализ риска (раздел 5) с оценкой тяжести и вероятности, '
            'а также определены меры контроля (раздел 6).'
        )
        story.append(Paragraph(summary, self.styles['Normal']))

        self._section_spacing(story)

    def _add_risk_analysis(self, story):
        """Add risk analysis section - Section 5"""
        story.append(Paragraph('5. АНАЛИЗ РИСКОВ (ДО ПРИМЕНЕНИЯ МЕР КОНТРОЛЯ)', self.styles['Heading1']))

        story.append(Paragraph('5.1 Методология оценки', self.styles['Heading2']))
        story.append(Paragraph(
            'Для анализа рисков используется качественно-количественная методика, где:',
            self.styles['Normal']
        ))

        # Severity table
        story.append(Paragraph('Тяжесть вреда (S):', self.styles['Heading3']))
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

        if len(table_data[0]) == 4:
            col_widths = self._calc_col_widths([1, 2, 4, 1])
        else:
            col_widths = self._calc_col_widths([1, 3, 4])
        table_data = self._wrap_table_data(table_data, header_size=8, body_size=7)
        table = Table(table_data, colWidths=col_widths, repeatRows=1)
        self._apply_table_style(table, [
            ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, 0), self.font_name_bold),
            ('FONTNAME', (0, 1), (-1, -1), self.font_name),
            ('FONTSIZE', (0, 0), (-1, 0), 8),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
            ('GRID', (0, 0), (-1, -1), 1, colors.black),
            ('FONTSIZE', (0, 1), (-1, -1), 7),
            ('WORDWRAP', (0, 0), (-1, -1), 'CJK'),
        ])
        story.append(table)
        story.append(Spacer(1, 10))

        # Probability table
        story.append(Paragraph('Вероятность возникновения (P):', self.styles['Heading3']))
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

        table_data = self._wrap_table_data(table_data, header_size=8, body_size=7)
        table = Table(
            table_data,
            colWidths=self._calc_col_widths([1, 3, 4]),
            repeatRows=1
        )
        self._apply_table_style(table, [
            ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, 0), self.font_name_bold),
            ('FONTNAME', (0, 1), (-1, -1), self.font_name),
            ('FONTSIZE', (0, 0), (-1, 0), 8),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
            ('GRID', (0, 0), (-1, -1), 1, colors.black),
            ('FONTSIZE', (0, 1), (-1, -1), 7),
            ('WORDWRAP', (0, 0), (-1, -1), 'CJK'),
        ])
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
            table_data = [['№', 'Опасность', 'Тяжесть (S)', 'Вероятность (P)', 'Оценка риска (S×P)']]

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

            table_data = self._wrap_table_data(table_data, header_size=8, body_size=7)
            table = Table(
                table_data,
                colWidths=self._calc_col_widths([1, 4, 1, 1, 1.5]),
                repeatRows=1
            )
            self._apply_table_style(table, [
                ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                ('FONTNAME', (0, 0), (-1, 0), self.font_name_bold),
                ('FONTNAME', (0, 1), (-1, -1), self.font_name),
                ('FONTSIZE', (0, 0), (-1, 0), 8),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
                ('GRID', (0, 0), (-1, -1), 1, colors.black),
                ('FONTSIZE', (0, 1), (-1, -1), 7),
                ('WORDWRAP', (0, 0), (-1, -1), 'CJK'),
            ])
            story.append(table)
        else:
            story.append(Paragraph('Нет данных по рискам', self.styles['Normal']))
            acceptable_count = 0
            unacceptable_count = 0

        # Section 5.3 removed as per requirements

        self._section_spacing(story)

    def _add_risk_control_measures(self, story, is_plan: bool = False):
        """Add risk control measures section - Section 6"""
        story.append(Paragraph('6. МЕРЫ УПРАВЛЕНИЯ РИСКАМИ', self.styles['Heading1']))

        story.append(Paragraph('6.1 Цель раздела', self.styles['Heading2']))
        story.append(Paragraph(
            'Определить и задокументировать меры, применённые для снижения или устранения рисков, '
            'связанных с выявленными опасными ситуациями.',
            self.styles['Normal']
        ))

        story.append(Paragraph('6.2 Таблица мер управления рисками', self.styles['Heading2']))

        if is_plan:
            headers = [
                '№', 'Этап жизненного цикла', 'Категория опасности', 'Наименование опасности',
                'Последовательность событий', 'Опасная ситуация', 'Вред',
                'Тяжесть вреда, балл', 'Вероятность причинения вреда, балл', 'Риск, балл',
                'Уровень риска (доп./не доп.)', 'Комментарий',
                'Меры по управлению риском (1)', 'Меры по управлению риском (2)', 'Меры по управлению риском (3)',
                'Верификация мер по управлению риском (1)', 'Верификация мер по управлению риском (2)', 'Верификация мер по управлению риском (3)',
                'Тяжесть вреда, балл (остат.)', 'Вероятность причинения вреда, балл (остат.)',
                'Достигнутый риск и его уровень', 'Уровень риска (доп./не доп.) (остат.)', 'Комментарий (остат.)',
                'Безопасность, заложенная в конструкции', 'Защитная мера/средство'
            ]
            table_data = [headers, ['не заполнено'] * len(headers)]

            table_data = self._wrap_table_data(table_data, header_size=6, body_size=5)
            table = Table(table_data, colWidths=self._calc_col_widths([1] * len(headers)), repeatRows=1)
            self._apply_table_style(table, [
                ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('GRID', (0, 0), (-1, -1), 1, colors.black),
            ])
            story.append(table)
        elif self.risks:
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
                    _format_lifecycle_stage_label(risk.get('table_name', data.get('lifecycle_stage', ''))),
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

            col_widths = self._calc_col_widths([1] * len(table_data[0]))
            table_data = self._wrap_table_data(table_data, header_size=6, body_size=5)
            table = Table(table_data, colWidths=col_widths, repeatRows=1)
            self._apply_table_style(table, [
                ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                ('FONTNAME', (0, 0), (-1, 0), self.font_name_bold),
                ('FONTNAME', (0, 1), (-1, -1), self.font_name),
                ('FONTSIZE', (0, 0), (-1, 0), 5),
                ('FONTSIZE', (0, 1), (-1, -1), 5),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
                ('GRID', (0, 0), (-1, -1), 1, colors.black),
                ('WORDWRAP', (0, 0), (-1, -1), 'CJK'),
            ])
            story.append(table)
        else:
            story.append(Paragraph('Нет данных по мерам управления рисками', self.styles['Normal']))

        self._section_spacing(story)

    def _add_residual_risk_evaluation(self, story, is_plan: bool = False):
        """Add residual risk evaluation section - Section 7"""
        story.append(Paragraph('7. ОЦЕНКА ОСТАТОЧНОГО РИСКА', self.styles['Heading1']))

        story.append(Paragraph('7.1 Цель раздела', self.styles['Heading2']))
        story.append(Paragraph(
            'Определить, являются ли остаточные риски (после реализации мер контроля) приемлемыми '
            'в соответствии с установленными критериями риск-аппетита организации и принципом ALARP',
            self.styles['Normal']
        ))

        story.append(Paragraph('7.2 Таблица оценки остаточных рисков', self.styles['Heading2']))

        if is_plan:
            headers = [
                '№', 'Этап жизненного цикла', 'Категория опасности', 'Наименование опасности',
                'Последовательность событий', 'Вред', 'Тяжесть вреда, балл (остат.)',
                'Вероятность причинения вреда, балл (остат.)', 'Достигнутый риск и его уровень',
                'Уровень риска (доп./не доп.) (остат.)', 'Комментарий (остат.)',
                'Анализ остаточный риск/польза', 'Новые риски в результате принятия мер по управлению'
            ]
            table_data = [headers, ['не заполнено'] * len(headers)]

            table_data = self._wrap_table_data(table_data, header_size=6, body_size=5)
            table = Table(table_data, colWidths=self._calc_col_widths([1] * len(headers)), repeatRows=1)
            self._apply_table_style(table, [
                ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('GRID', (0, 0), (-1, -1), 1, colors.black),
            ])
            story.append(table)
        elif self.risks:
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
                table_name = _format_lifecycle_stage_label(risk.get('table_name', data.get('lifecycle_stage', '')))

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

            table_data = self._wrap_table_data(table_data, header_size=6, body_size=5)
            col_widths = self._calc_col_widths([1] * len(table_data[0]))
            table = Table(table_data, colWidths=col_widths, repeatRows=1)
            self._apply_table_style(table, [
                ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                ('FONTNAME', (0, 0), (-1, 0), self.font_name_bold),
                ('FONTNAME', (0, 1), (-1, -1), self.font_name),
                ('FONTSIZE', (0, 0), (-1, 0), 6),
                ('FONTSIZE', (0, 1), (-1, -1), 5),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
                ('GRID', (0, 0), (-1, -1), 1, colors.black),
                ('WORDWRAP', (0, 0), (-1, -1), 'CJK'),
            ])
            story.append(table)
        else:
            story.append(Paragraph('Нет данных по остаточным рискам', self.styles['Normal']))
            acceptable_residual = 0
            unacceptable_residual = 0

       
        self._section_spacing(story)

    def _add_overall_risk_acceptability(self, story):
        """Add overall risk acceptability section - Section 8"""
        story.append(Paragraph('8. ОЦЕНКА ПРИЕМЛЕМОСТИ СОВОКУПНОГО ОСТАТОЧНОГО РИСКА', self.styles['Heading1']))

        story.append(Paragraph('8.1 Цель раздела', self.styles['Heading2']))
        story.append(Paragraph(
            'Определить, является ли совокупный остаточный риск медицинского изделия приемлемым, '
            'учитывая все идентифицированные индивидуальные риски, их взаимное влияние и соотношение '
            'польза/риск, как требует ISO 14971:2019, п. 8.3.',
            self.styles['Normal']
        ))

        
        story.append(Paragraph('Оценка соотношения польза/риск выполняется при наличии неприемлемых остаточных рисков.', self.styles['Normal']))

        self._section_spacing(story)

    def _add_conclusions(self, story, is_plan: bool = False):
        """Add conclusions section - Section 9"""
        if is_plan:
            story.append(Paragraph('9. СОСТАВ КОМАНДЫ ПО МЕНЕДЖМЕНТУ РИСКОВ', self.styles['Heading1']))
            story.append(Paragraph('9.1 Состав команды', self.styles['Heading2']))
        else:
            story.append(Paragraph('9. ВЫВОДЫ И УТВЕРЖДЕНИЕ', self.styles['Heading1']))
            story.append(Paragraph('9.1 Общие выводы', self.styles['Heading2']))

        if not is_plan:
            risk_threshold = self.project.get('risk_threshold', 10)
            device_name = self.project.get('device_name', 'не заполнено')
            dynamic = build_dynamic_conclusion_lines(self.risks, risk_threshold, device_name)

            conclusions = [
                'На основании проведённого процесса идентификации опасностей, анализа, оценки и управления рисками, подтверждено, что:',
                '',
                f'• {dynamic["reviewed_line"]}',
                f'• {dynamic["risk_count_line"]}',
                f'• {dynamic["controls_line"]}',
                f'• {dynamic["residual_line"]}',
                f'• {dynamic["overall_line"]}',
                '• Документация по управлению рисками является полной, прослеживаемой и согласована с системой менеджмента качества, соответствующей ISO 13485:2016;',
                '• Постпроизводственная информация (PMS, жалобы, CAPA) будет регулярно анализироваться для пересмотра оценки рисков.'
            ]

            for conclusion in conclusions:
                story.append(Paragraph(conclusion, self.styles['Normal']))

            story.append(Paragraph('9.2 Заключение', self.styles['Heading2']))
            story.append(Paragraph(dynamic['conclusion_main_line'], self.styles['Normal']))
            story.append(Paragraph(dynamic['conclusion_process_line'], self.styles['Normal']))

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
                    'не заполнено',
                    'не заполнено',
                    '',
                    datetime.now().strftime('%d.%m.%Y')
                ])

        table_data = self._wrap_table_data(table_data, header_size=8, body_size=7)
        table = Table(
            table_data,
            colWidths=self._calc_col_widths([2, 2, 1.2, 1.2]),
            repeatRows=1
        )
        self._apply_table_style(table, [
            ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, 0), self.font_name_bold),
            ('FONTNAME', (0, 1), (-1, -1), self.font_name),
            ('FONTSIZE', (0, 0), (-1, 0), 8),
            ('FONTSIZE', (0, 1), (-1, -1), 7),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
            ('GRID', (0, 0), (-1, -1), 1, colors.black),
            ('WORDWRAP', (0, 0), (-1, -1), 'CJK'),
        ])
        story.append(table)

        self._section_spacing(story)

    def _add_references(self, story):
        """Add references section - Section 10"""
        story.append(Paragraph('10. ССЫЛКИ И УПРАВЛЕНИЕ ДОКУМЕНТОМ', self.styles['Heading1']))

        story.append(Paragraph('10.1 Ссылки и нормативные документы', self.styles['Heading2']))

        references_data = [
            ['№', 'Документ / Стандарт', 'Наименование'],
            ['1', 'ISO 14971:2019', 'Медицинские изделия — Применение менеджмента риска к медицинским изделиям'],
            ['2', 'ISO 13485:2016', 'Системы менеджмента качества — Требования для целей регулирования'],
            ['3', 'MDR 2017/745', 'Регламент (ЕС) 2017/745 о медицинских изделиях'],
            ['4', 'ISO 10993-1:2020', 'Биологическая оценка медицинских изделий — Часть 1'],
            ['5', 'ISO 17664:2017', 'Обработка продукции для здравоохранения — Информация, предоставляемая производителем'],
            ['6', 'Company SOP QMS-RM-001', 'Процедура управления рисками'],
            ['7', 'IFU-CP-01', 'Инструкция по применению'],
        ]

        references_data = self._wrap_table_data(references_data, header_size=8, body_size=7)
        table = Table(
            references_data,
            colWidths=self._calc_col_widths([1, 2, 5]),
            repeatRows=1
        )
        self._apply_table_style(table, [
            ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, 0), self.font_name_bold),
            ('FONTNAME', (0, 1), (-1, -1), self.font_name),
            ('FONTSIZE', (0, 0), (-1, 0), 8),
            ('FONTSIZE', (0, 1), (-1, -1), 7),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
            ('GRID', (0, 0), (-1, -1), 1, colors.black),
            ('WORDWRAP', (0, 0), (-1, -1), 'CJK'),
        ])
        story.append(table)

        story.append(Paragraph('10.2 Управление документом', self.styles['Heading2']))

        device_name = self.project.get('device_name', '[Device Name]')

        control_data = [
            ['Название документа', f'Отчёт по управлению рисками — {device_name}'],
            ['Номер документа', self.project.get('report_number', 'RMR-2025-01')],
            ['Редакция', self.project.get('version', '1.0')],
            ['Статус', 'Утверждён'],
            ['Дата вступления в силу', datetime.now().strftime('%d.%m.%Y')],
            ['Местоположение контролируемой копии', 'Репозиторий СМК / Папка: "Управление рисками"'],
        ]

        control_data = self._wrap_table_data(control_data, header_size=8, body_size=7)
        table = Table(
            control_data,
            colWidths=self._calc_col_widths([1.5, 3.5]),
            repeatRows=1
        )
        self._apply_table_style(table, [
            ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, 0), self.font_name_bold),
            ('FONTNAME', (0, 1), (-1, -1), self.font_name),
            ('FONTSIZE', (0, 0), (-1, 0), 8),
            ('FONTSIZE', (0, 1), (-1, -1), 7),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
            ('GRID', (0, 0), (-1, -1), 1, colors.black),
            ('WORDWRAP', (0, 0), (-1, -1), 'CJK'),
        ])
        story.append(table)

        self._section_spacing(story)

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

            col_widths = self._calc_col_widths([1] * len(table_data[0]))
            table_data = self._wrap_table_data(table_data, header_size=6, body_size=5)
            table = Table(table_data, colWidths=col_widths, repeatRows=1)
            self._apply_table_style(table, [
                ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                ('FONTNAME', (0, 0), (-1, 0), self.font_name_bold),
                ('FONTNAME', (0, 1), (-1, -1), self.font_name),
                ('FONTSIZE', (0, 0), (-1, 0), 6),
                ('FONTSIZE', (0, 1), (-1, -1), 5),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
                ('GRID', (0, 0), (-1, -1), 1, colors.black),
                ('WORDWRAP', (0, 0), (-1, -1), 'CJK'),
            ])
            story.append(table)
        else:
            story.append(Paragraph('Нет данных по рискам для приложения', self.styles['Normal']))

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

    def _parse_hazard_categories_from_questions(self, hazard_questions):
        """Extract hazard categories from hazard_questions structure for PDF sections."""
        if not hazard_questions:
            return []

        try:
            if isinstance(hazard_questions, str):
                parsed = json.loads(hazard_questions)
            else:
                parsed = hazard_questions

            hazard_categories = []
            if isinstance(parsed, dict):
                category_mapping = {
                    'active': 'Электрическая энергия',
                    'sterile': 'Биологическая опасность',
                    'disposable': 'Биологическая опасность',
                    'software': 'Программное обеспечение',
                    'implantable': 'Биологическая опасность',
                    'bodyContact': 'Биологическая опасность',
                    'materialContact': 'Биологическая опасность',
                    'implantableDevice': 'Биологическая опасность',
                    'substanceRelease': 'Биологическая опасность',
                    'sensitization': 'Биологическая опасность',
                    'containsSoftware': 'Программное обеспечение',
                    'dataExchange': 'Программное обеспечение',
                    'wireless': 'Электрическая энергия',
                    'personalData': 'Программное обеспечение',
                    'userInterface': 'Программное обеспечение',
                    'activeDevice': 'Электрическая энергия',
                    'powerConnection': 'Электрическая энергия',
                    'electricalContacts': 'Электрическая энергия',
                    'movingElements': 'Механическая энергия',
                    'movingRisk': 'Механическая энергия',
                    'emitsEnergy': 'Электрическая энергия',
                    'opticalSystems': 'Электрическая энергия',
                    'specialTraining': 'Программное обеспечение',
                    'specialNeeds': 'Программное обеспечение',
                    'interfaceError': 'Программное обеспечение',
                    'alarms': 'Программное обеспечение',
                    'isSterile': 'Биологическая опасность',
                    'reusable': 'Биологическая опасность',
                    'biologicalContact': 'Биологическая опасность',
                    'chemicalSubstances': 'Химическая опасность',
                    'chemicalRelease': 'Химическая опасность',
                    'chemicalSterilization': 'Химическая опасность',
                    'animalMaterials': 'Биологическая опасность',
                    'nanomaterials': 'Биологическая опасность',
                    'pharmaceutical': 'Биологическая опасность',
                    'environmentalSensitivity': 'Окружающая среда',
                    'environmentalImpact': 'Окружающая среда',
                    'mechanicalLoad': 'Механическая энергия',
                    'destructionRisk': 'Механическая энергия',
                    'heating': 'Тепловая энергия',
                    'surfaceContact': 'Тепловая энергия',
                    'reliability': 'Программное обеспечение',
                    'clinicalUse': 'Программное обеспечение',
                    'clinicalError': 'Программное обеспечение',
                    'clinicalValidation': 'Программное обеспечение'
                }
                for question_key, is_active in parsed.items():
                    if is_active and question_key in category_mapping:
                        category = category_mapping[question_key]
                        if category not in hazard_categories:
                            hazard_categories.append(category)
            elif isinstance(parsed, list):
                hazard_categories = [str(item) for item in parsed if item]
            else:
                hazard_categories = []

            return hazard_categories
        except (json.JSONDecodeError, TypeError, AttributeError) as e:
            print(f"DEBUG: Error parsing hazard_categories from hazard_questions (PDF): {e}")
            return []



















