import { Component, OnInit } from '@angular/core';
import { FormArray, FormBuilder, FormGroup } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { UserProfile, CvEducation, CvExperience } from '../../models/cv.model';

@Component({
  selector: 'app-professional-space',
  templateUrl: './professional-space.component.html',
  styleUrls: ['./professional-space.component.css']
})
export class ProfessionalSpaceComponent implements OnInit {
  isLoading = false;
  isSaving = false;
  errorMessage = '';

  form = this.fb.group({
    aboutMe: [''],
    languagesText: [''],
    softwareText: [''],
    experiences: this.fb.array<FormGroup>([]),
    education: this.fb.array<FormGroup>([]),
  });

  constructor(
    private readonly fb: FormBuilder,
    private readonly api: ApiService,
  ) {}

  ngOnInit(): void {
    this.load();
  }

  get experiencesArray(): FormArray<FormGroup> {
    return this.form.get('experiences') as FormArray<FormGroup>;
  }

  get educationArray(): FormArray<FormGroup> {
    return this.form.get('education') as FormArray<FormGroup>;
  }

  private parseCommaList(value: unknown): string[] {
    if (typeof value !== 'string') return [];
    return value
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }

  private newExperienceGroup(value?: Partial<CvExperience>): FormGroup {
    return this.fb.group({
      title: [value?.title ?? ''],
      company: [value?.company ?? ''],
      startDate: [value?.startDate ?? ''],
      endDate: [value?.endDate ?? ''],
      description: [value?.description ?? ''],
    });
  }

  private newEducationGroup(value?: Partial<CvEducation>): FormGroup {
    return this.fb.group({
      school: [value?.school ?? ''],
      degree: [value?.degree ?? ''],
      startDate: [value?.startDate ?? ''],
      endDate: [value?.endDate ?? ''],
      description: [value?.description ?? ''],
    });
  }

  addExperience(value?: Partial<CvExperience>) {
    this.experiencesArray.push(this.newExperienceGroup(value));
  }

  removeExperience(index: number) {
    this.experiencesArray.removeAt(index);
  }

  addEducation(value?: Partial<CvEducation>) {
    this.educationArray.push(this.newEducationGroup(value));
  }

  removeEducation(index: number) {
    this.educationArray.removeAt(index);
  }

  load() {
    this.isLoading = true;
    this.errorMessage = '';

    this.api.getUserProfile().subscribe({
      next: (resp) => {
        const profile = resp?.profile;
        this.applyProfile(profile);
        this.isLoading = false;
      },
      error: (err) => {
        this.isLoading = false;
        const status = err?.status;
        const msg = err?.error?.message || err?.message;
        this.errorMessage = typeof msg === 'string' ? msg : `Erreur chargement (HTTP ${status || '?'})`;
      }
    });
  }

  private applyProfile(profile?: UserProfile | null) {
    const safe: UserProfile = {
      aboutMe: profile?.aboutMe ?? '',
      experiences: Array.isArray(profile?.experiences) ? profile!.experiences : [],
      education: Array.isArray(profile?.education) ? profile!.education : [],
      languages: Array.isArray(profile?.languages) ? profile!.languages : [],
      software: Array.isArray(profile?.software) ? profile!.software : [],
    };

    this.form.patchValue({
      aboutMe: safe.aboutMe,
      languagesText: safe.languages.join(', '),
      softwareText: safe.software.join(', '),
    }, { emitEvent: false });

    // Reset arrays
    while (this.experiencesArray.length) this.experiencesArray.removeAt(0);
    while (this.educationArray.length) this.educationArray.removeAt(0);

    safe.experiences.forEach((e) => this.addExperience(e));
    safe.education.forEach((e) => this.addEducation(e));
  }

  save() {
    if (this.isSaving) return;
    this.isSaving = true;
    this.errorMessage = '';

    const raw = this.form.getRawValue() as any;

    const payload: UserProfile = {
      aboutMe: typeof raw.aboutMe === 'string' ? raw.aboutMe : '',
      languages: this.parseCommaList(raw.languagesText),
      software: this.parseCommaList(raw.softwareText),
      experiences: Array.isArray(raw.experiences) ? raw.experiences : [],
      education: Array.isArray(raw.education) ? raw.education : [],
    };

    this.api.updateUserProfile(payload).subscribe({
      next: (resp) => {
        this.isSaving = false;
        this.applyProfile(resp?.profile);
      },
      error: (err) => {
        this.isSaving = false;
        const status = err?.status;
        const msg = err?.error?.message || err?.message;
        this.errorMessage = typeof msg === 'string' ? msg : `Erreur sauvegarde (HTTP ${status || '?'})`;
      }
    });
  }
}
