import { Component } from '@angular/core';

@Component({
  selector: 'app-sidebar',
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.css']
})
export class SidebarComponent {
  mobileMenuOpen = false;

  constructor() {}

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
}