import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
} from '@angular/core';
import { Location } from '@angular/common';
import { SupportCalloutComponent } from '@core/components/support-callout/support-callout';
import { MotionBackgroundComponent } from '@shared-components/motion-background/motion-background.component';
import { AccountRoutePaths } from '@core/constants/routes.constants';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-more-information',
  standalone: true,
  imports: [SupportCalloutComponent, MotionBackgroundComponent, RouterLink],
  templateUrl: './more-information.html',
  styleUrls: ['./more-information.scss'],
})
export class MoreInformation implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('viewport')
  private readonly viewportRef?: ElementRef<HTMLDivElement>;

  slides = [
    {
      icon: 'assets/more-information/money.png',
      title: 'Over R21 Million Paid Out',
      text: 'Since we started, MotionAds has paid out over R21,000,000 to drivers across South Africa — creating financial stability for thousands of families.',
    },
    {
      icon: 'assets/more-information/care.png',
      title: 'Real Support, Real Stories',
      text: 'In our driver spotlight video, you’ll hear directly from drivers who’ve benefited from being part of MotionAds. They share how the extra income helps them provide for their families and improve their lives.',
    },
    {
      icon: 'assets/more-information/bike_icon.png',
      title: 'Ongoing Care',
      text: 'We provide branding maintenance and wrap replacements at no cost to drivers, keeping their bikes professional and well-maintained.',
    },
    {
      icon: 'assets/more-information/community.png',
      title: 'Part of Something Bigger',
      text: 'MotionAds connects top brands with delivery drivers, ensuring drivers share in the rewards while building long-term opportunities.',
    },
  ];

  currentSlide = 0;
  interval: any;
  private ignoreScroll = false;
  private ignoreReleaseId: any;
  private scrollDebounceId: any;

  protected readonly signInRoute = AccountRoutePaths.REGISTER;

  constructor(private readonly location: Location) {}

  ngOnInit(): void {
    this.startAutoSlide();
  }

  ngAfterViewInit(): void {
    this.scrollToSlide(this.currentSlide, 'auto');
  }

  startAutoSlide(): void {
    this.clearAutoSlide();
    this.interval = setInterval(() => this.nextSlide(false), 5000);
  }

  private clearAutoSlide(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }

  private moveToSlide(index: number, fromScroll = false): void {
    this.currentSlide = index;
    if (!fromScroll) {
      this.scrollToSlide(index);
    }
  }

  private handleManualInteraction(): void {
    this.clearAutoSlide();
    this.startAutoSlide();
  }

  private scrollToSlide(
    index: number,
    behavior: ScrollBehavior = 'smooth',
  ): void {
    const viewport = this.viewportRef?.nativeElement;
    if (!viewport) {
      return;
    }
    const targetLeft = index * viewport.clientWidth;
    this.ignoreScroll = true;
    if (this.ignoreReleaseId) {
      clearTimeout(this.ignoreReleaseId);
    }
    viewport.scrollTo({
      left: targetLeft,
      behavior,
    });
    const releaseDelay = behavior === 'smooth' ? 450 : 0;
    this.ignoreReleaseId = setTimeout(() => {
      this.ignoreScroll = false;
      this.ignoreReleaseId = null;
    }, releaseDelay);
  }

  onViewportScroll(): void {
    if (this.ignoreScroll) {
      return;
    }

    const viewport = this.viewportRef?.nativeElement;
    if (!viewport) {
      return;
    }

    const progress = viewport.scrollLeft / Math.max(viewport.clientWidth, 1);
    const instantaneousIndex = Math.round(progress);
    if (instantaneousIndex !== this.currentSlide) {
      this.currentSlide = instantaneousIndex;
    }

    if (this.scrollDebounceId) {
      clearTimeout(this.scrollDebounceId);
    }

    this.scrollDebounceId = setTimeout(() => {
      const index = Math.round(
        viewport.scrollLeft / Math.max(viewport.clientWidth, 1),
      );
      if (index !== this.currentSlide) {
        this.moveToSlide(index, true);
      }
      this.handleManualInteraction();
    }, 120);
  }

  pauseAuto(): void {
    this.clearAutoSlide();
  }

  resumeAuto(): void {
    this.startAutoSlide();
  }

  nextSlide(manual = true): void {
    this.moveToSlide((this.currentSlide + 1) % this.slides.length);
    if (manual) {
      this.handleManualInteraction();
    }
  }

  prevSlide(): void {
    this.moveToSlide(
      (this.currentSlide - 1 + this.slides.length) % this.slides.length,
    );
    this.handleManualInteraction();
  }

  goToSlide(index: number): void {
    this.moveToSlide(index);
    this.handleManualInteraction();
  }

  ngOnDestroy(): void {
    this.clearAutoSlide();
    if (this.scrollDebounceId) {
      clearTimeout(this.scrollDebounceId);
    }
    if (this.ignoreReleaseId) {
      clearTimeout(this.ignoreReleaseId);
    }
  }

  close(): void {
    this.location.back();
  }
}
