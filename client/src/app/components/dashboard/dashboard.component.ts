import { Component, OnInit } from '@angular/core';
import { ApiService } from '../../services/api.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit {
  // Données de l'utilisateur
  userName: string = 'Utilisateur';
  today: string = new Date().toISOString().split('T')[0];
  selectedDate: string = new Date().toISOString().split('T')[0];

  // Données du jour (lecture seule)
  tasks: any[] = [];
  goals: any[] = [];
  journalContent: string = '';
  moodScore: number | null = null;

  isLoading: boolean = false;
  errorMessage: string = '';

  constructor(
    private api: ApiService, 
    private router: Router
  ) {}

  ngOnInit(): void {
    // 1. VÉRIFICATION DE SÉCURITÉ IMMÉDIATE
    if (!this.api.isLoggedIn()) {
      console.warn("Pas de token trouvé, redirection vers login...");
      this.router.navigate(['/login']);
      return; // On arrête l'exécution ici
    }

    // 2. RÉCUPÉRATION DES INFOS
    const savedName = localStorage.getItem('user_name');
    if (savedName) this.userName = savedName;

    this.loadDay();
  }

  onDateChange(value: string) {
    this.selectedDate = value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : this.today;
    this.loadDay();
  }

  private loadDay() {
    if (!this.api.isLoggedIn()) return;

    const date = this.selectedDate;
    this.isLoading = true;
    this.errorMessage = '';

    // Tasks
    this.api.getTasks(date).subscribe({
      next: (data) => {
        this.tasks = Array.isArray(data) ? data : [];
      },
      error: (err) => {
        console.error('Erreur chargement tasks (home):', err);
        if (err?.status === 401) {
          this.api.logout();
          this.router.navigate(['/login']);
          return;
        }
        this.errorMessage = "Impossible de charger les tâches.";
      }
    });

    // Goals
    this.api.getGoals(date).subscribe({
      next: (data) => {
        this.goals = Array.isArray(data) ? data : [];
      },
      error: (err) => {
        console.error('Erreur chargement goals (home):', err);
        if (err?.status === 401) {
          this.api.logout();
          this.router.navigate(['/login']);
          return;
        }
        // On ne bloque pas l'affichage si goals échoue.
      }
    });

    // Journal + Mood
    this.api.getDailyEntry(date).subscribe({
      next: (entry) => {
        this.journalContent = entry?.content ?? '';
        const score = entry?.mood_score;
        this.moodScore = typeof score === 'number' ? score : null;
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Erreur chargement journal (home):', err);
        this.isLoading = false;
        if (err?.status === 401) {
          this.api.logout();
          this.router.navigate(['/login']);
          return;
        }
        this.errorMessage = "Impossible de charger le journal.";
      }
    });
  }

  get tasksCompletedCount(): number {
    return this.tasks.filter(t => !!t?.is_completed).length;
  }

  get goalsCompletedCount(): number {
    return this.goals.filter(g => !!g?.is_completed).length;
  }

  get moodIcon(): string {
    switch (this.moodScore) {
      case 1: return '😠';
      case 2: return '😟';
      case 3: return '😐';
      case 4: return '😯';
      case 5: return '😄';
      default: return '—';
    }
  }
}