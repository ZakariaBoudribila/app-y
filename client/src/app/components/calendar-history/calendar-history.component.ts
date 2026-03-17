import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
import { Router } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { localIsoDate, parseIsoDateLocal } from '../../utils/date';

type HistoryDaySummary = {
  tasks_total?: number;
  tasks_completed?: number;
  has_journal?: boolean;
  mood_score?: number | null;
};

type HistorySummaryResponse = {
  from: string;
  to: string;
  days: Record<string, HistoryDaySummary>;
};

@Component({
  selector: 'app-calendar-history',
  templateUrl: './calendar-history.component.html',
  styleUrls: ['./calendar-history.component.css']
})
export class CalendarHistoryComponent implements OnInit, OnChanges {
  @Input() date?: string;
  @Input() compact: boolean = false;
  @Output() dateChange = new EventEmitter<string>();

  todayIso = localIsoDate();
  selectedDateIso = this.todayIso;

  // Mois affiché (on utilise le 1er du mois)
  monthCursor = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

  isLoadingSummary = false;
  isLoadingDetails = false;
  errorMessage = '';

  summary: Record<string, HistoryDaySummary> = {};

  // Détails du jour sélectionné
  tasks: any[] = [];
  goals: any[] = [];
  journalContent = '';
  moodScore: number | null = null;

  constructor(private api: ApiService, private router: Router) {}

  ngOnInit(): void {
    if (!this.api.isLoggedIn()) {
      this.router.navigate(['/login']);
      return;
    }

    if (typeof this.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(this.date)) {
      this.selectedDateIso = this.date;
      const d = parseIsoDateLocal(this.date) ?? new Date();
      this.monthCursor = new Date(d.getFullYear(), d.getMonth(), 1);
    }

    this.loadMonthSummary();
    if (!this.compact) {
      this.loadSelectedDayDetails();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['date'] && typeof this.date === 'string' && this.date && /^\d{4}-\d{2}-\d{2}$/.test(this.date)) {
      if (this.selectedDateIso === this.date) return;

      this.selectedDateIso = this.date;
      const d = parseIsoDateLocal(this.date) ?? new Date();
      const shouldMoveMonth =
        d.getFullYear() !== this.monthCursor.getFullYear() || d.getMonth() !== this.monthCursor.getMonth();

      if (shouldMoveMonth) {
        this.monthCursor = new Date(d.getFullYear(), d.getMonth(), 1);
        if (this.api.isLoggedIn()) {
          this.loadMonthSummary();
        }
      }

      if (!this.compact && this.api.isLoggedIn()) {
        this.loadSelectedDayDetails();
      }
    }
  }

  get monthTitle(): string {
    return this.monthCursor.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  }

  prevMonth(): void {
    this.monthCursor = new Date(this.monthCursor.getFullYear(), this.monthCursor.getMonth() - 1, 1);
    this.loadMonthSummary();
  }

  nextMonth(): void {
    this.monthCursor = new Date(this.monthCursor.getFullYear(), this.monthCursor.getMonth() + 1, 1);
    this.loadMonthSummary();
  }

  selectDay(dateIso: string): void {
    this.selectedDateIso = dateIso;
    this.dateChange.emit(dateIso);
    if (!this.compact) {
      this.loadSelectedDayDetails();
    }
  }

  hasActivity(dateIso: string): boolean {
    const day = this.summary[dateIso];
    if (!day) return false;
    return !!day.has_journal || (day.tasks_total || 0) > 0;
  }

  // Calendrier: retourne une grille de semaines, chaque case = ISO date
  get calendarGrid(): string[][] {
    const firstDay = new Date(this.monthCursor.getFullYear(), this.monthCursor.getMonth(), 1);
    const lastDay = new Date(this.monthCursor.getFullYear(), this.monthCursor.getMonth() + 1, 0);

    // On démarre au lundi (0..6 => lundi..dimanche)
    const start = new Date(firstDay);
    const jsDay = start.getDay(); // 0=dimanche
    const offsetToMonday = (jsDay + 6) % 7;
    start.setDate(start.getDate() - offsetToMonday);

    const end = new Date(lastDay);
    const endJsDay = end.getDay();
    const endOffsetToSunday = (7 - ((endJsDay + 6) % 7) - 1 + 7) % 7;
    end.setDate(end.getDate() + endOffsetToSunday);

    const grid: string[][] = [];
    const cursor = new Date(start);

    while (cursor <= end) {
      const week: string[] = [];
      for (let i = 0; i < 7; i++) {
        week.push(localIsoDate(cursor));
        cursor.setDate(cursor.getDate() + 1);
      }
      grid.push(week);
    }

    return grid;
  }

  isInCurrentMonth(dateIso: string): boolean {
    const d = parseIsoDateLocal(dateIso) ?? new Date(dateIso);
    return d.getFullYear() === this.monthCursor.getFullYear() && d.getMonth() === this.monthCursor.getMonth();
  }

  private loadMonthSummary(): void {
    const from = localIsoDate(new Date(this.monthCursor.getFullYear(), this.monthCursor.getMonth(), 1));
    const to = localIsoDate(new Date(this.monthCursor.getFullYear(), this.monthCursor.getMonth() + 1, 0));

    this.isLoadingSummary = true;
    this.errorMessage = '';

    this.api.getHistorySummary(from, to).subscribe({
      next: (res: HistorySummaryResponse) => {
        this.summary = res?.days || {};
        this.isLoadingSummary = false;
      },
      error: (err) => {
        console.error('Erreur chargement historique:', err);
        this.isLoadingSummary = false;
        if (err?.status === 401) {
          this.api.logout();
          this.router.navigate(['/login']);
          return;
        }
        this.errorMessage = "Impossible de charger l'historique.";
      }
    });
  }

  private loadSelectedDayDetails(): void {
    const date = this.selectedDateIso;
    this.isLoadingDetails = true;

    this.api.getTasks(date).subscribe({
      next: (data) => {
        this.tasks = data || [];
        this.isLoadingDetails = false;
      },
      error: (err) => {
        console.error('Erreur chargement tasks:', err);
        this.isLoadingDetails = false;
        if (err?.status === 401) {
          this.api.logout();
          this.router.navigate(['/login']);
        }
      }
    });

    this.api.getGoals(date).subscribe({
      next: (data) => {
        this.goals = data || [];
      },
      error: (err) => {
        console.error('Erreur chargement goals:', err);
        if (err?.status === 401) {
          this.api.logout();
          this.router.navigate(['/login']);
        }
      }
    });

    this.api.getDailyEntry(date).subscribe({
      next: (entry) => {
        this.journalContent = entry?.content ?? '';
        const score = entry?.mood_score;
        this.moodScore = typeof score === 'number' ? score : null;
      },
      error: (err) => {
        console.error('Erreur chargement journal:', err);
        if (err?.status === 401) {
          this.api.logout();
          this.router.navigate(['/login']);
        }
      }
    });
  }

  get selectedSummary(): HistoryDaySummary {
    return this.summary[this.selectedDateIso] || {};
  }

  get isFutureSelected(): boolean {
    return this.selectedDateIso > this.todayIso;
  }
}
