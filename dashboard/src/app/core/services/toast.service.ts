import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ToastService {
  private _toastMessage = signal<string>('');
  toastMessage = this._toastMessage.asReadonly();

  public show(message: string, duration = 4000) {
    this._toastMessage.set(message);
    setTimeout(() => this._toastMessage.set(''), duration);
  }
}
