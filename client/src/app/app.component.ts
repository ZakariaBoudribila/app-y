import { Component } from '@angular/core';
import { animate, query, style, transition, trigger } from '@angular/animations';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
  animations: [
    trigger('routeAnimations', [
      transition('* <=> *', [
        query(':leave', [
          animate('120ms ease-in', style({ opacity: 0 }))
        ], { optional: true }),
        query(':enter', [
          style({ opacity: 0, transform: 'translateY(8px)' }),
          animate('200ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
        ], { optional: true }),
      ]),
    ])
  ]
})
export class AppComponent {
  title = 'client';

  getRouteAnimation(outlet: RouterOutlet): string {
    // Utilise le path comme "state" pour forcer une transition à chaque navigation.
    return outlet?.activatedRouteData?.['animation'] || outlet?.activatedRoute?.routeConfig?.path || 'root';
  }
}
