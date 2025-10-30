import { Component, inject } from '@angular/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { LoaderService } from '@core/services/loading.service';

@Component({
  selector: 'app-loader',
  standalone: true,
  templateUrl: './loader.html',
  styleUrls: ['./loader.scss'],
  imports: [MatProgressSpinnerModule],
})
export class LoaderComponent {
  loaderService = inject(LoaderService);
  loading = this.loaderService.loading;
}
