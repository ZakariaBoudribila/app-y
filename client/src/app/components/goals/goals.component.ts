import { Component, Input, OnChanges, OnInit, SimpleChanges } from '@angular/core';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-goals',
  templateUrl: './goals.component.html',
  styleUrls: ['./goals.component.css']
})
export class GoalsComponent implements OnInit, OnChanges {
  @Input() date?: string;
  private selectedDate: string = new Date().toISOString().split('T')[0];
  
  // Liste réelle qui contiendra les données de la base de données
  goals: any[] = [];
  // Variable liée au champ de saisie (input) dans le HTML
  newGoalText: string = '';

  editingGoalId: number | null = null;
  editGoalText: string = '';
  isSavingEdit: boolean = false;
  deletingGoalId: number | null = null;

  constructor(private api: ApiService) {}

  ngOnInit() {
    if (this.date) this.selectedDate = this.date;
    this.loadGoals();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['date'] && typeof this.date === 'string' && this.date) {
      this.selectedDate = this.date;
      this.loadGoals();
    }
  }

  // --- CHARGEMENT ---
  loadGoals() {
    this.api.getGoals(this.selectedDate).subscribe({
      next: (data) => {
        this.goals = data;
      },
      error: (err) => console.error("Erreur lors de la récupération des objectifs", err)
    });
  }

  get title() {
    return 'Objectifs';
  }

  // --- AJOUT (Action du bouton) ---
  addGoal() {
    const description = this.newGoalText.trim();
    if (!description) return;

    this.api.saveGoal({
      description,
      goal_date: this.selectedDate,
      date: this.selectedDate,
      type: 'DATE'
    }).subscribe({
      next: () => {
        this.loadGoals();
        this.newGoalText = '';
      },
      error: (err) => {
        console.error("Détail de l'erreur backend :", err);

        const status = err?.status;
        const backendMessage = err?.error?.error || err?.error?.message;
        if (status === 401) {
          alert("Session expirée ou invalide. Merci de te reconnecter.");
          return;
        }

        alert(
          `Impossible d'ajouter l'objectif (${status ?? 'erreur'}).` +
          (backendMessage ? `\n${backendMessage}` : "\nVérifie la console (F12).")
        );
      }
    });
  }

  // --- MISE À JOUR (Action de la checkbox) ---
  toggleGoal(goal: any) {
    const newStatus = !goal.is_completed;
    
    // On appelle updateTaskStatus ou une méthode équivalente pour les goals
    // Si tu n'as pas encore updateGoalStatus dans ton API Service, 
    // assure-toi d'utiliser le bon nom de méthode.
    this.api.updateGoalStatus(goal.id, newStatus ? 1 : 0).subscribe({
      next: () => {
        goal.is_completed = newStatus;
      },
      error: (err) => console.error("Erreur de mise à jour", err)
    });
  }

  startEdit(goal: any) {
    this.editingGoalId = goal.id;
    this.editGoalText = goal.description ?? '';
  }

  cancelEdit() {
    this.editingGoalId = null;
    this.editGoalText = '';
  }

  saveEdit(goal: any) {
    const description = this.editGoalText.trim();
    if (!description) return;

    this.isSavingEdit = true;
    this.api.updateGoal(goal.id, { description }).subscribe({
      next: () => {
        goal.description = description;
        this.isSavingEdit = false;
        this.cancelEdit();
      },
      error: (err) => {
        this.isSavingEdit = false;
        console.error("Erreur de mise à jour", err);
      }
    });
  }

  deleteGoal(goal: any) {
    this.deletingGoalId = goal.id;
    this.api.deleteGoal(goal.id).subscribe({
      next: () => {
        this.goals = this.goals.filter(g => g.id !== goal.id);
        if (this.editingGoalId === goal.id) this.cancelEdit();
        this.deletingGoalId = null;
      },
      error: (err) => {
        this.deletingGoalId = null;
        console.error("Erreur lors de la suppression", err);
      }
    });
  }
}