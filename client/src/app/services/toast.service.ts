import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  title?: string;
  durationMs?: number;
  createdAt: number;
}

@Injectable({
  providedIn: 'root'
})
export class ToastService {
  private readonly toastsSubject = new BehaviorSubject<Toast[]>([]);
  readonly toasts$ = this.toastsSubject.asObservable();

  success(message: string, options?: Partial<Omit<Toast, 'id' | 'type' | 'message' | 'createdAt'>>): string {
    return this.show('success', message, options);
  }

  error(message: string, options?: Partial<Omit<Toast, 'id' | 'type' | 'message' | 'createdAt'>>): string {
    return this.show('error', message, options);
  }

  info(message: string, options?: Partial<Omit<Toast, 'id' | 'type' | 'message' | 'createdAt'>>): string {
    return this.show('info', message, options);
  }

  warning(message: string, options?: Partial<Omit<Toast, 'id' | 'type' | 'message' | 'createdAt'>>): string {
    return this.show('warning', message, options);
  }

  dismiss(id: string) {
    const current = this.toastsSubject.value;
    this.toastsSubject.next(current.filter(t => t.id !== id));
  }

  clear() {
    this.toastsSubject.next([]);
  }

  private show(type: ToastType, message: string, options?: Partial<Omit<Toast, 'id' | 'type' | 'message' | 'createdAt'>>): string {
    const id = this.generateId();
    const toast: Toast = {
      id,
      type,
      message,
      title: options?.title,
      durationMs: options?.durationMs,
      createdAt: Date.now()
    };

    this.toastsSubject.next([toast, ...this.toastsSubject.value]);

    const duration = toast.durationMs ?? this.defaultDuration(type);
    if (duration > 0) {
      window.setTimeout(() => this.dismiss(id), duration);
    }

    return id;
  }

  private defaultDuration(type: ToastType): number {
    if (type === 'error') return 6500;
    if (type === 'warning') return 5500;
    return 3500;
  }

  private generateId(): string {
    // Compatible browsers: use crypto.randomUUID when available.
    // Fallback keeps it deterministic enough for UI keys.
    const anyCrypto = globalThis as any;
    if (anyCrypto?.crypto?.randomUUID) return anyCrypto.crypto.randomUUID();
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }
}
