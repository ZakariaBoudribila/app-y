import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { FormBuilder, Validators } from '@angular/forms';

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css']
})
export class RegisterComponent {
  readonly form = this.fb.group({
    username: ['', [Validators.required, Validators.minLength(2)]],
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

  get usernameCtrl() {
    return this.form.controls.username;
  }

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

    const username = this.form.value.username ?? '';
    const email = this.form.value.email ?? '';
    const password = this.form.value.password ?? '';

    this.isSubmitting = true;

    this.api.register(username, email, password).subscribe({
      next: () => {
        // Une fois inscrit, on le renvoie vers la page de login
        this.isSubmitting = false;
        alert('Inscription réussie ! Connecte-toi maintenant.');
        this.router.navigate(['/login']);
      },
      error: (err) => {
        this.isSubmitting = false;
        const backendMessage = err?.error?.error || err?.error?.message;
        if (err?.status === 405) {
          this.errorMessage = "Erreur API (405) : URL API incorrecte (vérifie que tu utilises '/api').";
          return;
        }
        if (err?.status === 0) {
          this.errorMessage = "Serveur injoignable. Démarre le backend (port 3001) et réessaie.";
          return;
        }
        this.errorMessage = backendMessage || "Erreur lors de l'inscription.";
      }
    });
  }
}