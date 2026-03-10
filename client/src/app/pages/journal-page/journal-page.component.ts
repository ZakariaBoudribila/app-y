import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-journal-page',
  templateUrl: './journal-page.component.html',
  styleUrls: ['./journal-page.component.css']
})
export class JournalPageComponent implements OnInit {
  userName: string = 'Utilisateur';
  selectedDate: string = new Date().toISOString().split('T')[0];
  private todayDate: string = new Date().toISOString().split('T')[0];

  constructor(private api: ApiService, private router: Router) {}

  ngOnInit(): void {
    if (!this.api.isLoggedIn()) {
      this.router.navigate(['/login']);
      return;
    }
    const savedName = localStorage.getItem('user_name');
    if (savedName) this.userName = savedName;
  }

  onDateChange(value: string) {
    this.selectedDate = value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : this.todayDate;
  }
}
