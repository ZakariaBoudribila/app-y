import { Component } from '@angular/core';
import { Router } from '@angular/router'; // Pour rediriger après la connexion
import { ApiService } from '../../services/api.service';
import { FormBuilder, Validators } from '@angular/forms';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  readonly form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]]
  });

  errorMessage = '';
  isSubmitting = false;

  constructor(
    private api: ApiService,
    private router: Router,
    private fb: FormBuilder
  ) {}

  get emailCtrl() {
    return this.form.controls.email;
  }

  get passwordCtrl() {
    return this.form.controls.password;
  }

  onSubmit() {
    this.errorMessage = '';
    this.form.markAllAsTouched();

    if (this.form.invalid) return;

    const email = this.form.value.email ?? '';
    const password = this.form.value.password ?? '';

    this.isSubmitting = true;

    this.api.login(email, password).subscribe({
      next: (response) => {
        // 1. Sauvegarder le token
        this.api.saveToken(response.token);
        // 2. Sauvegarder le nom pour le header
        localStorage.setItem('user_name', response.user.username);
        // 3. SEULEMENT APRÈS, on change de page
        this.isSubmitting = false;
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.isSubmitting = false;
        if (err?.status === 405) {
          this.errorMessage = "Erreur API (405) : URL API incorrecte (vérifie que tu utilises '/api').";
          return;
        }
        if (err?.status === 0) {
          this.errorMessage = "Serveur injoignable. Démarre le backend (port 3001) et réessaie.";
          return;
        }
        const backendMessage = err?.error?.error || err?.error?.message;
        this.errorMessage = backendMessage || "Identifiants incorrects";
      }
    });
  }
}