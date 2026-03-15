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
import { ProPageComponent } from './pages/pro-page/pro-page.component';
import { SettingsPageComponent } from './pages/settings-page/settings-page.component';

const routes: Routes = [
  // Si l'utilisateur tape juste 'localhost:4200', on le redirige vers le login
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  
  // Les routes principales
  { path: 'login', component: LoginComponent, data: { animation: 'login' } },
  { path: 'register', component: RegisterComponent, data: { animation: 'register' } },
  { path: 'dashboard', component: DashboardComponent, data: { animation: 'dashboard' } },

  // Pages du menu (un seul widget par page)
  { path: 'tasks', component: TasksPageComponent, data: { animation: 'tasks' } },
  { path: 'journal', component: JournalPageComponent, data: { animation: 'journal' } },
  { path: 'mood', component: MoodPageComponent, data: { animation: 'mood' } },
  { path: 'goals', component: GoalsPageComponent, data: { animation: 'goals' } },
  { path: 'history', component: HistoryPageComponent, data: { animation: 'history' } },
  { path: 'pro', component: ProPageComponent, data: { animation: 'pro' } },
  { path: 'settings', component: SettingsPageComponent, data: { animation: 'settings' } },

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