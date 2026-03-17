import { Component } from '@angular/core';
import { ApiService } from '../../services/api.service';

type ChatMessage = {
  from: 'user' | 'assistant';
  text: string;
};

@Component({
  selector: 'app-support-chat',
  templateUrl: './support-chat.component.html',
  styleUrls: ['./support-chat.component.css']
})
export class SupportChatComponent {
  isOpen = false;
  isSending = false;
  inputMessage = '';

  messages: ChatMessage[] = [];

  constructor(private apiService: ApiService) {}

  get isAuthenticated(): boolean {
    return this.apiService.isLoggedIn();
  }

  private addAssistantNoticeOnce(text: string) {
    const last = this.messages.length ? this.messages[this.messages.length - 1] : null;
    if (last && last.from === 'assistant' && last.text === text) return;
    this.messages = [...this.messages, { from: 'assistant', text }];
  }

  toggleOpen() {
    this.isOpen = !this.isOpen;

    if (this.isOpen && !this.isAuthenticated) {
      this.addAssistantNoticeOnce('Connecte-toi pour utiliser l\'assistant.');
    }
  }

  close() {
    this.isOpen = false;
  }

  send() {
    if (!this.isAuthenticated) {
      this.addAssistantNoticeOnce('Connecte-toi pour utiliser l\'assistant.');
      return;
    }

    const text = this.inputMessage.trim();
    if (!text || this.isSending) return;

    this.messages = [...this.messages, { from: 'user', text }];
    this.inputMessage = '';
    this.isSending = true;

    this.apiService.askAssistant(text).subscribe({
      next: (resp) => {
        const answer = typeof resp?.answer === 'string' ? resp.answer : '';
        this.messages = [...this.messages, { from: 'assistant', text: answer || 'Je n\'ai pas pu générer de réponse.' }];
        this.isSending = false;
      },
      error: (err: any) => {
        const apiMessage = typeof err?.error?.message === 'string' ? err.error.message : '';
        const apiDetail = typeof err?.error?.detail === 'string' ? err.error.detail : '';
        const errorId = typeof err?.error?.errorId === 'string' ? err.error.errorId : '';
        const runtime = err?.error?.runtime;
        const retryAfterSeconds = typeof err?.error?.retryAfterSeconds === 'number' ? err.error.retryAfterSeconds : null;

        const extras: string[] = [];
        if (retryAfterSeconds && Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0) {
          extras.push(`Réessaie dans ${Math.ceil(retryAfterSeconds)} secondes.`);
        }
        if (apiDetail) extras.push(apiDetail);
        if (errorId) extras.push(`errorId=${errorId}`);
        if (runtime && (runtime.vercel === true || runtime.railway === true)) {
          extras.push(`runtime=${runtime.vercel ? 'vercel' : (runtime.railway ? 'railway' : 'unknown')}`);
        }

        const extraText = extras.length ? `\n${extras.join('\n')}` : '';
        this.messages = [
          ...this.messages,
          {
            from: 'assistant',
            text: apiMessage
              ? `Erreur: ${apiMessage}${extraText}`
              : `Désolé, une erreur est survenue. Réessaie dans un instant.${extraText}`,
          },
        ];
        this.isSending = false;
      },
      complete: () => {}
    });
  }

  trackByIndex(index: number) {
    return index;
  }
}
