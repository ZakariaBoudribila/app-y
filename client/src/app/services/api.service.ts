import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { TokenService } from './token.service';
import { ProfessionalProfile } from '../models/professional-profile';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  // Base URL API (en dev: proxy Angular -> http://localhost:3000)
  private baseUrl = environment.apiBaseUrl;

  constructor(
    private http: HttpClient,
    private tokenService: TokenService
  ) { }

  // --- GESTION DU TOKEN ---
  // On récupère le token et on le met dans le header Authorization
  private getHeaders(): HttpHeaders {
    const token = this.tokenService.getToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return new HttpHeaders(headers);
  }

  // ==========================================
  // AUTHENTIFICATION (LOGIN / REGISTER)
  // ==========================================

  register(username: string, email: string, password: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/users/register`, { username, email, password });
  }

  login(email: string, password: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/users/login`, { email, password }, { withCredentials: true });
  }

  // Nouveau: logout côté serveur (révoque refresh cookie)
  logoutRequest(): Observable<any> {
    return this.http.post(`${this.baseUrl}/auth/logout`, {}, { withCredentials: true });
  }

  // ==========================================
  // PROFIL PRO (CV)
  // ==========================================

  getProfile(): Observable<{ profile: ProfessionalProfile }> {
    return this.http.get<{ profile: ProfessionalProfile }>(`${this.baseUrl}/profile`, { headers: this.getHeaders() });
  }

  saveProfile(data: ProfessionalProfile): Observable<{ profile: ProfessionalProfile }> {
    return this.http.post<{ profile: ProfessionalProfile }>(`${this.baseUrl}/profile`, data, { headers: this.getHeaders() });
  }

  // ==========================================
  // REQUÊTES POUR LES TÂCHES (DAILY TO-DO)
  // ==========================================
  
  getTasks(date: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/tasks`, { 
      params: { date }, 
      headers: this.getHeaders() 
    });
  }

  addTask(description: string, date: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/tasks`, { description, date }, { headers: this.getHeaders() });
  }

  updateTask(
    taskId: number,
    payload: { description?: string; is_completed?: number | boolean }
  ): Observable<any> {
    return this.http.put(`${this.baseUrl}/tasks/${taskId}`, payload, { headers: this.getHeaders() });
  }

  updateTaskStatus(taskId: number, isCompleted: boolean): Observable<any> {
    // On envoie is_completed (avec underscore) pour correspondre au controller
    return this.updateTask(taskId, { is_completed: isCompleted ? 1 : 0 });
  }

  deleteTask(taskId: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/tasks/${taskId}`, { headers: this.getHeaders() });
  }

  // ==========================================
  // REQUÊTES POUR LES OBJECTIFS (GOALS)
  // ==========================================

  saveGoal(goalData: { description: string; goal_date?: string; date?: string; type?: string }): Observable<any> {
    return this.http.post(`${this.baseUrl}/goals`, goalData, { headers: this.getHeaders() });
  }

  // Ajoute aussi celle-ci pour que les cases à cocher fonctionnent
  updateGoalStatus(goalId: number, is_completed: number): Observable<any> {
    return this.updateGoal(goalId, { is_completed });
  }

  updateGoal(
    goalId: number,
    payload: { description?: string; is_completed?: number | boolean; goal_date?: string | null }
  ): Observable<any> {
    return this.http.put(`${this.baseUrl}/goals/${goalId}`, payload, { headers: this.getHeaders() });
  }

  getGoals(date: string): Observable<any> {
    const params = new HttpParams().set('date', date);
    return this.http.get(`${this.baseUrl}/goals`, { params, headers: this.getHeaders() });
  }

  deleteGoal(goalId: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/goals/${goalId}`, { headers: this.getHeaders() });
  }

  // ==========================================
  // HISTORIQUE / CALENDRIER
  // ==========================================

  getHistorySummary(from: string, to: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/history/summary`, {
      params: { from, to },
      headers: this.getHeaders()
    });
  }

  // ==========================================
  // REQUÊTES POUR LE JOURNAL & MOOD
  // ==========================================

  getDailyEntry(date: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/journal`, { 
      params: { date }, 
      headers: this.getHeaders() 
    });
  }

  // Cette méthode correspond à saveJournalEntry de ton controller
  saveDailyEntry(data: { date: string; content?: string | null; mood_score?: number | null }): Observable<any> {
    return this.http.post(`${this.baseUrl}/journal`, data, { headers: this.getHeaders() });
  }

  // ==========================================
  // UTILITAIRES DE SESSION
  // ==========================================

  // (Compat) utilisé par LoginComponent
  saveToken(token: string) {
    this.tokenService.setToken(token);
  }

  isLoggedIn(): boolean {
    return !!this.tokenService.getToken();
  }

  logout() {
    this.tokenService.clearToken();
    localStorage.removeItem('user_name');
  }
}