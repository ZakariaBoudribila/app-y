import { Component, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { Router } from '@angular/router';

import { ApiService } from '../../services/api.service';
import { ToastService } from '../../services/toast.service';
import { ConfirmService } from '../../services/confirm.service';

type MeUser = {
  id: number;
  username: string;
  email: string;
  role?: string;
};

@Component({
  selector: 'app-settings-page',
  templateUrl: './settings-page.component.html',
  styleUrls: ['./settings-page.component.css'],
})
export class SettingsPageComponent implements OnInit {
  me: MeUser | null = null;
  isLoadingMe = false;

  isSubmittingPassword = false;
  passwordErrorMessage = '';

  passwordForm = this.fb.group(
    {
      currentPassword: ['', [Validators.required]],
      newPassword: ['', [Validators.required, Validators.minLength(8)]],
      confirmNewPassword: ['', [Validators.required, Validators.minLength(8)]],
    },
    {
      validators: (group) => {
        const newPassword = group.get('newPassword')?.value;
        const confirm = group.get('confirmNewPassword')?.value;
        if (!newPassword || !confirm) return null;
        return newPassword === confirm ? null : { passwordMismatch: true };
      },
    }
  );

  constructor(
    private readonly api: ApiService,
    private readonly toast: ToastService,
    private readonly confirmService: ConfirmService,
    private readonly fb: FormBuilder,
    private readonly router: Router
  ) {}

  get currentPasswordCtrl() {
    return this.passwordForm.get('currentPassword');
  }

  get newPasswordCtrl() {
    return this.passwordForm.get('newPassword');
  }

  get confirmNewPasswordCtrl() {
    return this.passwordForm.get('confirmNewPassword');
  }

  ngOnInit(): void {
    void this.loadMe();
  }

  async loadMe() {
    this.isLoadingMe = true;
    try {
      const resp = await firstValueFrom(this.api.getMe());
      this.me = resp?.user ?? null;
    } catch {
      this.me = null;
    } finally {
      this.isLoadingMe = false;
    }
  }

  async submitPasswordChange() {
    this.passwordErrorMessage = '';

    if (this.passwordForm.invalid) {
      this.passwordForm.markAllAsTouched();
      return;
    }

    const currentPassword = this.currentPasswordCtrl?.value ?? '';
    const newPassword = this.newPasswordCtrl?.value ?? '';

    this.isSubmittingPassword = true;
    try {
      await firstValueFrom(this.api.changePassword(currentPassword, newPassword));
      this.toast.success('Mot de passe mis à jour.', { title: 'Sécurité' });
      this.passwordForm.reset();
    } catch (err: any) {
      const message =
        err?.error?.message ||
        err?.error?.error ||
        'Impossible de mettre à jour le mot de passe.';
      this.passwordErrorMessage = message;
      this.toast.error(message, { title: 'Sécurité' });
    } finally {
      this.isSubmittingPassword = false;
    }
  }

  async logout() {
    const ok = await this.confirmService.confirm('Se déconnecter ?', { title: 'Déconnexion' });
    if (!ok) return;

    try {
      await firstValueFrom(this.api.logoutRequest());
    } catch {
      // On déconnecte quand même côté client.
    }

    this.api.logout();
    this.router.navigate(['/login']);
  }
}
