import { Component, OnInit, inject } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { ActivatedRoute } from '@angular/router';
import { PageTitleComponent } from '@shared-components/page-title/page-title.component';
import { MotionBackgroundComponent } from '@shared-components/motion-background/motion-background.component';
import { SupportCalloutComponent } from '@core/components/support-callout/support-callout';

@Component({
  selector: 'app-email-passthrough',
  imports: [
    MatIconModule,
    PageTitleComponent,
    MotionBackgroundComponent,
    SupportCalloutComponent,
  ],
  templateUrl: './email-passthrough.html',
  styleUrl: './email-passthrough.scss',
})
export class EmailPassthrough implements OnInit {
  private route = inject(ActivatedRoute);

  ngOnInit(): void {
    // Immediately redirect – no CAPTCHA/MFA gating
    const link = this.passthroughLink();
    try {
      const url = new URL(link);
      // If a link ever points to an MFA route with a returnUrl, go straight to returnUrl
      if (url.pathname.endsWith('/account/mfa')) {
        const returnUrl = url.searchParams.get('returnUrl');
        if (returnUrl) {
          url.search = '';
          url.pathname = returnUrl;
        }
      }
      window.location.href = url.toString();
    } catch {
      // If parsing fails, just use the raw string
      window.location.href = link;
    }
  }

  title() {
    return this.route.snapshot.queryParamMap.get('title') ?? 'Redirecting…';
  }

  passthroughLink() {
    return this.route.snapshot.queryParamMap.get('passthroughLink') ?? '/';
  }
}
