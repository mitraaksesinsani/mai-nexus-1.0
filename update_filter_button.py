import os
import re

files = [
    'src/app/(dashboard)/master-data/warehouses/page.tsx',
    'src/app/(dashboard)/master-data/materials/page.tsx',
    'src/app/(dashboard)/master-data/vendors/page.tsx',
    'src/app/(dashboard)/master-data/users/page.tsx'
]

for fpath in files:
    if not os.path.exists(fpath):
        continue
    with open(fpath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Update mobile filter trigger button to match input proportion
    content = content.replace(
        'className="w-10 h-10 shrink-0"',
        'className="h-[46px] w-[46px] shrink-0"'
    )

    with open(fpath, 'w', encoding='utf-8') as f:
        f.write(content)

print("Updated mobile filter button on all master-data pages successfully!")
