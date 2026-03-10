import { Component } from '@angular/core';
import { ApiService } from '../../services/api.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-sidebar',
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.css']
})
export class SidebarComponent {

  constructor(
    private api: ApiService,
    private router: Router
  ) {}

  logout() {
    if (confirm('Se déconnecter ?')) {
      this.api.logout();
      this.router.navigate(['/login']);
    }
  }
}