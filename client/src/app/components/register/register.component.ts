import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { FormBuilder, Validators } from '@angular/forms';
import { ToastService } from '../../services/toast.service';

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
    private fb: FormBuilder,
    private toast: ToastService
  ) {
    // Defensive: si un Event ou un objet se retrouve dans le FormControl, Angular/DOM l'affiche comme "[object Object]".
    // On le corrige automatiquement vers une string.
    this.form.controls.username.valueChanges.subscribe((value) => {
      if (value === null || value === undefined) return;
      if (typeof value === 'string') return;

      const maybeTargetValue = (value as any)?.target?.value;
      const safe = typeof maybeTargetValue === 'string' ? maybeTargetValue : '';
      this.form.controls.username.setValue(safe, { emitEvent: false });
    });
  }

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
        this.toast.success('Inscription réussie ! Connecte-toi maintenant.', { title: 'Bienvenue' });
        this.router.navigate(['/login']);
      },
      error: (err) => {
        this.isSubmitting = false;

        const status = err?.status;
        const rawBackendMessage =
          (typeof err?.error === 'string' ? err.error : null) ??
          err?.error?.error ??
          err?.error?.message ??
          err?.message;
        const backendMessage =
          typeof rawBackendMessage === 'string' && rawBackendMessage.trim().startsWith('<')
            ? null
            : rawBackendMessage;

        if (status === 405) {
          this.errorMessage = "Erreur API (405) : URL API incorrecte (vérifie que tu utilises '/api').";
          return;
        }
        if (status === 0) {
          this.errorMessage = "Serveur injoignable. Démarre le backend (port 3001) et réessaie.";
          return;
        }
        if (status === 404) {
          this.errorMessage = backendMessage || "API introuvable (404). Vérifie l'URL backend configurée.";
          return;
        }

        const base = backendMessage || "Erreur lors de l'inscription.";
        this.errorMessage = typeof status === 'number' ? `${base} (HTTP ${status})` : base;
      }
    });
  }
}