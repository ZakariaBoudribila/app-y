import { Component, Input, OnChanges, OnInit, SimpleChanges } from '@angular/core';
import { Router } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { localIsoDate } from '../../utils/date';

@Component({
  selector: 'app-mood-tracker',
  templateUrl: './mood-tracker.component.html',
  styleUrls: ['./mood-tracker.component.css'] // ou .css selon ton projet
})
export class MoodTrackerComponent implements OnInit {
  // Liste de tes humeurs avec un score de 1 à 5
  moods = [
    { score: 1, iconClass: 'bi-emoji-angry-fill', color: '#ffadad', label: 'Très mal' },
    { score: 2, iconClass: 'bi-emoji-frown-fill', color: '#ffd6a5', label: 'Mal' },
    { score: 3, iconClass: 'bi-emoji-neutral-fill', color: '#fdffb6', label: 'Neutre' },
    { score: 4, iconClass: 'bi-emoji-smile-fill', color: '#caffbf', label: 'Bien' },
    { score: 5, iconClass: 'bi-emoji-laughing-fill', color: '#9bf6ff', label: 'Très bien' }
  ];

  // Humeur sélectionnée par défaut (aucune au début)
  selectedMood: number | null = null;

  @Input() date?: string;
  private todayDate: string = localIsoDate();

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