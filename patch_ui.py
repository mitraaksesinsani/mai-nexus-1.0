import os
import glob
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

    # Search Input
    content = re.sub(
        r'(<Input\s+[^>]*?placeholder="Search.*?".*?className="[^"]*)(")',
        lambda m: m.group(1) + ('' if 'text-[13px]' in m.group(1) else ' text-[13px]') + m.group(2),
        content,
        flags=re.DOTALL
    )

    # Add button
    content = re.sub(
        r'(<Button[^>]*?onClick=\{openCreateDialog\}[^>]*?className="[^"]*)(")',
        lambda m: m.group(1).replace('px-[8px]', 'px-2').replace('py-[6px]', 'py-1.5').replace('px-4', 'px-2').replace('py-2', 'py-1.5').replace('h-9', 'h-auto') + ('' if 'text-[13px]' in m.group(1) else ' text-[13px]') + m.group(2),
        content,
        flags=re.DOTALL
    )

    # Mobile Filter SheetHeader gap
    content = content.replace('<SheetHeader className="p-0 pb-2 text-left">', '<SheetHeader className="p-0 pb-0 text-left">')
    content = content.replace('<SheetHeader className="p-0 mb-4 text-left">', '<SheetHeader className="p-0 pb-0 text-left">')
    
    content = re.sub(
        r'(<SheetHeader[^>]*>\s*<SheetTitle>Filter & Sort</SheetTitle>\s*</SheetHeader>\s*<div className=")flex flex-col gap-4(")',
        r'\1flex flex-col gap-2\2',
        content
    )

    # Mobile Card Text: Name -> 16px
    content = re.sub(
        r'(className=".*?)text-sm(.*?(?:font-semibold|font-medium).*?truncate.*?")',
        r'\1text-[16px]\2',
        content
    )
    # Mobile Card Text: others -> 13px (specifically replacing text-xs in the context of mobile cards)
    # We will just replace all `text-xs` that are inside `text-neutral-500` or `text-muted-foreground` and `truncate`
    content = re.sub(
        r'(className=".*?)text-xs(.*?(?:truncate|leading-4).*?")',
        r'\1text-[13px]\2',
        content
    )

    # Drawer max-height adjustments for scrolling forms:
    # Ensure all have !bottom-0 !top-auto !left-0 !translate-x-0 !translate-y-0 sm:!top-1/2 sm:!left-1/2 sm:!-translate-x-1/2 sm:!-translate-y-1/2 !rounded-t-2xl !rounded-b-none sm:!rounded-xl max-h-[90vh] overflow-y-auto
    
    with open(fpath, 'w', encoding='utf-8') as f:
        f.write(content)

print('Done')
