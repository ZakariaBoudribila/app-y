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
    password: ['', [Validators.required, Validators.minLength(8)]]
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

    // Si le backend signale "email déjà utilisé", on place une erreur custom sur le champ.
    // Dès que l'utilisateur modifie l'email, on enlève cette erreur.
    this.form.controls.email.valueChanges.subscribe(() => {
      const ctrl = this.form.controls.email;
      const errors = ctrl.errors;
      if (!errors || !errors['emailTaken']) return;

      // On ne supprime que notre erreur custom.
      const { emailTaken, ...rest } = errors as any;
      ctrl.setErrors(Object.keys(rest).length ? rest : null);
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

        const msg = typeof backendMessage === 'string' ? backendMessage : '';
        const looksLikeEmailTaken =
          /email\s*(déjà\s*utilisé|already\s*in\s*use)/i.test(msg) ||
          /email\s*ou\s*nom\s*utilisateur\s*déjà\s*utilisé/i.test(msg);

        // Legacy: 400 + "Email déjà utilisé ..." ; New: 409 + "Email already in use."
        if ((status === 400 || status === 409) && looksLikeEmailTaken) {
          this.emailCtrl.setErrors({ ...(this.emailCtrl.errors || {}), emailTaken: true });
          this.emailCtrl.markAsTouched();
          this.errorMessage = '';
          return;
        }

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