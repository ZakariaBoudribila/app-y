import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { localIsoDate } from '../../utils/date';

@Component({
  selector: 'app-tasks-page',
  templateUrl: './tasks-page.component.html',
  styleUrls: ['./tasks-page.component.css']
})
export class TasksPageComponent implements OnInit {
  userName: string = 'Utilisateur';
  selectedDate: string = localIsoDate();

  constructor(private api: ApiService, private router: Router) {}

  ngOnInit(): void {
    if (!this.api.isLoggedIn()) {
      this.router.navigate(['/login']);
      return;
    }
    const savedName = localStorage.getItem('user_name');
    if (savedName) this.userName = savedName;
  }
}
