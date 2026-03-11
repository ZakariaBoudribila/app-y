import { Component } from '@angular/core';
import { ApiService } from '../../services/api.service';
import { Router } from '@angular/router';
import { ConfirmService } from '../../services/confirm.service';

@Component({
  selector: 'app-sidebar',
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.css']
})
export class SidebarComponent {

  constructor(
    private api: ApiService,
    private router: Router,
    private confirmService: ConfirmService
  ) {}

  async logout() {
    const ok = await this.confirmService.confirm('Se déconnecter ?', { title: 'Déconnexion' });
    if (!ok) return;
    this.api.logout();
    this.router.navigate(['/login']);
  }
}