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

    # 1. Update Title (e.g. <h1 className="text-3xl font-bold tracking-tight">)
    content = re.sub(
        r'text-3xl font-bold',
        r'text-[24px] font-medium',
        content
    )
    content = re.sub(
        r'text-2xl font-bold',
        r'text-[24px] font-medium',
        content
    )

    # 2. Update Total Metrics Card
    # Wrapper
    content = content.replace(
        'bg-white rounded-xl shadow-[0px_1px_2px_0px_rgba(16,24,40,0.05)] outline outline-1 outline-offset-[-1px] outline-gray-200',
        'bg-white dark:bg-card rounded-xl shadow-[0px_1px_2px_0px_rgba(16,24,40,0.05)] outline outline-1 outline-offset-[-1px] outline-gray-200 dark:outline-gray-800'
    )
    # Divider
    content = content.replace(
        'h-px bg-gray-200',
        'h-px bg-gray-200 dark:bg-gray-800'
    )
    # Total Text (e.g. Total Material) -> 14px + dark mode
    content = content.replace(
        "text-slate-600 text-sm font-normal font-['Inter']",
        "text-slate-600 dark:text-slate-400 text-[14px] font-normal font-['Inter']"
    )
    # Metric Number -> 18px + dark mode
    content = content.replace(
        "text-gray-900 text-lg font-semibold font-['Inter']",
        "text-gray-900 dark:text-gray-100 text-[18px] font-semibold font-['Inter']"
    )

    # 3. Update Add Button
    content = content.replace(
        'text-[13px] px-[8px] py-[6px] h-auto',
        'text-[16px] px-[14px] py-[10px] h-auto'
    )

    # 4. Update Search Input
    content = content.replace(
        'pl-9 bg-background h-10 text-[13px]',
        'pl-9 bg-background h-auto py-[10px] text-[16px]'
    )

    with open(fpath, 'w', encoding='utf-8') as f:
        f.write(content)

print("Updated all master-data pages successfully!")
