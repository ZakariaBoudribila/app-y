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

  toggleOpen() {
    this.isOpen = !this.isOpen;
  }

  close() {
    this.isOpen = false;
  }

  send() {
    const text = this.inputMessage.trim();
    if (!text || this.isSending) return;

    this.messages = [...this.messages, { from: 'user', text }];
    this.inputMessage = '';
    this.isSending = true;

    this.apiService.askAssistant(text).subscribe({
      next: (resp) => {
        const answer = typeof resp?.answer === 'string' ? resp.answer : '';
        this.messages = [...this.messages, { from: 'assistant', text: answer || 'Je n\'ai pas pu générer de réponse.' }];
      },
      error: () => {
        this.messages = [...this.messages, { from: 'assistant', text: "Désolé, une erreur est survenue. Réessaie dans un instant." }];
      },
      complete: () => {
        this.isSending = false;
      }
    });
  }

  trackByIndex(index: number) {
    return index;
  }
}
