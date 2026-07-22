import { Injectable, signal } from '@angular/core';

export type ToastKind = 'info' | 'error';

@Injectable({ providedIn: 'root' })
export class ToastService {
  readonly message = signal<string>('');
  readonly kind = signal<ToastKind>('info');
  readonly visible = signal<boolean>(false);

  private timer?: ReturnType<typeof setTimeout>;

  show(message: string, kind: ToastKind = 'info'): void {
    this.message.set(message);
    this.kind.set(kind);
    this.visible.set(true);
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.visible.set(false), kind === 'error' ? 4000 : 2200);
  }

  error(message: string): void {
    this.show(message, 'error');
  }
}
