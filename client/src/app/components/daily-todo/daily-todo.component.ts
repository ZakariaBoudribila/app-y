import { Component, Input, OnChanges, OnInit, SimpleChanges } from '@angular/core';
import { Router } from '@angular/router';
import { ApiService } from '../../services/api.service'; // On importe le service

@Component({
  selector: 'app-daily-todo',
  templateUrl: './daily-todo.component.html',
  styleUrls: ['./daily-todo.component.css']
})
export class DailyTodoComponent implements OnInit, OnChanges {
  tasks: any[] = [];

  @Input() date?: string;
  private selectedDate: string = new Date().toISOString().split('T')[0];

  newTaskText: string = '';
  newTaskCategory: string = 'Perso';
  isAdding: boolean = false;
  addErrorMessage: string = '';

  editingTaskId: number | null = null;
  editTaskText: string = '';
  editTaskCategory: string = 'Perso';
  isSavingEdit: boolean = false;
  deletingTaskId: number | null = null;

  readonly categories: string[] = ['Pro', 'Perso', 'Études'];

  // On injecte l'API Service dans le constructeur
  constructor(private api: ApiService, private router: Router) {}

  // ngOnInit se lance tout seul quand le composant apparaît à l'écran
  ngOnInit() {
    if (!this.api.isLoggedIn()) {
      this.router.navigate(['/login']);
      return;
    }

    if (this.date) this.selectedDate = this.date;
    this.loadTasks();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['date'] && typeof this.date === 'string' && this.date) {
      this.selectedDate = this.date;
      if (this.api.isLoggedIn()) {
        this.loadTasks();
      }
    }
  }

  // Charger les tâches depuis la base de données
  loadTasks() {
    this.api.getTasks(this.selectedDate).subscribe({
      next: (data) => {
        this.tasks = data; // On remplace nos fausses données par les vraies !
      },
      error: (err) => {
        console.error('Erreur lors du chargement des tâches', err);
        if (err?.status === 401) {
          this.api.logout();
          this.router.navigate(['/login']);
        }
      }
    });
  }

  addTask() {
    const description = this.newTaskText.trim();
    if (!description) return;

    const category = this.normalizeCategory(this.newTaskCategory);

    this.isAdding = true;
    this.addErrorMessage = '';

    this.api.addTask(description, this.selectedDate, category).subscribe({
      next: () => {
        this.newTaskText = '';
        this.newTaskCategory = 'Perso';
        this.isAdding = false;
        this.loadTasks();
      },
      error: (err) => {
        this.isAdding = false;
        console.error('Erreur lors de la création de la tâche', err);
        if (err?.status === 401) {
          this.api.logout();
          this.router.navigate(['/login']);
          return;
        }

        this.addErrorMessage = "Impossible d'ajouter la tâche.";
      }
    });
  }

  // Cocher/Décocher une tâche et sauvegarder en base
  toggleTask(task: any) {
    task.is_completed = !task.is_completed; // On inverse l'état visuellement
    
    // On envoie la modification au serveur
    this.api.updateTaskStatus(task.id, task.is_completed).subscribe({
      error: (err) => {
        console.error('Erreur lors de la mise à jour', err);
        task.is_completed = !task.is_completed; // En cas d'erreur, on annule le changement visuel
        if (err?.status === 401) {
          this.api.logout();
          this.router.navigate(['/login']);
        }
      }
    });
  }

  startEdit(task: any) {
    this.editingTaskId = task.id;
    this.editTaskText = task.description ?? '';
    this.editTaskCategory = this.normalizeCategory(task.category);
  }

  cancelEdit() {
    this.editingTaskId = null;
    this.editTaskText = '';
    this.editTaskCategory = 'Perso';
  }

  saveEdit(task: any) {
    const description = this.editTaskText.trim();
    if (!description) return;

    const category = this.normalizeCategory(this.editTaskCategory);

    this.isSavingEdit = true;
    this.api.updateTask(task.id, { description, category }).subscribe({
      next: () => {
        task.description = description;
        task.category = category;
        this.isSavingEdit = false;
        this.cancelEdit();
      },
      error: (err) => {
        this.isSavingEdit = false;
        console.error('Erreur lors de la mise à jour de la tâche', err);
        if (err?.status === 401) {
          this.api.logout();
          this.router.navigate(['/login']);
        }
      }
    });
  }

  deleteTask(task: any) {
    this.deletingTaskId = task.id;
    this.api.deleteTask(task.id).subscribe({
      next: () => {
        this.tasks = this.tasks.filter(t => t.id !== task.id);
        if (this.editingTaskId === task.id) this.cancelEdit();
        this.deletingTaskId = null;
      },
      error: (err) => {
        this.deletingTaskId = null;
        console.error('Erreur lors de la suppression de la tâche', err);
        if (err?.status === 401) {
          this.api.logout();
          this.router.navigate(['/login']);
        }
      }
    });
  }

  private normalizeCategory(value: any): string {
    const raw = typeof value === 'string' ? value.trim() : '';
    if (this.categories.includes(raw)) return raw;
    return 'Perso';
  }

  get totalTasks(): number {
    return Array.isArray(this.tasks) ? this.tasks.length : 0;
  }

  get completedTasks(): number {
    return (this.tasks || []).filter((t) => !!t?.is_completed).length;
  }

  get completionPercent(): number {
    if (!this.totalTasks) return 0;
    return Math.round((this.completedTasks / this.totalTasks) * 100);
  }

  get byCategory(): Array<{ category: string; total: number; completed: number; percent: number }> {
    const buckets = new Map<string, { total: number; completed: number }>();
    for (const c of this.categories) buckets.set(c, { total: 0, completed: 0 });

    for (const t of this.tasks || []) {
      const c = this.normalizeCategory(t?.category);
      const bucket = buckets.get(c);
      if (!bucket) continue;
      bucket.total += 1;
      if (t?.is_completed) bucket.completed += 1;
    }

    return this.categories
      .map((c) => {
        const b = buckets.get(c) ?? { total: 0, completed: 0 };
        const percent = b.total ? Math.round((b.completed / b.total) * 100) : 0;
        return { category: c, total: b.total, completed: b.completed, percent };
      })
      .filter((x) => x.total > 0);
  }
}