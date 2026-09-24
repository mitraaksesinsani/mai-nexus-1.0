const fs = require('fs');
const path = require('path');

const files = [
    'src/app/(dashboard)/master-data/warehouses/page.tsx',
    'src/app/(dashboard)/master-data/materials/page.tsx',
    'src/app/(dashboard)/master-data/vendors/page.tsx',
    'src/app/(dashboard)/master-data/users/page.tsx'
];

for (const fpath of files) {
    if (!fs.existsSync(fpath)) continue;
    let content = fs.readFileSync(fpath, 'utf8');

    // Search Input
    content = content.replace(
        /(<Input\s+[^>]*?placeholder="Search.*?".*?className="[^"]*)(")/g,
        (match, p1, p2) => p1 + (p1.includes('text-[13px]') ? '' : ' text-[13px]') + p2
    );

    // Add button
    content = content.replace(
        /(<Button[^>]*?onClick=\{openCreateDialog\}[^>]*?className="[^"]*)(")/g,
        (match, p1, p2) => p1.replace('px-[8px]', 'px-2').replace('py-[6px]', 'py-1.5').replace('px-4', 'px-2').replace('py-2', 'py-1.5').replace('h-9', 'h-auto') + (p1.includes('text-[13px]') ? '' : ' text-[13px]') + p2
    );

    // Mobile Filter SheetHeader gap
    content = content.replace('<SheetHeader className="p-0 pb-2 text-left">', '<SheetHeader className="p-0 pb-0 text-left">');
    content = content.replace('<SheetHeader className="p-0 mb-4 text-left">', '<SheetHeader className="p-0 pb-0 text-left">');
    content = content.replace('<SheetHeader className="p-0 mb-2 text-left">', '<SheetHeader className="p-0 pb-0 text-left">');
    
    // Also the gap for the wrapper inside SheetContent
    content = content.replace(
        /(<SheetHeader[^>]*>\s*<SheetTitle>Filter & Sort<\/SheetTitle>\s*<\/SheetHeader>\s*<div className=")flex flex-col gap-4(")/g,
        '$1flex flex-col gap-2$2'
    );

    // Mobile Card Text: Name -> 16px
    content = content.replace(
        /(className=".*?)text-sm(.*?(?:font-semibold|font-medium).*?truncate.*?")/g,
        '$1text-[16px]$2'
    );
    // Mobile Card Text: others -> 13px
    content = content.replace(
        /(className=".*?)text-xs(.*?(?:truncate|leading-4).*?")/g,
        '$1text-[13px]$2'
    );

    fs.writeFileSync(fpath, content, 'utf8');
}

console.log('Done');
