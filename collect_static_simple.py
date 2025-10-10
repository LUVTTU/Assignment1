import os
import shutil
from pathlib import Path

def collect_static():
    # Define source and destination directories
    base_dir = Path(__file__).parent
    static_root = base_dir / 'staticfiles'
    static_dirs = [
        base_dir / 'static',
        base_dir / 'booking' / 'static',
    ]
    
    # Create static root if it doesn't exist
    os.makedirs(static_root, exist_ok=True)
    
    # Copy files from each static directory
    for static_dir in static_dirs:
        if not static_dir.exists():
            print(f"Warning: Static directory not found: {static_dir}")
            continue
            
        print(f"Copying files from {static_dir} to {static_root}")
        
        for item in static_dir.rglob('*'):
            if item.is_file() and not item.name.startswith('.'):
                rel_path = item.relative_to(static_dir)
                dest_path = static_root / rel_path
                
                # Create destination directory if it doesn't exist
                os.makedirs(dest_path.parent, exist_ok=True)
                
                # Copy the file
                shutil.copy2(item, dest_path)
                print(f"  - Copied {rel_path}")

if __name__ == "__main__":
    collect_static()
    print("Static files collection complete.")
