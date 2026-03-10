import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

// On importe les composants vers lesquels on veut naviguer
import { LoginComponent } from './components/login/login.component';
import { RegisterComponent } from './components/register/register.component';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { TasksPageComponent } from './pages/tasks-page/tasks-page.component';
import { JournalPageComponent } from './pages/journal-page/journal-page.component';
import { MoodPageComponent } from './pages/mood-page/mood-page.component';
import { GoalsPageComponent } from './pages/goals-page/goals-page.component';
import { HistoryPageComponent } from './pages/history-page/history-page.component';

const routes: Routes = [
  // Si l'utilisateur tape juste 'localhost:4200', on le redirige vers le login
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  
  // Les routes principales
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'dashboard', component: DashboardComponent },

  // Pages du menu (un seul widget par page)
  { path: 'tasks', component: TasksPageComponent },
  { path: 'journal', component: JournalPageComponent },
  { path: 'mood', component: MoodPageComponent },
  { path: 'goals', component: GoalsPageComponent },
  { path: 'history', component: HistoryPageComponent },

  // Si l'utilisateur tape une adresse qui n'existe pas, on le renvoie au login
  { path: '**', redirectTo: '/login' }
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, {
      anchorScrolling: 'enabled',
      scrollPositionRestoration: 'enabled'
    })
  ],
  exports: [RouterModule]
})
export class AppRoutingModule { }