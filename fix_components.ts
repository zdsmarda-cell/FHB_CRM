import fs from 'fs';

let content = fs.readFileSync('src/components/views/DealDetailsView.tsx', 'utf8');

// fix select month
content = content.replace(
  "{t('deal.attributes.selectMonth', '-- Vyberte měsíc --')}}",
  "{t('deal.attributes.selectMonth', '-- Vyberte měsíc --')}"
);

// fix select country
content = content.replace(
  "{t('deal.attributes.selectCountry', '-- Vyberte zemi --')}}",
  "{t('deal.attributes.selectCountry', '-- Vyberte zemi --')}"
);

// fix months array
content = content.replace(
  "[{t('deal.attributes.months.january', 'Leden')}, {t('deal.attributes.months.february', 'Únor')}, {t('deal.attributes.months.march', 'Březen')}, {t('deal.attributes.months.april', 'Duben')}, {t('deal.attributes.months.may', 'Květen')}, {t('deal.attributes.months.june', 'Červen')}, {t('deal.attributes.months.july', 'Červenec')}, {t('deal.attributes.months.august', 'Srpen')}, {t('deal.attributes.months.september', 'Září')}, {t('deal.attributes.months.october', 'Říjen')}, {t('deal.attributes.months.november', 'Listopad')}, {t('deal.attributes.months.december', 'Prosinec')}]",
  "[t('deal.attributes.months.january', 'Leden'), t('deal.attributes.months.february', 'Únor'), t('deal.attributes.months.march', 'Březen'), t('deal.attributes.months.april', 'Duben'), t('deal.attributes.months.may', 'Květen'), t('deal.attributes.months.june', 'Červen'), t('deal.attributes.months.july', 'Červenec'), t('deal.attributes.months.august', 'Srpen'), t('deal.attributes.months.september', 'Září'), t('deal.attributes.months.october', 'Říjen'), t('deal.attributes.months.november', 'Listopad'), t('deal.attributes.months.december', 'Prosinec')]"
);

fs.writeFileSync('src/components/views/DealDetailsView.tsx', content);
