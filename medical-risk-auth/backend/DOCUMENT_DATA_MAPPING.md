# Risk Management Report - Database Mapping Documentation

This document describes the mapping between database fields and the Risk Management Report document sections.

## Document Structure Overview

The Risk Management Report (DOCX) consists of 10 main sections plus appendices. Each section pulls data from various database tables.

---

## 1. ТИТУЛЬНЫЙ ЛИСТ (Title Page)

| Document Field | Database Source | Table | Column | Notes |
|---------------|-----------------|-------|---------|-------|
| Medical device | Project | `projects` | `device_name` | **Required** |
| Model | Project | `projects` | `device_model` | Optional |
| Manufacturer | Project | `projects` | Custom field (not yet implemented) | **PLACEHOLDER** - needs to be added to projects table |
| Address | Project | `projects` | Custom field (not yet implemented) | **PLACEHOLDER** - needs to be added to projects table |
| Report No. | Document Version | `document_versions` | `report_number` | Auto-generated: RMR-{year}-{project_id} |
| Revision | Document Version | `document_versions` | `version` | Auto-incremented: 1.0, 1.1, 2.0, etc. |
| Date | Generated at runtime | - | - | Current date at generation time |
| Prepared by | Project Team | `project_members` + `users` | Role-based lookup | **PLACEHOLDER** - currently uses generic text |
| Reviewed by | Project Team | `project_members` + `users` | Role-based lookup | **PLACEHOLDER** - currently uses generic text |
| Approved by | Project Team | `project_members` + `users` | Role-based lookup | **PLACEHOLDER** - currently uses generic text |

**Implementation Status**: Partially implemented. Manufacturer info and team signatures need proper role-based assignment.

---

## 2. СОДЕРЖАНИЕ (Table of Contents)

| Document Field | Source | Notes |
|---------------|--------|-------|
| Section list | Hardcoded | Static list of all sections |

**Implementation Status**: ✅ Complete

---

## 3. ИДЕНТИФИКАЦИЯ ИЗДЕЛИЯ И НАЗНАЧЕНИЕ (Device Identification)

### 3.1 Device Information Table

| Document Field | Database Source | Table | Column | Notes |
|---------------|-----------------|-------|---------|-------|
| Device name | Project | `projects` | `device_name` | **Required** |
| Model / Type | Project | `projects` | `device_model` | Optional |
| Category risk | Project | `projects` | `device_classification` | Optional (e.g., "Class I") |
| Intended purpose | Project | `projects` | `intended_use` | Optional |
| Intended users | Project | `projects` | `user_profile` | Optional |
| Patient population | Project | `projects` | Custom field | **PLACEHOLDER** - not yet in DB |
| Operating environment | Project | `projects` | `operating_environment` | Optional |
| Key performance characteristics | Project | `projects` | Custom field | **PLACEHOLDER** - not yet in DB |
| Safety-related characteristics | Project | `projects` | Custom field | **PLACEHOLDER** - not yet in DB |
| Standards and regulations applied | Project | `projects` | `standards` | Optional |

### 3.2 Lifecycle Stages

| Document Field | Database Source | Table | Column | Format |
|---------------|-----------------|-------|---------|--------|
| Этапы жизненного цикла | Project | `projects` | `lifecycle_stages` | JSON array of strings |

**Example JSON**: `["operation", "maintenance", "storage", "transport", "disposal"]`

### 3.3 Hazard Categories

| Document Field | Database Source | Table | Column | Format |
|---------------|-----------------|-------|---------|--------|
| Идентифицированные категории опасностей | Project | `projects` | `active_hazard_categories` | JSON array of strings |

**Example JSON**: `["Biological/Chemical Hazards", "Energy-Related Hazards"]`

**Implementation Status**: ✅ Complete for implemented fields, ⚠️ Some placeholders remain

---

## 4. Identification of Hazards (Идентификация опасностей)

### 4.1 Checklist Answers

| Document Field | Database Source | Table | Column | Format |
|---------------|-----------------|-------|---------|--------|
| Hazard checklist answers | Project | `projects` | `hazard_checklist_answers` | JSON object with question/answer pairs |

**Implementation Status**: **PLACEHOLDER** - Field exists but rendering logic not implemented

### 4.2 Hazards Table

| Document Column | Database Source | Table | Column Path | Notes |
|----------------|-----------------|-------|-------------|-------|
| № | Row index | `risk_table_rows` | `row_number` | Sequential numbering |
| Lifecycle Stage | Risk data | `risk_table_rows` | `data->lifecycle_stage` | JSON field |
| Hazard | Risk data | `risk_table_rows` | `data->hazard` | JSON field |
| Hazardous Situation | Risk data | `risk_table_rows` | `data->hazardous_situation` | JSON field |
| Sequence of Events | Risk data | `risk_table_rows` | `data->sequence_of_events` | JSON field |
| Harm | Risk data | `risk_table_rows` | `data->harm` | JSON field |

**Data Source**: All rows from all `risk_management_tables` for the project, joined with `risk_table_rows`.

**Implementation Status**: ✅ Complete

---

## 5. Risk Analysis (Before Risk Control)

### 5.1 Methodology Tables

| Document Section | Source | Notes |
|-----------------|--------|-------|
| Severity scale | Hardcoded | Static 1-5 scale with descriptions |
| Probability scale | Hardcoded | Static 1-5 scale with descriptions |
| Risk acceptability criteria | Hardcoded | 1-9: Acceptable, 10-25: Unacceptable |

### 5.2 Risk Analysis Table

| Document Column | Database Source | Table | Column Path | Calculation |
|----------------|-----------------|-------|-------------|-------------|
| № | Row index | `risk_table_rows` | `row_number` | Sequential |
| Hazard | Risk data | `risk_table_rows` | `data->hazard` | Direct |
| Severity (S) | Risk data | `risk_table_rows` | `data->severity_initial` | User input (1-5) |
| Probability (P) | Risk data | `risk_table_rows` | `data->probability_initial` | User input (1-5) |
| Risk Score (S×P) | Calculated | - | - | `severity_initial * probability_initial` |

**Implementation Status**: ✅ Complete, ⚠️ Requires `severity_initial` and `probability_initial` fields in risk data

**Formula Configuration**: The risk formula and thresholds are currently **hardcoded**. 

**Recommendation**: Add to `projects` table:
- `risk_formula` (e.g., "S×P", "S+P", custom)
- `risk_threshold_low` (default: 9)
- `risk_threshold_high` (default: 10)

---

## 6. Risk Control Measures

| Document Column | Database Source | Table | Column Path | Notes |
|----------------|-----------------|-------|-------------|-------|
| № | Row index | `risk_table_rows` | `row_number` | Sequential |
| Hazard | Risk data | `risk_table_rows` | `data->hazard` | Direct |
| Control Measures | Risk data | `risk_table_rows` | `data->control_measures` | User input, **PLACEHOLDER** if empty |
| Verification Method | Risk data | `risk_table_rows` | `data->verification` | User input, **PLACEHOLDER** if empty |

**Implementation Status**: ✅ Structure complete, ⚠️ Data depends on user filling control measures

---

## 7. Residual Risk Evaluation

| Document Column | Database Source | Table | Column Path | Calculation |
|----------------|-----------------|-------|-------------|-------------|
| № | Row index | `risk_table_rows` | `row_number` | Sequential |
| Hazard | Risk data | `risk_table_rows` | `data->hazard` | Direct |
| Residual S | Risk data | `risk_table_rows` | `data->severity_residual` | User input after controls |
| Residual P | Risk data | `risk_table_rows` | `data->probability_residual` | User input after controls |
| Residual Risk | Calculated | - | - | `severity_residual * probability_residual` |
| Acceptable? | Calculated | - | - | "Yes" if < 10, "No" if >= 10 |

**Implementation Status**: ✅ Complete, ⚠️ Requires residual risk fields in risk data

---

## 8. Overall Residual Risk Acceptability

| Document Field | Database Source | Calculation | Notes |
|---------------|-----------------|-------------|-------|
| Совокупный остаточный риск | Calculated from all residual risks | Sum or max of all residual scores | **PLACEHOLDER** - formula not yet implemented |
| Приемлемость | Derived from overall risk | Based on threshold | **PLACEHOLDER** |
| Benefit-Risk assessment | Manual input | Not in DB yet | **PLACEHOLDER** - only shown if unacceptable risks remain |

**Implementation Status**: **PLACEHOLDER** - Needs formula configuration

**Recommendation**: Add to `projects` table:
- `overall_risk_formula` (e.g., "SUM", "MAX", "WEIGHTED_AVG")
- `overall_risk_threshold`

---

## 9. Conclusions and Approval

### 9.1 Statistics

| Document Field | Database Source | Calculation |
|---------------|-----------------|-------------|
| Total risks | Count | Number of rows in all risk tables for project |
| Acceptable risks | Calculated | Count of risks with initial score < 10 |
| Unacceptable risks | Calculated | Count of risks with initial score >= 10 |

### 9.2 Approval Signatures Table

| Document Column | Database Source | Table | Column | Notes |
|----------------|-----------------|-------|---------|-------|
| Имя | Team member | `project_members` JOIN `users` | `first_name + last_name` | All team members |
| Должность | Team member role | `project_members` | `role` | Maps to: admin, manager, doctor |
| Подпись | Manual | - | - | Empty (for physical signature) |
| Дата | Generation date | - | - | Document generation date |

**Implementation Status**: ⚠️ Partially implemented - team members listed but roles are generic project roles, not job titles

**Recommendation**: Add `job_title` field to `users` table for proper job titles (e.g., "Risk Management Coordinator", "Quality Manager").

---

## 10. References and Document Control

### 10.1 References

| Document Field | Source | Notes |
|---------------|--------|-------|
| Standards list | Hardcoded | Static list of ISO standards |

**Implementation Status**: ✅ Complete (static)

### 10.2 Document Control

| Document Field | Database Source | Table | Column | Notes |
|---------------|-----------------|-------|---------|-------|
| Document title | Project + generated | `projects` | `device_name` | "Risk Management Report — {device_name}" |
| Document number | Document version | `document_versions` | `report_number` | RMR-{year}-{project_id} |
| Revision | Document version | `document_versions` | `version` | 1.0, 1.1, etc. |
| Status | Hardcoded | - | - | Always "Approved" |
| Effective date | Generation time | `document_versions` | `generated_at` | Document generation timestamp |
| Prepared by | Team member | **PLACEHOLDER** | - | Should map to specific role |
| Reviewed by | Team member | **PLACEHOLDER** | - | Should map to specific role |
| Approved by | Team member | **PLACEHOLDER** | - | Should map to specific role |
| Next review date | Calculated | - | - | **PLACEHOLDER** - not implemented |

**Implementation Status**: ⚠️ Mostly complete, signature roles need implementation

---

## Приложение А (Appendix A)

Full risk management table with all columns:

| Document Column | Database Source | Table | Column Path |
|----------------|-----------------|-------|-------------|
| № | Row index | `risk_table_rows` | `row_number` |
| Lifecycle | Risk data | `risk_table_rows` | `data->lifecycle_stage` |
| Hazard | Risk data | `risk_table_rows` | `data->hazard` |
| Situation | Risk data | `risk_table_rows` | `data->hazardous_situation` |
| Events | Risk data | `risk_table_rows` | `data->sequence_of_events` |
| Harm | Risk data | `risk_table_rows` | `data->harm` |
| S | Risk data | `risk_table_rows` | `data->severity_initial` |
| P | Risk data | `risk_table_rows` | `data->probability_initial` |
| Risk | Calculated | - | `S * P` |
| Controls | Risk data | `risk_table_rows` | `data->control_measures` |

**Implementation Status**: ✅ Complete

---

## JSON Data Structure Examples

### risk_table_rows.data structure:
```json
{
  "lifecycle_stage": "Operation",
  "hazard": "Chemical exposure",
  "hazardous_situation": "Disinfectant leakage from container",
  "sequence_of_events": "Container lid not properly closed, disinfectant spills during transport",
  "harm": "Skin irritation, eye damage from chemical contact",
  "severity_initial": 3,
  "probability_initial": 2,
  "control_measures": "Ensure tight-fitting lid with locking mechanism, user training on proper closure",
  "verification": "Leak test during design validation, periodic inspection",
  "severity_residual": 2,
  "probability_residual": 1
}
```

### projects.lifecycle_stages structure:
```json
["operation", "maintenance", "storage", "transport", "disposal"]
```

### projects.active_hazard_categories structure:
```json
["Biological/Chemical Hazards", "Mechanical Hazards", "Energy-Related Hazards"]
```

### projects.hazard_checklist_answers structure (proposed):
```json
{
  "question_1": {
    "question": "Does the device have contact with the patient?",
    "answer": "No",
    "notes": "Indirect contact only via reprocessed instruments"
  },
  "question_2": {
    "question": "Does the device deliver energy to the patient?",
    "answer": "No",
    "notes": ""
  }
}
```

---

## Missing Database Fields (Placeholders)

The following fields are referenced in the document but **not yet implemented** in the database:

### Projects table additions needed:
- `manufacturer` (VARCHAR) - Manufacturer name
- `manufacturer_address` (TEXT) - Manufacturer full address
- `patient_population` (TEXT) - Description of patient population
- `key_performance_characteristics` (TEXT) - Key performance characteristics
- `safety_characteristics` (TEXT) - Safety-related characteristics
- `risk_formula` (VARCHAR) - Formula for risk calculation (default: "S×P")
- `risk_threshold_low` (INTEGER) - Threshold for low risk (default: 9)
- `risk_threshold_high` (INTEGER) - Threshold for high risk (default: 10)
- `overall_risk_formula` (VARCHAR) - Formula for overall risk (default: "SUM")
- `overall_risk_threshold` (INTEGER) - Threshold for overall acceptability

### Users table additions needed:
- `job_title` (VARCHAR) - Professional job title (e.g., "Risk Management Coordinator")
- `signature` (BLOB or VARCHAR) - Optional digital signature or signature image path

### Project team role mapping needed:
Currently using `project_members.role` (admin/manager/doctor). For document signatures, need mapping:
- Create a separate `project_team_roles` table or extend `project_members` with:
  - `document_role` (VARCHAR) - Role in document (e.g., "Prepared by", "Reviewed by", "Approved by")

---

## Data Retrieval Query Examples

### Get all risk data for a project:
```python
# Get all risk tables for project
risk_tables = db.query(RiskManagementTable).filter(
    RiskManagementTable.project_id == project_id
).all()

# Get all risk rows across all tables
all_risks = []
for table in risk_tables:
    rows = db.query(RiskTableRow).filter(
        RiskTableRow.table_id == table.id
    ).order_by(RiskTableRow.row_index).all()
    all_risks.extend(rows)
```

### Get project team members:
```python
members = db.query(ProjectMember, User).join(
    User, ProjectMember.user_id == User.id
).filter(ProjectMember.project_id == project_id).all()
```

### Calculate risk statistics:
```python
total_risks = len(all_risks)
acceptable = sum(1 for r in all_risks 
                 if (r.data.get('severity_initial', 0) * 
                     r.data.get('probability_initial', 0)) < 10)
unacceptable = total_risks - acceptable
```

---

## Version History and Snapshot

Each generated document version stores a snapshot of the data used:

### document_versions.snapshot_data structure:
```json
{
  "project": {
    "id": 1,
    "device_name": "Universal polypropylene container",
    "device_model": "СР-01",
    "version": "1.0",
    "report_number": "RMR-2025-01"
  },
  "risks_count": 15,
  "team_count": 3,
  "generated_at": "2025-11-07T14:30:00Z"
}
```

This allows viewing historical context even if project data changes.

---

## Implementation Recommendations

### Priority 1 (High Impact):
1. Add manufacturer fields to projects table
2. Implement proper team role assignments for document signatures
3. Add risk formula configuration to projects
4. Complete hazard checklist rendering

### Priority 2 (Medium Impact):
1. Add missing device characteristic fields
2. Implement overall risk calculation logic
3. Add benefit-risk assessment capability
4. Add job titles to users

### Priority 3 (Nice to Have):
1. Make references dynamic/configurable per project
2. Add next review date calculation logic
3. Add digital signature capability
4. Add custom branding/logo support

---

## Contact

For questions about data mapping or document generation:
- Review `app/services/document_generator.py` for implementation details
- Check `app/models/project.py` and `app/models/risk_analysis.py` for data models
- See `app/routers/documents.py` for API endpoints

---

**Last Updated**: November 7, 2025
**Version**: 1.0

