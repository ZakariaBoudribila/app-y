import { Component, Input, OnChanges, OnInit, SimpleChanges } from '@angular/core';
import { Router } from '@angular/router';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-mood-tracker',
  templateUrl: './mood-tracker.component.html',
  styleUrls: ['./mood-tracker.component.css'] // ou .css selon ton projet
})
export class MoodTrackerComponent implements OnInit {
  // Liste de tes humeurs avec un score de 1 à 5
  moods = [
    { score: 1, icon: '😠', color: '#ffadad' }, // Rouge (Triste/En colère)
    { score: 2, icon: '😟', color: '#ffd6a5' }, // Orange
    { score: 3, icon: '😐', color: '#fdffb6' }, // Jaune (Neutre)
    { score: 4, icon: '😯', color: '#caffbf' }, // Vert clair
    { score: 5, icon: '😄', color: '#9bf6ff' }  // Bleu/Vert (Très bien)
  ];

  // Humeur sélectionnée par défaut (aucune au début)
  selectedMood: number | null = null;

  @Input() date?: string;
  private todayDate: string = new Date().toISOString().split('T')[0];

  constructor(private api: ApiService, private router: Router) {}

  ngOnInit(): void {
    if (!this.api.isLoggedIn()) {
      this.router.navigate(['/login']);
      return;
    }

    this.loadMoodForDate();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['date'] && !changes['date'].firstChange) {
      this.loadMoodForDate();
    }
  }

  private loadMoodForDate() {
    const targetDate = this.date || this.todayDate;
    this.api.getDailyEntry(targetDate).subscribe({
      next: (data) => {
        const score = data?.mood_score;
        this.selectedMood = typeof score === 'number' ? score : 5;
      },
      error: (err) => {
        console.error('Erreur chargement mood:', err);
        if (err?.status === 401) {
          this.api.logout();
          this.router.navigate(['/login']);
        }
      }
    });
  }

  selectMood(score: number) {
    this.selectedMood = score;

    const targetDate = this.date || this.todayDate;
    // IMPORTANT: on n'envoie pas "content" pour éviter d'écraser le journal
    this.api.saveDailyEntry({
      date: targetDate,
      mood_score: score
    }).subscribe({
      error: (err) => {
        console.error('Erreur sauvegarde mood:', err);
        if (err?.status === 401) {
          this.api.logout();
          this.router.navigate(['/login']);
        }
      }
    });
  }
}