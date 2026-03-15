import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { SidebarComponent } from './components/sidebar/sidebar.component';
import { HeaderComponent } from './components/header/header.component';
import { DailyTodoComponent } from './components/daily-todo/daily-todo.component';
import { MoodTrackerComponent } from './components/mood-tracker/mood-tracker.component';
import { NotesComponent } from './components/notes/notes.component';
import { GoalsComponent } from './components/goals/goals.component';
import { LoginComponent } from './components/login/login.component';
import { RegisterComponent } from './components/register/register.component';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { CalendarHistoryComponent } from './components/calendar-history/calendar-history.component';
import { ToastContainerComponent } from './components/toast-container/toast-container.component';
import { ConfirmDialogComponent } from './components/confirm-dialog/confirm-dialog.component';
import { TasksPageComponent } from './pages/tasks-page/tasks-page.component';
import { JournalPageComponent } from './pages/journal-page/journal-page.component';
import { MoodPageComponent } from './pages/mood-page/mood-page.component';
import { GoalsPageComponent } from './pages/goals-page/goals-page.component';
import { HistoryPageComponent } from './pages/history-page/history-page.component';
import { ProPageComponent } from './pages/pro-page/pro-page.component';

import { AuthInterceptor } from './services/auth.interceptor';


@NgModule({
  declarations: [
    AppComponent,
    SidebarComponent,
    HeaderComponent,
    DailyTodoComponent,
    MoodTrackerComponent,
    NotesComponent,
    GoalsComponent,
    LoginComponent,
    RegisterComponent,
    DashboardComponent,
    CalendarHistoryComponent,
    ToastContainerComponent,
    ConfirmDialogComponent,
    TasksPageComponent,
    JournalPageComponent,
    MoodPageComponent,
    GoalsPageComponent,
    HistoryPageComponent,
    ProPageComponent
  ],
  imports: [
    BrowserModule,
    HttpClientModule,
    FormsModule,
    ReactiveFormsModule,
    CommonModule,
    AppRoutingModule
  ],
  providers: [
    {
      provide: HTTP_INTERCEPTORS,
      useClass: AuthInterceptor,
      multi: true,
    }
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
