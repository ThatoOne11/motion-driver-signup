import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';

@Component({
  selector: 'app-document-uploader',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatButtonModule, MatTooltipModule],
  templateUrl: './document-uploader.html',
  styleUrl: './document-uploader.scss',
})
export class DocumentUploaderComponent {
  @Input() label = '';
  @Input() accept = 'image/*,.pdf';
  @Output() fileSelected = new EventEmitter<File>();
  @Input() canRemove = false;
  @Output() remove = new EventEmitter<void>();

  dragging = false;
  fileName: string | null = null;

  async onFileInput(e: Event) {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
      const processed = await this.maybeConvertHeic(file);
      this.fileName = processed.name;
      this.fileSelected.emit(processed);
    }
  }

  async onDrop(e: DragEvent) {
    e.preventDefault();
    this.dragging = false;
    const file = e.dataTransfer?.files?.[0];
    if (file) {
      const processed = await this.maybeConvertHeic(file);
      this.fileName = processed.name;
      this.fileSelected.emit(processed);
    }
  }

  onDragOver(e: DragEvent) {
    e.preventDefault();
    this.dragging = true;
  }

  onDragLeave(e: DragEvent) {
    e.preventDefault();
    this.dragging = false;
  }

  onRemoveClick() {
    this.fileName = null;
    this.remove.emit();
  }

  private isHeic(file: File): boolean {
    const t = (file.type || '').toLowerCase();
    const n = (file.name || '').toLowerCase();
    return (
      t.includes('heic') ||
      t.includes('heif') ||
      /\.heic$/.test(n) ||
      /\.heif$/.test(n)
    );
  }

  private async maybeConvertHeic(file: File): Promise<File> {
    if (!this.isHeic(file)) return file;
    try {
      // Try decode via createImageBitmap first
      const bitmap = await createImageBitmap(file).catch(async () => {
        // Fallback: use HTMLImageElement + object URL
        const url = URL.createObjectURL(file);
        try {
          const img = await new Promise<HTMLImageElement>((resolve, reject) => {
            const i = new Image();
            i.onload = () => resolve(i);
            i.onerror = (err) => reject(err);
            i.src = url;
          });
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth;
          canvas.height = img.naturalHeight;
          const ctx = canvas.getContext('2d');
          if (!ctx) return file;
          ctx.drawImage(img, 0, 0);
          const blob: Blob | null = await new Promise((resolve) =>
            canvas.toBlob(resolve, 'image/jpeg', 0.92),
          );
          URL.revokeObjectURL(url);
          if (!blob) return file;
          return await createImageBitmap(blob);
        } finally {
          URL.revokeObjectURL(url);
        }
      });

      // Draw to canvas and export JPEG
      const canvas = document.createElement('canvas');
      canvas.width = (bitmap as any).width;
      canvas.height = (bitmap as any).height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return file;
      ctx.drawImage(bitmap as any, 0, 0);
      const outBlob: Blob | null = await new Promise((resolve) =>
        canvas.toBlob(resolve, 'image/jpeg', 0.92),
      );
      if (!outBlob) return file;
      const newName = file.name.replace(/\.(heic|heif)$/i, '.jpg');
      return new File([outBlob], newName, { type: 'image/jpeg' });
    } catch {
      // If conversion fails, return original file; server OCR may fail but upload still works
      return file;
    }
  }
}
