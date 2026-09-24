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

    # Find the old button and remove it
    # Pattern to match the button with openCreateDialog
    # <Button className="gap-2 shrink-0 w-full sm:w-auto text-[16px] px-[14px] py-[10px] h-auto" onClick={openCreateDialog}>
    #   <Plus className="w-4 h-4" /> Add ...
    # </Button>
    old_button_pattern = r'<Button[^>]*?onClick=\{openCreateDialog\}[^>]*?>\s*<Plus[^>]*/>.*?</Button>'
    
    # We also need to check if removing it leaves an empty <div className="flex items-center gap-2"> if selectedIds is empty
    # But usually selectedIds is there. Let's just remove the button.
    content = re.sub(old_button_pattern, '', content, flags=re.DOTALL)

    # Insert the new button after the mobile filter trigger
    # The mobile filter trigger ends with:
    #             </div>
    #           </div>
    #
    #           <div className="hidden sm:flex gap-4">
    # We can inject it right after the closing </div> of the mobile filter sheet, which is inside the search wrapper
    
    # The structure is:
    #             <div className="block sm:hidden shrink-0">
    #               <Sheet>
    #                 ...
    #               </Sheet>
    #             </div>
    #           </div>
    
    # We can search for:
    #             <div className="block sm:hidden shrink-0">
    #               <Sheet>
    #                 ...
    #               </Sheet>
    #             </div>
    
    # Actually, a more robust way:
    # Find: </Sheet>\s*</div>\s*</div>\s*<div className="hidden sm:flex gap-4">
    # Or just replace the mobile filter wrapper closing div:
    mobile_filter_end_pattern = r'(</Sheet>\s*</div>)\s*(</div>)'
    
    replacement = r'''\1
            <Button size="icon" className="shrink-0 h-[46px] w-[46px]" onClick={openCreateDialog}>
              <Plus className="w-5 h-5" />
            </Button>
          \2'''
    
    content = re.sub(mobile_filter_end_pattern, replacement, content, count=1)

    with open(fpath, 'w', encoding='utf-8') as f:
        f.write(content)

print("Updated add button position and style successfully!")
