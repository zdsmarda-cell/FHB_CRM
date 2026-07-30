import re

with open('src/i18n.ts', 'r') as f:
    content = f.read()

# English replacements
content = content.replace('Estimated monthly parcels > 0', 'Estimated monthly orders > 0')
content = content.replace('Estimated yearly parcels', 'Estimated yearly orders')
content = content.replace('Estimated monthly parcels', 'Estimated monthly orders')
content = content.replace('Estimated parcels (monthly / yearly)', 'Estimated orders (monthly / yearly)')

# Czech replacements
content = content.replace('Odhadovaný měsíční počet balíků', 'Odhadovaný měsíční počet objednávek')
content = content.replace('Odhadovaný počet balíků ročně', 'Odhadovaný počet objednávek ročně')
content = content.replace('Odhadovaný počet balíků (měsíčně / ročně)', 'Odhadovaný počet objednávek (měsíčně / ročně)')

with open('src/i18n.ts', 'w') as f:
    f.write(content)

with open('src/components/views/DealDetailsView.tsx', 'r') as f:
    content = f.read()

content = content.replace('Odhadovaný počet balíků ročně', 'Odhadovaný počet objednávek ročně')
content = content.replace('Odhadovaný počet balíků (měsíčně / ročně)', 'Odhadovaný počet objednávek (měsíčně / ročně)')

with open('src/components/views/DealDetailsView.tsx', 'w') as f:
    f.write(content)

print("Done string replacement")
