import re

with open('src/components/views/DealDetailsView.tsx', 'r') as f:
    content = f.read()

replacements = {
    '-- Vyberte měsíc --': "{t('deal.attributes.selectMonth', '-- Vyberte měsíc --')}",
    'Leden': "{t('deal.attributes.months.january', 'Leden')}",
    'Únor': "{t('deal.attributes.months.february', 'Únor')}",
    'Březen': "{t('deal.attributes.months.march', 'Březen')}",
    'Duben': "{t('deal.attributes.months.april', 'Duben')}",
    'Květen': "{t('deal.attributes.months.may', 'Květen')}",
    'Červen': "{t('deal.attributes.months.june', 'Červen')}",
    'Červenec': "{t('deal.attributes.months.july', 'Červenec')}",
    'Srpen': "{t('deal.attributes.months.august', 'Srpen')}",
    'Září': "{t('deal.attributes.months.september', 'Září')}",
    'Říjen': "{t('deal.attributes.months.october', 'Říjen')}",
    'Listopad': "{t('deal.attributes.months.november', 'Listopad')}",
    'Prosinec': "{t('deal.attributes.months.december', 'Prosinec')}",
    '-- Vyberte zemi --': "{t('deal.attributes.selectCountry', '-- Vyberte zemi --')}",
    'Odebrat': "{t('common.remove', 'Odebrat')}",
    'Přidat': "{t('common.add', 'Přidat')}"
}

for k, v in replacements.items():
    if k in ['-- Vyberte měsíc --', '-- Vyberte zemi --']:
        content = content.replace(">" + k + "<", ">{" + v.split("{")[1] + "}<")
    elif k in ['Odebrat', 'Přidat']:
        content = content.replace(">" + k + "</button>", ">" + v + "</button>")
        content = content.replace("> " + k + "</", "> {" + v.split("{")[1] + "}</")
    else:
        content = content.replace("'" + k + "'", v)

with open('src/components/views/DealDetailsView.tsx', 'w') as f:
    f.write(content)

with open('src/components/views/AdminPanel.tsx', 'r') as f:
    content = f.read()

content = content.replace(">Stávající skladování<", ">{t('deal.attributes.currentStorage', 'Stávající skladování')}<")
content = content.replace(">Žádné typy skladování<", ">{t('common.noStorageTypes', 'Žádné typy skladování')}<")

with open('src/components/views/AdminPanel.tsx', 'w') as f:
    f.write(content)

print("Done DealDetailsView and AdminPanel")
