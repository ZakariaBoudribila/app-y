import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { localIsoDate } from '../../utils/date';

@Component({
  selector: 'app-goals-page',
  templateUrl: './goals-page.component.html',
  styleUrls: ['./goals-page.component.css']
})
export class GoalsPageComponent implements OnInit {
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
