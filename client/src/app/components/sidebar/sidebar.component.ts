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
  mobileMenuOpen = false;

  constructor(
    private api: ApiService,
    private router: Router,
    private confirmService: ConfirmService
  ) {}

  toggleMobileMenu() {
    this.mobileMenuOpen = !this.mobileMenuOpen;
  }

  closeMobileMenu() {
    if (!this.isMobileViewport()) return;
    this.mobileMenuOpen = false;
  }

  private isMobileViewport(): boolean {
    return typeof window !== 'undefined' && !!window.matchMedia?.('(max-width: 768px)').matches;
  }

  async logout() {
    const ok = await this.confirmService.confirm('Se déconnecter ?', { title: 'Déconnexion' });
    if (!ok) return;

    this.closeMobileMenu();
    this.api.logout();
    this.router.navigate(['/login']);
  }
}