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
  isAdding: boolean = false;
  addErrorMessage: string = '';

  editingTaskId: number | null = null;
  editTaskText: string = '';
  isSavingEdit: boolean = false;
  deletingTaskId: number | null = null;

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

    this.isAdding = true;
    this.addErrorMessage = '';

    this.api.addTask(description, this.selectedDate).subscribe({
      next: () => {
        this.newTaskText = '';
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
  }

  cancelEdit() {
    this.editingTaskId = null;
    this.editTaskText = '';
  }

  saveEdit(task: any) {
    const description = this.editTaskText.trim();
    if (!description) return;

    this.isSavingEdit = true;
    this.api.updateTask(task.id, { description }).subscribe({
      next: () => {
        task.description = description;
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
}