import { Component, ElementRef, ViewChild } from '@angular/core';
import { CdkDragDrop, CdkDragEnd, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
import { FormArray, FormBuilder } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { ConfirmService } from '../../services/confirm.service';
import { ToastService } from '../../services/toast.service';
import { ProfessionalProfile } from '../../models/professional-profile';
import { firstValueFrom } from 'rxjs';
import { Router } from '@angular/router';

type ExperienceFormValue = {
  uid: string;
  title: string;
  company: string;
  period: string;
  description: string;
};

type EducationFormValue = {
  uid: string;
  school: string;
  degree: string;
  period: string;
  description: string;
};

type ProjectFormValue = {
  uid: string;
  name: string;
  tech: string;
  link: string;
  description: string;
};

type CertificationFormValue = {
  uid: string;
  name: string;
  issuer: string;
  year: string;
  link: string;
};

type LinkFormValue = {
  uid: string;
  label: string;
  url: string;
};

type PdfExperience = {
  uid: string;
  title: string;
  company: string;
  period: string;
  description: string;
};

type PdfEducation = {
  uid: string;
  school: string;
  degree: string;
  period: string;
  description: string;
};

type PdfProject = {
  uid: string;
  name: string;
  tech: string;
  link: string;
  description: string;
};

type PdfCertification = {
  uid: string;
  name: string;
  issuer: string;
  year: string;
  link: string;
};

type PdfLink = {
  uid: string;
  label: string;
  url: string;
};

type CvPdfViewModel = {
  fullName: string;
  email: string;
  phone: string;
  address: string;
  linkedin: string;
  avatarDataUrl: string | null;
  jobTitle: string;
  headline: string;
  aboutMe: string;
  experiences: PdfExperience[];
  education: PdfEducation[];
  languages: string[];
  software: string[];
  skills: string[];
  projects: PdfProject[];
  certifications: PdfCertification[];
  interests: string[];
  links: PdfLink[];
};

type PdfSectionId =
  | 'profile'
  | 'experiences'
  | 'projects'
  | 'education'
  | 'certifications'
  | 'grid'
  | 'links';

type PdfSectionsLayout = {
  left: PdfSectionId[];
  right: PdfSectionId[];
};

type PdfBlockLayout = { x: number; y: number; w: number; h: number };

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

  cvPrimaryColor = '';
  cvAccentColor = '';

  readonly pdfSectionCatalog: Array<{ id: PdfSectionId; label: string }> = [
    { id: 'profile', label: 'Profil' },
    { id: 'experiences', label: 'Expériences' },
    { id: 'projects', label: 'Projets' },
    { id: 'education', label: 'Éducation' },
    { id: 'certifications', label: 'Certifications' },
    { id: 'grid', label: 'Compétences / Langues / Logiciels / Centres d’intérêt' },
    { id: 'links', label: 'Liens' },
  ];

  private readonly defaultPdfSectionOrder: PdfSectionId[] = this.pdfSectionCatalog.map((x) => x.id);

  pdfSectionOrder: PdfSectionId[] = [...this.defaultPdfSectionOrder];

  private readonly defaultPdfSectionsLayout: PdfSectionsLayout = {
    left: ['profile', 'experiences', 'education'],
    right: ['projects', 'certifications', 'grid', 'links'],
  };

  pdfSectionsLayout: PdfSectionsLayout = {
    left: [...this.defaultPdfSectionsLayout.left],
    right: [...this.defaultPdfSectionsLayout.right],
  };

  pdfFreeLayoutEnabled = false;
  pdfBlocksLayout: Record<string, PdfBlockLayout> = {};

  private resizeState: {
    blockId: string;
    startClientX: number;
    startClientY: number;
    startW: number;
    startH: number;
  } | null = null;

  private previewSyncTimer: any = null;

  @ViewChild('pdfContent') private pdfContentRef?: ElementRef<HTMLElement>;

  languageInput = '';
  languageLevelInput = '';
  softwareInput = '';
  skillInput = '';
  interestInput = '';

  readonly languageOptions: string[] = this.buildLanguageOptions();

  readonly form = this.fb.group({
    jobTitle: this.fb.control('', { nonNullable: true }),
    headline: this.fb.control('', { nonNullable: true }),
    phone: this.fb.control('', { nonNullable: true }),
    address: this.fb.control('', { nonNullable: true }),
    linkedin: this.fb.control('', { nonNullable: true }),
    aboutMe: this.fb.control('', { nonNullable: true }),
    experiences: this.fb.array([] as any[]),
    education: this.fb.array([] as any[]),
    languages: this.fb.control<string[]>([], { nonNullable: true }),
    software: this.fb.control<string[]>([], { nonNullable: true }),
    skills: this.fb.control<string[]>([], { nonNullable: true }),
    interests: this.fb.control<string[]>([], { nonNullable: true }),
    projects: this.fb.array([] as any[]),
    certifications: this.fb.array([] as any[]),
    links: this.fb.array([] as any[]),
  });

  constructor(
    private readonly fb: FormBuilder,
    private readonly api: ApiService,
    private readonly confirm: ConfirmService,
    private readonly toast: ToastService,
    private readonly router: Router
  ) {
    if (!this.api.isLoggedIn()) {
      this.router.navigate(['/login']);
      return;
    }

    this.initCvStyleDefaults();

    // Aperçu en mode libre: sync léger quand on édite.
    this.form.valueChanges.subscribe(() => {
      if (!this.isEditing) return;
      if (!this.pdfFreeLayoutEnabled) return;
      this.queueSyncPdfPreview();
    });

    this.load();
  }

  private newUid(): string {
    try {
      const uuid = (globalThis as any)?.crypto?.randomUUID?.();
      if (typeof uuid === 'string' && uuid) return uuid;
    } catch {
      // ignore
    }
    return `uid_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  }

  private clamp(n: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, n));
  }

  private readCssVar(name: string): string {
    try {
      return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    } catch {
      return '';
    }
  }

  private initCvStyleDefaults() {
    // Par défaut: reprendre les couleurs du thème. L'utilisateur peut les changer
    // via les sélecteurs avant de télécharger le PDF.
    const primary = this.readCssVar('--text-title');
    const accent = this.readCssVar('--accent-color');

    // Fallbacks: valeurs déjà utilisées par le thème.
    this.cvPrimaryColor = primary || '#880e4f';
    this.cvAccentColor = accent || '#f8bbd0';
  }

  private sanitizePdfSectionsOrder(input: unknown): PdfSectionId[] {
    const allowed = new Set(this.defaultPdfSectionOrder);
    const seen = new Set<PdfSectionId>();
    const out: PdfSectionId[] = [];

    if (Array.isArray(input)) {
      for (const raw of input) {
        if (typeof raw !== 'string') continue;
        const id = raw as PdfSectionId;
        if (!allowed.has(id)) continue;
        if (seen.has(id)) continue;
        seen.add(id);
        out.push(id);
      }
    }

    // Ajoute les sections manquantes dans l'ordre par défaut.
    for (const id of this.defaultPdfSectionOrder) {
      if (seen.has(id)) continue;
      out.push(id);
    }

    return out;
  }

  private sanitizePdfSectionsLayout(input: unknown, fallbackOrder: PdfSectionId[]): PdfSectionsLayout {
    const allowed = new Set(this.defaultPdfSectionOrder);
    const seen = new Set<PdfSectionId>();

    const pick = (arr: unknown): PdfSectionId[] => {
      if (!Array.isArray(arr)) return [];
      const out: PdfSectionId[] = [];
      for (const raw of arr) {
        if (typeof raw !== 'string') continue;
        const id = raw as PdfSectionId;
        if (!allowed.has(id)) continue;
        if (seen.has(id)) continue;
        seen.add(id);
        out.push(id);
      }
      return out;
    };

    const obj = (input && typeof input === 'object') ? (input as any) : null;
    const left = pick(obj?.left);
    const right = pick(obj?.right);

    // Si aucun layout n'est fourni, on applique un défaut en 2 colonnes.
    if (left.length === 0 && right.length === 0) {
      const defaultLeft = new Set(this.defaultPdfSectionsLayout.left);
      const nextLeft: PdfSectionId[] = [];
      const nextRight: PdfSectionId[] = [];
      for (const id of fallbackOrder) {
        if (!allowed.has(id)) continue;
        if (defaultLeft.has(id)) nextLeft.push(id);
        else nextRight.push(id);
      }
      return { left: nextLeft, right: nextRight };
    }

    // Ajoute les sections manquantes en respectant un ordre fallback.
    const missing: PdfSectionId[] = [];
    for (const id of fallbackOrder) {
      if (seen.has(id)) continue;
      seen.add(id);
      missing.push(id);
    }

    const nextLeft = [...left];
    const nextRight = [...right];

    const defaultLeft = new Set(this.defaultPdfSectionsLayout.left);
    // Complète dans la colonne par défaut.
    for (const id of missing) {
      if (defaultLeft.has(id)) nextLeft.push(id);
      else nextRight.push(id);
    }

    return { left: nextLeft, right: nextRight };
  }

  private sanitizePdfBlocksLayout(input: unknown): Record<string, PdfBlockLayout> {
    if (!input || typeof input !== 'object' || Array.isArray(input)) return {};

    const out: Record<string, PdfBlockLayout> = {};
    for (const [key, raw] of Object.entries(input as Record<string, any>)) {
      if (typeof key !== 'string' || !key.trim()) continue;
      if (!raw || typeof raw !== 'object' || Array.isArray(raw)) continue;

      const x = Number((raw as any).x);
      const y = Number((raw as any).y);
      const w = Number((raw as any).w);
      const h = Number((raw as any).h);
      if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(w) || !Number.isFinite(h)) continue;

      out[key] = {
        x: Math.max(0, Math.round(x)),
        y: Math.max(0, Math.round(y)),
        w: Math.max(60, Math.round(w)),
        h: Math.max(40, Math.round(h)),
      };
    }
    return out;
  }

  onFreeLayoutToggle(enabled: boolean) {
    if (!this.isEditing) return;
    this.pdfFreeLayoutEnabled = !!enabled;
    this.form.markAsDirty();
    if (this.pdfFreeLayoutEnabled) {
      this.queueSyncPdfPreview();
    }
  }

  private getUserForPdfPreview(): { fullName: string; email: string; avatarDataUrl: string | null } {
    return this.userVm ?? { fullName: '—', email: '', avatarDataUrl: null };
  }

  private queueSyncPdfPreview() {
    if (this.previewSyncTimer) return;
    this.previewSyncTimer = setTimeout(() => {
      this.previewSyncTimer = null;
      try {
        const user = this.getUserForPdfPreview();
        this.pdfVm = this.cleanCvForPdf(this.getPayloadFromForm(), user);
        this.pdfGeneratedAt = new Date();

        // En mode Canva, on s'assure que tous les blocs visibles ont une position/taille.
        // Important: éviter de muter l'état depuis un getter appelé par le template.
        this.ensureFreeLayoutBlocksFromVm();
      } catch {
        // ignore
      }
    }, 0);
  }

  private createDefaultBlockLayout(index: number): PdfBlockLayout {
    // Auto-layout simple si le bloc n'a jamais été positionné.
    // Canvas interne ~ 794 - 2*28 = 738.
    const canvasW = 738;
    const canvasH = 1123 - 2 * 28;

    const col = index % 2;
    const row = Math.floor(index / 2);
    const x = col === 0 ? 0 : Math.floor(canvasW / 2) + 6;
    const y = this.clamp(row * 130, 0, canvasH - 60);
    const w = Math.floor(canvasW / 2) - 6;
    const h = 120;

    return { x, y, w: Math.max(220, w), h };
  }

  private ensureBlockLayout(blockId: string): PdfBlockLayout {
    const existing = this.pdfBlocksLayout[blockId];
    if (existing) return existing;

    const created = this.createDefaultBlockLayout(Object.keys(this.pdfBlocksLayout).length);
    this.pdfBlocksLayout = { ...this.pdfBlocksLayout, [blockId]: created };
    return created;
  }

  private ensureFreeLayoutBlocksFromVm() {
    if (!this.pdfFreeLayoutEnabled) return;
    const vm = this.pdfVm;
    if (!vm) return;

    const required: string[] = ['header', 'profile', 'skills', 'languages', 'software', 'interests'];

    for (const exp of vm.experiences || []) required.push(`exp:${(exp as any).uid}`);
    for (const edu of vm.education || []) required.push(`edu:${(edu as any).uid}`);
    for (const prj of vm.projects || []) required.push(`prj:${(prj as any).uid}`);
    for (const cert of vm.certifications || []) required.push(`cert:${(cert as any).uid}`);
    for (const lnk of vm.links || []) required.push(`link:${(lnk as any).uid}`);

    let next = this.pdfBlocksLayout;
    let changed = false;

    for (const id of required) {
      if (typeof id !== 'string' || !id) continue;
      if (next[id]) continue;
      const created = this.createDefaultBlockLayout(Object.keys(next).length);
      next = { ...next, [id]: created };
      changed = true;
    }

    if (changed) {
      this.pdfBlocksLayout = next;
    }
  }

  getBlockLayout(blockId: string): PdfBlockLayout | null {
    return this.pdfBlocksLayout[blockId] ?? null;
  }

  onBlockDragEnded(blockId: string, event: CdkDragEnd) {
    if (!this.isEditing) return;
    if (!this.pdfFreeLayoutEnabled) return;

    const pos = event?.source?.getFreeDragPosition?.();
    if (!pos) return;

    const prev = this.ensureBlockLayout(blockId);
    this.pdfBlocksLayout = {
      ...this.pdfBlocksLayout,
      [blockId]: {
        ...prev,
        x: Math.max(0, Math.round(pos.x)),
        y: Math.max(0, Math.round(pos.y)),
      },
    };

    this.form.markAsDirty();
  }

  onResizeStart(blockId: string, ev: MouseEvent) {
    if (!this.isEditing) return;
    if (!this.pdfFreeLayoutEnabled) return;
    ev.preventDefault();
    ev.stopPropagation();

    const prev = this.ensureBlockLayout(blockId);
    this.resizeState = {
      blockId,
      startClientX: ev.clientX,
      startClientY: ev.clientY,
      startW: prev.w,
      startH: prev.h,
    };

    const onMove = (e: MouseEvent) => {
      if (!this.resizeState) return;
      const dx = e.clientX - this.resizeState.startClientX;
      const dy = e.clientY - this.resizeState.startClientY;

      const nextW = Math.max(80, Math.round(this.resizeState.startW + dx));
      const nextH = Math.max(60, Math.round(this.resizeState.startH + dy));
      const id = this.resizeState.blockId;
      const current = this.ensureBlockLayout(id);
      this.pdfBlocksLayout = {
        ...this.pdfBlocksLayout,
        [id]: { ...current, w: nextW, h: nextH },
      };
      this.form.markAsDirty();
    };

    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      this.resizeState = null;
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }

  getPdfSectionLabel(id: PdfSectionId): string {
    return this.pdfSectionCatalog.find((x) => x.id === id)?.label || id;
  }

  onPdfSectionDrop(event: CdkDragDrop<PdfSectionId[]>) {
    if (!this.isEditing) return;
    if (!event?.container?.data) return;

    moveItemInArray(this.pdfSectionOrder, event.previousIndex, event.currentIndex);
    // Maintient le layout en cohérence (mode legacy: 1 seule liste).
    this.pdfSectionsLayout = {
      left: [...this.pdfSectionOrder],
      right: [],
    };
    // Ce choix doit être sauvegardé avec le profil.
    this.form.markAsDirty();
  }

  onPdfLayoutDrop(event: CdkDragDrop<PdfSectionId[]>) {
    if (!this.isEditing) return;

    if (event.previousContainer === event.container) {
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
    } else {
      transferArrayItem(
        event.previousContainer.data,
        event.container.data,
        event.previousIndex,
        event.currentIndex
      );
    }

    // Recalcule l'ordre plat pour compat (et pour le rendu qui en a besoin).
    this.pdfSectionOrder = [...this.pdfSectionsLayout.left, ...this.pdfSectionsLayout.right];
    this.form.markAsDirty();
  }

  private buildLanguageOptions(): string[] {
    // Langues les plus reconnues/communes au niveau mondial (liste courte).
    // Tu peux ajouter/enlever des valeurs ici sans toucher au backend.
    return [
      'Anglais',
      'Arabe',
      'Bengali',
      'Chinois (mandarin)',
      'Coréen',
      'Espagnol',
      'Français',
      'Haoussa',
      'Hébreu',
      'Hindi',
      'Indonésien',
      'Italien',
      'Japonais',
      'Malais',
      'Néerlandais',
      'Ourdou',
      'Pendjabi',
      'Persan',
      'Polonais',
      'Portugais',
      'Roumain',
      'Russe',
      'Swahili',
      'Tamoul',
      'Thaï',
      'Turc',
      'Ukrainien',
      'Vietnamien',
      'Allemand',
    ].sort((a, b) => a.localeCompare(b, 'fr'));
  }

  get experiencesArray(): FormArray {
    return this.form.controls.experiences as unknown as FormArray;
  }

  get educationArray(): FormArray {
    return this.form.controls.education as unknown as FormArray;
  }

  get projectsArray(): FormArray {
    return this.form.controls.projects as unknown as FormArray;
  }

  get certificationsArray(): FormArray {
    return this.form.controls.certifications as unknown as FormArray;
  }

  get linksArray(): FormArray {
    return this.form.controls.links as unknown as FormArray;
  }

  private createExperienceGroup(value?: Partial<ExperienceFormValue>) {
    return this.fb.group({
      uid: this.fb.control(value?.uid ?? this.newUid(), { nonNullable: true }),
      title: this.fb.control(value?.title ?? '', { nonNullable: true }),
      company: this.fb.control(value?.company ?? '', { nonNullable: true }),
      period: this.fb.control(value?.period ?? '', { nonNullable: true }),
      description: this.fb.control(value?.description ?? '', { nonNullable: true }),
    });
  }

  private createEducationGroup(value?: Partial<EducationFormValue>) {
    return this.fb.group({
      uid: this.fb.control(value?.uid ?? this.newUid(), { nonNullable: true }),
      school: this.fb.control(value?.school ?? '', { nonNullable: true }),
      degree: this.fb.control(value?.degree ?? '', { nonNullable: true }),
      period: this.fb.control(value?.period ?? '', { nonNullable: true }),
      description: this.fb.control(value?.description ?? '', { nonNullable: true }),
    });
  }

  private createProjectGroup(value?: Partial<ProjectFormValue>) {
    return this.fb.group({
      uid: this.fb.control(value?.uid ?? this.newUid(), { nonNullable: true }),
      name: this.fb.control(value?.name ?? '', { nonNullable: true }),
      tech: this.fb.control(value?.tech ?? '', { nonNullable: true }),
      link: this.fb.control(value?.link ?? '', { nonNullable: true }),
      description: this.fb.control(value?.description ?? '', { nonNullable: true }),
    });
  }

  private createCertificationGroup(value?: Partial<CertificationFormValue>) {
    return this.fb.group({
      uid: this.fb.control(value?.uid ?? this.newUid(), { nonNullable: true }),
      name: this.fb.control(value?.name ?? '', { nonNullable: true }),
      issuer: this.fb.control(value?.issuer ?? '', { nonNullable: true }),
      year: this.fb.control(value?.year ?? '', { nonNullable: true }),
      link: this.fb.control(value?.link ?? '', { nonNullable: true }),
    });
  }

  private createLinkGroup(value?: Partial<LinkFormValue>) {
    return this.fb.group({
      uid: this.fb.control(value?.uid ?? this.newUid(), { nonNullable: true }),
      label: this.fb.control(value?.label ?? '', { nonNullable: true }),
      url: this.fb.control(value?.url ?? '', { nonNullable: true }),
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

  addProject(prefill?: Partial<ProjectFormValue>) {
    this.projectsArray.push(this.createProjectGroup(prefill));
  }

  async removeProject(index: number) {
    if (!this.isEditing) return;
    if (this.projectsArray.length <= 1) return;

    const ok = await this.confirm.confirm('Supprimer ce projet ?', { title: 'Projets' });
    if (!ok) return;

    this.projectsArray.removeAt(index);
  }

  addCertification(prefill?: Partial<CertificationFormValue>) {
    this.certificationsArray.push(this.createCertificationGroup(prefill));
  }

  async removeCertification(index: number) {
    if (!this.isEditing) return;
    if (this.certificationsArray.length <= 1) return;

    const ok = await this.confirm.confirm('Supprimer cette certification ?', { title: 'Certifications' });
    if (!ok) return;

    this.certificationsArray.removeAt(index);
  }

  addLink(prefill?: Partial<LinkFormValue>) {
    this.linksArray.push(this.createLinkGroup(prefill));
  }

  async removeLink(index: number) {
    if (!this.isEditing) return;
    if (this.linksArray.length <= 1) return;

    const ok = await this.confirm.confirm('Supprimer ce lien ?', { title: 'Liens' });
    if (!ok) return;

    this.linksArray.removeAt(index);
  }

  addLanguage() {
    const raw = (this.languageInput || '').trim();
    if (!raw) return;

    const levelRaw = (this.languageLevelInput || '').trim();
    if (!levelRaw) return;

    const percentNum = Number(levelRaw);
    if (!Number.isFinite(percentNum)) return;
    const percent = Math.max(0, Math.min(100, Math.round(percentNum)));

    const baseOf = (value: string) => String(value || '').split('(')[0].trim().toLowerCase();
    const composed = `${raw} (${percent}%)`;

    const current = this.form.controls.languages.value || [];
    const base = raw.toLowerCase();
    const existingIndex = current.findIndex((x) => baseOf(x) === base);

    if (existingIndex >= 0) {
      const next = [...current];
      next[existingIndex] = composed;
      this.form.controls.languages.setValue(next);
    } else {
      this.form.controls.languages.setValue([...current, composed]);
    }

    this.form.controls.languages.markAsDirty();
    this.form.markAsDirty();

    this.languageInput = '';
    this.languageLevelInput = '';
  }

  getLanguagePercent(label: string): number {
    if (typeof label !== 'string') return 0;
    const match = label.match(/\((\s*\d{1,3})\s*%\s*\)/);
    if (!match) return 0;
    const n = Number(match[1]);
    if (!Number.isFinite(n)) return 0;
    return Math.max(0, Math.min(100, Math.round(n)));
  }

  removeLanguage(value: string) {
    const current = this.form.controls.languages.value || [];
    this.form.controls.languages.setValue(current.filter((x) => x !== value));

    this.form.controls.languages.markAsDirty();
    this.form.markAsDirty();
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
    this.form.controls.software.markAsDirty();
    this.form.markAsDirty();
    this.softwareInput = '';
  }

  removeSoftware(value: string) {
    const current = this.form.controls.software.value || [];
    this.form.controls.software.setValue(current.filter((x) => x !== value));

    this.form.controls.software.markAsDirty();
    this.form.markAsDirty();
  }

  addSkill() {
    const raw = (this.skillInput || '').trim();
    if (!raw) return;

    const current = this.form.controls.skills.value || [];
    const exists = current.some((x) => x.toLowerCase() === raw.toLowerCase());
    if (exists) {
      this.skillInput = '';
      return;
    }

    this.form.controls.skills.setValue([...current, raw]);
    this.form.controls.skills.markAsDirty();
    this.form.markAsDirty();
    this.skillInput = '';
  }

  removeSkill(value: string) {
    const current = this.form.controls.skills.value || [];
    this.form.controls.skills.setValue(current.filter((x) => x !== value));

    this.form.controls.skills.markAsDirty();
    this.form.markAsDirty();
  }

  addInterest() {
    const raw = (this.interestInput || '').trim();
    if (!raw) return;

    const current = this.form.controls.interests.value || [];
    const exists = current.some((x) => x.toLowerCase() === raw.toLowerCase());
    if (exists) {
      this.interestInput = '';
      return;
    }

    this.form.controls.interests.setValue([...current, raw]);
    this.form.controls.interests.markAsDirty();
    this.form.markAsDirty();
    this.interestInput = '';
  }

  removeInterest(value: string) {
    const current = this.form.controls.interests.value || [];
    this.form.controls.interests.setValue(current.filter((x) => x !== value));

    this.form.controls.interests.markAsDirty();
    this.form.markAsDirty();
  }

  private parsePgTextArrayLiteral(value: unknown): string[] {
    if (Array.isArray(value)) {
      return value.filter((v) => typeof v === 'string') as string[];
    }
    if (typeof value !== 'string') return [];

    const s = value.trim();
    if (s === '{}' || s === '{NULL}') return [];
    if (!s.startsWith('{') || !s.endsWith('}')) return [];

    const input = s.slice(1, -1);
    const out: string[] = [];
    let i = 0;

    while (i < input.length) {
      if (input[i] === ',') {
        i += 1;
        continue;
      }

      let item = '';
      let isQuoted = false;

      if (input[i] === '"') {
        isQuoted = true;
        i += 1;
        while (i < input.length) {
          const ch = input[i];
          if (ch === '\\') {
            const next = input[i + 1];
            if (typeof next === 'string') {
              item += next;
              i += 2;
              continue;
            }
          }
          if (ch === '"') {
            i += 1;
            break;
          }
          item += ch;
          i += 1;
        }
        while (i < input.length && input[i] !== ',') i += 1;
      } else {
        while (i < input.length && input[i] !== ',') {
          item += input[i];
          i += 1;
        }
      }

      const normalized = isQuoted ? item : item.trim();
      if (normalized && normalized.toUpperCase() !== 'NULL') out.push(normalized);
    }

    return out;
  }

  private normalizeIncomingProfile(p: ProfessionalProfile): ProfessionalProfile {
    const orderRaw = (p as any)?.pdfSectionsOrder ?? (p as any)?.pdf_sections_order;
    const layoutRaw = (p as any)?.pdfSectionsLayout ?? (p as any)?.pdf_sections_layout;
    const freeEnabledRaw = (p as any)?.pdfFreeLayoutEnabled ?? (p as any)?.pdf_free_layout_enabled;
    const blocksRaw = (p as any)?.pdfBlocksLayout ?? (p as any)?.pdf_blocks_layout;

    const sanitizedOrder = this.sanitizePdfSectionsOrder(orderRaw);
    const sanitizedLayout = this.sanitizePdfSectionsLayout(layoutRaw, sanitizedOrder);
    const sanitizedBlocks = this.sanitizePdfBlocksLayout(blocksRaw);
    const freeEnabled = !!freeEnabledRaw;

    return {
      jobTitle: typeof (p as any)?.jobTitle === 'string' ? (p as any).jobTitle : (typeof (p as any)?.job_title === 'string' ? (p as any).job_title : ''),
      headline: typeof (p as any)?.headline === 'string' ? (p as any).headline : '',
      pdfSectionsOrder: sanitizedOrder,
      pdfSectionsLayout: { left: [...sanitizedLayout.left], right: [...sanitizedLayout.right] },
      pdfFreeLayoutEnabled: freeEnabled,
      pdfBlocksLayout: sanitizedBlocks,
      phone: typeof (p as any)?.phone === 'string' ? (p as any).phone : '',
      address: typeof (p as any)?.address === 'string' ? (p as any).address : '',
      linkedin: typeof (p as any)?.linkedin === 'string' ? (p as any).linkedin : '',
      aboutMe: typeof p?.aboutMe === 'string' ? p.aboutMe : '',
      experiences: Array.isArray(p?.experiences) ? p.experiences : [],
      education: Array.isArray(p?.education) ? p.education : [],
      languages: this.parsePgTextArrayLiteral((p as any)?.languages),
      software: this.parsePgTextArrayLiteral((p as any)?.software),
      skills: this.parsePgTextArrayLiteral((p as any)?.skills),
      interests: this.parsePgTextArrayLiteral((p as any)?.interests),
      links: Array.isArray((p as any)?.links) ? (p as any).links : [],
      projects: Array.isArray((p as any)?.projects) ? (p as any).projects : [],
      certifications: Array.isArray((p as any)?.certifications) ? (p as any).certifications : [],
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
    const sanitizedOrder = this.sanitizePdfSectionsOrder((profile as any).pdfSectionsOrder);
    const sanitizedLayout = this.sanitizePdfSectionsLayout((profile as any).pdfSectionsLayout, sanitizedOrder);
    this.pdfSectionsLayout = sanitizedLayout;
    this.pdfSectionOrder = [...sanitizedLayout.left, ...sanitizedLayout.right];

    this.pdfFreeLayoutEnabled = !!(profile as any).pdfFreeLayoutEnabled;
    this.pdfBlocksLayout = this.sanitizePdfBlocksLayout((profile as any).pdfBlocksLayout);
    this.form.controls.jobTitle.setValue(profile.jobTitle || '');
    this.form.controls.headline.setValue(profile.headline || '');
    this.form.controls.phone.setValue(profile.phone || '');
    this.form.controls.address.setValue(profile.address || '');
    this.form.controls.linkedin.setValue(profile.linkedin || '');
    this.form.controls.aboutMe.setValue(profile.aboutMe || '');

    this.experiencesArray.clear();
    this.educationArray.clear();
    this.projectsArray.clear();
    this.certificationsArray.clear();
    this.linksArray.clear();

    for (const exp of profile.experiences || []) {
      this.addExperience(this.toExperienceFormValue(exp));
    }

    for (const edu of profile.education || []) {
      this.addEducation(this.toEducationFormValue(edu));
    }

    this.form.controls.languages.setValue(this.normalizeStringArray(profile.languages));
    this.form.controls.software.setValue(this.normalizeStringArray(profile.software));
    this.form.controls.skills.setValue(this.normalizeStringArray((profile as any).skills));
    this.form.controls.interests.setValue(this.normalizeStringArray((profile as any).interests));

    for (const prj of (profile as any).projects || []) {
      this.addProject(this.toProjectFormValue(prj));
    }

    for (const cert of (profile as any).certifications || []) {
      this.addCertification(this.toCertificationFormValue(cert));
    }

    for (const l of (profile as any).links || []) {
      this.addLink(this.toLinkFormValue(l));
    }

    this.form.markAsPristine();
    this.form.markAsUntouched();

    // Génère l'aperçu en mode libre même en lecture seule.
    if (this.pdfFreeLayoutEnabled) {
      this.queueSyncPdfPreview();
    }
  }

  private getPayloadFromForm(): ProfessionalProfile {
    const raw = this.form.getRawValue();

    return {
      jobTitle: raw.jobTitle || '',
      headline: raw.headline || '',
      pdfSectionsOrder: [...this.pdfSectionOrder],
      pdfSectionsLayout: {
        left: [...this.pdfSectionsLayout.left],
        right: [...this.pdfSectionsLayout.right],
      },
      pdfFreeLayoutEnabled: !!this.pdfFreeLayoutEnabled,
      pdfBlocksLayout: { ...this.pdfBlocksLayout },
      phone: raw.phone || '',
      address: raw.address || '',
      linkedin: raw.linkedin || '',
      aboutMe: raw.aboutMe || '',
      experiences: (raw.experiences as any[]) || [],
      education: (raw.education as any[]) || [],
      languages: this.normalizeStringArray(raw.languages),
      software: this.normalizeStringArray(raw.software),
      skills: this.normalizeStringArray(raw.skills),
      interests: this.normalizeStringArray(raw.interests),
      projects: (raw.projects as any[]) || [],
      certifications: (raw.certifications as any[]) || [],
      links: (raw.links as any[]) || [],
    };
  }

  startEdit() {
    if (this.isLoading || this.isSaving) return;

    this.isEditing = true;
    this.form.enable({ emitEvent: false });

    // UX: quand on passe en édition, on met au moins une ligne.
    if (this.experiencesArray.length === 0) this.addExperience();
    if (this.educationArray.length === 0) this.addEducation();
    if (this.projectsArray.length === 0) this.addProject();
    if (this.certificationsArray.length === 0) this.addCertification();
    if (this.linksArray.length === 0) this.addLink();
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
      uid: typeof item?.uid === 'string' && item.uid ? item.uid : this.newUid(),
      title: typeof item?.title === 'string' ? item.title : '',
      company: typeof item?.company === 'string' ? item.company : '',
      period: typeof item?.period === 'string' ? item.period : '',
      description: typeof item?.description === 'string' ? item.description : '',
    };
  }

  private toEducationFormValue(item: any): EducationFormValue {
    return {
      uid: typeof item?.uid === 'string' && item.uid ? item.uid : this.newUid(),
      school: typeof item?.school === 'string' ? item.school : '',
      degree: typeof item?.degree === 'string' ? item.degree : '',
      period: typeof item?.period === 'string' ? item.period : '',
      description: typeof item?.description === 'string' ? item.description : '',
    };
  }

  private toProjectFormValue(item: any): ProjectFormValue {
    return {
      uid: typeof item?.uid === 'string' && item.uid ? item.uid : this.newUid(),
      name: typeof item?.name === 'string' ? item.name : '',
      tech: typeof item?.tech === 'string' ? item.tech : '',
      link: typeof item?.link === 'string' ? item.link : '',
      description: typeof item?.description === 'string' ? item.description : '',
    };
  }

  private toCertificationFormValue(item: any): CertificationFormValue {
    return {
      uid: typeof item?.uid === 'string' && item.uid ? item.uid : this.newUid(),
      name: typeof item?.name === 'string' ? item.name : '',
      issuer: typeof item?.issuer === 'string' ? item.issuer : '',
      year: typeof item?.year === 'string' ? item.year : '',
      link: typeof item?.link === 'string' ? item.link : '',
    };
  }

  private toLinkFormValue(item: any): LinkFormValue {
    return {
      uid: typeof item?.uid === 'string' && item.uid ? item.uid : this.newUid(),
      label: typeof item?.label === 'string' ? item.label : '',
      url: typeof item?.url === 'string' ? item.url : '',
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
        if (err?.status === 401) {
          this.api.logout();
          this.toast.warning('Session expirée. Merci de te reconnecter.', { title: 'Espace Pro' });
          this.router.navigate(['/login']);
          return;
        }
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

    // Si l'utilisateur a saisi une langue / un logiciel sans cliquer sur "Ajouter",
    // on le capture avant d'envoyer le payload.
    if ((this.languageInput || '').trim() && (this.languageLevelInput || '').trim()) {
      this.addLanguage();
    }
    if ((this.softwareInput || '').trim()) {
      this.addSoftware();
    }
    if ((this.skillInput || '').trim()) {
      this.addSkill();
    }
    if ((this.interestInput || '').trim()) {
      this.addInterest();
    }

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

        if (err?.status === 401) {
          this.api.logout();
          this.toast.warning('Session expirée. Merci de te reconnecter.', { title: 'Espace Pro' });
          this.router.navigate(['/login']);
          return;
        }

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
        uid: typeof (x as any)?.uid === 'string' && (x as any).uid ? (x as any).uid : this.newUid(),
        title: trim((x as any)?.title),
        company: trim((x as any)?.company),
        period: trim((x as any)?.period),
        description: trim((x as any)?.description),
      }))
      .filter((x) => x.title || x.company || x.period || x.description);

    const education = (profile.education || [])
      .map((x) => ({
        uid: typeof (x as any)?.uid === 'string' && (x as any).uid ? (x as any).uid : this.newUid(),
        school: trim((x as any)?.school),
        degree: trim((x as any)?.degree),
        period: trim((x as any)?.period),
        description: trim((x as any)?.description),
      }))
      .filter((x) => x.school || x.degree || x.period || x.description);

    const projects = ((profile as any).projects || [])
      .map((x: any) => ({
        uid: typeof x?.uid === 'string' && x.uid ? x.uid : this.newUid(),
        name: trim(x?.name),
        tech: trim(x?.tech),
        link: trim(x?.link),
        description: trim(x?.description),
      }))
      .filter((x: any) => x.name || x.tech || x.link || x.description);

    const certifications = ((profile as any).certifications || [])
      .map((x: any) => ({
        uid: typeof x?.uid === 'string' && x.uid ? x.uid : this.newUid(),
        name: trim(x?.name),
        issuer: trim(x?.issuer),
        year: trim(x?.year),
        link: trim(x?.link),
      }))
      .filter((x: any) => x.name || x.issuer || x.year || x.link);

    const links = ((profile as any).links || [])
      .map((x: any) => ({
        uid: typeof x?.uid === 'string' && x.uid ? x.uid : this.newUid(),
        label: trim(x?.label),
        url: trim(x?.url),
      }))
      .filter((x: any) => x.label || x.url);

    return {
      fullName: user.fullName,
      email: user.email,
      phone: trim((profile as any)?.phone),
      address: trim((profile as any)?.address),
      linkedin: trim((profile as any)?.linkedin),
      avatarDataUrl: user.avatarDataUrl,
      jobTitle: trim((profile as any)?.jobTitle || (profile as any)?.job_title),
      headline: trim((profile as any)?.headline),
      aboutMe: trim(profile.aboutMe),
      experiences,
      education,
      languages: this.normalizeStringArray(profile.languages),
      software: this.normalizeStringArray(profile.software),
      skills: this.normalizeStringArray((profile as any).skills),
      projects,
      certifications,
      interests: this.normalizeStringArray((profile as any).interests),
      links,
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
