import { Component } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  title = 'client';

  currentUrl = '';

  constructor(private router: Router) {
    this.currentUrl = this.router.url || '';

    this.router.events
      .pipe(
        filter((e): e is NavigationEnd => e instanceof NavigationEnd)
      )
      .subscribe((e) => {
        this.currentUrl = e.urlAfterRedirects || e.url || '';
      });
  }

  get showAssistant(): boolean {
    const url = this.currentUrl || '';
    return !(url.startsWith('/login') || url.startsWith('/register'));
  }
}
