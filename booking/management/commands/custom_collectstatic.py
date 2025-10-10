import os
import shutil
from pathlib import Path
from django.core.management.base import BaseCommand

class Command(BaseCommand):
    help = 'Custom collectstatic command that copies static files safely.'

    def handle(self, *args, **options):
        base_dir = Path(__file__).resolve().parent.parent.parent.parent
        static_root = base_dir / 'staticfiles'
        static_dirs = [
            base_dir / 'static',
            base_dir / 'booking' / 'static',
        ]

        # Create static root
        os.makedirs(static_root, exist_ok=True)

        for static_dir in static_dirs:
            if not static_dir.exists():
                self.stdout.write(self.style.WARNING(f"Static directory not found: {static_dir}"))
                continue

            self.stdout.write(f"Copying files from {static_dir} to {static_root}")

            for item in static_dir.rglob('*'):
                if item.is_file() and not item.name.startswith('.'):
                    rel_path = item.relative_to(static_dir)
                    dest_path = static_root / rel_path
                    os.makedirs(dest_path.parent, exist_ok=True)
                    shutil.copy2(item, dest_path)
                    self.stdout.write(f"  - Copied {rel_path}")

        self.stdout.write(self.style.SUCCESS("Static files collection complete."))
