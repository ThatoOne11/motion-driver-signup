import { DomSanitizer } from '@angular/platform-browser';
import { MatIconRegistry } from '@angular/material/icon';

export function registerCustomSvgIcons(
  iconRegistry: MatIconRegistry,
  sanitizer: DomSanitizer
): void {
  const assetsIconPath = 'assets/icons/';
  const icons = [
    {
      name: 'logo',
      path: assetsIconPath + 'logo.svg',
    },
  ];

  for (const icon of icons) {
    iconRegistry.addSvgIcon(
      icon.name,
      sanitizer.bypassSecurityTrustResourceUrl(icon.path)
    );
  }
}
