import { Component, Input, OnChanges, OnInit, SimpleChanges } from '@angular/core';
import { ApiService } from '../../services/api.service';
import { Router } from '@angular/router';
import { localIsoDate } from '../../utils/date';

@Component({
  selector: 'app-notes',
  templateUrl: './notes.component.html',
  styleUrls: ['./notes.component.css']
})
export class NotesComponent implements OnInit, OnChanges {
  @Input() date?: string;
  private todayDate: string = localIsoDate();
  content: string = '';
  moodScore: number = 5;

  isLoading: boolean = false;
  isSaving: boolean = false;
  errorMessage: string = '';
  savedMessage: string = '';

  constructor(private api: ApiService, private router: Router) {}

  ngOnInit(): void {
    // Sécurité : si pas de token, retour au login
    if (!this.api.isLoggedIn()) {
      this.router.navigate(['/login']);
      return;
    }
    this.loadEntry();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['date'] && !changes['date'].firstChange) {
      this.loadEntry();
    }
  }

  loadEntry() {
    this.isLoading = true;
    this.errorMessage = '';
    this.savedMessage = '';
    const targetDate = this.date || this.todayDate;
    this.api.getDailyEntry(targetDate).subscribe({
      next: (data) => {
        this.content = data?.content ?? '';
        this.moodScore = data?.mood_score ?? 5;
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Erreur chargement journal:', err);
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

  saveEntry() {
    this.isSaving = true;
    this.errorMessage = '';
    this.savedMessage = '';
    const targetDate = this.date || this.todayDate;
    this.api.saveDailyEntry({
      date: targetDate,
      content: this.content,
      mood_score: this.moodScore
    }).subscribe({
      next: () => {
        this.isSaving = false;
        this.savedMessage = 'Sauvegardé';
      },
      error: (err) => {
        console.error('Erreur sauvegarde journal:', err);
        this.isSaving = false;
        if (err?.status === 401) {
          this.api.logout();
          this.router.navigate(['/login']);
          return;
        }
        this.errorMessage = "Impossible de sauvegarder le journal.";
      }
    });
  }
}