import { Component, OnInit } from '@angular/core'; // Ajout de OnInit ici
import { Router } from '@angular/router';          // Ajout de Router ici
import { ApiService } from '../../services/api.service'; // Vérifie bien le chemin vers ton service

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css']
})
export class HeaderComponent implements OnInit {
  today: Date = new Date();
  userName: string | null = 'Utilisateur';

  constructor(
    public api: ApiService, 
    private router: Router
  ) {}

  ngOnInit(): void {
    // On essaie de récupérer le nom de l'utilisateur stocké
    const savedName = localStorage.getItem('user_name');
    if (savedName) {
      this.userName = savedName;
    }
  }

  logout() {
    this.api.logout(); // On vide le token
    this.router.navigate(['/login']); // On redirige vers la connexion
  }
}