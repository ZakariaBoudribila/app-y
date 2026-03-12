import { Injectable } from '@angular/core';

const TOKEN_STORAGE_KEY = 'journal_token';

@Injectable({
  providedIn: 'root'
})
export class TokenService {
  private inMemoryToken: string | null = null;

  getToken(): string | null {
    // Priorité à la mémoire (évite les lectures répétées)
    if (this.inMemoryToken) return this.inMemoryToken;
    const token = localStorage.getItem(TOKEN_STORAGE_KEY);
    this.inMemoryToken = token;
    return token;
  }

  setToken(token: string): void {
    this.inMemoryToken = token;
    localStorage.setItem(TOKEN_STORAGE_KEY, token);
  }

  clearToken(): void {
    this.inMemoryToken = null;
    localStorage.removeItem(TOKEN_STORAGE_KEY);
  }
}
