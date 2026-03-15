import { Component, ElementRef, ViewChild } from '@angular/core';
import { FormArray, FormBuilder } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { ConfirmService } from '../../services/confirm.service';
import { ToastService } from '../../services/toast.service';
import { ProfessionalProfile } from '../../models/professional-profile';
import { firstValueFrom } from 'rxjs';

type ExperienceFormValue = {
  title: string;
  company: string;
  period: string;
  description: string;
};

type EducationFormValue = {
  school: string;
  degree: string;
  period: string;
  description: string;
};

type PdfExperience = {
  title: string;
  company: string;
  period: string;
  description: string;
};

type PdfEducation = {
  school: string;
  degree: string;
  period: string;
  description: string;
};

type CvPdfViewModel = {
  fullName: string;
  email: string;
  phone: string;
  address: string;
  linkedin: string;
  avatarDataUrl: string | null;
  aboutMe: string;
  experiences: PdfExperience[];
  education: PdfEducation[];
  languages: string[];
  software: string[];
};

@Component({
  selector: 'app-pro-page',
  templateUrl: './pro-page.component.html',
  styleUrls: ['./pro-page.component.css'],
})
export class ProPageComponent {
  isLoading = true;
  isSaving = false;
  isEditing = false;
  isExportingPdf = false;
  errorMessage = '';

  userVm: { fullName: string; email: string; avatarDataUrl: string | null } | null = null;

  private lastLoadedProfile: ProfessionalProfile | null = null;

  pdfVm: CvPdfViewModel | null = null;
  pdfGeneratedAt: Date | null = null;

  @ViewChild('pdfContent') private pdfContentRef?: ElementRef<HTMLElement>;

  languageInput = '';
  softwareInput = '';

  readonly form = this.fb.group({
    phone: this.fb.control('', { nonNullable: true }),
    address: this.fb.control('', { nonNullable: true }),
    linkedin: this.fb.control('', { nonNullable: true }),
    aboutMe: this.fb.control('', { nonNullable: true }),
    experiences: this.fb.array([] as any[]),
    education: this.fb.array([] as any[]),
    languages: this.fb.control<string[]>([], { nonNullable: true }),
    software: this.fb.control<string[]>([], { nonNullable: true }),
  });

  constructor(
    private readonly fb: FormBuilder,
    private readonly api: ApiService,
    private readonly confirm: ConfirmService,
    private readonly toast: ToastService
  ) {
    this.load();
  }

  get experiencesArray(): FormArray {
    return this.form.controls.experiences as unknown as FormArray;
  }

  get educationArray(): FormArray {
    return this.form.controls.education as unknown as FormArray;
  }

  private createExperienceGroup(value?: Partial<ExperienceFormValue>) {
    return this.fb.group({
      title: this.fb.control(value?.title ?? '', { nonNullable: true }),
      company: this.fb.control(value?.company ?? '', { nonNullable: true }),
      period: this.fb.control(value?.period ?? '', { nonNullable: true }),
      description: this.fb.control(value?.description ?? '', { nonNullable: true }),
    });
  }

  private createEducationGroup(value?: Partial<EducationFormValue>) {
    return this.fb.group({
      school: this.fb.control(value?.school ?? '', { nonNullable: true }),
      degree: this.fb.control(value?.degree ?? '', { nonNullable: true }),
      period: this.fb.control(value?.period ?? '', { nonNullable: true }),
      description: this.fb.control(value?.description ?? '', { nonNullable: true }),
    });
  }

  addExperience(prefill?: Partial<ExperienceFormValue>) {
    this.experiencesArray.push(this.createExperienceGroup(prefill));
  }

  async removeExperience(index: number) {
    if (!this.isEditing) return;
    if (this.experiencesArray.length <= 1) return;

    const ok = await this.confirm.confirm('Supprimer cette expérience ?', { title: 'Expériences' });
    if (!ok) return;

    this.experiencesArray.removeAt(index);
  }

  addEducation(prefill?: Partial<EducationFormValue>) {
    this.educationArray.push(this.createEducationGroup(prefill));
  }

  async removeEducation(index: number) {
    if (!this.isEditing) return;
    if (this.educationArray.length <= 1) return;

    const ok = await this.confirm.confirm('Supprimer cette formation ?', { title: 'Éducation' });
    if (!ok) return;

    this.educationArray.removeAt(index);
  }

  addLanguage() {
    const raw = (this.languageInput || '').trim();
    if (!raw) return;

    const current = this.form.controls.languages.value || [];
    const exists = current.some((x) => x.toLowerCase() === raw.toLowerCase());
    if (exists) {
      this.languageInput = '';
      return;
    }

    this.form.controls.languages.setValue([...current, raw]);
    this.languageInput = '';
  }

  removeLanguage(value: string) {
    const current = this.form.controls.languages.value || [];
    this.form.controls.languages.setValue(current.filter((x) => x !== value));
  }

  addSoftware() {
    const raw = (this.softwareInput || '').trim();
    if (!raw) return;

    const current = this.form.controls.software.value || [];
    const exists = current.some((x) => x.toLowerCase() === raw.toLowerCase());
    if (exists) {
      this.softwareInput = '';
      return;
    }

    this.form.controls.software.setValue([...current, raw]);
    this.softwareInput = '';
  }

  removeSoftware(value: string) {
    const current = this.form.controls.software.value || [];
    this.form.controls.software.setValue(current.filter((x) => x !== value));
  }

  private normalizeIncomingProfile(p: ProfessionalProfile): ProfessionalProfile {
    return {
      phone: typeof (p as any)?.phone === 'string' ? (p as any).phone : '',
      address: typeof (p as any)?.address === 'string' ? (p as any).address : '',
      linkedin: typeof (p as any)?.linkedin === 'string' ? (p as any).linkedin : '',
      aboutMe: typeof p?.aboutMe === 'string' ? p.aboutMe : '',
      experiences: Array.isArray(p?.experiences) ? p.experiences : [],
      education: Array.isArray(p?.education) ? p.education : [],
      languages: Array.isArray(p?.languages) ? p.languages.filter((x) => typeof x === 'string') : [],
      software: Array.isArray(p?.software) ? p.software.filter((x) => typeof x === 'string') : [],
    };
  }

  private normalizeStringArray(values: unknown): string[] {
    if (!Array.isArray(values)) return [];

    const out: string[] = [];
    const seen = new Set<string>();

    for (const v of values) {
      if (typeof v !== 'string') continue;
      const trimmed = v.trim();
      if (!trimmed) continue;
      const key = trimmed.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(trimmed);
    }

    return out;
  }

  private setFormFromProfile(profile: ProfessionalProfile) {
    this.form.controls.phone.setValue(profile.phone || '');
    this.form.controls.address.setValue(profile.address || '');
    this.form.controls.linkedin.setValue(profile.linkedin || '');
    this.form.controls.aboutMe.setValue(profile.aboutMe || '');

    this.experiencesArray.clear();
    this.educationArray.clear();

    for (const exp of profile.experiences || []) {
      this.addExperience(this.toExperienceFormValue(exp));
    }

    for (const edu of profile.education || []) {
      this.addEducation(this.toEducationFormValue(edu));
    }

    this.form.controls.languages.setValue(this.normalizeStringArray(profile.languages));
    this.form.controls.software.setValue(this.normalizeStringArray(profile.software));

    this.form.markAsPristine();
    this.form.markAsUntouched();
  }

  private getPayloadFromForm(): ProfessionalProfile {
    const raw = this.form.getRawValue();

    return {
      phone: raw.phone || '',
      address: raw.address || '',
      linkedin: raw.linkedin || '',
      aboutMe: raw.aboutMe || '',
      experiences: (raw.experiences as any[]) || [],
      education: (raw.education as any[]) || [],
      languages: this.normalizeStringArray(raw.languages),
      software: this.normalizeStringArray(raw.software),
    };
  }

  startEdit() {
    if (this.isLoading || this.isSaving) return;

    this.isEditing = true;
    this.form.enable({ emitEvent: false });

    // UX: quand on passe en édition, on met au moins une ligne.
    if (this.experiencesArray.length === 0) this.addExperience();
    if (this.educationArray.length === 0) this.addEducation();
  }

  async cancelEdit() {
    if (!this.isEditing) return;
    if (this.isSaving) return;

    if (this.form.dirty) {
      const ok = await this.confirm.confirm('Annuler les modifications non enregistrées ?', { title: 'Espace Pro' });
      if (!ok) return;
    }

    if (this.lastLoadedProfile) {
      this.setFormFromProfile(this.lastLoadedProfile);
    }

    this.languageInput = '';
    this.softwareInput = '';
    this.isEditing = false;
    this.form.disable({ emitEvent: false });
  }

  async refresh() {
    if (this.isLoading || this.isSaving) return;

    if (this.isEditing && this.form.dirty) {
      const ok = await this.confirm.confirm('Rafraîchir et perdre les modifications non enregistrées ?', { title: 'Espace Pro' });
      if (!ok) return;
    }

    this.load();
  }

  private toExperienceFormValue(item: any): ExperienceFormValue {
    return {
      title: typeof item?.title === 'string' ? item.title : '',
      company: typeof item?.company === 'string' ? item.company : '',
      period: typeof item?.period === 'string' ? item.period : '',
      description: typeof item?.description === 'string' ? item.description : '',
    };
  }

  private toEducationFormValue(item: any): EducationFormValue {
    return {
      school: typeof item?.school === 'string' ? item.school : '',
      degree: typeof item?.degree === 'string' ? item.degree : '',
      period: typeof item?.period === 'string' ? item.period : '',
      description: typeof item?.description === 'string' ? item.description : '',
    };
  }

  private load() {
    this.isLoading = true;
    this.errorMessage = '';

    // Infos utilisateur (nom/prénom/photo/email) pour l'en-tête du CV.
    this.api.getMe().subscribe({
        next: (resp) => {
        const u = resp?.user as any;
        const first = typeof u?.first_name === 'string' ? u.first_name.trim() : '';
        const last = typeof u?.last_name === 'string' ? u.last_name.trim() : '';
        const fullName = `${first} ${last}`.trim() || '—';
        const email = typeof u?.email === 'string' ? u.email : '';
        const avatarDataUrl = typeof u?.avatar_data_url === 'string' ? u.avatar_data_url : null;
        this.userVm = { fullName, email, avatarDataUrl };
      },
      error: () => {
        // Non bloquant (on garde juste un header minimal).
        this.userVm = { fullName: '—', email: '', avatarDataUrl: null };
      },
    });

    this.api.getProfile().subscribe({
      next: (resp) => {
        const profile = this.normalizeIncomingProfile(resp?.profile as any);

        this.lastLoadedProfile = profile;
        this.setFormFromProfile(profile);

        // Mode lecture par défaut (évite d'afficher des lignes vides).
        this.isEditing = false;
        this.form.disable({ emitEvent: false });

        this.languageInput = '';
        this.softwareInput = '';

        this.isLoading = false;
      },
      error: (err) => {
        this.isLoading = false;
        const status = err?.status;
        const msg = err?.error?.message || err?.message;
        this.errorMessage = typeof msg === 'string' ? msg : `Erreur chargement profil (HTTP ${status || '?'})`;
      },
    });
  }

  save() {
    this.errorMessage = '';
    if (this.isSaving) return;
    if (!this.isEditing) return;

    this.isSaving = true;

    const payload = this.getPayloadFromForm();

      this.api.updateProfile(payload).subscribe({
      next: (resp) => {
        this.isSaving = false;

        const saved = this.normalizeIncomingProfile((resp?.profile as any) ?? payload);
        this.lastLoadedProfile = saved;
        this.setFormFromProfile(saved);

        this.isEditing = false;
        this.form.disable({ emitEvent: false });

        this.toast.success('Profil Pro enregistré.', { title: 'Espace Pro' });
      },
      error: (err) => {
        this.isSaving = false;
        const status = err?.status;
        const msg = err?.error?.message || err?.message;
        this.errorMessage = typeof msg === 'string' ? msg : `Erreur sauvegarde profil (HTTP ${status || '?'})`;
      },
    });
  }

  private cleanCvForPdf(profile: ProfessionalProfile, user: { fullName: string; email: string; avatarDataUrl: string | null }): CvPdfViewModel {
    const trim = (v: unknown) => (typeof v === 'string' ? v.trim() : '');

    const experiences = (profile.experiences || [])
      .map((x) => ({
        title: trim((x as any)?.title),
        company: trim((x as any)?.company),
        period: trim((x as any)?.period),
        description: trim((x as any)?.description),
      }))
      .filter((x) => x.title || x.company || x.period || x.description);

    const education = (profile.education || [])
      .map((x) => ({
        school: trim((x as any)?.school),
        degree: trim((x as any)?.degree),
        period: trim((x as any)?.period),
        description: trim((x as any)?.description),
      }))
      .filter((x) => x.school || x.degree || x.period || x.description);

    return {
      fullName: user.fullName,
      email: user.email,
      phone: trim((profile as any)?.phone),
      address: trim((profile as any)?.address),
      linkedin: trim((profile as any)?.linkedin),
      avatarDataUrl: user.avatarDataUrl,
      aboutMe: trim(profile.aboutMe),
      experiences,
      education,
      languages: this.normalizeStringArray(profile.languages),
      software: this.normalizeStringArray(profile.software),
    };
  }

  private async loadUserForPdf(): Promise<{ fullName: string; email: string; avatarDataUrl: string | null }> {
    try {
      const resp = await firstValueFrom(this.api.getMe());
      const u = resp?.user as any;
      const first = typeof u?.first_name === 'string' ? u.first_name.trim() : '';
      const last = typeof u?.last_name === 'string' ? u.last_name.trim() : '';
      const fullName = `${first} ${last}`.trim() || '—';
      const email = typeof u?.email === 'string' ? u.email : '';
      const avatarDataUrl = typeof u?.avatar_data_url === 'string' ? u.avatar_data_url : null;
      return { fullName, email, avatarDataUrl };
    } catch {
      return { fullName: '—', email: '', avatarDataUrl: null };
    }
  }

  private async waitForPdfDomRender() {
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
  }

  async downloadPdf() {
    if (this.isLoading || this.isSaving || this.isExportingPdf) return;

    this.errorMessage = '';
    this.isExportingPdf = true;

    try {
      const [{ default: html2canvas }, { default: JsPDF }] = await Promise.all([
        import('html2canvas'),
        import('jspdf'),
      ]);

      const user = await this.loadUserForPdf();
      const source = this.cleanCvForPdf(this.getPayloadFromForm(), user);
      this.pdfVm = source;
      this.pdfGeneratedAt = new Date();

      await this.waitForPdfDomRender();

      const el = this.pdfContentRef?.nativeElement;
      if (!el) throw new Error('Contenu PDF introuvable.');

      const canvas = await html2canvas(el, {
        backgroundColor: '#ffffff',
        scale: 2,
        useCORS: true,
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new JsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      const imgWidth = pageWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let y = 0;
      let remaining = imgHeight;

      // On dessine la même image avec un offset Y pour simuler la pagination.
      while (remaining > 0) {
        pdf.addImage(imgData, 'PNG', 0, y, imgWidth, imgHeight);
        remaining -= pageHeight;

        if (remaining > 0) {
          pdf.addPage();
          y -= pageHeight;
        }
      }

      pdf.save('cv-pro.pdf');
      this.toast.success('CV téléchargé (PDF).', { title: 'Espace Pro' });
    } catch (e: any) {
      const msg = typeof e?.message === 'string' ? e.message : 'Erreur génération PDF.';
      this.toast.error(msg, { title: 'Espace Pro' });
    } finally {
      this.isExportingPdf = false;
      this.pdfVm = null;
      this.pdfGeneratedAt = null;
    }
  }
}
