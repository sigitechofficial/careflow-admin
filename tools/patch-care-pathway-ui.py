from pathlib import Path

types = Path(r'd:/New folder/Care/care-admin/src/features/settings/care-pathway/care-pathway.types.ts')
t = types.read_text(encoding='utf-8')
if 'ia-care-plan-triggers' not in t:
    t = t.replace(
        "  | 'care-plan-text'\n  | 'checklists'",
        "  | 'care-plan-text'\n  | 'ia-care-plan-triggers'\n  | 'checklists'",
    )
    t = t.replace(
        "  'care-plan-text',\n  'checklists',",
        "  'care-plan-text',\n  'ia-care-plan-triggers',\n  'checklists',",
    )
    types.write_text(t, encoding='utf-8')
    print('types ok')

panel = Path(r'd:/New folder/Care/care-admin/src/features/settings/components/CarePathwayPanel.tsx')
p = panel.read_text(encoding='utf-8')
if 'InitialAssessmentCarePlanTriggersTab' not in p:
    p = p.replace(
        "import { FormBuilderTab } from '@/features/care-pathway/components/FormBuilderTab'\n",
        "import { FormBuilderTab } from '@/features/care-pathway/components/FormBuilderTab'\n"
        "import { InitialAssessmentCarePlanTriggersTab } from '@/features/care-pathway/components/InitialAssessmentCarePlanTriggersTab'\n",
    )
    p = p.replace(
        "  { id: 'care-plan-text', label: 'Care Plan Text', Icon: Users },\n  { id: 'checklists',",
        "  { id: 'care-plan-text', label: 'Care Plan Text', Icon: Users },\n"
        "  { id: 'ia-care-plan-triggers', label: 'IA Care Plan Triggers', Icon: BookOpen },\n"
        "  { id: 'checklists',",
    )
    p = p.replace(
        "      {activeTab === 'care-plan-text' && <CarePlanTextTab />}\n      {activeTab === 'checklists'",
        "      {activeTab === 'care-plan-text' && <CarePlanTextTab />}\n"
        "      {activeTab === 'ia-care-plan-triggers' && <InitialAssessmentCarePlanTriggersTab />}\n"
        "      {activeTab === 'checklists'",
    )
    panel.write_text(p, encoding='utf-8')
    print('panel ok')

print('done')
