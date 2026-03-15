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
  first_name?: string | null;
  last_name?: string | null;
  avatar_data_url?: string | null;
};

@Component({
  selector: 'app-settings-page',
  templateUrl: './settings-page.component.html',
  styleUrls: ['./settings-page.component.css'],
})
export class SettingsPageComponent implements OnInit {
  me: MeUser | null = null;
  isLoadingMe = false;

  isEditingProfile = false;
  isSavingProfile = false;
  profileErrorMessage = '';

  profileForm = this.fb.group({
    firstName: ['', [Validators.required, Validators.minLength(2)]],
    lastName: ['', [Validators.required, Validators.minLength(2)]],
  });

  avatarPreviewUrl: string | null = null;
  private pendingAvatarDataUrl: string | null | undefined = undefined;

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

      this.avatarPreviewUrl = (this.me?.avatar_data_url ?? null) || null;
      this.pendingAvatarDataUrl = undefined;

      this.profileForm.patchValue({
        firstName: (this.me?.first_name ?? '') || '',
        lastName: (this.me?.last_name ?? '') || '',
      });
    } catch {
      this.me = null;
    } finally {
      this.isLoadingMe = false;
    }
  }

  startEditProfile() {
    if (!this.me) return;
    this.profileErrorMessage = '';
    this.isEditingProfile = true;
    this.profileForm.patchValue({
      firstName: (this.me.first_name ?? '') || '',
      lastName: (this.me.last_name ?? '') || '',
    });

    this.pendingAvatarDataUrl = (this.me.avatar_data_url ?? null) || null;
    this.avatarPreviewUrl = this.pendingAvatarDataUrl;
    this.profileForm.markAsPristine();
  }

  cancelEditProfile() {
    this.profileErrorMessage = '';
    this.isEditingProfile = false;
    if (!this.me) return;
    this.profileForm.patchValue({
      firstName: (this.me.first_name ?? '') || '',
      lastName: (this.me.last_name ?? '') || '',
    });

    this.pendingAvatarDataUrl = undefined;
    this.avatarPreviewUrl = (this.me.avatar_data_url ?? null) || null;
    this.profileForm.markAsPristine();
  }

  async onAvatarFileSelected(evt: Event) {
    const input = evt.target as HTMLInputElement | null;
    const file = input?.files?.[0];
    if (!file) return;

    try {
      const dataUrl = await this.resizeImageToDataUrl(file, 256, 0.86);
      this.pendingAvatarDataUrl = dataUrl;
      this.avatarPreviewUrl = dataUrl;
      this.profileForm.markAsDirty();
    } catch (e: any) {
      const msg = typeof e?.message === 'string' ? e.message : 'Impossible de charger la photo.';
      this.toast.error(msg, { title: 'Photo de profil' });
    } finally {
      // Permet de re-sélectionner le même fichier.
      if (input) input.value = '';
    }
  }

  removeAvatar() {
    if (!this.isEditingProfile) return;
    this.pendingAvatarDataUrl = null;
    this.avatarPreviewUrl = null;
    this.profileForm.markAsDirty();
  }

  private async resizeImageToDataUrl(file: File, maxSize: number, quality: number): Promise<string> {
    if (!file.type.startsWith('image/')) {
      throw new Error('Format invalide: sélectionne une image.');
    }

    // Fichiers très lourds (photos téléphone): on laisse passer mais on resize.
    const originalDataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('Lecture du fichier impossible.'));
      reader.onload = () => resolve(String(reader.result || ''));
      reader.readAsDataURL(file);
    });

    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error('Image invalide.'));
      i.src = originalDataUrl;
    });

    const scale = Math.min(maxSize / img.width, maxSize / img.height, 1);
    const w = Math.max(1, Math.round(img.width * scale));
    const h = Math.max(1, Math.round(img.height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas non supporté.');

    ctx.drawImage(img, 0, 0, w, h);

    const out = canvas.toDataURL('image/jpeg', quality);
    // Garde-fou (doit rester raisonnable pour DB / Vercel payload)
    if (out.length > 350_000) {
      throw new Error('Photo trop lourde. Essaye une image plus petite.');
    }
    return out;
  }

  async saveProfile() {
    this.profileErrorMessage = '';
    this.profileForm.markAllAsTouched();
    if (this.profileForm.invalid) return;

    const firstName = this.profileForm.value.firstName ?? '';
    const lastName = this.profileForm.value.lastName ?? '';
    const avatarDataUrl = this.pendingAvatarDataUrl;

    this.isSavingProfile = true;
    try {
      const resp = await firstValueFrom(this.api.updateProfile(firstName, lastName, avatarDataUrl));
      this.me = resp?.user ?? this.me;
      this.avatarPreviewUrl = (this.me?.avatar_data_url ?? null) || null;
      this.pendingAvatarDataUrl = undefined;
      this.toast.success('Profil mis à jour.', { title: 'Profil' });
      this.isEditingProfile = false;
    } catch (err: any) {
      const message =
        err?.error?.message ||
        err?.error?.error ||
        'Impossible de mettre à jour le profil.';
      this.profileErrorMessage = message;
      this.toast.error(message, { title: 'Profil' });
    } finally {
      this.isSavingProfile = false;
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
