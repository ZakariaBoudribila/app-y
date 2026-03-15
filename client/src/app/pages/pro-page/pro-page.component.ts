import { Component } from '@angular/core';
import { FormArray, FormBuilder } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { ToastService } from '../../services/toast.service';
import { ProfessionalProfile } from '../../models/professional-profile';

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

@Component({
  selector: 'app-pro-page',
  templateUrl: './pro-page.component.html',
  styleUrls: ['./pro-page.component.css'],
})
export class ProPageComponent {
  isLoading = true;
  isSaving = false;
  errorMessage = '';

  languageInput = '';
  softwareInput = '';

  readonly form = this.fb.group({
    aboutMe: this.fb.control('', { nonNullable: true }),
    experiences: this.fb.array([] as any[]),
    education: this.fb.array([] as any[]),
    languages: this.fb.control<string[]>([], { nonNullable: true }),
    software: this.fb.control<string[]>([], { nonNullable: true }),
  });

  constructor(
    private readonly fb: FormBuilder,
    private readonly api: ApiService,
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

  removeExperience(index: number) {
    this.experiencesArray.removeAt(index);
  }

  addEducation(prefill?: Partial<EducationFormValue>) {
    this.educationArray.push(this.createEducationGroup(prefill));
  }

  removeEducation(index: number) {
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
      aboutMe: typeof p?.aboutMe === 'string' ? p.aboutMe : '',
      experiences: Array.isArray(p?.experiences) ? p.experiences : [],
      education: Array.isArray(p?.education) ? p.education : [],
      languages: Array.isArray(p?.languages) ? p.languages.filter((x) => typeof x === 'string') : [],
      software: Array.isArray(p?.software) ? p.software.filter((x) => typeof x === 'string') : [],
    };
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

  load() {
    this.isLoading = true;
    this.errorMessage = '';

    this.api.getProfile().subscribe({
      next: (resp) => {
        const profile = this.normalizeIncomingProfile(resp?.profile as any);

        this.form.controls.aboutMe.setValue(profile.aboutMe || '');

        this.experiencesArray.clear();
        this.educationArray.clear();

        for (const exp of profile.experiences || []) {
          this.addExperience(this.toExperienceFormValue(exp));
        }

        for (const edu of profile.education || []) {
          this.addEducation(this.toEducationFormValue(edu));
        }

        this.form.controls.languages.setValue(profile.languages || []);
        this.form.controls.software.setValue(profile.software || []);

        // UX: si vide, on met une ligne de base.
        if (this.experiencesArray.length === 0) this.addExperience();
        if (this.educationArray.length === 0) this.addEducation();

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

    this.isSaving = true;

    const payload: ProfessionalProfile = {
      aboutMe: this.form.controls.aboutMe.value || '',
      experiences: (this.experiencesArray.value as any[]) || [],
      education: (this.educationArray.value as any[]) || [],
      languages: this.form.controls.languages.value || [],
      software: this.form.controls.software.value || [],
    };

    this.api.saveProfile(payload).subscribe({
      next: () => {
        this.isSaving = false;
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
}
