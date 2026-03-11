import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface ConfirmRequest {
  title?: string;
  message: string;
}

interface ConfirmInternalRequest extends ConfirmRequest {
  resolve: (value: boolean) => void;
}

@Injectable({
  providedIn: 'root'
})
export class ConfirmService {
  private readonly requestSubject = new BehaviorSubject<ConfirmInternalRequest | null>(null);
  readonly request$ = this.requestSubject.asObservable();

  confirm(message: string, options?: { title?: string }): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
      this.requestSubject.next({
        message,
        title: options?.title,
        resolve,
      });
    });
  }

  resolve(value: boolean) {
    const current = this.requestSubject.value;
    if (!current) return;
    current.resolve(value);
    this.requestSubject.next(null);
  }
}
