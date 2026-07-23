import re

with open('src/components/views/DealDetailsView.tsx', 'r') as f:
    content = f.read()

replacements = {
    'Stávající skladování': "{t('deal.attributes.currentStorage', 'Stávající skladování')}",
    'Odhadovaný počet balíků ročně': "{t('deal.attributes.estimatedYearlyParcels', 'Odhadovaný počet balíků ročně')}",
    'Měsíce sezóny': "{t('deal.attributes.seasonMonths', 'Měsíce sezóny')}",
    'Celkový počet SKU': "{t('deal.attributes.totalSku', 'Celkový počet SKU')}",
    'Produkty, které zákazník prodává': "{t('deal.attributes.productsSold', 'Produkty, které zákazník prodává')}",
    'Používání COD (vyberte zemi a procento)': "{t('deal.attributes.codUsage', 'Používání COD (vyberte zemi a procento)')}",
    'Odhadovaný počet balíků (měsíčně / ročně)': "{t('deal.attributes.estimatedParcelsMonthlyYearly', 'Odhadovaný počet balíků (měsíčně / ročně)')}"
}

for k, v in replacements.items():
    # Only replace exactly inside tags like >text< to avoid breaking things, but since we know where they are...
    content = content.replace('>' + k + '<', '>' + v + '<')

with open('src/components/views/DealDetailsView.tsx', 'w') as f:
    f.write(content)
print("Done DealDetailsView")
